package repository

import (
	"context"
	"gorm.io/gorm"
)

type FeaturedProductRepository interface {
	DB() *gorm.DB
	GetFeaturedProducts(ctx context.Context) (interface{}, error)
	AddFeaturedProduct(ctx context.Context, productID uint, position int) error
	RemoveFeaturedProduct(ctx context.Context, id uint) error
	UpdateFeaturedProductPosition(ctx context.Context, id uint, position int) error
	GetFeaturedProductByID(ctx context.Context, id uint) (*FeaturedProduct, error)
}

type featuredProductRepository struct {
	db *gorm.DB
}

func NewFeaturedProductRepository(db *gorm.DB) FeaturedProductRepository {
	return &featuredProductRepository{db: db}
}

func (r *featuredProductRepository) DB() *gorm.DB {
	return r.db
}

// GetFeaturedProducts 获取今日推荐商品列表（带商品详情）
func (r *featuredProductRepository) GetFeaturedProducts(ctx context.Context) (interface{}, error) {
	var featuredProducts []FeaturedProduct

	// 查询启用的推荐商品，按position排序
	if err := r.db.Where("is_active = ?", true).
		Order("position ASC, id ASC").
		Find(&featuredProducts).Error; err != nil {
		return nil, err
	}

	// 获取商品详情
	result := make([]map[string]interface{}, 0, len(featuredProducts))
	for _, fp := range featuredProducts {
		var product Product
		if err := r.db.Where("id = ?", fp.ProductID).First(&product).Error; err != nil {
			continue // 跳过找不到的商品
		}

		// 获取店铺名称
		var shop Shop
		shopName := ""
		if err := r.db.Select("name").Where("id = ?", product.ShopID).First(&shop).Error; err == nil {
			shopName = shop.Name
		}

		// 构建返回数据
		productMap := map[string]interface{}{
			"id":            fp.UID,
			"legacyId":      fp.ID,
			"tsid":          fp.TSID,
			"productId":     fp.ProductID,
			"position":      fp.Position,
			"isActive":      fp.IsActive,
			"productName":   product.Name,
			"productImage":  product.Image,
			"price":         product.Price,
			"originalPrice": product.OriginalPrice,
			"monthlySales":  product.MonthlySales,
			"rating":        product.Rating,
			"shopId":        product.ShopID,
			"shopName":      shopName,
			"created_at":    fp.CreatedAt,
			"updated_at":    fp.UpdatedAt,
		}

		result = append(result, productMap)
	}

	return result, nil
}

// AddFeaturedProduct 添加今日推荐商品
func (r *featuredProductRepository) AddFeaturedProduct(ctx context.Context, productID uint, position int) error {
	fp := &FeaturedProduct{
		ProductID: productID,
		Position:  position,
		IsActive:  true,
	}
	return r.db.Create(fp).Error
}

// RemoveFeaturedProduct 删除今日推荐商品
func (r *featuredProductRepository) RemoveFeaturedProduct(ctx context.Context, id uint) error {
	return r.db.Where("id = ?", id).Delete(&FeaturedProduct{}).Error
}

// UpdateFeaturedProductPosition 更新推荐位置
func (r *featuredProductRepository) UpdateFeaturedProductPosition(ctx context.Context, id uint, position int) error {
	return r.db.Model(&FeaturedProduct{}).
		Where("id = ?", id).
		Update("position", position).Error
}

// GetFeaturedProductByID 根据ID获取推荐商品
func (r *featuredProductRepository) GetFeaturedProductByID(ctx context.Context, id uint) (*FeaturedProduct, error) {
	var fp FeaturedProduct
	if err := r.db.Where("id = ?", id).First(&fp).Error; err != nil {
		return nil, err
	}
	return &fp, nil
}
