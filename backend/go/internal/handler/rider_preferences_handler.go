package handler

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
)

type riderPreferencePayload struct {
	MaxDistanceKM     float64 `json:"max_distance_km"`
	AutoAcceptEnabled bool    `json:"auto_accept_enabled"`
	PreferRoute       bool    `json:"prefer_route"`
	PreferHighPrice   bool    `json:"prefer_high_price"`
	PreferNearby      bool    `json:"prefer_nearby"`
}

type riderOrderDistanceMetrics struct {
	TotalDistanceKM   float64
	HasTotalDistance  bool
	ShopDistanceM     float64
	HasShopDistance   bool
	CustomerDistanceK float64
	HasCustomerDist   bool
}

type availableRiderOrderView struct {
	Data            gin.H
	PreferenceScore float64
	CreatedAt       time.Time
}

func riderOrderPublicID(order *repository.Order) interface{} {
	if order == nil {
		return ""
	}
	if uid := strings.TrimSpace(order.UID); uid != "" {
		return uid
	}
	return order.ID
}

func riderOrderPublicTSID(order *repository.Order) string {
	if order == nil {
		return ""
	}
	return strings.TrimSpace(order.TSID)
}

func normalizeRiderPreferenceRecord(pref repository.RiderPreference) repository.RiderPreference {
	if pref.MaxDistanceKM <= 0 {
		pref.MaxDistanceKM = 3
	}
	pref.MaxDistanceKM = math.Round(pref.MaxDistanceKM*10) / 10
	if pref.MaxDistanceKM < 0.5 {
		pref.MaxDistanceKM = 0.5
	}
	if pref.MaxDistanceKM > 20 {
		pref.MaxDistanceKM = 20
	}
	return pref
}

func defaultRiderPreferenceRecord(riderID uint) repository.RiderPreference {
	return normalizeRiderPreferenceRecord(repository.RiderPreference{
		RiderID:           riderID,
		MaxDistanceKM:     3,
		AutoAcceptEnabled: false,
		PreferRoute:       true,
		PreferHighPrice:   true,
		PreferNearby:      false,
	})
}

func riderPreferenceToMap(pref repository.RiderPreference) gin.H {
	pref = normalizeRiderPreferenceRecord(pref)
	return gin.H{
		"rider_id":            pref.RiderID,
		"max_distance_km":     pref.MaxDistanceKM,
		"auto_accept_enabled": pref.AutoAcceptEnabled,
		"prefer_route":        pref.PreferRoute,
		"prefer_high_price":   pref.PreferHighPrice,
		"prefer_nearby":       pref.PreferNearby,
		"updated_at":          pref.UpdatedAt,
	}
}

func (h *RiderHandler) currentRiderID(c *gin.Context) uint {
	return parseContextUint(c.Get("rider_id"))
}

func (h *RiderHandler) loadRiderPreference(c *gin.Context, riderID uint) repository.RiderPreference {
	pref := defaultRiderPreferenceRecord(riderID)
	if riderID == 0 {
		return pref
	}
	var stored repository.RiderPreference
	if err := h.db.WithContext(c.Request.Context()).Where("rider_id = ?", riderID).First(&stored).Error; err == nil {
		return normalizeRiderPreferenceRecord(stored)
	}
	return pref
}

func (h *RiderHandler) GetPreferences(c *gin.Context) {
	riderID := h.currentRiderID(c)
	if riderID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "骑手身份缺失"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    riderPreferenceToMap(h.loadRiderPreference(c, riderID)),
	})
}

func (h *RiderHandler) UpdatePreferences(c *gin.Context) {
	riderID := h.currentRiderID(c)
	if riderID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "骑手身份缺失"})
		return
	}

	var payload riderPreferencePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "参数错误"})
		return
	}

	pref := normalizeRiderPreferenceRecord(repository.RiderPreference{
		RiderID:           riderID,
		MaxDistanceKM:     payload.MaxDistanceKM,
		AutoAcceptEnabled: payload.AutoAcceptEnabled,
		PreferRoute:       payload.PreferRoute,
		PreferHighPrice:   payload.PreferHighPrice,
		PreferNearby:      payload.PreferNearby,
	})

	if err := h.db.WithContext(c.Request.Context()).
		Where("rider_id = ?", riderID).
		Assign(pref).
		FirstOrCreate(&pref).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "保存骑手偏好失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    riderPreferenceToMap(pref),
	})
}

