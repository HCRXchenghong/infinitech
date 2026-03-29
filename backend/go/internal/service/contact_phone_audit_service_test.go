package service

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newPhoneContactAuditServiceForTest(t *testing.T) (*PhoneContactAuditService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "phone_contact_audit_service_test.db")
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

	if err := db.AutoMigrate(&repository.PhoneContactAudit{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	return NewPhoneContactAuditService(db), db
}

func TestPhoneContactAuditServiceRecordPhoneClick(t *testing.T) {
	svc, db := newPhoneContactAuditServiceForTest(t)

	ctx := context.Background()
	ctx = context.WithValue(ctx, "operator_role", "user")
	ctx = context.WithValue(ctx, "user_id", "26032900000001")
	ctx = context.WithValue(ctx, "user_phone", "13800000001")

	record, err := svc.RecordPhoneClick(ctx, PhoneContactAuditInput{
		TargetRole:     "shop",
		TargetID:       "26032900000088",
		TargetPhone:    "138-0000-0002",
		ContactChannel: "system_phone",
		EntryPoint:     "order_detail",
		Scene:          "order_contact",
		OrderID:        "26032999000001",
		RoomID:         "shop_26032999000001",
		PagePath:       "/pages/order/detail/index",
		ClientPlatform: "mp-weixin",
		ClientResult:   "clicked",
		Metadata: map[string]interface{}{
			"status":  "delivering",
			"bizType": "takeout",
		},
	})
	if err != nil {
		t.Fatalf("RecordPhoneClick failed: %v", err)
	}

	if record.ActorRole != "user" {
		t.Fatalf("expected actor role user, got %q", record.ActorRole)
	}
	if record.TargetRole != "merchant" {
		t.Fatalf("expected target role merchant, got %q", record.TargetRole)
	}
	if record.TargetPhone != "13800000002" {
		t.Fatalf("expected normalized target phone, got %q", record.TargetPhone)
	}
	if record.ClientResult != "clicked" {
		t.Fatalf("expected client result clicked, got %q", record.ClientResult)
	}
	if record.Metadata == "" {
		t.Fatalf("expected metadata to be stored")
	}

	var stored repository.PhoneContactAudit
	if err := db.First(&stored, record.ID).Error; err != nil {
		t.Fatalf("query stored record failed: %v", err)
	}
	if stored.OrderID != "26032999000001" {
		t.Fatalf("expected stored order id, got %q", stored.OrderID)
	}
}

func TestPhoneContactAuditServiceRecordPhoneClickRequiresAuth(t *testing.T) {
	svc, _ := newPhoneContactAuditServiceForTest(t)

	_, err := svc.RecordPhoneClick(context.Background(), PhoneContactAuditInput{
		TargetPhone: "13800000002",
	})
	if err == nil {
		t.Fatal("expected unauthorized error")
	}
}

func TestPhoneContactAuditServiceRecordPhoneClickRequiresTargetRole(t *testing.T) {
	svc, _ := newPhoneContactAuditServiceForTest(t)

	ctx := context.Background()
	ctx = context.WithValue(ctx, "operator_role", "merchant")
	ctx = context.WithValue(ctx, "merchant_id", "26032900000002")

	_, err := svc.RecordPhoneClick(ctx, PhoneContactAuditInput{
		TargetPhone: "13800000002",
	})
	if err == nil || err.Error() != "targetRole is required" {
		t.Fatalf("expected targetRole validation error, got %v", err)
	}
}
