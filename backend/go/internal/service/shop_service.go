package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/repository"
)

type ShopService struct {
	repo  repository.ShopRepository
	redis *redis.Client
}

func normalizeShopMerchantType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "", "takeout", "waimai", "delivery", "外卖", "外卖类":
		return "takeout"
	case "groupbuy", "tuangou", "团购", "团购类":
		return "groupbuy"
	case "hybrid", "mixed", "mix", "混合", "混合类":
		return "hybrid"
	default:
		return "takeout"
	}
}

func merchantTypeToOrderType(merchantType string) string {
	switch normalizeShopMerchantType(merchantType) {
	case "groupbuy":
		return "团购类"
	case "hybrid":
		return "混合类"
	default:
		return "外卖类"
	}
}

func NewShopService(repo repository.ShopRepository, redis *redis.Client) *ShopService {
	return &ShopService{
		repo:  repo,
		redis: redis,
	}
}

func (s *ShopService) GetShopCategories(ctx context.Context) (interface{}, error) {
	categories := []map[string]interface{}{
		{"name": "美食", "icon": "🍜"},
		{"name": "团购", "icon": "🎫"},
		{"name": "甜点饮品", "icon": "🍰"},
		{"name": "超市便利", "icon": "🏪"},
	}

	// 统计每个分类的店铺数量
	for i := range categories {
		categoryName := categories[i]["name"].(string)
		count, _ := s.repo.CountShopsByCategory(ctx, categoryName)
		categories[i]["count"] = count
	}

	return categories, nil
}

func (s *ShopService) GetShops(ctx context.Context, category string) (interface{}, error) {
	return s.getShops(ctx, category, false)
}

func (s *ShopService) GetTodayRecommendedShops(ctx context.Context) (interface{}, error) {
	return s.getShops(ctx, "", true)
}

func (s *ShopService) getShops(ctx context.Context, category string, todayRecommendedOnly bool) (interface{}, error) {
	// 先尝试从 Redis 获取
	if s.redis != nil {
		cacheKey := buildShopListCacheKey(category, todayRecommendedOnly)
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var shops []interface{}
			if json.Unmarshal([]byte(cached), &shops) == nil {
				return shops, nil
			}
		}
	}

	// Redis 没有，从数据库获取
	shops, err := s.repo.GetShops(ctx, category, todayRecommendedOnly)
	if err != nil {
		return nil, err
	}

	// 存入 Redis（缓存 5 分钟）
	if s.redis != nil && shops != nil {
		if data, err := json.Marshal(shops); err == nil {
			cacheKey := buildShopListCacheKey(category, todayRecommendedOnly)
			s.redis.Set(ctx, cacheKey, data, 5*time.Minute)
		}
	}

	return shops, nil
}

func (s *ShopService) GetShopDetail(ctx context.Context, id string) (interface{}, error) {
	// 店铺详情含实时统计字段（如基于已完成订单计算的人均），直接查库避免缓存滞后。
	return s.repo.GetShopDetail(ctx, id)
}

func (s *ShopService) GetShopMenu(ctx context.Context, id string) (interface{}, error) {
	// 先尝试从 Redis 获取
	if s.redis != nil {
		cacheKey := fmt.Sprintf("cache:shop:%s:menu", id)
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var menu []interface{}
			if json.Unmarshal([]byte(cached), &menu) == nil {
				return menu, nil
			}
		}
	}

	// Redis 没有，从数据库获取
	menu, err := s.repo.GetShopMenu(ctx, id)
	if err != nil {
		return nil, err
	}

	// 存入 Redis（缓存 10 分钟）
	if s.redis != nil && menu != nil {
		if data, err := json.Marshal(menu); err == nil {
			s.redis.Set(ctx, fmt.Sprintf("cache:shop:%s:menu", id), data, 10*time.Minute)
		}
	}

	return menu, nil
}

func (s *ShopService) GetShopReviews(ctx context.Context, shopID string, page, pageSize int) (interface{}, error) {
	// 先尝试从 Redis 获取
	if s.redis != nil {
		cacheKey := fmt.Sprintf("cache:shop:%s:reviews:%d:%d", shopID, page, pageSize)
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var reviews map[string]interface{}
			if json.Unmarshal([]byte(cached), &reviews) == nil {
				return reviews, nil
			}
		}
	}

	// Redis 没有，从数据库获取
	reviews, err := s.repo.GetShopReviews(ctx, shopID, page, pageSize)
	if err != nil {
		return nil, err
	}

	// 存入 Redis（缓存 5 分钟）
	if s.redis != nil && reviews != nil {
		if data, err := json.Marshal(reviews); err == nil {
			s.redis.Set(ctx, fmt.Sprintf("cache:shop:%s:reviews:%d:%d", shopID, page, pageSize), data, 5*time.Minute)
		}
	}

	return reviews, nil
}

