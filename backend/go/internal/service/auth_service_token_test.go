package service

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newAuthServiceForTokenTest(t *testing.T) (*AuthService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "auth_service_token_test.db")
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

	if err := db.AutoMigrate(&repository.User{}, &repository.Rider{}, &repository.Merchant{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:             "12345678901234567890123456789012",
			AccessTokenExpiry:  2 * time.Hour,
			RefreshTokenExpiry: 30 * 24 * time.Hour,
		},
	}

	repo := repository.NewUserRepository(db)
	svc := NewAuthService(repo, cfg)
	svc.SetDBAndRedis(db, nil)
	return svc, db
}

func TestUserTokensCarryUnifiedClaimsAndRejectRefreshAsAccess(t *testing.T) {
	svc, db := newAuthServiceForTokenTest(t)

	user := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072402000011"},
		Phone:           "13800001001",
		Name:            "Alice",
		Type:            "customer",
		PasswordHash:    "hash",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("seed user failed: %v", err)
	}

	accessToken, err := svc.generateToken(user.Phone, int64(user.ID))
	if err != nil {
		t.Fatalf("generate access token failed: %v", err)
	}

	payload, err := verifyUnifiedTokenPayload(accessToken, svc.config.JWT.Secret)
	if err != nil {
		t.Fatalf("verify access token payload failed: %v", err)
	}
	if got := normalizeUnifiedPrincipalType(payload, ""); got != principalTypeUser {
		t.Fatalf("expected principal type user, got %q", got)
	}
	if got := normalizeUnifiedPrincipalID(payload); got != user.UID {
		t.Fatalf("expected principal id %q, got %q", user.UID, got)
	}
	if got := normalizeUnifiedPrincipalLegacyID(payload); got != int64(user.ID) {
		t.Fatalf("expected legacy id %d, got %d", user.ID, got)
	}
	if got := claimString(payload, "role"); got != "customer" {
		t.Fatalf("expected role customer, got %q", got)
	}
	if got := normalizeUnifiedTokenKind(payload); got != tokenKindAccess {
		t.Fatalf("expected access token kind, got %q", got)
	}
	for _, legacyKey := range []string{"id", "userId", "type"} {
		if _, ok := payload[legacyKey]; ok {
			t.Fatalf("did not expect legacy access-claim alias %q in payload", legacyKey)
		}
	}

	identity, err := svc.VerifyTokenIdentity(accessToken)
	if err != nil {
		t.Fatalf("verify token identity failed: %v", err)
	}
	if identity.PrincipalID != user.UID {
		t.Fatalf("expected verified principal id %q, got %q", user.UID, identity.PrincipalID)
	}
	if identity.PrincipalType != principalTypeUser {
		t.Fatalf("expected verified principal type user, got %q", identity.PrincipalType)
	}
	if identity.UserID != int64(user.ID) {
		t.Fatalf("expected verified user id %d, got %d", user.ID, identity.UserID)
	}
	if identity.SessionID == "" {
		t.Fatal("expected unified session id to be present")
	}

	refreshToken, err := svc.generateRefreshToken(user.Phone, int64(user.ID))
	if err != nil {
		t.Fatalf("generate refresh token failed: %v", err)
	}

	if valid, _, _, err := svc.VerifyUserToken(refreshToken); err == nil || valid {
		t.Fatalf("expected refresh token to be rejected as access token, got valid=%v err=%v", valid, err)
	} else if !strings.Contains(err.Error(), "token kind") {
		t.Fatalf("expected token kind rejection, got %v", err)
	}

	refreshed, err := svc.RefreshToken(context.Background(), refreshToken)
	if err != nil {
		t.Fatalf("refresh token flow failed: %v", err)
	}
	if !refreshed.Success || strings.TrimSpace(refreshed.Token) == "" || strings.TrimSpace(refreshed.RefreshToken) == "" {
		t.Fatalf("expected refresh response to issue new token pair, got %#v", refreshed)
	}
}

func TestPrincipalAccessTokensCarryUnifiedClaimsForRiderAndMerchant(t *testing.T) {
	svc, db := newAuthServiceForTokenTest(t)

	rider := repository.Rider{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072403000021"},
		Phone:           "13800001002",
		Name:            "Rider",
		PasswordHash:    "hash",
	}
	merchant := repository.Merchant{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072404000031"},
		Phone:           "13800001003",
		Name:            "Merchant",
		OwnerName:       "Owner",
		PasswordHash:    "hash",
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("seed rider failed: %v", err)
	}
	if err := db.Create(&merchant).Error; err != nil {
		t.Fatalf("seed merchant failed: %v", err)
	}

	riderToken, err := svc.generatePrincipalAccessToken(principalTypeRider, rider.Phone, int64(rider.ID))
	if err != nil {
		t.Fatalf("generate rider token failed: %v", err)
	}
	riderPayload, err := verifyUnifiedTokenPayload(riderToken, svc.config.JWT.Secret)
	if err != nil {
		t.Fatalf("verify rider token payload failed: %v", err)
	}
	if got := normalizeUnifiedPrincipalType(riderPayload, ""); got != principalTypeRider {
		t.Fatalf("expected rider principal type, got %q", got)
	}
	if got := normalizeUnifiedPrincipalID(riderPayload); got != rider.UID {
		t.Fatalf("expected rider principal id %q, got %q", rider.UID, got)
	}
	if got := normalizeUnifiedPrincipalLegacyID(riderPayload); got != int64(rider.ID) {
		t.Fatalf("expected rider legacy id %d, got %d", rider.ID, got)
	}
	if got := claimString(riderPayload, "role"); got != principalTypeRider {
		t.Fatalf("expected rider role %q, got %q", principalTypeRider, got)
	}
	if valid, phone, riderID, err := svc.VerifyRiderToken(riderToken); err != nil || !valid || phone != rider.Phone || riderID != int64(rider.ID) {
		t.Fatalf("expected rider token verification success, got valid=%v phone=%q riderID=%d err=%v", valid, phone, riderID, err)
	}

	merchantToken, err := svc.generatePrincipalAccessToken(principalTypeMerchant, merchant.Phone, int64(merchant.ID))
	if err != nil {
		t.Fatalf("generate merchant token failed: %v", err)
	}
	merchantPayload, err := verifyUnifiedTokenPayload(merchantToken, svc.config.JWT.Secret)
	if err != nil {
		t.Fatalf("verify merchant token payload failed: %v", err)
	}
	if got := normalizeUnifiedPrincipalType(merchantPayload, ""); got != principalTypeMerchant {
		t.Fatalf("expected merchant principal type, got %q", got)
	}
	if got := normalizeUnifiedPrincipalID(merchantPayload); got != merchant.UID {
		t.Fatalf("expected merchant principal id %q, got %q", merchant.UID, got)
	}
	if got := normalizeUnifiedPrincipalLegacyID(merchantPayload); got != int64(merchant.ID) {
		t.Fatalf("expected merchant legacy id %d, got %d", merchant.ID, got)
	}
	if got := claimString(merchantPayload, "role"); got != principalTypeMerchant {
		t.Fatalf("expected merchant role %q, got %q", principalTypeMerchant, got)
	}
	if valid, phone, merchantID, err := svc.VerifyMerchantToken(merchantToken); err != nil || !valid || phone != merchant.Phone || merchantID != int64(merchant.ID) {
		t.Fatalf("expected merchant token verification success, got valid=%v phone=%q merchantID=%d err=%v", valid, phone, merchantID, err)
	}
}
