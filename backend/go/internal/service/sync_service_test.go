package service

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newSyncServiceForTest(t *testing.T, models ...interface{}) *SyncService {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "sync_service_test.db")
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

	return NewSyncService(db, nil)
}

func TestGetSyncDataRejectsInvalidDataset(t *testing.T) {
	svc := newSyncServiceForTest(t, &repository.Shop{})

	_, err := svc.GetSyncData(context.Background(), "unknown", "0")
	if !errors.Is(err, ErrInvalidSyncDataset) {
		t.Fatalf("expected ErrInvalidSyncDataset, got %v", err)
	}
}

func TestGetSyncDataRejectsInvalidSince(t *testing.T) {
	svc := newSyncServiceForTest(t, &repository.Shop{})

	_, err := svc.GetSyncData(context.Background(), "shops", "abc")
	if !errors.Is(err, ErrInvalidSince) {
		t.Fatalf("expected ErrInvalidSince, got %v", err)
	}
}

func TestGetSyncDataUsesUIDForDeletedShop(t *testing.T) {
	svc := newSyncServiceForTest(t, &repository.Shop{})
	now := time.Now()
	uid := "25072401000001"

	shop := repository.Shop{
		UnifiedIdentity: repository.UnifiedIdentity{UID: uid},
		Name:            "deleted shop",
		IsActive:        true,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := svc.db.Create(&shop).Error; err != nil {
		t.Fatalf("seed shop failed: %v", err)
	}
	if err := svc.db.Model(&shop).Update("is_active", false).Error; err != nil {
		t.Fatalf("mark shop inactive failed: %v", err)
	}

	data, err := svc.GetSyncData(context.Background(), "shops", "0")
	if err != nil {
		t.Fatalf("GetSyncData failed: %v", err)
	}

	deleted, ok := data["deleted"].([]string)
	if !ok {
		t.Fatalf("deleted has unexpected type: %T", data["deleted"])
	}
	if len(deleted) != 1 || deleted[0] != uid {
		t.Fatalf("expected deleted [%s], got %#v", uid, deleted)
	}
}

func TestGetSyncDataUsersReturnsChangedRows(t *testing.T) {
	svc := newSyncServiceForTest(t, &repository.User{})
	now := time.Now()
	uid := "25072402000001"

	user := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: uid},
		Phone:           "13800000000",
		Name:            "sync-user",
		Type:            "customer",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := svc.db.Create(&user).Error; err != nil {
		t.Fatalf("seed user failed: %v", err)
	}

	data, err := svc.GetSyncData(context.Background(), "users", "0")
	if err != nil {
		t.Fatalf("GetSyncData failed: %v", err)
	}

	changed, ok := data["changed"].([]map[string]interface{})
	if !ok {
		t.Fatalf("changed has unexpected type: %T", data["changed"])
	}
	if len(changed) != 1 {
		t.Fatalf("expected 1 changed user, got %d", len(changed))
	}
	if gotID, _ := changed[0]["id"].(string); gotID != uid {
		t.Fatalf("expected changed[0].id=%s, got %q", uid, gotID)
	}
}

func TestParseMaxUpdatedUnixWithStringTimestamp(t *testing.T) {
	const raw = "2026-02-25 14:10:20.116027+08:00"
	got := parseMaxUpdatedUnix(raw)
	if got <= 0 {
		t.Fatalf("expected positive unix timestamp, got %d", got)
	}
}

func TestParseMaxUpdatedUnixWithTime(t *testing.T) {
	now := time.Now()
	got := parseMaxUpdatedUnix(now)
	if got != now.Unix() {
		t.Fatalf("expected %d, got %d", now.Unix(), got)
	}
}
