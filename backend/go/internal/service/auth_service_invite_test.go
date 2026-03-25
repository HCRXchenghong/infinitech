package service

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newAuthServiceForInviteTest(t *testing.T) (*AuthService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "auth_service_invite_test.db")
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
		&repository.InviteCode{},
		&repository.InviteRecord{},
		&repository.PointsLedger{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}
	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:             "12345678901234567890123456789012",
			AccessTokenExpiry:  2 * time.Hour,
			RefreshTokenExpiry: 30 * 24 * time.Hour,
		},
		Invite: config.InviteConfig{
			RegisterRewardPoints: 20,
		},
	}

	repo := repository.NewUserRepository(db)
	svc := NewAuthService(repo, cfg)
	svc.SetDBAndRedis(db, nil)
	return svc, db
}

func TestRegisterWithInviteCodeRewardsInviterAndUpdatesShareRecord(t *testing.T) {
	svc, db := newAuthServiceForInviteTest(t)
	ctx := context.Background()

	inviter := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072402000001"},
		Phone:           "13800000001",
		Name:            "inviter",
		PasswordHash:    "hash",
		Type:            "customer",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := db.Create(&inviter).Error; err != nil {
		t.Fatalf("seed inviter failed: %v", err)
	}

	inviteCode := repository.InviteCode{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072464000001"},
		UserID:          inviter.UID,
		Phone:           inviter.Phone,
		Code:            "YXINVITE88",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := db.Create(&inviteCode).Error; err != nil {
		t.Fatalf("seed invite code failed: %v", err)
	}

	sharedRecord := repository.InviteRecord{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072465000001"},
		InviterUserID:   inviter.UID,
		InviterPhone:    inviter.Phone,
		InviteCode:      inviteCode.Code,
		Status:          "shared",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := db.Create(&sharedRecord).Error; err != nil {
		t.Fatalf("seed invite record failed: %v", err)
	}

	result, err := svc.Register(ctx, map[string]interface{}{
		"phone":      "13800000002",
		"name":       "invitee",
		"password":   "pass123456",
		"inviteCode": inviteCode.Code,
	})
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	resp, ok := result.(*RegisterResponse)
	if !ok {
		t.Fatalf("unexpected register response type: %T", result)
	}
	if !resp.Success {
		t.Fatalf("expected success response, got %#v", resp)
	}

	var records []repository.InviteRecord
	if err := db.Where("invite_code = ?", inviteCode.Code).Find(&records).Error; err != nil {
		t.Fatalf("query invite records failed: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("expected 1 invite record, got %d", len(records))
	}

	record := records[0]
	if record.Status != "rewarded" {
		t.Fatalf("expected invite record status rewarded, got %q", record.Status)
	}
	if record.RewardPoints != 20 {
		t.Fatalf("expected reward points 20, got %d", record.RewardPoints)
	}
	if record.InviteePhone != "13800000002" {
		t.Fatalf("expected invitee phone to be backfilled, got %q", record.InviteePhone)
	}
	if record.InviteeUserID == "" {
		t.Fatalf("expected invitee user id to be backfilled")
	}

	var ledgers []repository.PointsLedger
	if err := db.Where("user_id = ? AND type = ?", inviter.UID, "invite").Find(&ledgers).Error; err != nil {
		t.Fatalf("query points ledger failed: %v", err)
	}
	if len(ledgers) != 1 {
		t.Fatalf("expected 1 invite ledger, got %d", len(ledgers))
	}
	if ledgers[0].Change != 20 {
		t.Fatalf("expected invite ledger change 20, got %d", ledgers[0].Change)
	}
}
