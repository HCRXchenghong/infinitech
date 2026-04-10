package repository

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ShopRepository interface {
	GetShops(ctx context.Context, category string, todayRecommendedOnly bool) (interface{}, error)
	CountShopsByCategory(ctx context.Context, category string) (int64, error)
	GetShopDetail(ctx context.Context, id string) (interface{}, error)
	GetShopByID(ctx context.Context, id string) (*Shop, error)
	GetTodayRecommendedShops(ctx context.Context) (interface{}, error)
	GetMaxTodayRecommendPosition(ctx context.Context) (int, error)
	GetAdjacentTodayRecommendedShop(ctx context.Context, currentPosition int, direction string) (*Shop, error)
	SwapTodayRecommendPosition(ctx context.Context, currentShopID, targetShopID uint, currentPosition, targetPosition int) error
	GetShopMenu(ctx context.Context, id string) (interface{}, error)
	GetShopReviews(ctx context.Context, shopID string, page, pageSize int) (interface{}, error)
	GetUserFavorites(ctx context.Context, userID string, page, pageSize int) (interface{}, error)
	GetUserReviews(ctx context.Context, userID string, page, pageSize int) (interface{}, error)
	AddUserFavorite(ctx context.Context, favorite *UserFavorite) (*UserFavorite, bool, error)
	DeleteUserFavorite(ctx context.Context, userID, shopID string) error
	IsUserFavorite(ctx context.Context, userID, shopID string) (bool, error)
	GetMerchantShops(ctx context.Context, merchantID string) (interface{}, error)
	HasShopOrdersSince(ctx context.Context, shopID string, since time.Time) (bool, error)
	CreateShop(ctx context.Context, shop *Shop) error
	UpdateShop(ctx context.Context, shopID string, updates map[string]interface{}) error
	DeleteShop(ctx context.Context, shopID string) error
	CreateReview(ctx context.Context, review *Review) error
	GetReviewByID(ctx context.Context, reviewID string) (*Review, error)
	UpdateReview(ctx context.Context, reviewID string, updates map[string]interface{}) error
	DeleteReview(ctx context.Context, reviewID string) error
}

type shopRepository struct {
	db *gorm.DB
}

func NewShopRepository(db *gorm.DB) ShopRepository {
	return &shopRepository{db: db}
}

func normalizeShopBusinessCategoryKey(raw string) string {
	switch strings.TrimSpace(strings.ToLower(raw)) {
	case "", "food", "美食":
		return "food"
	case "groupbuy", "团购":
		return "groupbuy"
	case "dessert_drinks", "dessert-drinks", "甜点饮品":
		return "dessert_drinks"
	case "supermarket_convenience", "supermarket-convenience", "超市便利":
		return "supermarket_convenience"
	case "leisure_entertainment", "leisure-entertainment", "休闲娱乐", "休闲玩乐":
		return "leisure_entertainment"
	case "life_services", "life-services", "生活服务":
		return "life_services"
	default:
		return "food"
	}
}

func businessCategoryLabelByKey(key string) string {
	switch normalizeShopBusinessCategoryKey(key) {
	case "groupbuy":
		return "团购"
	case "dessert_drinks":
		return "甜点饮品"
	case "supermarket_convenience":
		return "超市便利"
	case "leisure_entertainment":
		return "休闲娱乐"
	case "life_services":
		return "生活服务"
	default:
		return "美食"
	}
}

func (r *shopRepository) CountShopsByCategory(ctx context.Context, category string) (int64, error) {
	var count int64
	key := normalizeShopBusinessCategoryKey(category)
	label := businessCategoryLabelByKey(key)
	if err := r.db.WithContext(ctx).
		Model(&Shop{}).
		Where("is_active = ?", true).
		Where("(business_category_key = ? OR business_category = ?)", key, label).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *shopRepository) GetShops(ctx context.Context, category string, todayRecommendedOnly bool) (interface{}, error) {
	var shops []Shop
	query := r.db.WithContext(ctx).Where("is_active = ?", true)
	if category != "" {
		key := normalizeShopBusinessCategoryKey(category)
		label := businessCategoryLabelByKey(key)
		query = query.Where("(business_category_key = ? OR business_category = ?)", key, label)
	}
	if todayRecommendedOnly {
		query = query.Where("is_today_recommended = ?", true)
	}
	if err := query.
		Order("is_today_recommended DESC").
		Order("CASE WHEN is_today_recommended = 1 THEN today_recommend_position ELSE 2147483647 END ASC").
		Order("id DESC").
		Find(&shops).Error; err != nil {
		return nil, err
	}

	// 转换为前端需要的格式
	result := make([]map[string]interface{}, 0, len(shops))
	for _, shop := range shops {
		shopMap := r.shopToMap(shop)
		result = append(result, shopMap)
	}

	return result, nil
}

