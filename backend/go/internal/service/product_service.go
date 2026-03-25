package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/repository"
)

type ProductService struct {
	repo  repository.ProductRepository
	redis *redis.Client
}

func NewProductService(repo repository.ProductRepository, redis *redis.Client) *ProductService {
	return &ProductService{
		repo:  repo,
		redis: redis,
	}
}

func (s *ProductService) GetCategories(ctx context.Context, shopID string) (interface{}, error) {
	// 先尝试从 Redis 获取
	if s.redis != nil {
		cacheKey := fmt.Sprintf("cache:shop:%s:categories", shopID)
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var categories []interface{}
			if json.Unmarshal([]byte(cached), &categories) == nil {
				return categories, nil
			}
		}
	}

	// Redis 没有，从数据库获取
	categories, err := s.repo.GetCategories(ctx, shopID)
	if err != nil {
		return nil, err
	}

	// 存入 Redis（缓存 10 分钟）
	if s.redis != nil && categories != nil {
		if data, err := json.Marshal(categories); err == nil {
			s.redis.Set(ctx, fmt.Sprintf("cache:shop:%s:categories", shopID), data, 10*time.Minute)
		}
	}

	return categories, nil
}

func (s *ProductService) GetProducts(ctx context.Context, shopID string, categoryID string) (interface{}, error) {
	// 先尝试从 Redis 获取
	if s.redis != nil {
		cacheKey := fmt.Sprintf("cache:shop:%s:category:%s:products", shopID, categoryID)
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var products []interface{}
			if json.Unmarshal([]byte(cached), &products) == nil {
				return products, nil
			}
		}
	}

	// Redis 没有，从数据库获取
	products, err := s.repo.GetProducts(ctx, shopID, categoryID)
	if err != nil {
		return nil, err
	}

	// 存入 Redis（缓存 5 分钟）
	if s.redis != nil && products != nil {
		if data, err := json.Marshal(products); err == nil {
			s.redis.Set(ctx, fmt.Sprintf("cache:shop:%s:category:%s:products", shopID, categoryID), data, 5*time.Minute)
		}
	}

	return products, nil
}

func (s *ProductService) GetProductDetail(ctx context.Context, productID string) (interface{}, error) {
	// 先尝试从 Redis 获取
	if s.redis != nil {
		cacheKey := fmt.Sprintf("cache:product:%s", productID)
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var product map[string]interface{}
			if json.Unmarshal([]byte(cached), &product) == nil {
				return product, nil
			}
		}
	}

	// Redis 没有，从数据库获取
	product, err := s.repo.GetProductDetail(ctx, productID)
	if err != nil {
		return nil, err
	}

	// 存入 Redis（缓存 10 分钟）
	if s.redis != nil && product != nil {
		if data, err := json.Marshal(product); err == nil {
			s.redis.Set(ctx, fmt.Sprintf("cache:product:%s", productID), data, 10*time.Minute)
		}
	}

	return product, nil
}

func (s *ProductService) GetBanners(ctx context.Context, shopID string) (interface{}, error) {
	// 先尝试从 Redis 获取
	if s.redis != nil {
		cacheKey := fmt.Sprintf("cache:shop:%s:banners", shopID)
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var banners []interface{}
			if json.Unmarshal([]byte(cached), &banners) == nil {
				return banners, nil
			}
		}
	}

	// Redis 没有，从数据库获取
	banners, err := s.repo.GetBanners(ctx, shopID)
	if err != nil {
		return nil, err
	}

	// 存入 Redis（缓存 10 分钟）
	if s.redis != nil && banners != nil {
		if data, err := json.Marshal(banners); err == nil {
			s.redis.Set(ctx, fmt.Sprintf("cache:shop:%s:banners", shopID), data, 10*time.Minute)
		}
	}

	return banners, nil
}

