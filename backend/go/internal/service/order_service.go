package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type OrderService struct {
	repo     repository.OrderRepository
	db       *gorm.DB
	groupbuy *GroupbuyService
}

type OrderExceptionReportPayload struct {
	Reason string `json:"reason"`
	Note   string `json:"note"`
}

type orderExceptionReportRecord struct {
	Reason        string    `json:"reason"`
	Note          string    `json:"note,omitempty"`
	ReporterRole  string    `json:"reporter_role"`
	ReporterID    string    `json:"reporter_id"`
	ReporterPhone string    `json:"reporter_phone,omitempty"`
	OrderStatus   string    `json:"order_status"`
	ReportedAt    time.Time `json:"reported_at"`
}

func NewOrderService(repo repository.OrderRepository, db *gorm.DB, groupbuy *GroupbuyService) *OrderService {
	return &OrderService{
		repo:     repo,
		db:       db,
		groupbuy: groupbuy,
	}
}

func normalizeMerchantType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "", "takeout", "外卖", "外卖类":
		return "takeout"
	case "groupbuy", "团购", "团购类":
		return "groupbuy"
	case "hybrid", "mixed", "mix", "混合", "混合类":
		return "hybrid"
	default:
		return value
	}
}

func normalizeOrderBizType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "", "takeout", "外卖", "外卖类":
		return "takeout"
	case "groupbuy", "团购", "团购类":
		return "groupbuy"
	default:
		return value
	}
}

func normalizeOrderServiceType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "", "takeout", "groupbuy":
		return value
	case "errand_buy", "buy", "purchase", "帮我买":
		return "errand_buy"
	case "errand_deliver", "deliver", "delivery", "帮我送":
		return "errand_deliver"
	case "errand_pickup", "pickup", "pick_up", "帮我取":
		return "errand_pickup"
	case "errand_do", "do", "task", "帮我办":
		return "errand_do"
	default:
		return value
	}
}

func isErrandServiceType(raw string) bool {
	return strings.HasPrefix(normalizeOrderServiceType(raw), "errand_")
}

func errandServiceTypeLabel(raw string) string {
	switch normalizeOrderServiceType(raw) {
	case "errand_buy":
		return "帮我买"
	case "errand_deliver":
		return "帮我送"
	case "errand_pickup":
		return "帮我取"
	case "errand_do":
		return "帮我办"
	default:
		return "跑腿"
	}
}

func merchantSupportsBizType(merchantType, bizType string) bool {
	merchantType = normalizeMerchantType(merchantType)
	bizType = normalizeOrderBizType(bizType)
	switch merchantType {
	case "takeout":
		return bizType == "takeout"
	case "groupbuy":
		return bizType == "groupbuy"
	case "hybrid":
		return bizType == "takeout" || bizType == "groupbuy"
	default:
		return bizType == "takeout"
	}
}

func defaultBizTypeByMerchantType(merchantType string) string {
	if normalizeMerchantType(merchantType) == "groupbuy" {
		return "groupbuy"
	}
	return "takeout"
}

func orderPublicID(order *repository.Order) interface{} {
	if order == nil {
		return ""
	}
	if uid := strings.TrimSpace(order.UID); uid != "" {
		return uid
	}
	return order.ID
}

func orderPublicTSID(order *repository.Order) string {
	if order == nil {
		return ""
	}
	return strings.TrimSpace(order.TSID)
}

func (s *OrderService) resolveOrderByAnyID(ctx context.Context, rawID string) (*repository.Order, error) {
	idText := strings.TrimSpace(rawID)
	if idText == "" {
		return nil, fmt.Errorf("invalid order id")
	}

	if s != nil && s.db != nil {
		var order repository.Order
		if idkit.UIDPattern.MatchString(idText) {
			if err := s.db.WithContext(ctx).Where("uid = ?", idText).First(&order).Error; err != nil {
				return nil, err
			}
			return &order, nil
		}
		if idkit.TSIDPattern.MatchString(idText) {
			if err := s.db.WithContext(ctx).Where("tsid = ?", idText).First(&order).Error; err != nil {
				return nil, err
			}
			return &order, nil
		}
	}

	orderID, err := strconv.ParseUint(idText, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid order id")
	}
	return s.repo.GetByID(ctx, uint(orderID))
}

func isGroupbuyOrderStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "pending_payment", "paid_unused", "redeemed", "refunding", "refunded", "expired":
		return true
	default:
		return false
	}
}