func (r *shopRepository) GetShopDetail(ctx context.Context, id string) (interface{}, error) {
	var shop Shop
	if err := r.db.WithContext(ctx).Where("id = ? AND is_active = ?", id, true).First(&shop).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	perCapita, err := r.calculateCompletedOrderPerCapita(ctx, id)
	if err != nil {
		return nil, err
	}
	shop.PerCapita = perCapita

	return r.shopToMap(shop), nil
}

func (r *shopRepository) calculateCompletedOrderPerCapita(ctx context.Context, shopID string) (float64, error) {
	var summary struct {
		TotalAmount float64 `gorm:"column:total_amount"`
		OrderCount  int64   `gorm:"column:order_count"`
	}

	if err := r.db.WithContext(ctx).
		Model(&Order{}).
		Select("COALESCE(SUM(total_price), 0) AS total_amount, COUNT(*) AS order_count").
		Where("shop_id = ? AND status = ?", shopID, "completed").
		Scan(&summary).Error; err != nil {
		return 0, err
	}

	if summary.OrderCount <= 0 {
		return 0, nil
	}

	avg := summary.TotalAmount / float64(summary.OrderCount)
	return math.Round(avg*100) / 100, nil
}

func (r *shopRepository) GetShopByID(ctx context.Context, id string) (*Shop, error) {
	var shop Shop
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&shop).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &shop, nil
}

func (r *shopRepository) GetTodayRecommendedShops(ctx context.Context) (interface{}, error) {
	return r.GetShops(ctx, "", true)
}

func (r *shopRepository) GetMaxTodayRecommendPosition(ctx context.Context) (int, error) {
	var result struct {
		MaxPosition int `gorm:"column:max_position"`
	}

	if err := r.db.WithContext(ctx).
		Model(&Shop{}).
		Select("COALESCE(MAX(today_recommend_position), 0) as max_position").
		Where("is_today_recommended = ?", true).
		Scan(&result).Error; err != nil {
		return 0, err
	}

	return result.MaxPosition, nil
}

func (r *shopRepository) GetAdjacentTodayRecommendedShop(ctx context.Context, currentPosition int, direction string) (*Shop, error) {
	var target Shop
	query := r.db.WithContext(ctx).
		Where("is_today_recommended = ? AND is_active = ?", true, true)

	if direction == "up" {
		query = query.Where("today_recommend_position < ?", currentPosition).Order("today_recommend_position DESC")
	} else {
		query = query.Where("today_recommend_position > ?", currentPosition).Order("today_recommend_position ASC")
	}

	if err := query.First(&target).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return &target, nil
}