func (h *RiderHandler) ListAvailableOrders(c *gin.Context) {
	riderID := h.currentRiderID(c)
	if riderID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "骑手身份缺失"})
		return
	}

	preference := h.loadRiderPreference(c, riderID)

	var orders []repository.Order
	if err := h.db.WithContext(c.Request.Context()).
		Model(&repository.Order{}).
		Where("status = ?", "pending").
		Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", "takeout").
		Where("(rider_id IS NULL OR rider_id = '')").
		Where("payment_status = ?", "paid").
		Order("created_at DESC").
		Limit(200).
		Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "加载可用订单失败"})
		return
	}

	items := make([]availableRiderOrderView, 0, len(orders))
	for _, order := range orders {
		metrics := extractOrderDistanceMetrics(order.RawPayload)
		if preference.MaxDistanceKM > 0 && metrics.HasTotalDistance && metrics.TotalDistanceKM > preference.MaxDistanceKM {
			continue
		}
		price := order.DeliveryFee
		if price <= 0 {
			price = order.RiderQuotedPrice
		}
		if price <= 0 {
			price = order.TotalPrice
		}
		score := calculatePreferenceScore(preference, metrics, price)
		items = append(items, availableRiderOrderView{
			Data: gin.H{
				"id":                   riderOrderPublicID(&order),
				"legacyId":             order.ID,
				"tsid":                 riderOrderPublicTSID(&order),
				"daily_order_id":       order.DailyOrderID,
				"status":               order.Status,
				"shop_name":            order.ShopName,
				"address":              order.Address,
				"delivery_fee":         order.DeliveryFee,
				"rider_quoted_price":   order.RiderQuotedPrice,
				"total_price":          order.TotalPrice,
				"food_request":         order.FoodRequest,
				"items":                order.Items,
				"created_at":           order.CreatedAt,
				"service_type":         order.ServiceType,
				"service_description":  order.ServiceDescription,
				"shop_distance_m":      metersOrZero(metrics.ShopDistanceM, metrics.HasShopDistance),
				"customer_distance_km": kilometersOrZero(metrics.CustomerDistanceK, metrics.HasCustomerDist),
				"total_distance_km":    kilometersOrZero(metrics.TotalDistanceKM, metrics.HasTotalDistance),
				"preference_score":     score,
				"auto_accept_priority": score,
			},
			PreferenceScore: score,
			CreatedAt:       order.CreatedAt,
		})
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].PreferenceScore == items[j].PreferenceScore {
			return items[i].CreatedAt.After(items[j].CreatedAt)
		}
		return items[i].PreferenceScore > items[j].PreferenceScore
	})

	result := make([]gin.H, 0, len(items))
	for _, item := range items {
		result = append(result, item.Data)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"preferences": riderPreferenceToMap(preference),
		"data":        result,
	})
}

func calculatePreferenceScore(pref repository.RiderPreference, metrics riderOrderDistanceMetrics, price float64) float64 {
	score := 0.0
	if pref.PreferRoute && (metrics.HasTotalDistance && metrics.TotalDistanceKM <= 2.5 || metrics.HasShopDistance && metrics.ShopDistanceM <= 800) {
		score += 5
	}
	if pref.PreferHighPrice {
		score += math.Min(price/5, 5)
	}
	if pref.PreferNearby && metrics.HasTotalDistance {
		score += math.Max(0, 4-metrics.TotalDistanceKM)
	}
	if metrics.HasTotalDistance {
		score += math.Max(0, 3-metrics.TotalDistanceKM/2)
	}
	return score
}

func extractOrderDistanceMetrics(raw string) riderOrderDistanceMetrics {
	metrics := riderOrderDistanceMetrics{}
	if strings.TrimSpace(raw) == "" {
		return metrics
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return metrics
	}

	if value, ok := firstMetricValue(payload, "total_distance_km", "totalDistanceKm", "total_distance", "totalDistance", "distance"); ok {
		metrics.TotalDistanceKM = normalizeDistanceKilometers(value)
		metrics.HasTotalDistance = metrics.TotalDistanceKM > 0
	}
	if value, ok := firstMetricValue(payload, "shop_distance_m", "shopDistanceM", "shop_distance", "shopDistance", "pickup_distance", "pickupDistance"); ok {
		metrics.ShopDistanceM = normalizeDistanceMeters(value)
		metrics.HasShopDistance = metrics.ShopDistanceM > 0
	}
	if value, ok := firstMetricValue(payload, "customer_distance_km", "customerDistanceKm", "customer_distance", "customerDistance", "delivery_distance", "deliveryDistance"); ok {
		metrics.CustomerDistanceK = normalizeDistanceKilometers(value)
		metrics.HasCustomerDist = metrics.CustomerDistanceK > 0
	}
	if !metrics.HasTotalDistance && metrics.HasShopDistance && metrics.HasCustomerDist {
		metrics.TotalDistanceKM = metrics.ShopDistanceM/1000 + metrics.CustomerDistanceK
		metrics.HasTotalDistance = metrics.TotalDistanceKM > 0
	}
	return metrics
}

func firstMetricValue(payload map[string]interface{}, keys ...string) (float64, bool) {
	for _, key := range keys {
		value, exists := payload[key]
		if !exists {
			continue
		}
		switch typed := value.(type) {
		case float64:
			return typed, true
		case float32:
			return float64(typed), true
		case int:
			return float64(typed), true
		case int64:
			return float64(typed), true
		case uint:
			return float64(typed), true
		case json.Number:
			number, err := typed.Float64()
			if err == nil {
				return number, true
			}
		case string:
			number, err := strconv.ParseFloat(strings.TrimSpace(typed), 64)
			if err == nil {
				return number, true
			}
		}
	}
	return 0, false
}

func normalizeDistanceKilometers(value float64) float64 {
	if value <= 0 {
		return 0
	}
	if value > 50 {
		value = value / 1000
	}
	return math.Round(value*10) / 10
}

func normalizeDistanceMeters(value float64) float64 {
	if value <= 0 {
		return 0
	}
	if value > 0 && value < 1 {
		value = value * 1000
	}
	return math.Round(value)
}

func kilometersOrZero(value float64, enabled bool) float64 {
	if !enabled {
		return 0
	}
	return value
}

func metersOrZero(value float64, enabled bool) float64 {
	if !enabled {
		return 0
	}
	return value
}
