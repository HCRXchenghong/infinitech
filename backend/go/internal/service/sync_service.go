package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/uploadasset"
	"gorm.io/gorm"
)

type SyncService struct {
	db    *gorm.DB
	redis *redis.Client
}

var (
	ErrInvalidSyncDataset = errors.New("invalid sync dataset")
	ErrInvalidSince       = errors.New("invalid since version")
)

var supportedSyncDatasets = map[string]struct{}{
	"shops":    {},
	"products": {},
	"orders":   {},
	"users":    {},
}

func NewSyncService(db *gorm.DB, redis *redis.Client) *SyncService {
	return &SyncService{
		db:    db,
		redis: redis,
	}
}

// GetSyncState 获取各数据集的版本号
func (s *SyncService) GetSyncState(ctx context.Context) (map[string]interface{}, error) {
	// 版本号直接基于数据库实时计算，避免 Redis 长缓存导致新增数据不同步。
	state := make(map[string]interface{})

	datasets := []string{"shops", "products", "orders", "users"}

	for _, dataset := range datasets {
		version := s.getVersionFromDB(dataset)

		// 可选写入 Redis，仅用于观测，不再作为读取来源。
		if s.redis != nil && version > 0 {
			key := fmt.Sprintf("sync:version:%s", dataset)
			s.redis.Set(ctx, key, version, 10*time.Minute)
		}

		state[dataset] = version
	}

	return state, nil
}

// GetSyncData 获取增量同步数据
func (s *SyncService) GetSyncData(ctx context.Context, dataset, since string) (map[string]interface{}, error) {
	if !isSyncDatasetSupported(dataset) {
		return nil, fmt.Errorf("%w: %s", ErrInvalidSyncDataset, dataset)
	}

	sinceVersion := int64(0)
	if since != "" {
		parsed, err := strconv.ParseInt(since, 10, 64)
		if err != nil || parsed < 0 {
			return nil, fmt.Errorf("%w: %s", ErrInvalidSince, since)
		}
		sinceVersion = parsed
	}

	// 获取当前版本
	currentVersion := s.getVersionFromDB(dataset)

	// 获取变更数据
	changed, deleted, err := s.getChanges(ctx, dataset, sinceVersion)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"dataset":    dataset,
		"since":      sinceVersion,
		"newVersion": currentVersion,
		"changed":    changed,
		"deleted":    deleted,
		"timestamp":  time.Now().Unix(),
	}, nil
}

// getVersionFromDB 从数据库获取版本号
func (s *SyncService) getVersionFromDB(dataset string) int64 {
	switch dataset {
	case "shops":
		return s.getMaxUpdatedUnix(&repository.Shop{})
	case "products":
		return s.getMaxUpdatedUnix(&repository.Product{})
	case "orders":
		return s.getMaxUpdatedUnix(&repository.Order{})
	case "users":
		return s.getMaxUpdatedUnix(&repository.User{})
	}

	return 0
}

func (s *SyncService) getMaxUpdatedUnix(model interface{}) int64 {
	var result map[string]interface{}
	if err := s.db.Model(model).Select("MAX(updated_at) AS max_updated").Take(&result).Error; err != nil {
		return 0
	}
	return parseMaxUpdatedUnix(result["max_updated"])
}

// getChanges 获取变更数据
func (s *SyncService) getChanges(ctx context.Context, dataset string, sinceVersion int64) ([]map[string]interface{}, []string, error) {
	switch dataset {
	case "shops":
		return s.getShopChanges(ctx, sinceVersion)
	case "products":
		return s.getProductChanges(ctx, sinceVersion)
	case "orders":
		return s.getOrderChanges(ctx, sinceVersion)
	case "users":
		return s.getUserChanges(ctx, sinceVersion)
	default:
		return nil, nil, fmt.Errorf("%w: %s", ErrInvalidSyncDataset, dataset)
	}
}

