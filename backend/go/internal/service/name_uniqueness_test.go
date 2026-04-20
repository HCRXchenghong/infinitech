package service

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func openNameUniquenessTestDB(t *testing.T, models ...interface{}) *gorm.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "name_uniqueness_test.db")
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

	if err := db.AutoMigrate(models...); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	return db
}

func TestCreateCategoryRejectsDuplicateNameWithinShop(t *testing.T) {
	db := openNameUniquenessTestDB(t, &repository.Shop{}, &repository.Category{})
	repo := repository.NewProductRepository(db)
	svc := NewProductService(repo, nil)

	shop := repository.Shop{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "shop-name-test-001", TSID: "shop-name-test-001-tsid-0001"},
		Name:            "Alpha Shop",
	}
	if err := db.Create(&shop).Error; err != nil {
		t.Fatalf("create shop failed: %v", err)
	}
	if err := db.Create(&repository.Category{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "category-test-0001", TSID: "category-test-0001-tsid0001"},
		ShopID:          shop.ID,
		Name:            "Hot Sale",
	}).Error; err != nil {
		t.Fatalf("create category failed: %v", err)
	}

	err := svc.CreateCategory(context.Background(), &repository.Category{
		ShopID: shop.ID,
		Name:   "  hot sale  ",
	})
	if !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected ErrInvalidArgument, got %v", err)
	}
	if !strings.Contains(err.Error(), "分类名称已存在") {
		t.Fatalf("expected duplicate category hint, got %v", err)
	}
}

func TestUpdateBannerRejectsDuplicateTitleWithinShop(t *testing.T) {
	db := openNameUniquenessTestDB(t, &repository.Shop{}, &repository.Banner{})
	repo := repository.NewProductRepository(db)
	svc := NewProductService(repo, nil)

	shop := repository.Shop{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "shop-name-test-002", TSID: "shop-name-test-002-tsid-0002"},
		Name:            "Banner Shop",
	}
	if err := db.Create(&shop).Error; err != nil {
		t.Fatalf("create shop failed: %v", err)
	}

	first := repository.Banner{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "banner-name-test01", TSID: "banner-name-test01-tsid0001"},
		ShopID:          shop.ID,
		Title:           "Hero Banner",
		ImageURL:        "/hero-a.png",
		IsActive:        true,
	}
	second := repository.Banner{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "banner-name-test02", TSID: "banner-name-test02-tsid0002"},
		ShopID:          shop.ID,
		Title:           "Promo Banner",
		ImageURL:        "/hero-b.png",
		IsActive:        true,
	}
	if err := db.Create(&first).Error; err != nil {
		t.Fatalf("create first banner failed: %v", err)
	}
	if err := db.Create(&second).Error; err != nil {
		t.Fatalf("create second banner failed: %v", err)
	}

	err := svc.UpdateBanner(
		context.Background(),
		fmt.Sprintf("%d", second.ID),
		fmt.Sprintf("%d", shop.ID),
		map[string]interface{}{"title": "  hero banner "},
	)
	if !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected ErrInvalidArgument, got %v", err)
	}
	if !strings.Contains(err.Error(), "轮播图标题已存在") {
		t.Fatalf("expected duplicate banner hint, got %v", err)
	}
}

func TestCreateCarouselRejectsDuplicateTitle(t *testing.T) {
	db := openNameUniquenessTestDB(t, &repository.Carousel{})
	svc := NewAdminService(db, nil, "test-secret")

	if err := db.Create(&repository.Carousel{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "carousel-name-test", TSID: "carousel-name-test-tsid0001"},
		Title:           "Home Hero",
		ImageURL:        "/hero.png",
		IsActive:        true,
	}).Error; err != nil {
		t.Fatalf("create carousel failed: %v", err)
	}

	err := svc.CreateCarousel(context.Background(), &repository.Carousel{
		Title:    "  home hero ",
		ImageURL: "/hero-2.png",
		IsActive: true,
	})
	if !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected ErrInvalidArgument, got %v", err)
	}
	if !strings.Contains(err.Error(), "轮播图标题已存在") {
		t.Fatalf("expected duplicate carousel hint, got %v", err)
	}
}

func TestUpdatePushMessageRejectsDuplicateTitle(t *testing.T) {
	db := openNameUniquenessTestDB(t, &repository.PushMessage{}, &repository.PushDevice{}, &repository.PushDelivery{})
	svc := NewAdminService(db, nil, "test-secret")

	first := repository.PushMessage{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "push-name-test0001", TSID: "push-name-test0001-tsid0001"},
		Title:           "Morning Broadcast",
		Content:         "hello",
		IsActive:        true,
	}
	second := repository.PushMessage{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "push-name-test0002", TSID: "push-name-test0002-tsid0002"},
		Title:           "Night Broadcast",
		Content:         "world",
		IsActive:        true,
	}
	if err := db.Create(&first).Error; err != nil {
		t.Fatalf("create first push message failed: %v", err)
	}
	if err := db.Create(&second).Error; err != nil {
		t.Fatalf("create second push message failed: %v", err)
	}

	err := svc.UpdatePushMessage(context.Background(), fmt.Sprintf("%d", second.ID), map[string]interface{}{
		"title": " morning broadcast ",
	})
	if !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected ErrInvalidArgument, got %v", err)
	}
	if !strings.Contains(err.Error(), "推送消息标题已存在") {
		t.Fatalf("expected duplicate push message hint, got %v", err)
	}
}

func TestUpdatePublicAPIRejectsDuplicateName(t *testing.T) {
	db := openNameUniquenessTestDB(t, &repository.PublicAPI{})
	svc := NewAdminService(db, nil, "test-secret")

	first := repository.PublicAPI{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "public-api-test001", TSID: "public-api-test001-tsid0001"},
		Name:            "Merchant Console",
		Path:            "/merchant/console",
		APIKey:          "key-a",
		IsActive:        true,
	}
	second := repository.PublicAPI{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "public-api-test002", TSID: "public-api-test002-tsid0002"},
		Name:            "Order Feed",
		Path:            "/orders/feed",
		APIKey:          "key-b",
		IsActive:        true,
	}
	if err := db.Create(&first).Error; err != nil {
		t.Fatalf("create first public api failed: %v", err)
	}
	if err := db.Create(&second).Error; err != nil {
		t.Fatalf("create second public api failed: %v", err)
	}

	err := svc.UpdatePublicAPI(context.Background(), fmt.Sprintf("%d", second.ID), map[string]interface{}{
		"name": " merchant console ",
	})
	if !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("expected ErrInvalidArgument, got %v", err)
	}
	if !strings.Contains(err.Error(), "开放 API 名称已存在") {
		t.Fatalf("expected duplicate public api hint, got %v", err)
	}
}