func (s *OrderService) resolveShopForCreate(ctx context.Context, shopID string) (*repository.Shop, error) {
	if s == nil || s.db == nil {
		return nil, nil
	}
	shopID = strings.TrimSpace(shopID)
	if shopID == "" {
		return nil, nil
	}
	var shop repository.Shop
	if err := s.db.WithContext(ctx).Where("id = ?", shopID).First(&shop).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &shop, nil
}

func buildOrderDisplayTags(order *repository.Order) []string {
	if order == nil {
		return []string{}
	}
	if isErrandServiceType(order.ServiceType) {
		tags := []string{"跑腿", errandServiceTypeLabel(order.ServiceType)}
		switch strings.ToLower(strings.TrimSpace(order.Status)) {
		case "pending":
			tags = append(tags, "待接单")
		case "accepted":
			tags = append(tags, "进行中")
		case "delivering":
			tags = append(tags, "配送中")
		case "completed":
			tags = append(tags, "已完成")
		case "cancelled":
			tags = append(tags, "已取消")
		}
		return tags
	}
	tags := make([]string, 0, 3)
	bizType := normalizeOrderBizType(order.BizType)
	if bizType == "groupbuy" {
		tags = append(tags, "团购")
		switch strings.ToLower(strings.TrimSpace(order.Status)) {
		case "pending_payment":
			tags = append(tags, "待支付")
		case "paid_unused":
			tags = append(tags, "待核销")
		case "redeemed":
			tags = append(tags, "已核销")
		case "refunding":
			tags = append(tags, "退款中")
		case "refunded":
			tags = append(tags, "已退款")
		case "expired":
			tags = append(tags, "已过期")
		}
		return tags
	}
	tags = append(tags, "外卖")
	switch strings.ToLower(strings.TrimSpace(order.Status)) {
	case "pending":
		tags = append(tags, "待接单")
	case "accepted":
		tags = append(tags, "进行中")
	case "delivering":
		tags = append(tags, "配送中")
	case "completed":
		tags = append(tags, "已完成")
	case "cancelled":
		tags = append(tags, "已取消")
	}
	return tags
}

func buildOrderCardFields(order *repository.Order) map[string]interface{} {
	if order == nil {
		return map[string]interface{}{}
	}
	bizType := normalizeOrderBizType(order.BizType)
	status := strings.ToLower(strings.TrimSpace(order.Status))
	canAccept := false
	canRedeem := false
	canRefund := false

	if bizType == "groupbuy" {
		canRedeem = status == "paid_unused"
		canRefund = status == "paid_unused" || status == "refunding" || status == "refunded"
	} else {
		canAccept = status == "pending"
		canRefund = status == "pending" || status == "delivering" || status == "completed"
	}

	return map[string]interface{}{
		"bizType":     bizType,
		"biz_type":    bizType,
		"canAccept":   canAccept,
		"canRedeem":   canRedeem,
		"canRefund":   canRefund,
		"displayTags": buildOrderDisplayTags(order),
	}
}

