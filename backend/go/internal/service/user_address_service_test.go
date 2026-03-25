package service

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newUserAddressServiceForTest(t *testing.T) (*UserService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "user_address_service_test.db")
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
		&repository.IDCodebook{},
		&repository.IDSequence{},
		&repository.IDLegacyMapping{},
		&repository.User{},
		&repository.UserAddress{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}
	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	return NewUserService(repository.NewUserRepository(db), nil), db
}

func seedUserForAddressTest(t *testing.T, db *gorm.DB) repository.User {
	t.Helper()

	user := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072400001001"},
		Phone:           "13800000001",
		Name:            "测试用户",
		Type:            "customer",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("seed user failed: %v", err)
	}
	return user
}

func TestUserAddressCreateSetDefaultAndDelete(t *testing.T) {
	svc, db := newUserAddressServiceForTest(t)
	ctx := context.Background()
	user := seedUserForAddressTest(t, db)

	first, err := svc.CreateAddress(ctx, user.Phone, UserAddressInput{
		Name:    "张三",
		Phone:   "13800000001",
		Tag:     "家",
		Address: "上海市浦东新区张江路 1 号",
		Detail:  "1 栋 101",
	})
	if err != nil {
		t.Fatalf("CreateAddress first failed: %v", err)
	}
	if first["isDefault"] != true {
		t.Fatalf("expected first address to be default")
	}

	second, err := svc.CreateAddress(ctx, user.Phone, UserAddressInput{
		Name:    "张三",
		Phone:   "13800000001",
		Tag:     "公司",
		Address: "上海市浦东新区科苑路 88 号",
		Detail:  "B 座 7 楼",
	})
	if err != nil {
		t.Fatalf("CreateAddress second failed: %v", err)
	}
	if second["isDefault"] == true {
		t.Fatalf("expected second address to be non-default initially")
	}

	addresses, err := svc.ListAddresses(ctx, user.Phone)
	if err != nil {
		t.Fatalf("ListAddresses failed: %v", err)
	}
	if len(addresses) != 2 {
		t.Fatalf("expected 2 addresses, got %d", len(addresses))
	}

	secondID, _ := second["id"].(string)
	if _, err := svc.SetDefaultAddress(ctx, user.Phone, secondID); err != nil {
		t.Fatalf("SetDefaultAddress failed: %v", err)
	}

	defaultAddress, err := svc.GetDefaultAddress(ctx, user.Phone)
	if err != nil {
		t.Fatalf("GetDefaultAddress failed: %v", err)
	}
	if defaultAddress == nil || defaultAddress["id"] != second["id"] {
		t.Fatalf("expected second address to become default")
	}

	if err := svc.DeleteAddress(ctx, user.Phone, secondID); err != nil {
		t.Fatalf("DeleteAddress failed: %v", err)
	}

	defaultAddress, err = svc.GetDefaultAddress(ctx, user.Phone)
	if err != nil {
		t.Fatalf("GetDefaultAddress after delete failed: %v", err)
	}
	if defaultAddress == nil || defaultAddress["id"] != first["id"] {
		t.Fatalf("expected first address to be promoted as default after delete")
	}
}