func (s *ProductService) GetFeaturedProducts(ctx context.Context) (interface{}, error) {
	// 先尝试从 Redis 获取
	if s.redis != nil {
		cacheKey := "cache:products:featured"
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var products []interface{}
			if json.Unmarshal([]byte(cached), &products) == nil {
				return products, nil
			}
		}
	}

	// Redis 没有，从数据库获取
	products, err := s.repo.GetFeaturedProducts(ctx)
	if err != nil {
		return nil, err
	}

	// 存入 Redis（缓存 10 分钟）
	if s.redis != nil && products != nil {
		if data, err := json.Marshal(products); err == nil {
			s.redis.Set(ctx, "cache:products:featured", data, 10*time.Minute)
		}
	}

	return products, nil
}

// CreateCategory creates a new category and clears cache
func (s *ProductService) CreateCategory(ctx context.Context, category *repository.Category) error {
	if category == nil {
		return fmt.Errorf("invalid category payload")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, category.ShopID); err != nil {
		return err
	}

	if err := s.repo.CreateCategory(ctx, category); err != nil {
		return err
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:categories", category.ShopID))
	}
	return nil
}

// UpdateCategory updates a category and clears cache
func (s *ProductService) UpdateCategory(ctx context.Context, id string, shopID string, updates map[string]interface{}) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "categories", id)
	if err != nil {
		return err
	}
	resolvedShopID, err := resolveOptionalEntityID(ctx, s.repo.DB(), "shops", shopID)
	if err != nil {
		return err
	}

	current, err := s.repo.GetCategoryByID(ctx, resolvedID)
	if err != nil {
		return err
	}
	if current == nil {
		return fmt.Errorf("category not found")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, current.ShopID); err != nil {
		return err
	}
	if authContextRole(ctx) == "merchant" {
		if targetShopID, ok := parseUintField(updates, "shopId", "shop_id"); ok && targetShopID != 0 && targetShopID != current.ShopID {
			return fmt.Errorf("%w: merchant cannot move category to another shop", ErrForbidden)
		}
	}

	if err := s.repo.UpdateCategory(ctx, resolvedID, updates); err != nil {
		return err
	}
	if resolvedShopID == 0 {
		resolvedShopID = current.ShopID
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:categories", resolvedShopID))
	}
	return nil
}

// DeleteCategory deletes a category and clears cache
func (s *ProductService) DeleteCategory(ctx context.Context, id string, shopID string) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "categories", id)
	if err != nil {
		return err
	}
	resolvedShopID, err := resolveOptionalEntityID(ctx, s.repo.DB(), "shops", shopID)
	if err != nil {
		return err
	}

	current, err := s.repo.GetCategoryByID(ctx, resolvedID)
	if err != nil {
		return err
	}
	if current == nil {
		return fmt.Errorf("category not found")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, current.ShopID); err != nil {
		return err
	}

	if err := s.repo.DeleteCategory(ctx, resolvedID); err != nil {
		return err
	}
	if resolvedShopID == 0 {
		resolvedShopID = current.ShopID
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:categories", resolvedShopID))
	}
	return nil
}

// CreateProduct creates a new product and clears cache
func (s *ProductService) CreateProduct(ctx context.Context, product *repository.Product) error {
	if product == nil {
		return fmt.Errorf("invalid product payload")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, product.ShopID); err != nil {
		return err
	}
	category, err := s.repo.GetCategoryByID(ctx, product.CategoryID)
	if err != nil {
		return err
	}
	if category == nil {
		return fmt.Errorf("category not found")
	}
	if category.ShopID != product.ShopID {
		return fmt.Errorf("category does not belong to the shop")
	}

	if err := s.repo.CreateProduct(ctx, product); err != nil {
		return err
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:category:%d:products", product.ShopID, product.CategoryID))
	}
	return nil
}