func (s *OrderService) CreateOrder(ctx context.Context, data interface{}) (interface{}, error) {
	req, ok := data.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid request")
	}

	toString := func(v interface{}) string {
		switch t := v.(type) {
		case string:
			return t
		case float64:
			return strconv.FormatInt(int64(t), 10)
		case int:
			return strconv.Itoa(t)
		default:
			return ""
		}
	}

	toFloat := func(v interface{}) float64 {
		switch t := v.(type) {
		case float64:
			return t
		case int:
			return float64(t)
		case string:
			f, _ := strconv.ParseFloat(t, 64)
			return f
		default:
			return 0
		}
	}

	toJSONString := func(v interface{}) string {
		switch t := v.(type) {
		case nil:
			return ""
		case string:
			return strings.TrimSpace(t)
		default:
			encoded, err := json.Marshal(t)
			if err != nil {
				return ""
			}
			return string(encoded)
		}
	}

	shopID := toString(req["shopId"])
	if shopID == "" {
		shopID = toString(req["shop_id"])
	}
	shopName := toString(req["shopName"])
	if shopName == "" {
		shopName = toString(req["shop_name"])
	}
	items := toString(req["items"])
	price := toFloat(req["price"])
	if price <= 0 {
		price = toFloat(req["totalPrice"])
	}
	if price <= 0 {
		price = toFloat(req["total_price"])
	}
	remark := toString(req["remark"])
	tableware := toString(req["tableware"])
	address := toString(req["address"])
	addressID := toString(req["addressId"])
	if addressID == "" {
		addressID = toString(req["address_id"])
	}
	serviceType := normalizeOrderServiceType(toString(req["serviceType"]))
	if serviceType == "" {
		serviceType = normalizeOrderServiceType(toString(req["service_type"]))
	}
	serviceDescription := toString(req["serviceDescription"])
	if serviceDescription == "" {
		serviceDescription = toString(req["service_description"])
	}
	preferredTime := toString(req["preferredTime"])
	if preferredTime == "" {
		preferredTime = toString(req["preferred_time"])
	}
	productPrice := toFloat(req["productPrice"])
	if productPrice <= 0 {
		productPrice = toFloat(req["product_price"])
	}
	if productPrice <= 0 {
		productPrice = toFloat(req["estimatedAmount"])
	}
	if productPrice <= 0 {
		productPrice = toFloat(req["estimated_amount"])
	}
	deliveryFee := toFloat(req["deliveryFee"])
	if deliveryFee <= 0 {
		deliveryFee = toFloat(req["delivery_fee"])
	}
	errandRequest := toJSONString(req["errandRequest"])
	if errandRequest == "" {
		errandRequest = toJSONString(req["errand_request"])
	}
	errandLocation := toJSONString(req["errandLocation"])
	if errandLocation == "" {
		errandLocation = toJSONString(req["errand_location"])
	}
	errandRequirements := toJSONString(req["errandRequirements"])
	if errandRequirements == "" {
		errandRequirements = toJSONString(req["errand_requirements"])
	}
	userID := toString(req["userId"])
	if userID == "" {
		userID = toString(req["user_id"])
	}
	if userID == "" {
		if phone := toString(req["phone"]); phone != "" {
			userID = phone
		}
	}
	if userID == "" {
		return nil, fmt.Errorf("userId is required")
	}
	customerPhone := toString(req["phone"])
	customerName := toString(req["name"])
	providedCustomerPhone := customerPhone
	providedCustomerName := customerName
	user, selectedAddress, err := s.resolveUserAddressForOrder(ctx, userID, addressID)
	if err != nil {
		return nil, err
	}
	if user != nil {
		if customerPhone == "" {
			customerPhone = strings.TrimSpace(user.Phone)
		}
		if customerName == "" {
			customerName = strings.TrimSpace(user.Name)
		}
	}
	if selectedAddress != nil {
		address = selectedAddress.FullAddress()
		if strings.TrimSpace(providedCustomerPhone) == "" {
			customerPhone = strings.TrimSpace(selectedAddress.Phone)
		}
		if strings.TrimSpace(providedCustomerName) == "" {
			customerName = strings.TrimSpace(selectedAddress.Name)
		}
	}
	if strings.TrimSpace(address) == "" {
		return nil, fmt.Errorf("address is required")
	}
	paymentStatus := strings.ToLower(strings.TrimSpace(toString(req["paymentStatus"])))
	if paymentStatus == "" {
		paymentStatus = strings.ToLower(strings.TrimSpace(toString(req["payment_status"])))
	}
	bizType := normalizeOrderBizType(toString(req["bizType"]))
	if bizType == "" {
		bizType = normalizeOrderBizType(toString(req["biz_type"]))
	}
	quantity := 1
	if rawQty := toString(req["quantity"]); rawQty != "" {
		if parsedQty, err := strconv.Atoi(rawQty); err == nil && parsedQty > 0 {
			quantity = parsedQty
		}
	}

	if err := normalizeRequestExtraMedicalDocument(ctx, req); err != nil {
		return nil, err
	}

	rawPayload, _ := json.Marshal(req)

	shop, err := s.resolveShopForCreate(ctx, shopID)
	if err != nil {
		return nil, err
	}
	merchantType := "takeout"
	if shop != nil {
		if strings.TrimSpace(shopName) == "" {
			shopName = strings.TrimSpace(shop.Name)
		}
		merchantType = normalizeMerchantType(shop.MerchantType)
		if merchantType == "takeout" && strings.TrimSpace(shop.OrderType) != "" {
			// 兼容历史数据里的 orderType
			merchantType = normalizeMerchantType(shop.OrderType)
			if merchantType == "" {
				merchantType = "takeout"
			}
		}
	}
	if bizType == "" {
		bizType = defaultBizTypeByMerchantType(merchantType)
	}
	if !merchantSupportsBizType(merchantType, bizType) {
		return nil, fmt.Errorf("shop does not support bizType: %s", bizType)
	}
	if isErrandServiceType(serviceType) {
		if strings.TrimSpace(shopName) == "" {
			shopName = "跑腿服务"
		}
		if strings.TrimSpace(serviceDescription) == "" {
			serviceDescription = errandServiceTypeLabel(serviceType)
		}
	}

	if bizType == "groupbuy" && paymentStatus == "" {
		paymentStatus = "paid"
	}
	if paymentStatus == "" {
		paymentStatus = "unpaid"
	}
	if price <= 0 {
		price = productPrice + deliveryFee
	}
	if productPrice <= 0 && !isErrandServiceType(serviceType) {
		productPrice = price
	}

	now := time.Now()
	dailyNumber := now.UnixNano() % 10000000000
	dailyID := buildDailyOrderID(now, dailyNumber)

	status := "pending"
	if bizType == "groupbuy" {
		if paymentStatus == "paid" {
			status = "paid_unused"
		} else {
			status = "pending_payment"
		}
	}

	order := &repository.Order{
		DailyOrderID:     dailyID,
		DailyOrderNumber: dailyNumber,
		UserID:           userID,
		CustomerName:     customerName,
		CustomerPhone:    customerPhone,
		MerchantID: func() string {
			if shop != nil && shop.MerchantID > 0 {
				return strconv.FormatUint(uint64(shop.MerchantID), 10)
			}
			return ""
		}(),
		ShopID:             shopID,
		ShopName:           shopName,
		BizType:            bizType,
		Status:             status,
		ServiceType:        serviceType,
		ServiceDescription: serviceDescription,
		PreferredTime:      preferredTime,
		FoodRequest:        items,
		FoodShop:           shopName,
		ErrandRequest:      errandRequest,
		ErrandLocation:     errandLocation,
		ErrandRequirements: errandRequirements,
		DeliveryName:       customerName,
		DeliveryPhone:      customerPhone,
		TotalPrice:         price,
		ProductPrice:       productPrice,
		DeliveryFee:        deliveryFee,
		Items:              items,
		Address:            address,
		RawPayload:         string(rawPayload),
		PaymentStatus:      paymentStatus,
		PaidAt: func() *time.Time {
			if paymentStatus == "paid" {
				return &now
			}
			return nil
		}(),
		PaymentTime: func() *time.Time {
			if paymentStatus == "paid" {
				return &now
			}
			return nil
		}(),
	}
	if s.db != nil {
		if _, dailySeq, refErr := nextUnifiedRefSequence(ctx, s.db, bucketDailyOrderNo); refErr != nil {
			return nil, fmt.Errorf("allocate order daily reference failed: %w", refErr)
		} else {
			dailyNumber = dailySeq
			dailyID = buildDailyOrderID(now, dailySeq)
			order.DailyOrderID = dailyID
			order.DailyOrderNumber = dailySeq
		}
		uid, tsid, idErr := idkit.NextIdentityForTable(ctx, s.db, "orders", now)
		if idErr != nil {
			return nil, fmt.Errorf("allocate order identity failed: %w", idErr)
		}
		order.UID = uid
		order.TSID = tsid
	}

	// Map remark/tableware into errand_request for extra info (admin detail uses it).
	if order.ErrandRequest == "" && (remark != "" || tableware != "") {
		extra := map[string]string{}
		if remark != "" {
			extra["remark"] = remark
		}
		if tableware != "" {
			extra["tableware"] = tableware
		}
		if extraJSON, err := json.Marshal(extra); err == nil {
			order.ErrandRequest = string(extraJSON)
		}
	}

	if err := s.repo.Create(ctx, order); err != nil {
		return nil, fmt.Errorf("create order failed: %w", err)
	}

	if bizType == "groupbuy" && paymentStatus == "paid" && s.groupbuy != nil {
		var voucherExpireAt *time.Time
		if rawExpire := strings.TrimSpace(toString(req["voucherExpireAt"])); rawExpire != "" {
			if parsed, parseErr := time.Parse(time.RFC3339, rawExpire); parseErr == nil {
				voucherExpireAt = &parsed
			}
		}
		if rawExpire := strings.TrimSpace(toString(req["voucher_expire_at"])); voucherExpireAt == nil && rawExpire != "" {
			if parsed, parseErr := time.Parse(time.RFC3339, rawExpire); parseErr == nil {
				voucherExpireAt = &parsed
			}
		}
		if _, issueErr := s.groupbuy.IssueVouchersForOrder(ctx, order, quantity, voucherExpireAt); issueErr != nil {
			return nil, fmt.Errorf("issue groupbuy vouchers failed: %w", issueErr)
		}
	}

	result := map[string]interface{}{
		"id":                  orderPublicID(order),
		"tsid":                orderPublicTSID(order),
		"daily_order_id":      order.DailyOrderID,
		"status":              order.Status,
		"statusText":          orderStatusText(order.Status),
		"time":                order.CreatedAt.Format(time.RFC3339),
		"price":               order.TotalPrice,
		"total_price":         order.TotalPrice,
		"items":               order.Items,
		"shopId":              order.ShopID,
		"shopName":            order.ShopName,
		"service_type":        normalizeOrderServiceType(order.ServiceType),
		"serviceType":         normalizeOrderServiceType(order.ServiceType),
		"serviceDescription":  order.ServiceDescription,
		"delivery_fee":        order.DeliveryFee,
		"deliveryFee":         order.DeliveryFee,
		"product_price":       order.ProductPrice,
		"productPrice":        order.ProductPrice,
		"address":             order.Address,
		"errand_request":      order.ErrandRequest,
		"errandRequest":       order.ErrandRequest,
		"errand_location":     order.ErrandLocation,
		"errandLocation":      order.ErrandLocation,
		"errand_requirements": order.ErrandRequirements,
		"errandRequirements":  order.ErrandRequirements,
		"is_reviewed":         order.IsReviewed,
		"isReviewed":          order.IsReviewed,
		"reviewed_at":         order.ReviewedAt,
		"reviewedAt":          order.ReviewedAt,
		"created_at":          order.CreatedAt,
		"createdAt":           order.CreatedAt,
	}
	for key, value := range buildOrderCardFields(order) {
		result[key] = value
	}
	return result, nil
}