func (r *shopRepository) SwapTodayRecommendPosition(ctx context.Context, currentShopID, targetShopID uint, currentPosition, targetPosition int) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Shop{}).
			Where("id = ?", currentShopID).
			Update("today_recommend_position", targetPosition).Error; err != nil {
			return err
		}

		if err := tx.Model(&Shop{}).
			Where("id = ?", targetShopID).
			Update("today_recommend_position", currentPosition).Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *shopRepository) GetShopMenu(ctx context.Context, id string) (interface{}, error) {
	var products []Product
	if err := r.db.WithContext(ctx).
		Where("shop_id = ? AND is_active = ?", id, true).
		Order("category_id ASC").
		Order("sort_order ASC, id DESC").
		Find(&products).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(products))
	for _, product := range products {
		goodReviewRate := 0.0
		if product.TotalReviews > 0 {
			goodReviewRate = float64(product.GoodReviews) / float64(product.TotalReviews) * 100
		}

		item := map[string]interface{}{
			"id":             product.UID,
			"legacyId":       product.ID,
			"tsid":           product.TSID,
			"shopId":         product.ShopID,
			"categoryId":     product.CategoryID,
			"name":           product.Name,
			"description":    product.Description,
			"image":          product.Image,
			"price":          product.Price,
			"originalPrice":  product.OriginalPrice,
			"monthlySales":   product.MonthlySales,
			"rating":         product.Rating,
			"goodReviews":    product.GoodReviews,
			"totalReviews":   product.TotalReviews,
			"goodReviewRate": goodReviewRate,
			"stock":          product.Stock,
			"unit":           product.Unit,
			"isRecommend":    product.IsRecommend,
			"isFeatured":     product.IsFeatured,
			"isActive":       product.IsActive,
			"sortOrder":      product.SortOrder,
			"created_at":     product.CreatedAt,
			"updated_at":     product.UpdatedAt,
		}

		if product.UID == "" {
			item["id"] = strconv.FormatUint(uint64(product.ID), 10)
		}

		if product.Images != "" {
			var images []string
			if err := json.Unmarshal([]byte(product.Images), &images); err == nil {
				item["images"] = images
			} else {
				item["images"] = []string{}
			}
		} else {
			item["images"] = []string{}
		}

		if product.Tags != "" {
			var tags []string
			if err := json.Unmarshal([]byte(product.Tags), &tags); err == nil {
				item["tags"] = tags
			} else {
				item["tags"] = []string{}
			}
		} else {
			item["tags"] = []string{}
		}

		if product.Nutrition != "" {
			var nutrition map[string]interface{}
			if err := json.Unmarshal([]byte(product.Nutrition), &nutrition); err == nil {
				item["nutrition"] = nutrition
			} else {
				item["nutrition"] = map[string]interface{}{}
			}
		} else {
			item["nutrition"] = map[string]interface{}{}
		}

		result = append(result, item)
	}

	return result, nil
}

func (r *shopRepository) GetShopReviews(ctx context.Context, shopID string, page, pageSize int) (interface{}, error) {
	var reviews []Review
	offset := (page - 1) * pageSize

	if err := r.db.Where("shop_id = ?", shopID).
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&reviews).Error; err != nil {
		return nil, err
	}

	// 获取总数
	var total int64
	r.db.Model(&Review{}).Where("shop_id = ?", shopID).Count(&total)

	// 获取好评数（rating >= 4）和差评数（rating < 3）
	var goodCount, badCount int64
	r.db.Model(&Review{}).Where("shop_id = ? AND rating >= 4", shopID).Count(&goodCount)
	r.db.Model(&Review{}).Where("shop_id = ? AND rating < 3", shopID).Count(&badCount)

	// 获取全部评价的平均分
	var ratingSummary struct {
		AvgRating float64 `gorm:"column:avg_rating"`
	}
	r.db.Model(&Review{}).
		Select("COALESCE(AVG(rating), 0) as avg_rating").
		Where("shop_id = ?", shopID).
		Scan(&ratingSummary)

	// 转换为前端需要的格式
	result := make([]map[string]interface{}, 0, len(reviews))
	for _, review := range reviews {
		reviewMap := r.reviewToMap(review)
		result = append(result, reviewMap)
	}

	return map[string]interface{}{
		"list":      result,
		"total":     total,
		"goodCount": goodCount,
		"badCount":  badCount,
		"avgRating": ratingSummary.AvgRating,
		"page":      page,
		"pageSize":  pageSize,
	}, nil
}