func (s *ShopService) GetUserFavorites(ctx context.Context, userID string, page, pageSize int) (interface{}, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return nil, fmt.Errorf("用户ID无效")
	}
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	return s.repo.GetUserFavorites(ctx, normalizedUserID, page, pageSize)
}

func (s *ShopService) AddUserFavorite(ctx context.Context, userID string, shopID string) (interface{}, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return nil, fmt.Errorf("用户ID无效")
	}
	normalizedShopID := strings.TrimSpace(shopID)
	if normalizedShopID == "" {
		return nil, fmt.Errorf("shop_id 不能为空")
	}

	shop, err := s.repo.GetShopByID(ctx, normalizedShopID)
	if err != nil {
		return nil, err
	}
	if shop == nil || !shop.IsActive {
		return nil, fmt.Errorf("商家不存在或已下线")
	}
	uid, err := parsePositiveUintFromID(normalizedUserID)
	if err != nil {
		return nil, fmt.Errorf("用户ID无效")
	}
	sid, err := parsePositiveUintFromID(normalizedShopID)
	if err != nil {
		return nil, fmt.Errorf("商家ID无效")
	}

	favorite, created, err := s.repo.AddUserFavorite(ctx, &repository.UserFavorite{
		UserID: uid,
		ShopID: sid,
	})
	if err != nil {
		return nil, err
	}
	favoriteID := strings.TrimSpace(favorite.UID)
	if favoriteID == "" {
		favoriteID = strconv.FormatUint(uint64(favorite.ID), 10)
	}
	shopPublicID := strings.TrimSpace(shop.UID)
	if shopPublicID == "" {
		shopPublicID = normalizedShopID
	}

	return map[string]interface{}{
		"id":        favoriteID,
		"tsid":      favorite.TSID,
		"legacyId":  favorite.ID,
		"userId":    normalizedUserID,
		"shopId":    shopPublicID,
		"shopTsid":  shop.TSID,
		"createdAt": favorite.CreatedAt,
		"created":   created,
	}, nil
}

func (s *ShopService) DeleteUserFavorite(ctx context.Context, userID, shopID string) error {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return fmt.Errorf("用户ID无效")
	}
	normalizedShopID := strings.TrimSpace(shopID)
	if normalizedShopID == "" {
		return fmt.Errorf("商家ID无效")
	}
	return s.repo.DeleteUserFavorite(ctx, normalizedUserID, normalizedShopID)
}

func (s *ShopService) GetUserFavoriteStatus(ctx context.Context, userID, shopID string) (interface{}, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return nil, fmt.Errorf("用户ID无效")
	}
	normalizedShopID := strings.TrimSpace(shopID)
	if normalizedShopID == "" {
		return nil, fmt.Errorf("商家ID无效")
	}

	isFavorite, err := s.repo.IsUserFavorite(ctx, normalizedUserID, normalizedShopID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"isFavorite":  isFavorite,
		"isCollected": isFavorite,
		"isFavorited": isFavorite,
	}, nil
}

func (s *ShopService) GetUserReviews(ctx context.Context, userID string, page, pageSize int) (interface{}, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return nil, fmt.Errorf("用户ID无效")
	}
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	return s.repo.GetUserReviews(ctx, normalizedUserID, page, pageSize)
}

func (s *ShopService) GetMerchantShops(ctx context.Context, merchantID string) (interface{}, error) {
	return s.repo.GetMerchantShops(ctx, merchantID)
}