func (s *OrderService) GetOrderDetail(ctx context.Context, id string) (interface{}, error) {
	order, err := s.resolveOrderByAnyID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.authorizeOrderRead(ctx, order); err != nil {
		return nil, err
	}

	riderRating := 0.0
	riderRatingCount := 0
	if order.RiderID != "" || order.RiderPhone != "" {
		rating, count, err := s.repo.GetRiderRating(ctx, order.RiderID, order.RiderPhone)
		if err == nil {
			riderRating = rating
			riderRatingCount = count
		}
	}

	result := map[string]interface{}{
		"id":                             orderPublicID(order),
		"tsid":                           orderPublicTSID(order),
		"daily_order_id":                 order.DailyOrderID,
		"daily_order_number":             order.DailyOrderNumber,
		"user_id":                        order.UserID,
		"customer_name":                  order.CustomerName,
		"customer_phone":                 order.CustomerPhone,
		"rider_id":                       order.RiderID,
		"rider_name":                     order.RiderName,
		"rider_phone":                    order.RiderPhone,
		"rider_rating":                   riderRating,
		"rider_rating_count":             riderRatingCount,
		"shop_id":                        order.ShopID,
		"shop_name":                      order.ShopName,
		"status":                         order.Status,
		"statusText":                     orderStatusText(order.Status),
		"service_type":                   order.ServiceType,
		"serviceType":                    normalizeOrderServiceType(order.ServiceType),
		"serviceDescription":             order.ServiceDescription,
		"service_description":            order.ServiceDescription,
		"package_name":                   order.PackageName,
		"package_price":                  order.PackagePrice,
		"phone_model":                    order.PhoneModel,
		"special_notes":                  order.SpecialNotes,
		"preferred_time":                 order.PreferredTime,
		"food_request":                   order.FoodRequest,
		"food_shop":                      order.FoodShop,
		"food_allergies":                 order.FoodAllergies,
		"taste_notes":                    order.TasteNotes,
		"drink_request":                  order.DrinkRequest,
		"drink_pickup_code":              order.DrinkPickupCode,
		"drink_sugar":                    order.DrinkSugar,
		"drink_pickup_qr_image":          order.DrinkPickupQRImage,
		"delivery_request":               order.DeliveryRequest,
		"delivery_name":                  order.DeliveryName,
		"delivery_phone":                 order.DeliveryPhone,
		"delivery_codes":                 order.DeliveryCodes,
		"delivery_photo":                 order.DeliveryPhoto,
		"delivery_message":               order.DeliveryMessage,
		"delivery_photo_time":            order.DeliveryPhotoTime,
		"errand_request":                 order.ErrandRequest,
		"errandRequest":                  order.ErrandRequest,
		"errand_location":                order.ErrandLocation,
		"errandLocation":                 order.ErrandLocation,
		"errand_requirements":            order.ErrandRequirements,
		"errandRequirements":             order.ErrandRequirements,
		"dorm_number":                    order.DormNumber,
		"address":                        order.Address,
		"total_price":                    order.TotalPrice,
		"rider_quoted_price":             order.RiderQuotedPrice,
		"delivery_fee":                   order.DeliveryFee,
		"deliveryFee":                    order.DeliveryFee,
		"product_price":                  order.ProductPrice,
		"productPrice":                   order.ProductPrice,
		"items":                          order.Items,
		"payment_method":                 order.PaymentMethod,
		"payment_status":                 order.PaymentStatus,
		"payment_time":                   order.PaymentTime,
		"accepted_at":                    order.AcceptedAt,
		"paid_at":                        order.PaidAt,
		"completed_at":                   order.CompletedAt,
		"latest_exception_reason":        order.LatestExceptionReason,
		"latest_exception_reporter_id":   order.LatestExceptionReporterID,
		"latest_exception_reporter_role": order.LatestExceptionReporterRole,
		"latest_exception_reported_at":   order.LatestExceptionReportedAt,
		"exception_reports":              decodeOrderExceptionReports(order.ExceptionReports),
		"is_reviewed":                    order.IsReviewed,
		"reviewed_at":                    order.ReviewedAt,
		"created_at":                     order.CreatedAt,
		"updated_at":                     order.UpdatedAt,
		// camelCase for app
		"shopId":           order.ShopID,
		"shopName":         order.ShopName,
		"totalPrice":       order.TotalPrice,
		"createdAt":        order.CreatedAt.Format(time.RFC3339),
		"price":            order.TotalPrice,
		"time":             order.CreatedAt.Format(time.RFC3339),
		"riderId":          order.RiderID,
		"riderName":        order.RiderName,
		"riderPhone":       order.RiderPhone,
		"riderRating":      riderRating,
		"riderRatingCount": riderRatingCount,
		"paymentMethod":    order.PaymentMethod,
		"paymentStatus":    order.PaymentStatus,
		"paymentTime": func() string {
			if order.PaymentTime == nil {
				return ""
			}
			return order.PaymentTime.Format(time.RFC3339)
		}(),
		"latestExceptionReason":       order.LatestExceptionReason,
		"latestExceptionReporterId":   order.LatestExceptionReporterID,
		"latestExceptionReporterRole": order.LatestExceptionReporterRole,
		"latestExceptionReportedAt":   order.LatestExceptionReportedAt,
		"exceptionReports":            decodeOrderExceptionReports(order.ExceptionReports),
		"isReviewed":                  order.IsReviewed,
		"reviewedAt":                  order.ReviewedAt,
		"biz_type":                    normalizeOrderBizType(order.BizType),
		"bizType":                     normalizeOrderBizType(order.BizType),
	}
	for key, value := range buildOrderCardFields(order) {
		result[key] = value
	}
	return result, nil
}