func (r *shopRepository) GetUserFavorites(ctx context.Context, userID string, page, pageSize int) (interface{}, error) {
	type favoriteRow struct {
		FavoriteID          uint      `gorm:"column:favorite_id"`
		FavoriteCreatedAt   time.Time `gorm:"column:favorite_created_at"`
		ShopID              uint      `gorm:"column:shop_id"`
		ShopUID             string    `gorm:"column:shop_uid"`
		ShopTSID            string    `gorm:"column:shop_tsid"`
		Name                string    `gorm:"column:name"`
		OrderType           string    `gorm:"column:order_type"`
		MerchantType        string    `gorm:"column:merchant_type"`
		BusinessCategory    string    `gorm:"column:business_category"`
		CoverImage          string    `gorm:"column:cover_image"`
		Logo                string    `gorm:"column:logo"`
		Rating              float64   `gorm:"column:rating"`
		MonthlySales        int       `gorm:"column:monthly_sales"`
		MinPrice            float64   `gorm:"column:min_price"`
		DeliveryPrice       float64   `gorm:"column:delivery_price"`
		DeliveryTime        string    `gorm:"column:delivery_time"`
		Distance            string    `gorm:"column:distance"`
		BusinessCategoryKey string    `gorm:"column:business_category_key"`
	}

	offset := (page - 1) * pageSize
	baseQuery := r.db.WithContext(ctx).
		Table("user_favorites AS uf").
		Joins("JOIN shops AS s ON s.id = uf.shop_id").
		Where("uf.user_id = ?", userID).
		Where("s.is_active = ?", true)

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	var rows []favoriteRow
	if err := baseQuery.
		Select(`uf.id AS favorite_id, uf.created_at AS favorite_created_at,
			s.id AS shop_id, s.uid AS shop_uid, s.tsid AS shop_tsid,
			s.name, s.order_type, s.merchant_type, s.business_category, s.business_category_key, s.cover_image, s.logo,
			s.rating, s.monthly_sales, s.min_price, s.delivery_price, s.delivery_time, s.distance`).
		Order("uf.created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	list := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		shopID := strings.TrimSpace(row.ShopUID)
		if shopID == "" {
			shopID = strconv.FormatUint(uint64(row.ShopID), 10)
		}
		list = append(list, map[string]interface{}{
			"id":                  shopID,
			"legacyId":            row.ShopID,
			"tsid":                row.ShopTSID,
			"name":                row.Name,
			"orderType":           row.OrderType,
			"merchantType":        row.MerchantType,
			"merchant_type":       row.MerchantType,
			"businessCategory":    row.BusinessCategory,
			"businessCategoryKey": normalizeShopBusinessCategoryKey(row.BusinessCategoryKey),
			"coverImage":          row.CoverImage,
			"logo":                row.Logo,
			"rating":              row.Rating,
			"monthlySales":        row.MonthlySales,
			"minPrice":            row.MinPrice,
			"deliveryPrice":       row.DeliveryPrice,
			"deliveryTime":        row.DeliveryTime,
			"distance":            row.Distance,
			"favoriteId":          row.FavoriteID,
			"favoriteCreatedAt":   row.FavoriteCreatedAt,
			"isCollected":         true,
			"isFavorited":         true,
			"isFavorite":          true,
		})
	}

	return map[string]interface{}{
		"list":     list,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	}, nil
}