// UpdateProduct updates a product and clears cache
func (s *ProductService) UpdateProduct(ctx context.Context, id string, shopID string, categoryID string, updates map[string]interface{}) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "products", id)
	if err != nil {
		return err
	}
	resolvedShopID, err := resolveOptionalEntityID(ctx, s.repo.DB(), "shops", shopID)
	if err != nil {
		return err
	}
	resolvedCategoryID, err := resolveOptionalEntityID(ctx, s.repo.DB(), "categories", categoryID)
	if err != nil {
		return err
	}

	current, err := s.repo.GetProductByID(ctx, resolvedID)
	if err != nil {
		return err
	}
	if current == nil {
		return fmt.Errorf("product not found")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, current.ShopID); err != nil {
		return err
	}
	if authContextRole(ctx) == "merchant" {
		if targetShopID, ok := parseUintField(updates, "shopId", "shop_id"); ok && targetShopID != 0 && targetShopID != current.ShopID {
			return fmt.Errorf("%w: merchant cannot move product to another shop", ErrForbidden)
		}
	}
	if targetCategoryID, ok := parseUintField(updates, "categoryId", "category_id"); ok && targetCategoryID != 0 {
		category, catErr := s.repo.GetCategoryByID(ctx, targetCategoryID)
		if catErr != nil {
			return catErr
		}
		if category == nil {
			return fmt.Errorf("category not found")
		}
		targetShopID := current.ShopID
		if updatedShopID, ok := parseUintField(updates, "shopId", "shop_id"); ok && updatedShopID > 0 {
			targetShopID = updatedShopID
		}
		if category.ShopID != targetShopID {
			return fmt.Errorf("category does not belong to target shop")
		}
	} else if resolvedCategoryID > 0 && resolvedCategoryID != current.CategoryID {
		category, catErr := s.repo.GetCategoryByID(ctx, resolvedCategoryID)
		if catErr != nil {
			return catErr
		}
		if category == nil {
			return fmt.Errorf("category not found")
		}
		targetShopID := current.ShopID
		if updatedShopID, ok := parseUintField(updates, "shopId", "shop_id"); ok && updatedShopID > 0 {
			targetShopID = updatedShopID
		}
		if category.ShopID != targetShopID {
			return fmt.Errorf("category does not belong to target shop")
		}
	}

	if err := s.repo.UpdateProduct(ctx, resolvedID, updates); err != nil {
		return err
	}
	if resolvedShopID == 0 {
		resolvedShopID = current.ShopID
	}
	if resolvedCategoryID == 0 {
		resolvedCategoryID = current.CategoryID
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:category:%d:products", resolvedShopID, resolvedCategoryID))
		s.redis.Del(ctx, fmt.Sprintf("cache:product:%d", resolvedID))
		if strings.TrimSpace(current.UID) != "" {
			s.redis.Del(ctx, fmt.Sprintf("cache:product:%s", strings.TrimSpace(current.UID)))
		}
		if strings.TrimSpace(current.TSID) != "" {
			s.redis.Del(ctx, fmt.Sprintf("cache:product:%s", strings.TrimSpace(current.TSID)))
		}
	}
	return nil
}

// DeleteProduct deletes a product and clears cache
func (s *ProductService) DeleteProduct(ctx context.Context, id string, shopID string, categoryID string) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "products", id)
	if err != nil {
		return err
	}
	resolvedShopID, err := resolveOptionalEntityID(ctx, s.repo.DB(), "shops", shopID)
	if err != nil {
		return err
	}
	resolvedCategoryID, err := resolveOptionalEntityID(ctx, s.repo.DB(), "categories", categoryID)
	if err != nil {
		return err
	}

	current, err := s.repo.GetProductByID(ctx, resolvedID)
	if err != nil {
		return err
	}
	if current == nil {
		return fmt.Errorf("product not found")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, current.ShopID); err != nil {
		return err
	}

	if err := s.repo.DeleteProduct(ctx, resolvedID); err != nil {
		return err
	}
	if resolvedShopID == 0 {
		resolvedShopID = current.ShopID
	}
	if resolvedCategoryID == 0 {
		resolvedCategoryID = current.CategoryID
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:category:%d:products", resolvedShopID, resolvedCategoryID))
		s.redis.Del(ctx, fmt.Sprintf("cache:product:%d", resolvedID))
		if strings.TrimSpace(current.UID) != "" {
			s.redis.Del(ctx, fmt.Sprintf("cache:product:%s", strings.TrimSpace(current.UID)))
		}
		if strings.TrimSpace(current.TSID) != "" {
			s.redis.Del(ctx, fmt.Sprintf("cache:product:%s", strings.TrimSpace(current.TSID)))
		}
	}
	return nil
}