func decodeOrderExceptionReports(raw string) []orderExceptionReportRecord {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []orderExceptionReportRecord{}
	}

	var reports []orderExceptionReportRecord
	if err := json.Unmarshal([]byte(raw), &reports); err != nil {
		return []orderExceptionReportRecord{}
	}
	if reports == nil {
		return []orderExceptionReportRecord{}
	}
	return reports
}

func isOrderExceptionReportableStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "pending", "accepted", "delivering":
		return true
	default:
		return false
	}
}

func resolveOrderExceptionReporter(ctx context.Context) (string, string, string, error) {
	switch authContextRole(ctx) {
	case "admin":
		reporterID := authContextString(ctx, "admin_id")
		if reporterID == "" {
			return "", "", "", fmt.Errorf("%w: admin identity is missing", ErrUnauthorized)
		}
		return "admin", reporterID, "", nil
	case "rider":
		reporterID := authContextString(ctx, "rider_id")
		reporterPhone := authContextString(ctx, "rider_phone")
		if reporterID == "" && reporterPhone == "" {
			return "", "", "", fmt.Errorf("%w: rider identity is missing", ErrUnauthorized)
		}
		return "rider", reporterID, reporterPhone, nil
	default:
		return "", "", "", fmt.Errorf("%w: invalid operator role", ErrUnauthorized)
	}
}