func (r *shopRepository) GetUserReviews(ctx context.Context, userID string, page, pageSize int) (interface{}, error) {
	type reviewRow struct {
		ID             uint       `gorm:"column:id"`
		ReviewUID      string     `gorm:"column:review_uid"`
		ReviewTSID     string     `gorm:"column:review_tsid"`
		ShopID         uint       `gorm:"column:shop_id"`
		UserID         uint       `gorm:"column:user_id"`
		OrderID        uint       `gorm:"column:order_id"`
		Rating         float64    `gorm:"column:rating"`
		Content        string     `gorm:"column:content"`
		Images         string     `gorm:"column:images"`
		Reply          string     `gorm:"column:reply"`
		ReplyTime      *time.Time `gorm:"column:reply_time"`
		UserName       string     `gorm:"column:user_name"`
		UserAvatar     string     `gorm:"column:user_avatar"`
		CreatedAt      time.Time  `gorm:"column:created_at"`
		UpdatedAt      time.Time  `gorm:"column:updated_at"`
		ShopName       string     `gorm:"column:shop_name"`
		ShopLogo       string     `gorm:"column:shop_logo"`
		ShopCoverImage string     `gorm:"column:shop_cover_image"`
	}

	identifiers, err := r.resolveUserReviewIdentifiers(ctx, userID)
	if err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	baseQuery := r.db.WithContext(ctx).
		Table("reviews AS r").
		Joins("LEFT JOIN shops AS s ON s.id = r.shop_id").
		Where("r.user_id IN ?", identifiers)

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	var rows []reviewRow
	if err := baseQuery.
		Select(`r.id, r.uid AS review_uid, r.tsid AS review_tsid,
			r.shop_id, r.user_id, r.order_id, r.rating, r.content, r.images, r.reply, r.reply_time,
			r.user_name, r.user_avatar, r.created_at, r.updated_at,
			s.name AS shop_name, s.logo AS shop_logo, s.cover_image AS shop_cover_image`).
		Order("r.created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	list := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		images := make([]string, 0)
		if row.Images != "" {
			if err := json.Unmarshal([]byte(row.Images), &images); err != nil {
				trimmed := strings.TrimSpace(row.Images)
				if trimmed != "" {
					segments := strings.FieldsFunc(trimmed, func(r rune) bool {
						return r == ',' || r == '，' || r == '\n' || r == '\r'
					})
					for _, segment := range segments {
						item := strings.TrimSpace(segment)
						if item != "" {
							images = append(images, item)
						}
					}
				}
			}
		}
		reviewID := strings.TrimSpace(row.ReviewUID)
		if reviewID == "" {
			reviewID = strconv.FormatUint(uint64(row.ID), 10)
		}
		list = append(list, map[string]interface{}{
			"id":             reviewID,
			"legacyId":       row.ID,
			"tsid":           row.ReviewTSID,
			"shopId":         row.ShopID,
			"userId":         row.UserID,
			"orderId":        row.OrderID,
			"rating":         row.Rating,
			"content":        row.Content,
			"images":         images,
			"reply":          row.Reply,
			"replyTime":      row.ReplyTime,
			"userName":       row.UserName,
			"userAvatar":     row.UserAvatar,
			"createdAt":      row.CreatedAt,
			"created_at":     row.CreatedAt,
			"updatedAt":      row.UpdatedAt,
			"updated_at":     row.UpdatedAt,
			"shopName":       row.ShopName,
			"shopLogo":       row.ShopLogo,
			"shopCoverImage": row.ShopCoverImage,
		})
	}

	var ratingSummary struct {
		AvgRating float64 `gorm:"column:avg_rating"`
	}
	if err := r.db.WithContext(ctx).
		Model(&Review{}).
		Select("COALESCE(AVG(rating), 0) AS avg_rating").
		Where("user_id IN ?", identifiers).
		Scan(&ratingSummary).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"list":      list,
		"total":     total,
		"avgRating": ratingSummary.AvgRating,
		"page":      page,
		"pageSize":  pageSize,
	}, nil
}

func (r *shopRepository) resolveUserReviewIdentifiers(ctx context.Context, userID string) ([]interface{}, error) {
	normalizedUserID := strings.TrimSpace(userID)
	identifiers := []interface{}{normalizedUserID}

	var user User
	if err := r.db.WithContext(ctx).
		Select("id, phone").
		Where("id = ?", normalizedUserID).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return identifiers, nil
		}
		return nil, err
	}

	phone := strings.TrimSpace(user.Phone)
	if phone == "" || phone == normalizedUserID {
		return identifiers, nil
	}

	identifiers = append(identifiers, phone)

	// 尝试把历史写入为手机号的评论纠正成用户主键，避免后续继续出现“有评论但看不到”。
	_ = r.db.WithContext(ctx).
		Model(&Review{}).
		Where("user_id = ?", phone).
		Update("user_id", user.ID).Error

	return identifiers, nil
}

func (r *shopRepository) AddUserFavorite(ctx context.Context, favorite *UserFavorite) (*UserFavorite, bool, error) {
	result := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "shop_id"}},
			DoNothing: true,
		}).
		Create(favorite)
	if result.Error != nil {
		return nil, false, result.Error
	}

	if result.RowsAffected == 0 {
		var existing UserFavorite
		if err := r.db.WithContext(ctx).
			Where("user_id = ? AND shop_id = ?", favorite.UserID, favorite.ShopID).
			First(&existing).Error; err != nil {
			return nil, false, err
		}
		return &existing, false, nil
	}

	return favorite, true, nil
}

func (r *shopRepository) DeleteUserFavorite(ctx context.Context, userID, shopID string) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND shop_id = ?", userID, shopID).
		Delete(&UserFavorite{}).Error
}

