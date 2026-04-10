package service

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newRTCCallAuditServiceForTest(t *testing.T) (*RTCCallAuditService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "rtc_call_audit_service_test.db")
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

	if err := db.AutoMigrate(&repository.RTCCallAudit{}, &repository.IDSequence{}, &repository.IDCodebook{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	return NewRTCCallAuditService(db, nil), db
}

func TestRTCCallAuditServiceUpsertCall(t *testing.T) {
	svc, db := newRTCCallAuditServiceForTest(t)

	ctx := context.Background()
	ctx = context.WithValue(ctx, "operator_role", "user")
	ctx = context.WithValue(ctx, "user_id", "26032900000001")
	ctx = context.WithValue(ctx, "user_phone", "13800000001")

	record, err := svc.UpsertCall(ctx, RTCCallAuditUpsertInput{
		CalleeRole:         "merchant",
		CalleeID:           "26032900000088",
		CalleePhone:        "138-0000-0002",
		ConversationID:     "support_26032900000001",
		OrderID:            "26032999000001",
		EntryPoint:         "order_detail",
		Scene:              "support_contact",
		ClientPlatform:     "app-plus",
		ClientKind:         "app",
		Status:             "initiated",
		RecordingRetention: "standard",
		Metadata: map[string]interface{}{
			"network": "wifi",
		},
	})
	if err != nil {
		t.Fatalf("UpsertCall create failed: %v", err)
	}
	if record.CallerRole != "user" || record.CalleeRole != "merchant" {
		t.Fatalf("unexpected caller/callee roles: %+v", record)
	}
	if record.CalleePhone != "13800000002" {
		t.Fatalf("expected normalized callee phone, got %q", record.CalleePhone)
	}
	if record.UID == "" {
		t.Fatal("expected uid to be assigned")
	}

	endedAt := time.Now()
	updated, err := svc.UpsertCall(ctx, RTCCallAuditUpsertInput{
		CallID:          record.UID,
		Status:          "ended",
		AnsweredAt:      &endedAt,
		EndedAt:         &endedAt,
		DurationSeconds: 32,
		ComplaintStatus: "reported",
	})
	if err != nil {
		t.Fatalf("UpsertCall update failed: %v", err)
	}
	if updated.Status != "ended" {
		t.Fatalf("expected ended status, got %q", updated.Status)
	}
	if updated.DurationSeconds != 32 {
		t.Fatalf("expected duration 32, got %d", updated.DurationSeconds)
	}
	if updated.CalleeRole != "merchant" || updated.CalleeID != "26032900000088" {
		t.Fatalf("expected callee identity to be preserved, got role=%q id=%q", updated.CalleeRole, updated.CalleeID)
	}
	if updated.ConversationID != "support_26032900000001" {
		t.Fatalf("expected conversation id to be preserved, got %q", updated.ConversationID)
	}
	if updated.ComplaintStatus != "reported" {
		t.Fatalf("expected complaint status reported, got %q", updated.ComplaintStatus)
	}

	var stored repository.RTCCallAudit
	if err := db.First(&stored, updated.ID).Error; err != nil {
		t.Fatalf("query stored rtc call failed: %v", err)
	}
	if stored.Status != "ended" {
		t.Fatalf("expected stored status ended, got %q", stored.Status)
	}
}

func TestRTCCallAuditServiceListForAdmin(t *testing.T) {
	svc, db := newRTCCallAuditServiceForTest(t)

	now := time.Now()
	rows := []repository.RTCCallAudit{
		{
			UnifiedIdentity: repository.UnifiedIdentity{UID: "26033083000001", TSID: "260330830000012603301301"},
			CallType:        "audio",
			CallerRole:      "user",
			CallerID:        "26032900000001",
			CallerPhone:     "13800000001",
			CalleeRole:      "merchant",
			CalleeID:        "26032900000088",
			CalleePhone:     "13800000002",
			ConversationID:  "support_1",
			OrderID:         "26032999000001",
			Status:          "accepted",
			ClientKind:      "app",
			ClientPlatform:  "app-plus",
			CreatedAt:       now.Add(-3 * time.Minute),
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{UID: "26033083000002", TSID: "260330830000022603301302"},
			CallType:        "audio",
			CallerRole:      "merchant",
			CallerID:        "26032900000088",
			CalleeRole:      "user",
			CalleeID:        "26032900000001",
			Status:          "ended",
			ClientKind:      "h5",
			ClientPlatform:  "h5",
			ComplaintStatus: "reported",
			CreatedAt:       now.Add(-2 * time.Minute),
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{UID: "26033083000003", TSID: "260330830000032603301303"},
			CallType:        "audio",
			CallerRole:      "rider",
			CallerID:        "26032900000066",
			CalleeRole:      "user",
			CalleeID:        "26032900000001",
			Status:          "failed",
			ClientKind:      "app",
			ClientPlatform:  "app-plus",
			CreatedAt:       now.Add(-1 * time.Minute),
		},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatalf("seed rtc call audits failed: %v", err)
	}

	result, err := svc.ListForAdmin(context.Background(), RTCCallAuditAdminQuery{
		CalleeRole: "user",
		Page:       1,
		Limit:      10,
	})
	if err != nil {
		t.Fatalf("ListForAdmin failed: %v", err)
	}
	if result.Pagination.Total != 2 {
		t.Fatalf("expected total 2, got %d", result.Pagination.Total)
	}
	if result.Summary.Ended != 1 || result.Summary.Failed != 1 || result.Summary.Complaints != 1 {
		t.Fatalf("unexpected summary: %+v", result.Summary)
	}
}

func TestRTCCallAuditServiceGetCall(t *testing.T) {
	svc, db := newRTCCallAuditServiceForTest(t)

	record := repository.RTCCallAudit{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "26033083000011", TSID: "260330830000112603301311"},
		CallType:        "audio",
		CallerRole:      "user",
		CallerID:        "26032900000001",
		CalleeRole:      "merchant",
		CalleeID:        "26032900000088",
		Status:          "accepted",
	}
	if err := db.Create(&record).Error; err != nil {
		t.Fatalf("seed rtc call audit failed: %v", err)
	}

	userCtx := context.Background()
	userCtx = context.WithValue(userCtx, "operator_role", "user")
	userCtx = context.WithValue(userCtx, "user_id", "26032900000001")
	got, err := svc.GetCall(userCtx, record.UID)
	if err != nil {
		t.Fatalf("GetCall for caller failed: %v", err)
	}
	if got.UID != record.UID {
		t.Fatalf("expected uid %q, got %q", record.UID, got.UID)
	}

	riderCtx := context.Background()
	riderCtx = context.WithValue(riderCtx, "operator_role", "rider")
	riderCtx = context.WithValue(riderCtx, "rider_id", "26032900000066")
	if _, err := svc.GetCall(riderCtx, record.UID); err == nil {
		t.Fatal("expected forbidden error for unrelated rider")
	}
}