func (s *OrderService) authorizeOrderRead(ctx context.Context, order *repository.Order) error {
	if order == nil {
		return fmt.Errorf("order not found")
	}

	switch authContextRole(ctx) {
	case "admin":
		return nil
	case "merchant":
		merchantID := authContextString(ctx, "merchant_id")
		if merchantID == "" {
			return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		if strings.TrimSpace(order.MerchantID) == merchantID {
			return nil
		}
		owned, err := s.repo.IsOrderOwnedByMerchant(ctx, order.ID, merchantID)
		if err != nil {
			return err
		}
		if owned {
			return nil
		}
		return fmt.Errorf("%w: merchant cannot access this order", ErrForbidden)
	case "rider":
		riderID := authContextString(ctx, "rider_id")
		riderPhone := authContextString(ctx, "rider_phone")
		if riderID == "" && riderPhone == "" {
			return fmt.Errorf("%w: rider identity is missing", ErrUnauthorized)
		}
		if matchesAnyIdentity(order.RiderID, riderID, riderPhone) || matchesAnyIdentity(order.RiderPhone, riderID, riderPhone) {
			return nil
		}
		return fmt.Errorf("%w: rider cannot access this order", ErrForbidden)
	case "user":
		userID := authContextString(ctx, "user_id")
		userPhone := authContextString(ctx, "user_phone")
		if userID == "" && userPhone == "" {
			return fmt.Errorf("%w: user identity is missing", ErrUnauthorized)
		}
		if matchesAnyIdentity(order.UserID, userID, userPhone) || matchesAnyIdentity(order.CustomerPhone, userID, userPhone) {
			return nil
		}
		return fmt.Errorf("%w: user cannot access this order", ErrForbidden)
	default:
		return fmt.Errorf("%w: invalid operator role", ErrUnauthorized)
	}
}

func matchesAnyIdentity(target string, candidates ...string) bool {
	target = strings.TrimSpace(target)
	if target == "" {
		return false
	}
	for _, candidate := range candidates {
		if target == strings.TrimSpace(candidate) && strings.TrimSpace(candidate) != "" {
			return true
		}
	}
	return false
}

func (s *OrderService) GetUserOrders(ctx context.Context, userId string) (interface{}, error) {
	orders, err := s.repo.ListByUserID(ctx, userId)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(orders))
	for _, order := range orders {
		orderRef := order
		row := map[string]interface{}{
			"id":                  orderPublicID(&orderRef),
			"tsid":                orderPublicTSID(&orderRef),
			"shopId":              order.ShopID,
			"shopName":            order.ShopName,
			"status":              order.Status,
			"statusText":          orderStatusText(order.Status),
			"time":                order.CreatedAt.Format(time.RFC3339),
			"price":               order.TotalPrice,
			"total_price":         order.TotalPrice,
			"items":               order.Items,
			"address":             order.Address,
			"service_type":        normalizeOrderServiceType(order.ServiceType),
			"serviceType":         normalizeOrderServiceType(order.ServiceType),
			"service_description": order.ServiceDescription,
			"serviceDescription":  order.ServiceDescription,
			"errand_request":      order.ErrandRequest,
			"errandRequest":       order.ErrandRequest,
			"errand_location":     order.ErrandLocation,
			"errandLocation":      order.ErrandLocation,
			"errand_requirements": order.ErrandRequirements,
			"errandRequirements":  order.ErrandRequirements,
			"delivery_fee":        order.DeliveryFee,
			"deliveryFee":         order.DeliveryFee,
			"product_price":       order.ProductPrice,
			"productPrice":        order.ProductPrice,
			"preferred_time":      order.PreferredTime,
			"preferredTime":       order.PreferredTime,
			"is_reviewed":         order.IsReviewed,
			"isReviewed":          order.IsReviewed,
			"reviewed_at":         order.ReviewedAt,
			"reviewedAt":          order.ReviewedAt,
			"created_at":          order.CreatedAt,
			"createdAt":           order.CreatedAt.Format(time.RFC3339),
			"payment_method":      order.PaymentMethod,
			"payment_status":      order.PaymentStatus,
			"paymentMethod":       order.PaymentMethod,
			"paymentStatus":       order.PaymentStatus,
			"biz_type":            normalizeOrderBizType(order.BizType),
			"bizType":             normalizeOrderBizType(order.BizType),
		}
		for key, value := range buildOrderCardFields(&order) {
			row[key] = value
		}
		result = append(result, row)
	}

	return result, nil
}

