package repository

import (
	"context"
	"encoding/json"

	"gorm.io/gorm"
)

type ProductRepository interface {
	DB() *gorm.DB
	GetCategories(ctx context.Context, shopID string) (interface{}, error)
	GetProducts(ctx context.Context, shopID string, categoryID string) (interface{}, error)
	GetProductDetail(ctx context.Context, productID string) (interface{}, error)
	GetBanners(ctx context.Context, shopID string) (interface{}, error)
	GetFeaturedProducts(ctx context.Context) (interface{}, error)

	// Category CRUD
	CreateCategory(ctx context.Context, category *Category) error
	GetCategoryByID(ctx context.Context, id uint) (*Category, error)
	UpdateCategory(ctx context.Context, id uint, updates map[string]interface{}) error
	DeleteCategory(ctx context.Context, id uint) error

	// Product CRUD
	CreateProduct(ctx context.Context, product *Product) error
	GetProductByID(ctx context.Context, id uint) (*Product, error)
	UpdateProduct(ctx context.Context, id uint, updates map[string]interface{}) error
	DeleteProduct(ctx context.Context, id uint) error

	// Banner CRUD
	CreateBanner(ctx context.Context, banner *Banner) error
	GetBannerByID(ctx context.Context, id uint) (*Banner, error)
	UpdateBanner(ctx context.Context, id uint, updates map[string]interface{}) error
	DeleteBanner(ctx context.Context, id uint) error

	MerchantOwnsShop(ctx context.Context, shopID uint, merchantID int64) (bool, error)
}

type productRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) DB() *gorm.DB {
	return r.db
}

func (r *productRepository) GetCategories(ctx context.Context, shopID string) (interface{}, error) {
	var categories []Category
	query := r.db.Where("is_active = ?", true)

	if shopID != "" {
		query = query.Where("shop_id = ?", shopID)
	}

	if err := query.Order("sort_order ASC, id ASC").Find(&categories).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(categories))
	for _, cat := range categories {
		result = append(result, map[string]interface{}{
			"id":        cat.UID,
			"legacyId":  cat.ID,
			"tsid":      cat.TSID,
			"shopId":    cat.ShopID,
			"name":      cat.Name,
			"sortOrder": cat.SortOrder,
			"isActive":  cat.IsActive,
		})
	}

	return result, nil
}

func (r *productRepository) GetProducts(ctx context.Context, shopID string, categoryID string) (interface{}, error) {
	var products []Product
	query := r.db.Where("is_active = ?", true)

	if shopID != "" {
		query = query.Where("shop_id = ?", shopID)
	}

	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	if err := query.Order("sort_order ASC, id DESC").Find(&products).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(products))
	for _, product := range products {
		productMap := r.productToMap(product)
		result = append(result, productMap)
	}

	return result, nil
}

func (r *productRepository) GetProductDetail(ctx context.Context, productID string) (interface{}, error) {
	var product Product
	if err := r.db.Where("id = ?", productID).First(&product).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.productToMap(product), nil
}

func (r *productRepository) GetBanners(ctx context.Context, shopID string) (interface{}, error) {
	var banners []Banner
	query := r.db.Where("is_active = ?", true)

	if shopID != "" {
		query = query.Where("shop_id = ?", shopID)
	}

	if err := query.Order("sort_order ASC, id DESC").Find(&banners).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(banners))
	for _, banner := range banners {
		result = append(result, map[string]interface{}{
			"id":        banner.UID,
			"legacyId":  banner.ID,
			"tsid":      banner.TSID,
			"shopId":    banner.ShopID,
			"title":     banner.Title,
			"imageUrl":  banner.ImageURL,
			"linkType":  banner.LinkType,
			"linkValue": banner.LinkValue,
			"sortOrder": banner.SortOrder,
		})
	}

	return result, nil
}