func TestRTCCallAuditServiceAdminReviewCall(t *testing.T) {
	svc, db := newRTCCallAuditServiceForTest(t)

	record := repository.RTCCallAudit{
		UnifiedIdentity:    repository.UnifiedIdentity{UID: "26033083000031", TSID: "260330830000312603301331"},
		CallType:           "audio",
		CallerRole:         "user",
		CallerID:           "26032900000001",
		CalleeRole:         "merchant",
		CalleeID:           "26032900000088",
		Status:             "ended",
		ComplaintStatus:    "none",
		RecordingRetention: "standard",
	}
	if err := db.Create(&record).Error; err != nil {
		t.Fatalf("seed rtc call audit failed: %v", err)
	}

	adminCtx := context.Background()
	adminCtx = context.WithValue(adminCtx, "operator_role", "admin")
	adminCtx = context.WithValue(adminCtx, "admin_id", "26032900000999")

	reported, err := svc.AdminReviewCall(adminCtx, record.UID, RTCCallAuditAdminReviewInput{
		ComplaintStatus: "reported",
	})
	if err != nil {
		t.Fatalf("AdminReviewCall report failed: %v", err)
	}
	if reported.ComplaintStatus != "reported" {
		t.Fatalf("expected complaint status reported, got %q", reported.ComplaintStatus)
	}
	if reported.RecordingRetention != "frozen" {
		t.Fatalf("expected recording retention frozen, got %q", reported.RecordingRetention)
	}

	resolved, err := svc.AdminReviewCall(adminCtx, record.UID, RTCCallAuditAdminReviewInput{
		ComplaintStatus: "resolved",
	})
	if err != nil {
		t.Fatalf("AdminReviewCall resolve failed: %v", err)
	}
	if resolved.ComplaintStatus != "resolved" {
		t.Fatalf("expected complaint status resolved, got %q", resolved.ComplaintStatus)
	}
	if resolved.RecordingRetention != "cleared" {
		t.Fatalf("expected recording retention cleared, got %q", resolved.RecordingRetention)
	}
}

