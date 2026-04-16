package handler

import (
	"errors"
	"net/http"
	"reflect"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type ShopHandler struct {
	service *service.ShopService
}

func NewShopHandler(service *service.ShopService) *ShopHandler {
	return &ShopHandler{service: service}
}

func respondShopError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondShopInvalidRequest(c *gin.Context, message string) {
	respondShopError(c, http.StatusBadRequest, message)
}

func respondShopMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func respondShopSuccess(c *gin.Context, message string, data interface{}, legacy gin.H) {
	respondSuccessEnvelope(c, message, data, legacy)
}

func buildShopPaginatedPayload(listKey string, items interface{}, total int64, page, limit int) (gin.H, gin.H) {
	data := gin.H{
		"items":    items,
		listKey:    items,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"pageSize": limit,
	}
	legacy := gin.H{
		listKey:    items,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"pageSize": limit,
	}
	return data, legacy
}

func respondShopPaginated(
	c *gin.Context,
	message string,
	listKey string,
	items interface{},
	total int64,
	page, limit int,
	extraData gin.H,
	extraLegacy gin.H,
) {
	data, legacy := buildShopPaginatedPayload(listKey, items, total, page, limit)
	for key, value := range extraData {
		data[key] = value
	}
	for key, value := range extraLegacy {
		legacy[key] = value
	}
	respondEnvelope(c, http.StatusOK, responseCodeOK, message, data, legacy)
}

func countShopItems(items interface{}) int64 {
	if items == nil {
		return 0
	}
	value := reflect.ValueOf(items)
	if !value.IsValid() {
		return 0
	}
	if value.Kind() == reflect.Slice || value.Kind() == reflect.Array {
		return int64(value.Len())
	}
	return 0
}

func writeShopServiceError(c *gin.Context, err error, fallbackStatus int) {
	if err == nil {
		respondShopError(c, fallbackStatus, "request failed")
		return
	}

	normalizedError := strings.ToLower(strings.TrimSpace(err.Error()))

	if errors.Is(err, service.ErrUnauthorized) {
		respondShopError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondShopError(c, http.StatusForbidden, err.Error())
		return
	}
	if strings.Contains(normalizedError, "not found") || strings.Contains(err.Error(), "不存在") {
		respondShopError(c, http.StatusNotFound, err.Error())
		return
	}
	if strings.Contains(normalizedError, "invalid") ||
		strings.Contains(err.Error(), "不能为空") ||
		strings.Contains(err.Error(), "格式不正确") ||
		strings.Contains(err.Error(), "必须是") ||
		strings.Contains(err.Error(), "无效") {
		respondShopInvalidRequest(c, err.Error())
		return
	}

	respondShopError(c, fallbackStatus, err.Error())
}

// GetShopCategories 获取商家分类列表
func (h *ShopHandler) GetShopCategories(c *gin.Context) {
	categories, err := h.service.GetShopCategories(c.Request.Context())
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	total := countShopItems(categories)
	respondShopPaginated(
		c,
		"店铺分类加载成功",
		"categories",
		categories,
		total,
		1,
		int(total),
		nil,
		nil,
	)
}

// GetShops 获取商家列表
// @Summary 获取商家列表
// @Tags 商家
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /shops [get]
func (h *ShopHandler) GetShops(c *gin.Context) {
	category := c.Query("category")
	todayRecommended := parseQueryBool(c.Query("todayRecommended"))

	var (
		shops interface{}
		err   error
	)
	if todayRecommended {
		shops, err = h.service.GetTodayRecommendedShops(c.Request.Context())
	} else {
		shops, err = h.service.GetShops(c.Request.Context(), category)
	}

	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	total := countShopItems(shops)
	respondShopPaginated(c, "店铺列表加载成功", "shops", shops, total, 1, int(total), nil, nil)
}

// GetTodayRecommendedShops 获取今日推荐商户列表
func (h *ShopHandler) GetTodayRecommendedShops(c *gin.Context) {
	shops, err := h.service.GetTodayRecommendedShops(c.Request.Context())
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	total := countShopItems(shops)
	respondShopPaginated(c, "今日推荐商户列表加载成功", "shops", shops, total, 1, int(total), gin.H{
		"todayRecommended": true,
	}, gin.H{
		"todayRecommended": true,
	})
}

// GetShopDetail 获取商家详情
func (h *ShopHandler) GetShopDetail(c *gin.Context) {
	id := c.Param("id")
	shop, err := h.service.GetShopDetail(c.Request.Context(), id)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}
	if shop == nil {
		respondShopError(c, http.StatusNotFound, "商家不存在")
		return
	}

	respondShopMirroredSuccess(c, "店铺详情加载成功", shop)
}

// GetShopMenu 获取商家菜单
func (h *ShopHandler) GetShopMenu(c *gin.Context) {
	id := c.Param("id")
	menu, err := h.service.GetShopMenu(c.Request.Context(), id)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	total := countShopItems(menu)
	respondShopPaginated(c, "店铺菜单加载成功", "products", menu, total, 1, int(total), nil, nil)
}