func (s *ShopService) CreateShop(ctx context.Context, data map[string]interface{}) (interface{}, error) {
	role := authContextRole(ctx)
	currentMerchantID := authContextInt64(ctx, "merchant_id")

	shop := &repository.Shop{
		OrderType:        "外卖类",
		MerchantType:     "takeout",
		BusinessCategory: "美食",
		BusinessHours:    "09:00-22:00",
		IsActive:         true,
		Tags:             "[]",
		Discounts:        "[]",
	}
	merchantTypeProvided := false

	if v, ok := data["merchant_id"]; ok {
		if merchantID := toInt(v); merchantID > 0 {
			shop.MerchantID = uint(merchantID)
		}
	}
	if v, ok := data["name"]; ok {
		shop.Name = toString(v)
	}
	if v, ok := data["orderType"]; ok && toString(v) != "" {
		shop.OrderType = toString(v)
		if !merchantTypeProvided {
			shop.MerchantType = normalizeShopMerchantType(shop.OrderType)
		}
	}
	if v, ok := data["merchantType"]; ok && toString(v) != "" {
		shop.MerchantType = normalizeShopMerchantType(toString(v))
		merchantTypeProvided = true
	}
	if v, ok := data["merchant_type"]; ok && toString(v) != "" {
		shop.MerchantType = normalizeShopMerchantType(toString(v))
		merchantTypeProvided = true
	}
	if v, ok := data["businessCategory"]; ok && toString(v) != "" {
		shop.BusinessCategory = toString(v)
	}
	// 兼容旧的 category 字段
	if v, ok := data["category"]; ok && toString(v) != "" {
		shop.BusinessCategory = toString(v)
	}
	if v, ok := data["coverImage"]; ok {
		shop.CoverImage = toString(v)
	}
	if v, ok := data["backgroundImage"]; ok {
		shop.BackgroundImage = toString(v)
	}
	if v, ok := data["logo"]; ok {
		shop.Logo = toString(v)
	}
	if v, ok := data["merchantQualification"]; ok {
		shop.MerchantQualification = toString(v)
	} else if v, ok := data["merchantQualificationImage"]; ok {
		shop.MerchantQualification = toString(v)
	} else if v, ok := data["businessLicense"]; ok {
		shop.MerchantQualification = toString(v)
	} else if v, ok := data["businessLicenseImage"]; ok {
		shop.MerchantQualification = toString(v)
	} else if v, ok := data["merchant_qualification"]; ok {
		shop.MerchantQualification = toString(v)
	}
	if v, ok := data["foodBusinessLicense"]; ok {
		shop.FoodBusinessLicense = toString(v)
	} else if v, ok := data["foodBusinessLicenseImage"]; ok {
		shop.FoodBusinessLicense = toString(v)
	} else if v, ok := data["foodLicense"]; ok {
		shop.FoodBusinessLicense = toString(v)
	} else if v, ok := data["foodLicenseImage"]; ok {
		shop.FoodBusinessLicense = toString(v)
	} else if v, ok := data["food_business_license"]; ok {
		shop.FoodBusinessLicense = toString(v)
	}
	if v, ok := data["rating"]; ok {
		shop.Rating = toFloat(v)
	}
	if v, ok := data["monthlySales"]; ok {
		shop.MonthlySales = toInt(v)
	}
	if v, ok := data["perCapita"]; ok {
		shop.PerCapita = toFloat(v)
	}
	if v, ok := data["announcement"]; ok {
		shop.Announcement = toString(v)
	}
	if v, ok := data["address"]; ok {
		shop.Address = toString(v)
	}
	if v, ok := data["phone"]; ok {
		shop.Phone = toString(v)
	}
	if v, ok := data["businessHours"]; ok && toString(v) != "" {
		shop.BusinessHours = toString(v)
	}
	if v, ok := data["tags"]; ok {
		shop.Tags = normalizeJSONText(v, "[]")
	}
	if v, ok := data["discounts"]; ok {
		shop.Discounts = normalizeJSONText(v, "[]")
	}
	if v, ok := data["menuNotes"]; ok {
		shop.MenuNotes = toString(v)
	}
	if v, ok := data["staffRecord"]; ok {
		shop.StaffRecord = toString(v)
	}
	if v := pickFirst(data, "employeeName", "employee_name"); v != nil {
		shop.EmployeeName = toString(v)
	}
	if v := pickFirst(data, "employeeAge", "employee_age", "age"); v != nil {
		age := toInt(v)
		if age < 0 {
			age = 0
		}
		shop.EmployeeAge = age
	}
	if v := pickFirst(data, "employeePosition", "employee_position", "position", "jobTitle", "job_title"); v != nil {
		shop.EmployeePosition = toString(v)
	}
	if v := pickFirst(data, "idCardFrontImage", "id_card_front_image", "idCardFront", "id_card_front"); v != nil {
		shop.IDCardFrontImage = toString(v)
	}
	if v := pickFirst(data, "idCardBackImage", "id_card_back_image", "idCardBack", "id_card_back"); v != nil {
		shop.IDCardBackImage = toString(v)
	}
	if v := pickFirst(data, "idCardExpireAt", "id_card_expire_at", "idCardExpireDate", "id_card_expire_date"); v != nil {
		parsed, err := parseDateTimePtr(v)
		if err != nil {
			return nil, fmt.Errorf("身份证到期时间格式不正确")
		}
		shop.IDCardExpireAt = parsed
	}
	if v := pickFirst(data, "healthCertFrontImage", "health_cert_front_image", "healthCertFront", "health_cert_front"); v != nil {
		shop.HealthCertFrontImage = toString(v)
	}
	if v := pickFirst(data, "healthCertBackImage", "health_cert_back_image", "healthCertBack", "health_cert_back"); v != nil {
		shop.HealthCertBackImage = toString(v)
	}
	if v := pickFirst(data, "healthCertExpireAt", "health_cert_expire_at", "healthCertExpireDate", "health_cert_expire_date"); v != nil {
		parsed, err := parseDateTimePtr(v)
		if err != nil {
			return nil, fmt.Errorf("健康证到期时间格式不正确")
		}
		shop.HealthCertExpireAt = parsed
	}
	if v := pickFirst(data, "employmentStartAt", "employment_start_at", "entryDate", "entry_date", "hireDate", "hire_date"); v != nil {
		parsed, err := parseDateTimePtr(v)
		if err != nil {
			return nil, fmt.Errorf("入职时间格式不正确")
		}
		shop.EmploymentStartAt = parsed
	}
	if v := pickFirst(data, "employmentEndAt", "employment_end_at", "leaveDate", "leave_date"); v != nil {
		parsed, err := parseDateTimePtr(v)
		if err != nil {
			return nil, fmt.Errorf("离职时间格式不正确")
		}
		shop.EmploymentEndAt = parsed
	}
	if v, ok := data["isBrand"]; ok {
		shop.IsBrand = toBool(v)
	}
	if v, ok := data["isFranchise"]; ok {
		shop.IsFranchise = toBool(v)
	}
	if v, ok := data["isActive"]; ok {
		shop.IsActive = toBool(v)
	}
	if v, ok := data["minPrice"]; ok {
		shop.MinPrice = toFloat(v)
	}
	if v, ok := data["deliveryPrice"]; ok {
		shop.DeliveryPrice = toFloat(v)
	}
	if v, ok := data["deliveryTime"]; ok {
		shop.DeliveryTime = toString(v)
	}
	if v, ok := data["distance"]; ok {
		shop.Distance = toString(v)
	}
	if v, ok := data["isTodayRecommended"]; ok {
		shop.IsTodayRecommended = toBool(v)
	} else if v, ok := data["is_today_recommended"]; ok {
		shop.IsTodayRecommended = toBool(v)
	}
	if v, ok := data["todayRecommendPosition"]; ok {
		shop.TodayRecommendPosition = toInt(v)
	} else if v, ok := data["today_recommend_position"]; ok {
		shop.TodayRecommendPosition = toInt(v)
	}
	if shop.IsTodayRecommended {
		if shop.TodayRecommendPosition <= 0 {
			maxPosition, err := s.repo.GetMaxTodayRecommendPosition(ctx)
			if err != nil {
				return nil, err
			}
			shop.TodayRecommendPosition = maxPosition + 1
		}
	} else {
		shop.TodayRecommendPosition = 0
	}

	if shop.Name == "" {
		return nil, fmt.Errorf("店铺名称不能为空")
	}
	if !merchantTypeProvided {
		shop.MerchantType = normalizeShopMerchantType(shop.OrderType)
	}
	shop.OrderType = merchantTypeToOrderType(shop.MerchantType)
	if role == "merchant" {
		if currentMerchantID <= 0 {
			return nil, fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		if shop.MerchantID == 0 {
			shop.MerchantID = uint(currentMerchantID)
		}
		if int64(shop.MerchantID) != currentMerchantID {
			return nil, fmt.Errorf("%w: merchant cannot create shop for another account", ErrForbidden)
		}
	}
	if shop.MerchantID == 0 {
		return nil, fmt.Errorf("merchant_id 不能为空")
	}

	if err := s.repo.CreateShop(ctx, shop); err != nil {
		return nil, err
	}

	// 清除缓存
	s.InvalidateCache(ctx, "")

	return shop, nil
}

func (s *ShopService) UpdateShop(ctx context.Context, shopID string, data map[string]interface{}) error {
	role := authContextRole(ctx)
	currentMerchantID := authContextInt64(ctx, "merchant_id")
	if role == "merchant" {
		if currentMerchantID <= 0 {
			return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		owned, err := s.merchantOwnsShop(ctx, shopID, currentMerchantID)
		if err != nil {
			return err
		}
		if !owned {
			return fmt.Errorf("%w: merchant cannot update this shop", ErrForbidden)
		}
	}

	updates := map[string]interface{}{}
	isTodayRecommendedProvided := false
	isTodayRecommended := false
	positionProvided := false
	todayRecommendPosition := 0
	orderTypeProvided := false
	orderTypeValue := ""
	merchantTypeProvided := false
	merchantTypeValue := ""

	for key, value := range data {
		switch key {
		case "merchant_id":
			if role == "merchant" {
				return fmt.Errorf("%w: merchant_id cannot be modified by merchant", ErrForbidden)
			}
			updates["merchant_id"] = toInt(value)
		case "name":
			updates["name"] = toString(value)
		case "orderType":
			orderTypeProvided = true
			orderTypeValue = toString(value)
		case "merchantType", "merchant_type":
			merchantTypeProvided = true
			merchantTypeValue = toString(value)
		case "businessCategory", "category":
			updates["business_category"] = toString(value)
		case "coverImage":
			updates["cover_image"] = toString(value)
		case "backgroundImage":
			updates["background_image"] = toString(value)
		case "logo":
			updates["logo"] = toString(value)
		case "merchantQualification", "merchantQualificationImage", "businessLicense", "businessLicenseImage", "merchant_qualification":
			updates["merchant_qualification"] = toString(value)
		case "foodBusinessLicense", "foodBusinessLicenseImage", "foodLicense", "foodLicenseImage", "food_business_license":
			updates["food_business_license"] = toString(value)
		case "rating":
			updates["rating"] = toFloat(value)
		case "monthlySales":
			updates["monthly_sales"] = toInt(value)
		case "perCapita":
			updates["per_capita"] = toFloat(value)
		case "announcement":
			updates["announcement"] = toString(value)
		case "address":
			updates["address"] = toString(value)
		case "phone":
			updates["phone"] = toString(value)
		case "businessHours":
			updates["business_hours"] = toString(value)
		case "tags":
			updates["tags"] = normalizeJSONText(value, "[]")
		case "discounts":
			updates["discounts"] = normalizeJSONText(value, "[]")
		case "menuNotes":
			updates["menu_notes"] = toString(value)
		case "staffRecord":
			updates["staff_record"] = toString(value)
		case "employeeName", "employee_name":
			updates["employee_name"] = toString(value)
		case "employeeAge", "employee_age", "age":
			age := toInt(value)
			if age < 0 {
				age = 0
			}
			updates["employee_age"] = age
		case "employeePosition", "employee_position", "position", "jobTitle", "job_title":
			updates["employee_position"] = toString(value)
		case "idCardFrontImage", "id_card_front_image", "idCardFront", "id_card_front":
			updates["id_card_front_image"] = toString(value)
		case "idCardBackImage", "id_card_back_image", "idCardBack", "id_card_back":
			updates["id_card_back_image"] = toString(value)
		case "idCardExpireAt", "id_card_expire_at", "idCardExpireDate", "id_card_expire_date":
			parsed, err := parseDateTimePtr(value)
			if err != nil {
				return fmt.Errorf("身份证到期时间格式不正确")
			}
			updates["id_card_expire_at"] = parsed
		case "healthCertFrontImage", "health_cert_front_image", "healthCertFront", "health_cert_front":
			updates["health_cert_front_image"] = toString(value)
		case "healthCertBackImage", "health_cert_back_image", "healthCertBack", "health_cert_back":
			updates["health_cert_back_image"] = toString(value)
		case "healthCertExpireAt", "health_cert_expire_at", "healthCertExpireDate", "health_cert_expire_date":
			parsed, err := parseDateTimePtr(value)
			if err != nil {
				return fmt.Errorf("健康证到期时间格式不正确")
			}
			updates["health_cert_expire_at"] = parsed
		case "employmentStartAt", "employment_start_at", "entryDate", "entry_date", "hireDate", "hire_date":
			parsed, err := parseDateTimePtr(value)
			if err != nil {
				return fmt.Errorf("入职时间格式不正确")
			}
			updates["employment_start_at"] = parsed
		case "employmentEndAt", "employment_end_at", "leaveDate", "leave_date":
			parsed, err := parseDateTimePtr(value)
			if err != nil {
				return fmt.Errorf("离职时间格式不正确")
			}
			updates["employment_end_at"] = parsed
		case "isBrand":
			updates["is_brand"] = toBool(value)
		case "isFranchise":
			updates["is_franchise"] = toBool(value)
		case "isActive":
			updates["is_active"] = toBool(value)
		case "minPrice":
			updates["min_price"] = toFloat(value)
		case "deliveryPrice":
			updates["delivery_price"] = toFloat(value)
		case "deliveryTime":
			updates["delivery_time"] = toString(value)
		case "distance":
			updates["distance"] = toString(value)
		case "isTodayRecommended":
			isTodayRecommendedProvided = true
			isTodayRecommended = toBool(value)
		case "is_today_recommended":
			isTodayRecommendedProvided = true
			isTodayRecommended = toBool(value)
		case "todayRecommendPosition":
			positionProvided = true
			todayRecommendPosition = toInt(value)
		case "today_recommend_position":
			positionProvided = true
			todayRecommendPosition = toInt(value)
		}
	}

	if merchantTypeProvided {
		normalized := normalizeShopMerchantType(merchantTypeValue)
		updates["merchant_type"] = normalized
		if !orderTypeProvided {
			updates["order_type"] = merchantTypeToOrderType(normalized)
		}
	}
	if orderTypeProvided {
		if strings.TrimSpace(orderTypeValue) != "" {
			updates["order_type"] = orderTypeValue
		}
		if !merchantTypeProvided {
			updates["merchant_type"] = normalizeShopMerchantType(orderTypeValue)
		}
	}

	if isTodayRecommendedProvided {
		updates["is_today_recommended"] = isTodayRecommended
		if !isTodayRecommended {
			updates["today_recommend_position"] = 0
		} else if positionProvided && todayRecommendPosition > 0 {
			updates["today_recommend_position"] = todayRecommendPosition
		} else {
			currentShop, err := s.repo.GetShopByID(ctx, shopID)
			if err != nil {
				return err
			}
			if currentShop != nil && currentShop.IsTodayRecommended && currentShop.TodayRecommendPosition > 0 {
				updates["today_recommend_position"] = currentShop.TodayRecommendPosition
			} else {
				maxPosition, err := s.repo.GetMaxTodayRecommendPosition(ctx)
				if err != nil {
					return err
				}
				updates["today_recommend_position"] = maxPosition + 1
			}
		}
	} else if positionProvided {
		currentShop, err := s.repo.GetShopByID(ctx, shopID)
		if err != nil {
			return err
		}
		if currentShop != nil && currentShop.IsTodayRecommended && todayRecommendPosition > 0 {
			updates["today_recommend_position"] = todayRecommendPosition
		}
	}

	if len(updates) == 0 {
		return nil
	}

	if err := s.repo.UpdateShop(ctx, shopID, updates); err != nil {
		return err
	}

	// 清除缓存
	s.InvalidateCache(ctx, shopID)

	return nil
}

func (s *ShopService) MoveTodayRecommendPosition(ctx context.Context, shopID string, direction string) error {
	if authContextRole(ctx) == "merchant" {
		return fmt.Errorf("%w: merchant cannot adjust today-recommend ranking", ErrForbidden)
	}

	direction = strings.ToLower(strings.TrimSpace(direction))
	if direction != "up" && direction != "down" {
		return fmt.Errorf("direction 必须是 up 或 down")
	}

	currentShop, err := s.repo.GetShopByID(ctx, shopID)
	if err != nil {
		return err
	}
	if currentShop == nil {
		return fmt.Errorf("店铺不存在")
	}
	if !currentShop.IsTodayRecommended {
		return fmt.Errorf("店铺未加入今日推荐")
	}
	if currentShop.TodayRecommendPosition <= 0 {
		return fmt.Errorf("当前推荐排名无效")
	}

	targetShop, err := s.repo.GetAdjacentTodayRecommendedShop(ctx, currentShop.TodayRecommendPosition, direction)
	if err != nil {
		return err
	}
	if targetShop == nil {
		return nil
	}

	if err := s.repo.SwapTodayRecommendPosition(
		ctx,
		currentShop.ID,
		targetShop.ID,
		currentShop.TodayRecommendPosition,
		targetShop.TodayRecommendPosition,
	); err != nil {
		return err
	}

	s.InvalidateCache(ctx, shopID)
	s.InvalidateCache(ctx, strconv.Itoa(int(targetShop.ID)))
	return nil
}

func (s *ShopService) DeleteShop(ctx context.Context, shopID string) error {
	role := authContextRole(ctx)
	currentMerchantID := authContextInt64(ctx, "merchant_id")
	if role == "merchant" {
		if currentMerchantID <= 0 {
			return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		owned, err := s.merchantOwnsShop(ctx, shopID, currentMerchantID)
		if err != nil {
			return err
		}
		if !owned {
			return fmt.Errorf("%w: merchant cannot delete this shop", ErrForbidden)
		}
	}

	cutoff := time.Now().Add(-48 * time.Hour)
	hasRecentOrders, err := s.repo.HasShopOrdersSince(ctx, shopID, cutoff)
	if err != nil {
		return err
	}
	if hasRecentOrders {
		return fmt.Errorf("%w: 店铺近2天存在订单，暂不支持删除", ErrForbidden)
	}

	if err := s.repo.DeleteShop(ctx, shopID); err != nil {
		return err
	}

	// 清除缓存
	s.InvalidateCache(ctx, shopID)

	return nil
}

func (s *ShopService) CreateReview(ctx context.Context, data map[string]interface{}) (interface{}, error) {
	review := &repository.Review{
		ShopID:     uint(toInt(pickFirst(data, "shop_id", "shopId"))),
		UserID:     uint(toInt(pickFirst(data, "user_id", "userId"))),
		OrderID:    uint(toInt(pickFirst(data, "order_id", "orderId"))),
		Rating:     toFloat(pickFirst(data, "rating")),
		Content:    toString(pickFirst(data, "content")),
		Images:     normalizeReviewImages(pickFirst(data, "images")),
		Reply:      toString(pickFirst(data, "reply")),
		UserName:   toString(pickFirst(data, "user_name", "userName")),
		UserAvatar: toString(pickFirst(data, "user_avatar", "userAvatar")),
	}

	if review.ShopID == 0 {
		return nil, fmt.Errorf("shop_id 不能为空")
	}
	review.Rating = clampRating(review.Rating)
	if review.Rating <= 0 {
		review.Rating = 5
	}
	if review.Images == "" {
		review.Images = "[]"
	}
	if strings.TrimSpace(review.Reply) != "" {
		now := time.Now()
		review.ReplyTime = &now
	}

	if err := s.repo.CreateReview(ctx, review); err != nil {
		return nil, err
	}

	s.InvalidateCache(ctx, strconv.Itoa(int(review.ShopID)))

	return review, nil
}

func (s *ShopService) UpdateReview(ctx context.Context, reviewID string, data map[string]interface{}) error {
	role := authContextRole(ctx)
	currentMerchantID := authContextInt64(ctx, "merchant_id")
	if role == "merchant" {
		if currentMerchantID <= 0 {
			return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		review, err := s.repo.GetReviewByID(ctx, reviewID)
		if err != nil {
			return err
		}
		if review == nil {
			return fmt.Errorf("评价不存在")
		}
		owned, ownErr := s.merchantOwnsShop(ctx, strconv.FormatUint(uint64(review.ShopID), 10), currentMerchantID)
		if ownErr != nil {
			return ownErr
		}
		if !owned {
			return fmt.Errorf("%w: merchant cannot update this review", ErrForbidden)
		}
	}

	updates := map[string]interface{}{}
	shopID := toInt(pickFirst(data, "shop_id", "shopId"))

	for key, value := range data {
		switch key {
		case "shop_id", "shopId":
			updates["shop_id"] = toInt(value)
		case "user_id", "userId":
			updates["user_id"] = toInt(value)
		case "order_id", "orderId":
			updates["order_id"] = toInt(value)
		case "rating":
			updates["rating"] = clampRating(toFloat(value))
		case "content":
			updates["content"] = toString(value)
		case "images":
			updates["images"] = normalizeReviewImages(value)
		case "reply":
			reply := toString(value)
			updates["reply"] = reply
			if strings.TrimSpace(reply) == "" {
				updates["reply_time"] = nil
			} else {
				updates["reply_time"] = time.Now()
			}
		case "user_name", "userName":
			updates["user_name"] = toString(value)
		case "user_avatar", "userAvatar":
			updates["user_avatar"] = toString(value)
		}
	}

	if len(updates) == 0 {
		return nil
	}

	if err := s.repo.UpdateReview(ctx, reviewID, updates); err != nil {
		return err
	}

	if shopID > 0 {
		s.InvalidateCache(ctx, strconv.Itoa(shopID))
	} else {
		s.InvalidateCache(ctx, "")
	}
	return nil
}

func (s *ShopService) DeleteReview(ctx context.Context, reviewID string) error {
	role := authContextRole(ctx)
	currentMerchantID := authContextInt64(ctx, "merchant_id")
	if role == "merchant" {
		if currentMerchantID <= 0 {
			return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		review, err := s.repo.GetReviewByID(ctx, reviewID)
		if err != nil {
			return err
		}
		if review == nil {
			return fmt.Errorf("评价不存在")
		}
		owned, ownErr := s.merchantOwnsShop(ctx, strconv.FormatUint(uint64(review.ShopID), 10), currentMerchantID)
		if ownErr != nil {
			return ownErr
		}
		if !owned {
			return fmt.Errorf("%w: merchant cannot delete this review", ErrForbidden)
		}
	}

	if err := s.repo.DeleteReview(ctx, reviewID); err != nil {
		return err
	}
	// 无法直接拿到所属店铺，退化为清空评论缓存。
	s.InvalidateCache(ctx, "")
	return nil
}

func (s *ShopService) merchantOwnsShop(ctx context.Context, shopID string, merchantID int64) (bool, error) {
	if merchantID <= 0 || strings.TrimSpace(shopID) == "" {
		return false, nil
	}

	shop, err := s.repo.GetShopByID(ctx, strings.TrimSpace(shopID))
	if err != nil {
		return false, err
	}
	if shop == nil {
		return false, nil
	}

	return int64(shop.MerchantID) == merchantID, nil
}

// InvalidateCache 清除缓存（当商家数据更新时调用）
func (s *ShopService) InvalidateCache(ctx context.Context, shopId string) {
	if s.redis == nil {
		return
	}

	// 清除商家列表缓存（含分类、今日推荐等）
	shopListIter := s.redis.Scan(ctx, 0, "cache:shops:*", 100).Iterator()
	for shopListIter.Next(ctx) {
		s.redis.Del(ctx, shopListIter.Val())
	}

	if shopId != "" {
		// 清除商家详情缓存
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%s", shopId))
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%s:menu", shopId))

		// 清除该店铺所有评论分页缓存
		reviewIter := s.redis.Scan(ctx, 0, fmt.Sprintf("cache:shop:%s:reviews:*", shopId), 100).Iterator()
		for reviewIter.Next(ctx) {
			s.redis.Del(ctx, reviewIter.Val())
		}
		return
	}

	// 全量失效评论缓存（用于无法确定店铺 ID 的场景）
	allReviewIter := s.redis.Scan(ctx, 0, "cache:shop:*:reviews:*", 100).Iterator()
	for allReviewIter.Next(ctx) {
		s.redis.Del(ctx, allReviewIter.Val())
	}
}

func buildShopListCacheKey(category string, todayRecommendedOnly bool) string {
	if category != "" && todayRecommendedOnly {
		return fmt.Sprintf("cache:shops:category:%s:today_recommended", category)
	}
	if category != "" {
		return fmt.Sprintf("cache:shops:category:%s", category)
	}
	if todayRecommendedOnly {
		return "cache:shops:today_recommended"
	}
	return "cache:shops:list"
}

func toString(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", val)
	}
}

func parsePositiveUintFromID(value string) (uint, error) {
	text := strings.TrimSpace(value)
	if text == "" {
		return 0, fmt.Errorf("empty id")
	}
	numericID, err := strconv.ParseUint(text, 10, 64)
	if err != nil || numericID == 0 {
		return 0, fmt.Errorf("invalid id")
	}
	return uint(numericID), nil
}

func toBool(v interface{}) bool {
	switch val := v.(type) {
	case bool:
		return val
	case float64:
		return val != 0
	case int:
		return val != 0
	case string:
		return val == "1" || val == "true" || val == "TRUE"
	default:
		return false
	}
}

func toInt(v interface{}) int {
	switch val := v.(type) {
	case int:
		return val
	case int32:
		return int(val)
	case int64:
		return int(val)
	case float64:
		return int(val)
	case float32:
		return int(val)
	case string:
		num, err := strconv.Atoi(strings.TrimSpace(val))
		if err != nil {
			return 0
		}
		return num
	default:
		return 0
	}
}

func toFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		num, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
		if err != nil {
			return 0
		}
		return num
	default:
		return 0
	}
}

func parseDateTimePtr(v interface{}) (*time.Time, error) {
	switch val := v.(type) {
	case nil:
		return nil, nil
	case *time.Time:
		if val == nil || val.IsZero() {
			return nil, nil
		}
		parsed := *val
		return &parsed, nil
	case time.Time:
		if val.IsZero() {
			return nil, nil
		}
		parsed := val
		return &parsed, nil
	case float64:
		return unixTimestampToTimePtr(int64(val)), nil
	case float32:
		return unixTimestampToTimePtr(int64(val)), nil
	case int:
		return unixTimestampToTimePtr(int64(val)), nil
	case int32:
		return unixTimestampToTimePtr(int64(val)), nil
	case int64:
		return unixTimestampToTimePtr(val), nil
	case string:
		text := strings.TrimSpace(val)
		if text == "" || strings.EqualFold(text, "null") {
			return nil, nil
		}
		if timestamp, err := strconv.ParseInt(text, 10, 64); err == nil {
			return unixTimestampToTimePtr(timestamp), nil
		}
		layouts := []string{
			"2006-01-02",
			"2006-01-02 15:04",
			"2006-01-02 15:04:05",
			"2006-01-02T15:04",
			"2006-01-02T15:04:05",
			time.RFC3339,
			time.RFC3339Nano,
		}
		for _, layout := range layouts {
			if parsed, err := time.ParseInLocation(layout, text, time.Local); err == nil {
				return &parsed, nil
			}
			if parsed, err := time.Parse(layout, text); err == nil {
				return &parsed, nil
			}
		}
		return nil, fmt.Errorf("invalid datetime")
	default:
		text := strings.TrimSpace(fmt.Sprintf("%v", v))
		if text == "" || text == "<nil>" {
			return nil, nil
		}
		return parseDateTimePtr(text)
	}
}

func unixTimestampToTimePtr(timestamp int64) *time.Time {
	if timestamp == 0 {
		return nil
	}
	if timestamp > 9999999999 || timestamp < -9999999999 {
		timestamp = timestamp / 1000
	}
	parsed := time.Unix(timestamp, 0)
	return &parsed
}

func normalizeJSONText(v interface{}, fallback string) string {
	if v == nil {
		return fallback
	}
	if str, ok := v.(string); ok {
		if str == "" {
			return fallback
		}
		var parsed interface{}
		if err := json.Unmarshal([]byte(str), &parsed); err == nil {
			return str
		}
		// 非 JSON 字符串时，按单值数组保存
		wrapped, _ := json.Marshal([]string{str})
		return string(wrapped)
	}
	raw, err := json.Marshal(v)
	if err != nil {
		return fallback
	}
	return string(raw)
}

func pickFirst(data map[string]interface{}, keys ...string) interface{} {
	for _, key := range keys {
		if value, ok := data[key]; ok && value != nil {
			return value
		}
	}
	return nil
}

func normalizeReviewImages(v interface{}) string {
	if v == nil {
		return "[]"
	}

	if raw, ok := v.(string); ok {
		text := strings.TrimSpace(raw)
		if text == "" {
			return "[]"
		}

		var jsonArray []string
		if err := json.Unmarshal([]byte(text), &jsonArray); err == nil {
			out, _ := json.Marshal(jsonArray)
			return string(out)
		}

		segments := strings.FieldsFunc(text, func(r rune) bool {
			return r == ',' || r == '，' || r == '\n' || r == '\r'
		})
		if len(segments) == 0 {
			return "[]"
		}
		out := make([]string, 0, len(segments))
		for _, segment := range segments {
			item := strings.TrimSpace(segment)
			if item != "" {
				out = append(out, item)
			}
		}
		bytes, _ := json.Marshal(out)
		return string(bytes)
	}

	normalized := normalizeJSONText(v, "[]")
	if strings.TrimSpace(normalized) == "" {
		return "[]"
	}
	return normalized
}

func clampRating(rating float64) float64 {
	if rating < 0 {
		return 0
	}
	if rating > 5 {
		return 5
	}
	return rating
}
