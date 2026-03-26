package service

import (
	"context"
	"math"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newAdminServiceForPushStatsTest(t *testing.T) (*AdminService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "admin_service_push_stats_test.db")
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
		&repository.PushMessage{},
		&repository.PushDevice{},
		&repository.PushDelivery{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}
	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	return NewAdminService(db, nil, ""), db
}

func TestAdminServiceGetPushMessageStats(t *testing.T) {
	svc, db := newAdminServiceForPushStatsTest(t)
	ctx := context.Background()

	message := repository.PushMessage{
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26032600000001",
			TSID: "260326000000000000000001",
		},
		Title:     "Spring Push",
		Content:   "hello",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := db.Create(&message).Error; err != nil {
		t.Fatalf("create push message failed: %v", err)
	}

	now := time.Now()
	later := now.Add(2 * time.Minute)
	records := []repository.PushDelivery{
		{
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26032600000002",
				TSID: "260326000000000000000002",
			},
			MessageID:      message.UID,
			UserID:         "1001",
			UserType:       "customer",
			Status:         "acknowledged",
			Action:         "received",
			AcknowledgedAt: &now,
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26032600000003",
				TSID: "260326000000000000000003",
			},
			MessageID:      message.UID,
			UserID:         "1002",
			UserType:       "customer",
			Status:         "acknowledged",
			Action:         "opened",
			AcknowledgedAt: &later,
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26032600000004",
				TSID: "260326000000000000000004",
			},
			MessageID:      message.UID,
			UserID:         "2001",
			UserType:       "rider",
			Status:         "acknowledged",
			Action:         "opened",
			AcknowledgedAt: &later,
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26032600000005",
				TSID: "260326000000000000000005",
			},
			MessageID: "26032600009999",
			UserID:    "9999",
			UserType:  "customer",
			Status:    "acknowledged",
			Action:    "opened",
		},
	}
	if err := db.Create(&records).Error; err != nil {
		t.Fatalf("create push deliveries failed: %v", err)
	}

	stats, err := svc.GetPushMessageStats(ctx, message.UID)
	if err != nil {
		t.Fatalf("GetPushMessageStats failed: %v", err)
	}

	if stats.TotalDeliveries != 3 {
		t.Fatalf("expected 3 deliveries, got %d", stats.TotalDeliveries)
	}
	if stats.TotalUsers != 3 {
		t.Fatalf("expected 3 users, got %d", stats.TotalUsers)
	}
	if stats.QueuedCount != 0 {
		t.Fatalf("expected queued count 0, got %d", stats.QueuedCount)
	}
	if stats.SentCount != 3 {
		t.Fatalf("expected sent count 3, got %d", stats.SentCount)
	}
	if stats.FailedCount != 0 {
		t.Fatalf("expected failed count 0, got %d", stats.FailedCount)
	}
	if stats.AcknowledgedCount != 3 {
		t.Fatalf("expected acknowledged count 3, got %d", stats.AcknowledgedCount)
	}
	if stats.ReceivedCount != 3 {
		t.Fatalf("expected 3 received users, got %d", stats.ReceivedCount)
	}
	if stats.ReadCount != 2 {
		t.Fatalf("expected 2 read users, got %d", stats.ReadCount)
	}
	if stats.UnreadCount != 1 {
		t.Fatalf("expected 1 unread user, got %d", stats.UnreadCount)
	}
	if math.Abs(stats.ReadRate-(2.0/3.0)) > 1e-9 {
		t.Fatalf("expected read rate 2/3, got %f", stats.ReadRate)
	}
	if math.Abs(stats.ReadRatePercent-((2.0/3.0)*100)) > 1e-6 {
		t.Fatalf("expected read rate percent 66.666..., got %f", stats.ReadRatePercent)
	}
	if stats.LatestAcknowledged == nil || !stats.LatestAcknowledged.Equal(later) {
		t.Fatalf("expected latest acknowledged_at to equal %s, got %+v", later, stats.LatestAcknowledged)
	}
}