func TestRTCCallAuditServiceListHistory(t *testing.T) {
	svc, db := newRTCCallAuditServiceForTest(t)

	now := time.Now()
	rows := []repository.RTCCallAudit{
		{
			UnifiedIdentity: repository.UnifiedIdentity{UID: "26033083000021", TSID: "260330830000212603301321"},
			CallType:        "audio",
			CallerRole:      "user",
			CallerID:        "26032900000001",
			CalleeRole:      "merchant",
			CalleeID:        "26032900000088",
			Status:          "ended",
			CreatedAt:       now.Add(-5 * time.Minute),
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{UID: "26033083000022", TSID: "260330830000222603301322"},
			CallType:        "audio",
			CallerRole:      "merchant",
			CallerID:        "26032900000088",
			CalleeRole:      "user",
			CalleeID:        "26032900000001",
			Status:          "failed",
			CreatedAt:       now.Add(-4 * time.Minute),
		},
		{
			UnifiedIdentity: repository.UnifiedIdentity{UID: "26033083000023", TSID: "260330830000232603301323"},
			CallType:        "audio",
			CallerRole:      "rider",
			CallerID:        "26032900000066",
			CalleeRole:      "user",
			CalleeID:        "26032900000002",
			Status:          "ended",
			CreatedAt:       now.Add(-3 * time.Minute),
		},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatalf("seed rtc history failed: %v", err)
	}

	userCtx := context.Background()
	userCtx = context.WithValue(userCtx, "operator_role", "user")
	userCtx = context.WithValue(userCtx, "user_id", "26032900000001")
	result, err := svc.ListHistory(userCtx, RTCCallAuditHistoryQuery{
		Page:  1,
		Limit: 10,
	})
	if err != nil {
		t.Fatalf("ListHistory failed: %v", err)
	}
	if result.Pagination.Total != 2 {
		t.Fatalf("expected total 2, got %d", result.Pagination.Total)
	}

	filtered, err := svc.ListHistory(userCtx, RTCCallAuditHistoryQuery{
		Status: "failed",
		Page:   1,
		Limit:  10,
	})
	if err != nil {
		t.Fatalf("ListHistory filtered failed: %v", err)
	}
	if filtered.Pagination.Total != 1 || len(filtered.Items) != 1 || filtered.Items[0].Status != "failed" {
		t.Fatalf("unexpected filtered history: %+v", filtered)
	}
}