func (s *SyncService) getShopChanges(ctx context.Context, sinceVersion int64) ([]map[string]interface{}, []string, error) {
	var shops []repository.Shop
	query := s.db.WithContext(ctx).Model(&repository.Shop{})
	if sinceVersion > 0 {
		query = query.Where("updated_at > ?", time.Unix(sinceVersion, 0))
	}
	if err := query.Order("updated_at ASC").Find(&shops).Error; err != nil {
		return nil, nil, err
	}

	changed := make([]map[string]interface{}, 0, len(shops))
	deleted := make([]string, 0)

	for _, shop := range shops {
		// 非营业店铺从客户端本地缓存移除，保持与 /api/shops 的行为一致（仅返回营业中）。
		if !shop.IsActive {
			deleted = append(deleted, syncEntityID(shop.UID, shop.ID))
			continue
		}

		changed = append(changed, map[string]interface{}{
			"id":                         shop.UID,
			"merchantId":                 shop.MerchantID,
			"name":                       shop.Name,
			"orderType":                  shop.OrderType,
			"category":                   shop.BusinessCategory,
			"businessCategory":           shop.BusinessCategory,
			"coverImage":                 shop.CoverImage,
			"backgroundImage":            shop.BackgroundImage,
			"logo":                       shop.Logo,
			"merchantQualification":      uploadasset.BuildConfiguredPreviewURL(shop.MerchantQualification),
			"merchantQualificationImage": uploadasset.BuildConfiguredPreviewURL(shop.MerchantQualification),
			"businessLicense":            uploadasset.BuildConfiguredPreviewURL(shop.MerchantQualification),
			"businessLicenseImage":       uploadasset.BuildConfiguredPreviewURL(shop.MerchantQualification),
			"foodBusinessLicense":        uploadasset.BuildConfiguredPreviewURL(shop.FoodBusinessLicense),
			"foodBusinessLicenseImage":   uploadasset.BuildConfiguredPreviewURL(shop.FoodBusinessLicense),
			"foodLicense":                uploadasset.BuildConfiguredPreviewURL(shop.FoodBusinessLicense),
			"foodLicenseImage":           uploadasset.BuildConfiguredPreviewURL(shop.FoodBusinessLicense),
			"rating":                     shop.Rating,
			"monthlySales":               shop.MonthlySales,
			"perCapita":                  shop.PerCapita,
			"announcement":               shop.Announcement,
			"address":                    shop.Address,
			"phone":                      shop.Phone,
			"businessHours":              shop.BusinessHours,
			"tags":                       normalizeJSONArrayString(shop.Tags),
			"discounts":                  normalizeJSONArrayString(shop.Discounts),
			"isBrand":                    shop.IsBrand,
			"isFranchise":                shop.IsFranchise,
			"isTodayRecommended":         shop.IsTodayRecommended,
			"todayRecommendPosition":     shop.TodayRecommendPosition,
			"isActive":                   shop.IsActive,
			"minPrice":                   shop.MinPrice,
			"deliveryPrice":              shop.DeliveryPrice,
			"deliveryTime":               shop.DeliveryTime,
			"distance":                   shop.Distance,
			"created_at":                 shop.CreatedAt.Unix(),
			"updated_at":                 shop.UpdatedAt.Unix(),
		})
	}

	return changed, deleted, nil
}

func (s *SyncService) getProductChanges(ctx context.Context, sinceVersion int64) ([]map[string]interface{}, []string, error) {
	var products []repository.Product
	query := s.db.WithContext(ctx).Model(&repository.Product{})
	if sinceVersion > 0 {
		query = query.Where("updated_at > ?", time.Unix(sinceVersion, 0))
	}
	if err := query.Order("updated_at ASC").Find(&products).Error; err != nil {
		return nil, nil, err
	}

	shopNameMap := make(map[uint]string)
	if len(products) > 0 {
		shopIDs := make([]uint, 0, len(products))
		seen := make(map[uint]struct{}, len(products))
		for _, product := range products {
			if _, ok := seen[product.ShopID]; ok {
				continue
			}
			seen[product.ShopID] = struct{}{}
			shopIDs = append(shopIDs, product.ShopID)
		}
		var shops []repository.Shop
		if err := s.db.WithContext(ctx).Select("id, name").Where("id IN ?", shopIDs).Find(&shops).Error; err == nil {
			for _, shop := range shops {
				shopNameMap[shop.ID] = shop.Name
			}
		}
	}

	changed := make([]map[string]interface{}, 0, len(products))
	deleted := make([]string, 0)

	for _, product := range products {
		if !product.IsActive {
			deleted = append(deleted, syncEntityID(product.UID, product.ID))
			continue
		}

		changed = append(changed, map[string]interface{}{
			"id":            product.UID,
			"shopId":        product.ShopID,
			"categoryId":    product.CategoryID,
			"name":          product.Name,
			"description":   product.Description,
			"image":         product.Image,
			"images":        normalizeJSONArrayString(product.Images),
			"price":         product.Price,
			"originalPrice": product.OriginalPrice,
			"monthlySales":  product.MonthlySales,
			"rating":        product.Rating,
			"goodReviews":   product.GoodReviews,
			"stock":         product.Stock,
			"unit":          product.Unit,
			"nutrition":     normalizeJSONObjectString(product.Nutrition),
			"tags":          normalizeJSONArrayString(product.Tags),
			"isRecommend":   product.IsRecommend,
			"isFeatured":    product.IsFeatured,
			"isActive":      product.IsActive,
			"sortOrder":     product.SortOrder,
			"shopName":      shopNameMap[product.ShopID],
			"created_at":    product.CreatedAt.Unix(),
			"updated_at":    product.UpdatedAt.Unix(),
		})
	}

	return changed, deleted, nil
}