func (s *OrderService) ReportOrderException(ctx context.Context, id string, payload OrderExceptionReportPayload) (interface{}, error) {
	current, err := s.resolveOrderByAnyID(ctx, id)
	if err != nil {
		return nil, err
	}

	role := authContextRole(ctx)
	switch role {
	case "admin":
		// 管理员允许直接记录异常上报，便于复核与代操作。
	case "rider":
		if err := s.authorizeOrderRead(ctx, current); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("%w: invalid operator role", ErrUnauthorized)
	}

	if !isOrderExceptionReportableStatus(current.Status) {
		return nil, fmt.Errorf("%w: current order status cannot report exception", ErrForbidden)
	}

	reason := strings.TrimSpace(payload.Reason)
	if reason == "" {
		return nil, fmt.Errorf("reason is required")
	}
	if utf8.RuneCountInString(reason) > 100 {
		return nil, fmt.Errorf("reason is too long")
	}

	note := strings.TrimSpace(payload.Note)
	if utf8.RuneCountInString(note) > 500 {
		return nil, fmt.Errorf("note is too long")
	}

	reporterRole, reporterID, reporterPhone, err := resolveOrderExceptionReporter(ctx)
	if err != nil {
		return nil, err
	}

	reports := decodeOrderExceptionReports(current.ExceptionReports)
	now := time.Now()
	report := orderExceptionReportRecord{
		Reason:        reason,
		Note:          note,
		ReporterRole:  reporterRole,
		ReporterID:    reporterID,
		ReporterPhone: reporterPhone,
		OrderStatus:   strings.TrimSpace(current.Status),
		ReportedAt:    now,
	}
	reports = append(reports, report)
	if len(reports) > 50 {
		reports = reports[len(reports)-50:]
	}

	reportsJSON, err := json.Marshal(reports)
	if err != nil {
		return nil, fmt.Errorf("marshal exception reports failed: %w", err)
	}

	updates := map[string]interface{}{
		"latest_exception_reason":        reason,
		"latest_exception_reporter_id":   reporterID,
		"latest_exception_reporter_role": reporterRole,
		"latest_exception_reported_at":   now,
		"exception_reports":              string(reportsJSON),
	}

	if err := s.db.WithContext(ctx).
		Model(&repository.Order{}).
		Where("id = ?", current.ID).
		Updates(updates).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":                        true,
		"id":                             orderPublicID(current),
		"tsid":                           orderPublicTSID(current),
		"latest_exception_reason":        reason,
		"latest_exception_reporter_id":   reporterID,
		"latest_exception_reporter_role": reporterRole,
		"latest_exception_reported_at":   now,
		"exception_reports":              reports,
		"report_count":                   len(reports),
		"latestExceptionReason":          reason,
		"latestExceptionReporterId":      reporterID,
		"latestExceptionReporterRole":    reporterRole,
		"latestExceptionReportedAt":      now,
		"exceptionReports":               reports,
		"reportCount":                    len(reports),
	}, nil
}