func TestAdminServiceCreatePushMessageMaterializesDeliveries(t *testing.T) {
	svc, db := newAdminServiceForPushStatsTest(t)
	ctx := context.Background()

	devices := []repository.PushDevice{
		{
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26032600000101",
				TSID: "260326000000000000000101",
			},
			UserID:           "1001",
			UserType:         "customer",
			DeviceToken:      "token-customer-new",
			AppEnv:           "prod",
			IsActive:         true,
			LastRegisteredAt: time.Now().Add(2 * time.Minute),
			LastSeenAt:       time.Now().Add(2 * time.Minute),
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26032600000102",
				TSID: "260326000000000000000102",
			},
			UserID:           "1001",
			UserType:         "customer",
			DeviceToken:      "token-customer-old",
			AppEnv:           "prod",
			IsActive:         true,
			LastRegisteredAt: time.Now(),
			LastSeenAt:       time.Now(),
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26032600000103",
				TSID: "260326000000000000000103",
			},
			UserID:           "2001",
			UserType:         "rider",
			DeviceToken:      "token-rider",
			AppEnv:           "test",
			IsActive:         true,
			LastRegisteredAt: time.Now().Add(time.Minute),
			LastSeenAt:       time.Now().Add(time.Minute),
		},
	}
	if err := db.Create(&devices).Error; err != nil {
		t.Fatalf("create push devices failed: %v", err)
	}

	message := repository.PushMessage{
		Title:     "Queued Push",
		Content:   "queued body",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := svc.CreatePushMessage(ctx, &message); err != nil {
		t.Fatalf("CreatePushMessage failed: %v", err)
	}

	var deliveries []repository.PushDelivery
	if err := db.Order("user_type ASC, user_id ASC").Find(&deliveries).Error; err != nil {
		t.Fatalf("query deliveries failed: %v", err)
	}
	if len(deliveries) != 2 {
		t.Fatalf("expected 2 deliveries, got %d", len(deliveries))
	}
	if deliveries[0].Status != "queued" || deliveries[1].Status != "queued" {
		t.Fatalf("expected queued deliveries, got %+v", deliveries)
	}
	if deliveries[0].MessageID != message.UID || deliveries[1].MessageID != message.UID {
		t.Fatalf("expected message id %q, got %+v", message.UID, deliveries)
	}

	deliveryByRecipient := map[string]repository.PushDelivery{}
	for _, delivery := range deliveries {
		deliveryByRecipient[delivery.UserType+"::"+delivery.UserID] = delivery
	}
	if deliveryByRecipient["customer::1001"].DeviceToken != "token-customer-new" {
		t.Fatalf("expected latest customer device token, got %+v", deliveryByRecipient["customer::1001"])
	}
	if deliveryByRecipient["customer::1001"].AppEnv != "prod" {
		t.Fatalf("expected customer app env prod, got %+v", deliveryByRecipient["customer::1001"])
	}
	if deliveryByRecipient["rider::2001"].DeviceToken != "token-rider" {
		t.Fatalf("expected rider delivery token, got %+v", deliveryByRecipient["rider::2001"])
	}
	if deliveryByRecipient["rider::2001"].AppEnv != "test" {
		t.Fatalf("expected rider app env test, got %+v", deliveryByRecipient["rider::2001"])
	}

	deliveryList, err := svc.ListPushMessageDeliveries(ctx, message.UID, 20)
	if err != nil {
		t.Fatalf("ListPushMessageDeliveries failed: %v", err)
	}
	if deliveryList.Total != 2 {
		t.Fatalf("expected total deliveries 2, got %d", deliveryList.Total)
	}
	if len(deliveryList.Items) != 2 {
		t.Fatalf("expected 2 delivery items, got %d", len(deliveryList.Items))
	}
}