// GetShopReviews 获取商家评价列表
func (h *ShopHandler) GetShopReviews(c *gin.Context) {
	shopID := c.Param("id")
	page := 1
	pageSize := 10

	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	reviews, err := h.service.GetShopReviews(c.Request.Context(), shopID, page, pageSize)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	reviewPayload, ok := reviews.(map[string]interface{})
	if !ok {
		total := countShopItems(reviews)
		respondShopPaginated(c, "店铺评论加载成功", "list", reviews, total, page, pageSize, gin.H{
			"reviews": reviews,
		}, gin.H{
			"reviews": reviews,
		})
		return
	}

	items := reviewPayload["list"]
	if items == nil {
		items = reviewPayload["items"]
	}
	total := extractInt64Field(reviewPayload["total"], countShopItems(items))
	pageValue := extractIntField(reviewPayload["page"], page)
	pageSizeValue := extractIntField(firstNonNil(reviewPayload["pageSize"], reviewPayload["limit"]), pageSize)
	goodCount := extractInt64Field(reviewPayload["goodCount"], 0)
	badCount := extractInt64Field(reviewPayload["badCount"], 0)
	avgRating := extractFloat64Field(reviewPayload["avgRating"], 0)

	respondShopPaginated(c, "店铺评论加载成功", "list", items, total, pageValue, pageSizeValue, gin.H{
		"reviews":   items,
		"goodCount": goodCount,
		"badCount":  badCount,
		"avgRating": avgRating,
		"summary":   gin.H{"goodCount": goodCount, "badCount": badCount, "avgRating": avgRating},
	}, gin.H{
		"reviews":   items,
		"goodCount": goodCount,
		"badCount":  badCount,
		"avgRating": avgRating,
	})
}

// GetMerchantShops 获取商户的店铺列表
func (h *ShopHandler) GetMerchantShops(c *gin.Context) {
	merchantID := c.Param("merchantId")
	shops, err := h.service.GetMerchantShops(c.Request.Context(), merchantID)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	total := countShopItems(shops)
	respondShopPaginated(c, "商户店铺列表加载成功", "shops", shops, total, 1, int(total), nil, nil)
}

// CreateShop 创建店铺
func (h *ShopHandler) CreateShop(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondShopInvalidRequest(c, "Invalid request")
		return
	}

	shop, err := h.service.CreateShop(c.Request.Context(), req)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopSuccess(c, "店铺创建成功", gin.H{"shop": shop}, gin.H{"shop": shop})
}

// UpdateShop 更新店铺
func (h *ShopHandler) UpdateShop(c *gin.Context) {
	shopID := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondShopInvalidRequest(c, "Invalid request")
		return
	}

	if err := h.service.UpdateShop(c.Request.Context(), shopID, req); err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopMirroredSuccess(c, "店铺更新成功", gin.H{"id": shopID, "updated": true})
}

// MoveTodayRecommendPosition 调整今日推荐商户排名
func (h *ShopHandler) MoveTodayRecommendPosition(c *gin.Context) {
	shopID := c.Param("id")

	var req struct {
		Direction string `json:"direction" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondShopInvalidRequest(c, "Invalid request")
		return
	}

	if err := h.service.MoveTodayRecommendPosition(c.Request.Context(), shopID, req.Direction); err != nil {
		writeShopServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondShopMirroredSuccess(c, "今日推荐排序调整成功", gin.H{"id": shopID, "updated": true})
}

// DeleteShop 删除店铺
func (h *ShopHandler) DeleteShop(c *gin.Context) {
	shopID := c.Param("id")
	if err := h.service.DeleteShop(c.Request.Context(), shopID); err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopMirroredSuccess(c, "店铺删除成功", gin.H{"id": shopID, "deleted": true})
}

// CreateReview 创建评价
func (h *ShopHandler) CreateReview(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondShopInvalidRequest(c, "Invalid request")
		return
	}

	review, err := h.service.CreateReview(c.Request.Context(), req)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopSuccess(c, "评价创建成功", gin.H{"review": review}, gin.H{"review": review})
}

// UpdateReview 更新评价
func (h *ShopHandler) UpdateReview(c *gin.Context) {
	reviewID := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondShopInvalidRequest(c, "Invalid request")
		return
	}

	if err := h.service.UpdateReview(c.Request.Context(), reviewID, req); err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopMirroredSuccess(c, "评价更新成功", gin.H{"id": reviewID, "updated": true})
}

// DeleteReview 删除评价
func (h *ShopHandler) DeleteReview(c *gin.Context) {
	reviewID := c.Param("id")
	if err := h.service.DeleteReview(c.Request.Context(), reviewID); err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopMirroredSuccess(c, "评价删除成功", gin.H{"id": reviewID, "deleted": true})
}

// GetUserFavorites 获取用户收藏店铺列表
func (h *ShopHandler) GetUserFavorites(c *gin.Context) {
	userID := c.Param("id")
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	result, err := h.service.GetUserFavorites(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	payload, ok := result.(map[string]interface{})
	if !ok {
		total := countShopItems(result)
		respondShopPaginated(c, "收藏店铺列表加载成功", "list", result, total, page, pageSize, gin.H{
			"favorites": result,
		}, gin.H{
			"favorites": result,
		})
		return
	}

	items := payload["list"]
	if items == nil {
		items = payload["items"]
	}
	total := extractInt64Field(payload["total"], countShopItems(items))
	pageValue := extractIntField(payload["page"], page)
	pageSizeValue := extractIntField(firstNonNil(payload["pageSize"], payload["limit"]), pageSize)
	respondShopPaginated(c, "收藏店铺列表加载成功", "list", items, total, pageValue, pageSizeValue, gin.H{
		"favorites": items,
	}, gin.H{
		"favorites": items,
	})
}

// AddUserFavorite 添加用户收藏
func (h *ShopHandler) AddUserFavorite(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		ShopID      string `json:"shopId"`
		ShopIDSnake string `json:"shop_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondShopInvalidRequest(c, "Invalid request")
		return
	}

	shopID := strings.TrimSpace(req.ShopID)
	if shopID == "" {
		shopID = strings.TrimSpace(req.ShopIDSnake)
	}
	if shopID == "" {
		respondShopInvalidRequest(c, "shop_id 不能为空")
		return
	}

	favorite, err := h.service.AddUserFavorite(c.Request.Context(), userID, shopID)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopSuccess(c, "收藏成功", gin.H{"favorite": favorite}, gin.H{"favorite": favorite})
}