// CreateBanner creates a new banner and clears cache
func (s *ProductService) CreateBanner(ctx context.Context, banner *repository.Banner) error {
	if banner == nil {
		return fmt.Errorf("invalid banner payload")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, banner.ShopID); err != nil {
		return err
	}

	if err := s.repo.CreateBanner(ctx, banner); err != nil {
		return err
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:banners", banner.ShopID))
	}
	return nil
}

// UpdateBanner updates a banner and clears cache
func (s *ProductService) UpdateBanner(ctx context.Context, id string, shopID string, updates map[string]interface{}) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "banners", id)
	if err != nil {
		return err
	}
	resolvedShopID, err := resolveOptionalEntityID(ctx, s.repo.DB(), "shops", shopID)
	if err != nil {
		return err
	}

	current, err := s.repo.GetBannerByID(ctx, resolvedID)
	if err != nil {
		return err
	}
	if current == nil {
		return fmt.Errorf("banner not found")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, current.ShopID); err != nil {
		return err
	}
	if authContextRole(ctx) == "merchant" {
		if targetShopID, ok := parseUintField(updates, "shopId", "shop_id"); ok && targetShopID != 0 && targetShopID != current.ShopID {
			return fmt.Errorf("%w: merchant cannot move banner to another shop", ErrForbidden)
		}
	}

	if err := s.repo.UpdateBanner(ctx, resolvedID, updates); err != nil {
		return err
	}
	if resolvedShopID == 0 {
		resolvedShopID = current.ShopID
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:banners", resolvedShopID))
	}
	return nil
}

// DeleteBanner deletes a banner and clears cache
func (s *ProductService) DeleteBanner(ctx context.Context, id string, shopID string) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "banners", id)
	if err != nil {
		return err
	}
	resolvedShopID, err := resolveOptionalEntityID(ctx, s.repo.DB(), "shops", shopID)
	if err != nil {
		return err
	}

	current, err := s.repo.GetBannerByID(ctx, resolvedID)
	if err != nil {
		return err
	}
	if current == nil {
		return fmt.Errorf("banner not found")
	}
	if err := s.ensureMerchantCanAccessShop(ctx, current.ShopID); err != nil {
		return err
	}

	if err := s.repo.DeleteBanner(ctx, resolvedID); err != nil {
		return err
	}
	if resolvedShopID == 0 {
		resolvedShopID = current.ShopID
	}
	// Clear cache
	if s.redis != nil {
		s.redis.Del(ctx, fmt.Sprintf("cache:shop:%d:banners", resolvedShopID))
	}
	return nil
}

func (s *ProductService) ensureMerchantCanAccessShop(ctx context.Context, shopID uint) error {
	if authContextRole(ctx) != "merchant" {
		return nil
	}
	merchantID := authContextInt64(ctx, "merchant_id")
	if merchantID <= 0 {
		return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
	}
	owned, err := s.repo.MerchantOwnsShop(ctx, shopID, merchantID)
	if err != nil {
		return err
	}
	if !owned {
		return fmt.Errorf("%w: merchant cannot operate resources of this shop", ErrForbidden)
	}
	return nil
}

func parseUintField(data map[string]interface{}, keys ...string) (uint, bool) {
	if len(data) == 0 || len(keys) == 0 {
		return 0, false
	}
	for _, key := range keys {
		raw, ok := data[key]
		if !ok {
			continue
		}
		value := strings.TrimSpace(fmt.Sprintf("%v", raw))
		if value == "" {
			return 0, true
		}
		parsed := toInt(raw)
		if parsed <= 0 {
			return 0, true
		}
		return uint(parsed), true
	}
	return 0, false
}
