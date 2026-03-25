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

func newOrderServiceForAddressTest(t *testing.T) (*OrderService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "order_service_address_test.db")
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
		&repository.Order{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}
	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	return NewOrderService(repository.NewOrderRepository(db), db, nil), db
}

func TestCreateOrderUsesPersistedUserAddress(t *testing.T) {
	orderSvc, db := newOrderServiceForAddressTest(t)
	userSvc := NewUserService(repository.NewUserRepository(db), nil)
	ctx := context.Background()

	user := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072400001002"},
		Phone:           "13800000002",
		Name:            "下单用户",
		Type:            "customer",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("seed user failed: %v", err)
	}

	address, err := userSvc.CreateAddress(ctx, user.Phone, UserAddressInput{
		Name:    "李四",
		Phone:   "13800000009",
		Tag:     "家",
		Address: "北京市朝阳区望京街道 10 号",
		Detail:  "3 单元 502",
	})
	if err != nil {
		t.Fatalf("CreateAddress failed: %v", err)
	}

	result, err := orderSvc.CreateOrder(ctx, map[string]interface{}{
		"userId":    user.Phone,
		"addressId": address["id"],
		"shopName":  "测试店铺",
		"items":     "鱼香肉丝 x1",
		"price":     28.5,
	})
	if err != nil {
		t.Fatalf("CreateOrder failed: %v", err)
	}

	orderID, ok := result.(map[string]interface{})["id"]
	if !ok || orderID == nil {
		t.Fatalf("expected created order id in result")
	}

	var order repository.Order
	if err := db.Where("uid = ?", orderID).First(&order).Error; err != nil {
		t.Fatalf("query order failed: %v", err)
	}

	if order.Address != "北京市朝阳区望京街道 10 号 3 单元 502" {
		t.Fatalf("unexpected order address: %q", order.Address)
	}
	if order.DeliveryName != "李四" {
		t.Fatalf("unexpected delivery name: %q", order.DeliveryName)
	}
	if order.DeliveryPhone != "13800000009" {
		t.Fatalf("unexpected delivery phone: %q", order.DeliveryPhone)
	}
}