// DeleteUserFavorite 取消用户收藏
func (h *ShopHandler) DeleteUserFavorite(c *gin.Context) {
	userID := c.Param("id")
	shopID := c.Param("shopId")

	if err := h.service.DeleteUserFavorite(c.Request.Context(), userID, shopID); err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopMirroredSuccess(c, "已取消收藏", gin.H{"shopId": shopID, "deleted": true})
}

// GetUserFavoriteStatus 获取用户收藏状态
func (h *ShopHandler) GetUserFavoriteStatus(c *gin.Context) {
	userID := c.Param("id")
	shopID := c.Param("shopId")

	status, err := h.service.GetUserFavoriteStatus(c.Request.Context(), userID, shopID)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondShopMirroredSuccess(c, "收藏状态加载成功", status)
}

// GetUserReviews 获取用户评价列表
func (h *ShopHandler) GetUserReviews(c *gin.Context) {
	userID := c.Param("id")
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	reviews, err := h.service.GetUserReviews(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		writeShopServiceError(c, err, http.StatusInternalServerError)
		return
	}

	payload, ok := reviews.(map[string]interface{})
	if !ok {
		total := countShopItems(reviews)
		respondShopPaginated(c, "用户评价列表加载成功", "list", reviews, total, page, pageSize, gin.H{
			"reviews": reviews,
		}, gin.H{
			"reviews": reviews,
		})
		return
	}

	items := payload["list"]
	if items == nil {
		items = payload["items"]
	}
	total := extractInt64Field(payload["total"], countShopItems(items))
	pageValue := extractIntField(payload["page"], page)
	pageSizeValue := extractIntField(firstNonNil(payload["pageSize"], payload["limit"]), pageSize)
	avgRating := extractFloat64Field(payload["avgRating"], 0)

	respondShopPaginated(c, "用户评价列表加载成功", "list", items, total, pageValue, pageSizeValue, gin.H{
		"reviews":   items,
		"avgRating": avgRating,
	}, gin.H{
		"reviews":   items,
		"avgRating": avgRating,
	})
}

func parseQueryBool(raw string) bool {
	value := strings.ToLower(strings.TrimSpace(raw))
	return value == "1" || value == "true" || value == "yes" || value == "y"
}

func extractInt64Field(value interface{}, fallback int64) int64 {
	switch typed := value.(type) {
	case int64:
		return typed
	case int:
		return int64(typed)
	case int32:
		return int64(typed)
	case uint:
		return int64(typed)
	case uint32:
		return int64(typed)
	case uint64:
		return int64(typed)
	case float64:
		return int64(typed)
	case float32:
		return int64(typed)
	case string:
		parsed, err := strconv.ParseInt(strings.TrimSpace(typed), 10, 64)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func extractIntField(value interface{}, fallback int) int {
	return int(extractInt64Field(value, int64(fallback)))
}

func extractFloat64Field(value interface{}, fallback float64) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	case int32:
		return float64(typed)
	case int64:
		return float64(typed)
	case uint:
		return float64(typed)
	case uint32:
		return float64(typed)
	case uint64:
		return float64(typed)
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(typed), 64)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func firstNonNil(values ...interface{}) interface{} {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}