func (r *shopRepository) IsUserFavorite(ctx context.Context, userID, shopID string) (bool, error) {
	var total int64
	if err := r.db.WithContext(ctx).
		Model(&UserFavorite{}).
		Where("user_id = ? AND shop_id = ?", userID, shopID).
		Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}

// shopToMap 将 Shop 模型转换为 map，并解析 JSON 字段
func (r *shopRepository) shopToMap(shop Shop) map[string]interface{} {
	shopID := strings.TrimSpace(shop.UID)
	if shopID == "" {
		shopID = strconv.FormatUint(uint64(shop.ID), 10)
	}
	result := map[string]interface{}{
		"id":                         shopID,
		"legacyId":                   shop.ID,
		"tsid":                       shop.TSID,
		"merchantId":                 shop.MerchantID,
		"name":                       shop.Name,
		"orderType":                  shop.OrderType,
		"merchantType":               shop.MerchantType,
		"merchant_type":              shop.MerchantType,
		"category":                   shop.BusinessCategory, // 兼容旧客户端字段
		"businessCategory":           shop.BusinessCategory,
		"businessCategoryKey":        normalizeShopBusinessCategoryKey(shop.BusinessCategoryKey),
		"coverImage":                 shop.CoverImage,
		"backgroundImage":            shop.BackgroundImage,
		"logo":                       shop.Logo,
		"merchantQualification":      shop.MerchantQualification,
		"merchantQualificationImage": shop.MerchantQualification,
		"businessLicense":            shop.MerchantQualification,
		"businessLicenseImage":       shop.MerchantQualification,
		"foodBusinessLicense":        shop.FoodBusinessLicense,
		"foodBusinessLicenseImage":   shop.FoodBusinessLicense,
		"foodLicense":                shop.FoodBusinessLicense,
		"foodLicenseImage":           shop.FoodBusinessLicense,
		"rating":                     shop.Rating,
		"monthlySales":               shop.MonthlySales,
		"perCapita":                  shop.PerCapita,
		"announcement":               shop.Announcement,
		"address":                    shop.Address,
		"phone":                      shop.Phone,
		"businessHours":              shop.BusinessHours,
		"isBrand":                    shop.IsBrand,
		"isFranchise":                shop.IsFranchise,
		"isTodayRecommended":         shop.IsTodayRecommended,
		"todayRecommendPosition":     shop.TodayRecommendPosition,
		"menuNotes":                  shop.MenuNotes,
		"staffRecord":                shop.StaffRecord,
		"employeeName":               shop.EmployeeName,
		"employeeAge":                shop.EmployeeAge,
		"employeePosition":           shop.EmployeePosition,
		"idCardFrontImage":           shop.IDCardFrontImage,
		"idCardBackImage":            shop.IDCardBackImage,
		"idCardExpireAt":             formatNullableDate(shop.IDCardExpireAt),
		"healthCertFrontImage":       shop.HealthCertFrontImage,
		"healthCertBackImage":        shop.HealthCertBackImage,
		"healthCertExpireAt":         formatNullableDate(shop.HealthCertExpireAt),
		"employmentStartAt":          formatNullableDate(shop.EmploymentStartAt),
		"employmentEndAt":            formatNullableDate(shop.EmploymentEndAt),
		"isActive":                   shop.IsActive,
		"minPrice":                   shop.MinPrice,
		"deliveryPrice":              shop.DeliveryPrice,
		"deliveryTime":               shop.DeliveryTime,
		"distance":                   shop.Distance,
		"created_at":                 shop.CreatedAt,
		"updated_at":                 shop.UpdatedAt,
	}

	// 解析 tags JSON 字符串
	if shop.Tags != "" {
		var tags []string
		if err := json.Unmarshal([]byte(shop.Tags), &tags); err == nil {
			result["tags"] = tags
		} else {
			result["tags"] = []string{}
		}
	} else {
		result["tags"] = []string{}
	}

	// 解析 discounts JSON 字符串
	if shop.Discounts != "" {
		var discounts []string
		if err := json.Unmarshal([]byte(shop.Discounts), &discounts); err == nil {
			result["discounts"] = discounts
		} else {
			result["discounts"] = []string{}
		}
	} else {
		result["discounts"] = []string{}
	}

	return result
}