func (s *OrderService) MarkOrderReviewed(ctx context.Context, id string) (interface{}, error) {
	current, err := s.resolveOrderByAnyID(ctx, id)
	if err != nil {
		return nil, err
	}
	if authContextRole(ctx) == "user" {
		userID := authContextString(ctx, "user_id")
		userPhone := authContextString(ctx, "user_phone")
		if userID == "" && userPhone == "" {
			return nil, fmt.Errorf("%w: user identity is missing", ErrUnauthorized)
		}
		if !matchesAnyIdentity(current.UserID, userID, userPhone) && !matchesAnyIdentity(current.CustomerPhone, userID, userPhone) {
			return nil, fmt.Errorf("%w: user cannot review this order", ErrForbidden)
		}
	}
	if strings.ToLower(strings.TrimSpace(current.Status)) != "completed" {
		return nil, fmt.Errorf("order is not completed")
	}
	if current.IsReviewed {
		return map[string]interface{}{
			"success":     true,
			"id":          orderPublicID(current),
			"tsid":        orderPublicTSID(current),
			"is_reviewed": current.IsReviewed,
			"isReviewed":  current.IsReviewed,
			"reviewed_at": current.ReviewedAt,
			"reviewedAt":  current.ReviewedAt,
		}, nil
	}

	order, err := s.repo.MarkReviewed(ctx, current.ID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":     true,
		"id":          orderPublicID(order),
		"tsid":        orderPublicTSID(order),
		"is_reviewed": order.IsReviewed,
		"isReviewed":  order.IsReviewed,
		"reviewed_at": order.ReviewedAt,
		"reviewedAt":  order.ReviewedAt,
	}, nil
}

func orderStatusText(status string) string {
	switch status {
	case "pending":
		return "待接单"
	case "accepted":
		return "进行中"
	case "delivering":
		return "配送中"
	case "priced":
		return "待付款"
	case "pending_payment":
		return "待支付"
	case "paid_unused":
		return "待核销"
	case "redeemed":
		return "已核销"
	case "refunding":
		return "退款中"
	case "refunded":
		return "已退款"
	case "expired":
		return "已过期"
	case "completed":
		return "已完成"
	case "cancelled":
		return "已取消"
	default:
		return status
	}
}