func (r *productRepository) GetFeaturedProducts(ctx context.Context) (interface{}, error) {
	var products []Product
	if err := r.db.Where("is_featured = ? AND is_active = ?", true, true).
		Order("sort_order ASC, id DESC").
		Limit(20).
		Find(&products).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(products))
	for _, product := range products {
		productMap := r.productToMap(product)

		// 获取商家名称
		var shop Shop
		if err := r.db.Select("name").Where("id = ?", product.ShopID).First(&shop).Error; err == nil {
			productMap["shopName"] = shop.Name
		} else {
			productMap["shopName"] = ""
		}

		result = append(result, productMap)
	}

	return result, nil
}

func (r *productRepository) productToMap(product Product) map[string]interface{} {
	// 计算好评率
	goodReviewRate := 0.0
	if product.TotalReviews > 0 {
		goodReviewRate = float64(product.GoodReviews) / float64(product.TotalReviews) * 100
	}

	result := map[string]interface{}{
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

	// 解析 images JSON 字符串
	if product.Images != "" {
		var images []string
		if err := json.Unmarshal([]byte(product.Images), &images); err == nil {
			result["images"] = images
		} else {
			result["images"] = []string{}
		}
	} else {
		result["images"] = []string{}
	}

	// 解析 tags JSON 字符串
	if product.Tags != "" {
		var tags []string
		if err := json.Unmarshal([]byte(product.Tags), &tags); err == nil {
			result["tags"] = tags
		} else {
			result["tags"] = []string{}
		}
	} else {
		result["tags"] = []string{}
	}

	// 解析 nutrition JSON 对象
	if product.Nutrition != "" {
		var nutrition map[string]interface{}
		if err := json.Unmarshal([]byte(product.Nutrition), &nutrition); err == nil {
			result["nutrition"] = nutrition
		} else {
			result["nutrition"] = map[string]interface{}{}
		}
	} else {
		result["nutrition"] = map[string]interface{}{}
	}

	return result
}

// CreateCategory creates a new category
func (r *productRepository) CreateCategory(ctx context.Context, category *Category) error {
	return r.db.Create(category).Error
}

func (r *productRepository) GetCategoryByID(ctx context.Context, id uint) (*Category, error) {
	var category Category
	if err := r.db.WithContext(ctx).First(&category, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &category, nil
}

// UpdateCategory updates a category
func (r *productRepository) UpdateCategory(ctx context.Context, id uint, updates map[string]interface{}) error {
	return r.db.Model(&Category{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteCategory deletes a category
func (r *productRepository) DeleteCategory(ctx context.Context, id uint) error {
	return r.db.Delete(&Category{}, id).Error
}

// CreateProduct creates a new product
func (r *productRepository) CreateProduct(ctx context.Context, product *Product) error {
	return r.db.Create(product).Error
}

func (r *productRepository) GetProductByID(ctx context.Context, id uint) (*Product, error) {
	var product Product
	if err := r.db.WithContext(ctx).First(&product, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

// UpdateProduct updates a product
func (r *productRepository) UpdateProduct(ctx context.Context, id uint, updates map[string]interface{}) error {
	return r.db.Model(&Product{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteProduct deletes a product
func (r *productRepository) DeleteProduct(ctx context.Context, id uint) error {
	return r.db.Delete(&Product{}, id).Error
}

// CreateBanner creates a new banner
func (r *productRepository) CreateBanner(ctx context.Context, banner *Banner) error {
	return r.db.Create(banner).Error
}

func (r *productRepository) GetBannerByID(ctx context.Context, id uint) (*Banner, error) {
	var banner Banner
	if err := r.db.WithContext(ctx).First(&banner, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &banner, nil
}

// UpdateBanner updates a banner
func (r *productRepository) UpdateBanner(ctx context.Context, id uint, updates map[string]interface{}) error {
	return r.db.Model(&Banner{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteBanner deletes a banner
func (r *productRepository) DeleteBanner(ctx context.Context, id uint) error {
	return r.db.Delete(&Banner{}, id).Error
}

func (r *productRepository) MerchantOwnsShop(ctx context.Context, shopID uint, merchantID int64) (bool, error) {
	if shopID == 0 || merchantID <= 0 {
		return false, nil
	}
	var total int64
	if err := r.db.WithContext(ctx).
		Model(&Shop{}).
		Where("id = ? AND merchant_id = ?", shopID, merchantID).
		Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}