func formatNullableDate(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.Format("2006-01-02")
}

// reviewToMap 将 Review 模型转换为 map，并解析 JSON 字段
func (r *shopRepository) reviewToMap(review Review) map[string]interface{} {
	reviewID := strings.TrimSpace(review.UID)
	if reviewID == "" {
		reviewID = strconv.FormatUint(uint64(review.ID), 10)
	}
	result := map[string]interface{}{
		"id":         reviewID,
		"legacyId":   review.ID,
		"tsid":       review.TSID,
		"shopId":     review.ShopID,
		"userId":     review.UserID,
		"orderId":    review.OrderID,
		"rating":     review.Rating,
		"content":    review.Content,
		"reply":      review.Reply,
		"replyTime":  review.ReplyTime,
		"userName":   review.UserName,
		"userAvatar": review.UserAvatar,
		"created_at": review.CreatedAt,
		"updated_at": review.UpdatedAt,
	}

	// 解析 images JSON 字符串
	if review.Images != "" {
		var images []string
		if err := json.Unmarshal([]byte(review.Images), &images); err == nil {
			result["images"] = images
		} else {
			result["images"] = []string{}
		}
	} else {
		result["images"] = []string{}
	}

	return result
}

func (r *shopRepository) GetMerchantShops(ctx context.Context, merchantID string) (interface{}, error) {
	var shops []Shop
	if err := r.db.WithContext(ctx).
		Where("merchant_id = ?", merchantID).
		Order("is_today_recommended DESC").
		Order("CASE WHEN is_today_recommended = 1 THEN today_recommend_position ELSE 2147483647 END ASC").
		Order("id DESC").
		Find(&shops).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(shops))
	for _, shop := range shops {
		shopMap := r.shopToMap(shop)
		result = append(result, shopMap)
	}

	return result, nil
}

func (r *shopRepository) CreateShop(ctx context.Context, shop *Shop) error {
	return r.db.WithContext(ctx).Create(shop).Error
}

func (r *shopRepository) HasShopOrdersSince(ctx context.Context, shopID string, since time.Time) (bool, error) {
	var total int64
	if err := r.db.WithContext(ctx).
		Model(&Order{}).
		Where("shop_id = ? AND created_at >= ?", shopID, since).
		Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}

func (r *shopRepository) UpdateShop(ctx context.Context, shopID string, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(&Shop{}).Where("id = ?", shopID).Updates(updates).Error
}

func (r *shopRepository) DeleteShop(ctx context.Context, shopID string) error {
	return r.db.WithContext(ctx).Where("id = ?", shopID).Delete(&Shop{}).Error
}

func (r *shopRepository) CreateReview(ctx context.Context, review *Review) error {
	if err := r.normalizeReviewUserID(ctx, review); err != nil {
		return err
	}
	return r.db.WithContext(ctx).Create(review).Error
}

func (r *shopRepository) GetReviewByID(ctx context.Context, reviewID string) (*Review, error) {
	var review Review
	if err := r.db.WithContext(ctx).Where("id = ?", reviewID).First(&review).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &review, nil
}

func (r *shopRepository) normalizeReviewUserID(ctx context.Context, review *Review) error {
	if review == nil || review.UserID == 0 {
		return nil
	}

	var user User
	if err := r.db.WithContext(ctx).
		Select("id").
		Where("id = ?", review.UserID).
		First(&user).Error; err == nil {
		return nil
	} else if err != gorm.ErrRecordNotFound {
		return err
	}

	phone := strconv.FormatUint(uint64(review.UserID), 10)
	if strings.TrimSpace(phone) == "" {
		return nil
	}

	if err := r.db.WithContext(ctx).
		Select("id").
		Where("phone = ?", phone).
		First(&user).Error; err == nil {
		review.UserID = user.ID
		return nil
	} else if err == gorm.ErrRecordNotFound {
		return nil
	} else {
		return err
	}
}

func (r *shopRepository) UpdateReview(ctx context.Context, reviewID string, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(&Review{}).Where("id = ?", reviewID).Updates(updates).Error
}

func (r *shopRepository) DeleteReview(ctx context.Context, reviewID string) error {
	return r.db.WithContext(ctx).Where("id = ?", reviewID).Delete(&Review{}).Error
}