func (s *SyncService) getOrderChanges(ctx context.Context, sinceVersion int64) ([]map[string]interface{}, []string, error) {
	var orders []repository.Order
	query := s.db.WithContext(ctx).Model(&repository.Order{})
	if sinceVersion > 0 {
		query = query.Where("updated_at > ?", time.Unix(sinceVersion, 0))
	}
	if err := query.Order("updated_at ASC").Find(&orders).Error; err != nil {
		return nil, nil, err
	}

	changed := make([]map[string]interface{}, 0, len(orders))
	for _, order := range orders {
		changed = append(changed, map[string]interface{}{
			"id":          order.UID,
			"user_id":     order.UserID,
			"shop_id":     order.ShopID,
			"status":      order.Status,
			"total_price": order.TotalPrice,
			"items":       order.Items,
			"address":     order.Address,
			"created_at":  order.CreatedAt.Unix(),
			"updated_at":  order.UpdatedAt.Unix(),
		})
	}
	return changed, []string{}, nil
}

func (s *SyncService) getUserChanges(ctx context.Context, sinceVersion int64) ([]map[string]interface{}, []string, error) {
	var users []repository.User
	query := s.db.WithContext(ctx).Model(&repository.User{})
	if sinceVersion > 0 {
		query = query.Where("updated_at > ?", time.Unix(sinceVersion, 0))
	}
	if err := query.Order("updated_at ASC").Find(&users).Error; err != nil {
		return nil, nil, err
	}

	changed := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		changed = append(changed, map[string]interface{}{
			"id":         syncEntityID(user.UID, user.ID),
			"name":       user.Name,
			"phone":      user.Phone,
			"type":       user.Type,
			"created_at": user.CreatedAt.Unix(),
			"updated_at": user.UpdatedAt.Unix(),
		})
	}

	// users 当前未暴露软删除状态，保持空 deleted。
	return changed, []string{}, nil
}

func isSyncDatasetSupported(dataset string) bool {
	_, ok := supportedSyncDatasets[dataset]
	return ok
}

func syncEntityID(uid string, legacyID uint) string {
	if uid != "" {
		return uid
	}
	return strconv.FormatUint(uint64(legacyID), 10)
}

func parseMaxUpdatedUnix(raw interface{}) int64 {
	switch value := raw.(type) {
	case nil:
		return 0
	case time.Time:
		if value.IsZero() {
			return 0
		}
		return value.Unix()
	case *time.Time:
		if value == nil || value.IsZero() {
			return 0
		}
		return value.Unix()
	case []byte:
		return parseMaxUpdatedTimeStringUnix(string(value))
	case string:
		return parseMaxUpdatedTimeStringUnix(value)
	case int64:
		return value
	case int:
		return int64(value)
	case float64:
		return int64(value)
	default:
		return 0
	}
}

func parseMaxUpdatedTimeStringUnix(raw string) int64 {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0
	}

	if unix, err := strconv.ParseInt(value, 10, 64); err == nil {
		return unix
	}

	layouts := []string{
		time.RFC3339Nano,
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05.999999999Z07:00",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t.Unix()
		}
	}

	return 0
}

func normalizeJSONArrayString(raw string) string {
	return normalizeJSON(raw, "[]")
}

func normalizeJSONObjectString(raw string) string {
	return normalizeJSON(raw, "{}")
}

func normalizeJSON(raw, fallback string) string {
	if raw == "" {
		return fallback
	}

	var payload interface{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return fallback
	}

	return raw
}

// UpdateVersion 更新数据集版本号
func (s *SyncService) UpdateVersion(ctx context.Context, dataset string, version int64) error {
	key := fmt.Sprintf("sync:version:%s", dataset)

	if s.redis != nil {
		return s.redis.Set(ctx, key, version, 24*time.Hour).Err()
	}

	return nil
}
