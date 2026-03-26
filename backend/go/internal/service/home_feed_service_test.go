package service

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newHomeFeedServiceForTest(t *testing.T) (*HomeFeedService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "home_feed_service_test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("resolve sql db failed: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	if err := db.AutoMigrate(
		&repository.Shop{},
		&repository.Category{},
		&repository.Product{},
		&repository.FeaturedProduct{},
		&repository.HomePromotionCampaign{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	return NewHomeFeedService(
		db,
		repository.NewShopRepository(db),
		repository.NewFeaturedProductRepository(db),
	), db
}

func TestHomeFeedServiceGetHomeFeedAppliesPromotionPriority(t *testing.T) {
	svc, db := newHomeFeedServiceForTest(t)
	ctx := context.Background()
	now := time.Now()

	shops := []repository.Shop{
		{
			UnifiedIdentity:        repository.UnifiedIdentity{UID: "26032711000001", TSID: "260327110000000000000001"},
			Name:                   "自然商户",
			BusinessCategory:       "美食",
			IsTodayRecommended:     true,
			TodayRecommendPosition: 1,
			IsActive:               true,
		},
		{
			UnifiedIdentity:        repository.UnifiedIdentity{UID: "26032711000002", TSID: "260327110000000000000002"},
			Name:                   "付费商户",
			BusinessCategory:       "美食",
			TodayRecommendPosition: 2,
			IsActive:               true,
		},
		{
			UnifiedIdentity:        repository.UnifiedIdentity{UID: "26032711000003", TSID: "260327110000000000000003"},
			Name:                   "锁位商户",
			BusinessCategory:       "美食",
			TodayRecommendPosition: 3,
			IsActive:               true,
		},
	}
	if err := db.Create(&shops).Error; err != nil {
		t.Fatalf("seed shops failed: %v", err)
	}

	campaigns := []repository.HomePromotionCampaign{
		{
			UnifiedIdentity:  repository.UnifiedIdentity{UID: "26032761000001", TSID: "260327610000000000000001"},
			ObjectType:       "shop",
			TargetLegacyID:   shops[2].ID,
			TargetPublicID:   shops[2].UID,
			SlotPosition:     1,
			Status:           "approved",
			IsPositionLocked: true,
			PromoteLabel:     "",
			StartAt:          now.Add(-time.Hour),
			EndAt:            now.Add(time.Hour),
			CreatedAt:        now,
			UpdatedAt:        now,
		},
		{
			UnifiedIdentity:  repository.UnifiedIdentity{UID: "26032761000002", TSID: "260327610000000000000002"},
			ObjectType:       "shop",
			TargetLegacyID:   shops[1].ID,
			TargetPublicID:   shops[1].UID,
			SlotPosition:     2,
			Status:           "approved",
			IsPositionLocked: false,
			PromoteLabel:     "品牌推广",
			StartAt:          now.Add(-time.Hour),
			EndAt:            now.Add(time.Hour),
			CreatedAt:        now,
			UpdatedAt:        now.Add(time.Minute),
		},
	}
	if err := db.Create(&campaigns).Error; err != nil {
		t.Fatalf("seed campaigns failed: %v", err)
	}

	feed, err := svc.GetHomeFeed(ctx, HomeFeedQuery{})
	if err != nil {
		t.Fatalf("GetHomeFeed failed: %v", err)
	}

	shopFeed, ok := feed["shops"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected shops feed slice, got %T", feed["shops"])
	}
	if len(shopFeed) < 3 {
		t.Fatalf("expected at least 3 shops, got %d", len(shopFeed))
	}

	if got := stringValue(shopFeed[0]["name"]); got != "锁位商户" {
		t.Fatalf("expected locked shop first, got %q", got)
	}
	if got := stringValue(shopFeed[0]["positionSource"]); got != "manual_locked" {
		t.Fatalf("expected manual_locked source, got %q", got)
	}
	if got := stringValue(shopFeed[0]["promoteLabel"]); got != "推广" {
		t.Fatalf("expected default promote label, got %q", got)
	}

	if got := stringValue(shopFeed[1]["name"]); got != "付费商户" {
		t.Fatalf("expected paid shop second, got %q", got)
	}
	if got := stringValue(shopFeed[1]["positionSource"]); got != "paid_campaign" {
		t.Fatalf("expected paid campaign source, got %q", got)
	}
	if got := stringValue(shopFeed[1]["promoteLabel"]); got != "品牌推广" {
		t.Fatalf("expected explicit promote label, got %q", got)
	}

	if got := stringValue(shopFeed[2]["name"]); got != "自然商户" {
		t.Fatalf("expected organic shop pushed to third position, got %q", got)
	}

	total, ok := feed["campaigns"].(int)
	if !ok {
		t.Fatalf("expected campaign count int, got %T", feed["campaigns"])
	}
	if total != 2 {
		t.Fatalf("expected campaign count 2, got %d", total)
	}
}

func TestHomeFeedServiceListCampaignsIncludesEffectiveStatusAndTargetName(t *testing.T) {
	svc, db := newHomeFeedServiceForTest(t)
	ctx := context.Background()
	now := time.Now()

	shop := repository.Shop{
		UnifiedIdentity:  repository.UnifiedIdentity{UID: "26032712000001", TSID: "260327120000000000000001"},
		Name:             "测试商户",
		BusinessCategory: "美食",
		IsActive:         true,
	}
	if err := db.Create(&shop).Error; err != nil {
		t.Fatalf("seed shop failed: %v", err)
	}

	category := repository.Category{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "26032713000001", TSID: "260327130000000000000001"},
		ShopID:          shop.ID,
		Name:            "热卖",
		IsActive:        true,
	}
	if err := db.Create(&category).Error; err != nil {
		t.Fatalf("seed category failed: %v", err)
	}

	product := repository.Product{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "26032714000001", TSID: "260327140000000000000001"},
		ShopID:          shop.ID,
		CategoryID:      category.ID,
		Name:            "测试商品",
		Price:           18.8,
		IsActive:        true,
	}
	if err := db.Create(&product).Error; err != nil {
		t.Fatalf("seed product failed: %v", err)
	}

	campaigns := []repository.HomePromotionCampaign{
		{
			UnifiedIdentity: repository.UnifiedIdentity{UID: "26032762000001", TSID: "260327620000000000000001"},
			ObjectType:      "shop",
			TargetLegacyID:  shop.ID,
			TargetPublicID:  shop.UID,
			SlotPosition:    1,
			Status:          "approved",
			PromoteLabel:    "即将开始",
			StartAt:         now.Add(time.Hour),
			EndAt:           now.Add(2 * time.Hour),
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{UID: "26032762000002", TSID: "260327620000000000000002"},
			ObjectType:      "product",
			TargetLegacyID:  product.ID,
			TargetPublicID:  product.UID,
			SlotPosition:    2,
			Status:          "approved",
			PromoteLabel:    "历史活动",
			StartAt:         now.Add(-2 * time.Hour),
			EndAt:           now.Add(-time.Hour),
			CreatedAt:       now,
			UpdatedAt:       now.Add(time.Minute),
		},
	}
	if err := db.Create(&campaigns).Error; err != nil {
		t.Fatalf("seed campaigns failed: %v", err)
	}

	result, err := svc.ListCampaigns(ctx, HomePromotionListQuery{})
	if err != nil {
		t.Fatalf("ListCampaigns failed: %v", err)
	}

	items, ok := result["campaigns"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected campaign list slice, got %T", result["campaigns"])
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 campaigns, got %d", len(items))
	}

	byTargetName := map[string]map[string]interface{}{}
	for _, item := range items {
		byTargetName[stringValue(item["targetName"])] = item
	}

	shopCampaign, ok := byTargetName["测试商户"]
	if !ok {
		t.Fatalf("expected shop campaign target name to be resolved")
	}
	if got := stringValue(shopCampaign["effectiveStatus"]); got != "scheduled" {
		t.Fatalf("expected scheduled status, got %q", got)
	}

	productCampaign, ok := byTargetName["测试商品"]
	if !ok {
		t.Fatalf("expected product campaign target name to be resolved")
	}
	if got := stringValue(productCampaign["effectiveStatus"]); got != "ended" {
		t.Fatalf("expected ended status, got %q", got)
	}
}