func TestRTCCallAuditServiceRunRetentionCleanupCycle(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "rtc_call_audit_cleanup_test.db")
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
	if err := db.AutoMigrate(&repository.RTCCallAudit{}, &repository.IDSequence{}, &repository.IDCodebook{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	cfg := &config.Config{
		RTC: config.RTCConfig{
			RecordingRetention:      24 * time.Hour,
			RetentionCleanupEnabled: true,
			RetentionCleanupEvery:   time.Minute,
			RetentionCleanupBatch:   10,
		},
	}
	svc := NewRTCCallAuditService(db, cfg)

	now := time.Now()
	rows := []repository.RTCCallAudit{
		{
			UnifiedIdentity:    repository.UnifiedIdentity{UID: "26033083001001", TSID: "260330830010012603301401"},
			CallType:           "audio",
			CallerRole:         "user",
			CallerID:           "26032900000001",
			CalleeRole:         "merchant",
			CalleeID:           "26032900000088",
			Status:             "ended",
			ComplaintStatus:    "none",
			RecordingRetention: "standard",
			EndedAt:            timePtr(now.Add(-25 * time.Hour)),
		},
		{
			UnifiedIdentity:    repository.UnifiedIdentity{UID: "26033083001002", TSID: "260330830010022603301402"},
			CallType:           "audio",
			CallerRole:         "user",
			CallerID:           "26032900000002",
			CalleeRole:         "merchant",
			CalleeID:           "26032900000089",
			Status:             "ended",
			ComplaintStatus:    "reported",
			RecordingRetention: "frozen",
			EndedAt:            timePtr(now.Add(-30 * time.Hour)),
		},
		{
			UnifiedIdentity:    repository.UnifiedIdentity{UID: "26033083001003", TSID: "260330830010032603301403"},
			CallType:           "audio",
			CallerRole:         "user",
			CallerID:           "26032900000003",
			CalleeRole:         "merchant",
			CalleeID:           "26032900000090",
			Status:             "ringing",
			ComplaintStatus:    "none",
			RecordingRetention: "standard",
			EndedAt:            nil,
		},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatalf("seed rtc cleanup rows failed: %v", err)
	}

	cleared, err := svc.RunRetentionCleanupCycle(context.Background(), 10)
	if err != nil {
		t.Fatalf("RunRetentionCleanupCycle failed: %v", err)
	}
	if cleared != 1 {
		t.Fatalf("expected cleared count 1, got %d", cleared)
	}

	var eligible repository.RTCCallAudit
	if err := db.Where("uid = ?", "26033083001001").First(&eligible).Error; err != nil {
		t.Fatalf("query eligible record failed: %v", err)
	}
	if eligible.RecordingRetention != "cleared" {
		t.Fatalf("expected eligible record cleared, got %q", eligible.RecordingRetention)
	}

	var frozen repository.RTCCallAudit
	if err := db.Where("uid = ?", "26033083001002").First(&frozen).Error; err != nil {
		t.Fatalf("query frozen record failed: %v", err)
	}
	if frozen.RecordingRetention != "frozen" {
		t.Fatalf("expected frozen record unchanged, got %q", frozen.RecordingRetention)
	}
}

func TestRTCCallAuditServiceRunRetentionCleanupCycleNowUpdatesStatus(t *testing.T) {
	svc, db := newRTCCallAuditServiceForTest(t)
	now := time.Now()
	row := repository.RTCCallAudit{
		UnifiedIdentity:    repository.UnifiedIdentity{UID: "26033083001021", TSID: "260330830010212603301421"},
		CallType:           "audio",
		CallerRole:         "user",
		CallerID:           "26032900000121",
		CalleeRole:         "merchant",
		CalleeID:           "26032900000188",
		Status:             "ended",
		ComplaintStatus:    "none",
		RecordingRetention: "standard",
		EndedAt:            timePtr(now.Add(-25 * time.Hour)),
	}
	if err := db.Create(&row).Error; err != nil {
		t.Fatalf("seed cleanup status row failed: %v", err)
	}

	cleared, err := svc.RunRetentionCleanupCycleNow(context.Background(), 10)
	if err != nil {
		t.Fatalf("RunRetentionCleanupCycleNow failed: %v", err)
	}
	if cleared != 1 {
		t.Fatalf("expected cleared count 1, got %d", cleared)
	}

	snapshot := svc.RetentionCleanupStatusSnapshot()
	if snapshot.LastCleanupStatus != "ok" {
		t.Fatalf("expected cleanup status ok, got %q", snapshot.LastCleanupStatus)
	}
	if snapshot.LastCleanupCount != 1 {
		t.Fatalf("expected cleanup count 1, got %d", snapshot.LastCleanupCount)
	}
	if snapshot.LastCleanupAt == "" {
		t.Fatal("expected last cleanup timestamp to be recorded")
	}
}

func timePtr(value time.Time) *time.Time {
	return &value
}
