package service

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/admincli"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/ridercert"
	"github.com/yuexiang/go-api/internal/uploadasset"
	"gorm.io/gorm"
)

func newAdminServiceForSecurityTest(t *testing.T) (*AdminService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "admin_service_security_test.db")
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

	if err := db.AutoMigrate(&repository.Admin{}, &repository.User{}, &repository.Rider{}, &repository.Merchant{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	return NewAdminService(db, nil, "test-secret"), db
}

func TestCreateAdminUsesValidatedRequestedType(t *testing.T) {
	svc, db := newAdminServiceForSecurityTest(t)

	if err := svc.CreateAdmin(context.Background(), "13800138001", "Ops", "StrongPass123!", "admin"); err != nil {
		t.Fatalf("create admin failed: %v", err)
	}

	var admin repository.Admin
	if err := db.Where("phone = ?", "13800138001").First(&admin).Error; err != nil {
		t.Fatalf("load admin failed: %v", err)
	}
	if admin.Type != "admin" {
		t.Fatalf("expected admin type to stay admin, got %q", admin.Type)
	}
}

func TestCreateAdminRejectsInvalidType(t *testing.T) {
	svc, _ := newAdminServiceForSecurityTest(t)

	if err := svc.CreateAdmin(context.Background(), "13800138002", "Ops", "StrongPass123!", "root"); err == nil {
		t.Fatal("expected invalid admin type to be rejected")
	}
}

func TestResetPasswordsGenerateStrongTemporarySecrets(t *testing.T) {
	svc, db := newAdminServiceForSecurityTest(t)

	adminHash, _ := hashPassword("StrongPass123!")
	userHash, _ := hashPassword("UserPass123!")
	riderHash, _ := hashPassword("RiderPass123!")
	merchantHash, _ := hashPassword("MerchantPass123!")

	admin := repository.Admin{Phone: "13800138003", Name: "Admin", PasswordHash: adminHash, Type: "admin"}
	user := repository.User{Phone: "13800138004", Name: "User", PasswordHash: userHash, Type: "customer"}
	rider := repository.Rider{Phone: "13800138005", Name: "Rider", PasswordHash: riderHash}
	merchant := repository.Merchant{Phone: "13800138006", Name: "Merchant", OwnerName: "Owner", PasswordHash: merchantHash}
	if err := db.Create(&admin).Error; err != nil {
		t.Fatalf("create admin failed: %v", err)
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("create rider failed: %v", err)
	}
	if err := db.Create(&merchant).Error; err != nil {
		t.Fatalf("create merchant failed: %v", err)
	}

	passwords := []string{}
	resetters := []func() (string, error){
		func() (string, error) { return svc.ResetAdminPassword(context.Background(), "1") },
		func() (string, error) { return svc.ResetUserPassword(context.Background(), "1") },
		func() (string, error) { return svc.ResetRiderPassword(context.Background(), "1") },
		func() (string, error) { return svc.ResetMerchantPassword(context.Background(), "1") },
	}

	for _, resetter := range resetters {
		password, err := resetter()
		if err != nil {
			t.Fatalf("reset password failed: %v", err)
		}
		if password == "123456" {
			t.Fatal("expected generated password instead of legacy weak default")
		}
		if err := admincli.ValidateManualPassword(password); err != nil {
			t.Fatalf("expected generated password to satisfy strength policy, got %v", err)
		}
		passwords = append(passwords, password)
	}

	seen := map[string]struct{}{}
	for _, password := range passwords {
		if _, exists := seen[password]; exists {
			t.Fatalf("expected generated passwords to be unique, got duplicate %q", password)
		}
		seen[password] = struct{}{}
	}
}

func TestAdminTokenCarriesUnifiedClaimsAndVerifies(t *testing.T) {
	svc, db := newAdminServiceForSecurityTest(t)

	hash, err := hashPassword("StrongPass123!")
	if err != nil {
		t.Fatalf("hash admin password failed: %v", err)
	}

	admin := repository.Admin{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072401000041"},
		Phone:           "13800138007",
		Name:            "Security Admin",
		PasswordHash:    hash,
		Type:            "admin",
	}
	if err := db.Create(&admin).Error; err != nil {
		t.Fatalf("create admin failed: %v", err)
	}

	token, err := svc.generateToken(admin)
	if err != nil {
		t.Fatalf("generate admin token failed: %v", err)
	}

	payload, err := verifyUnifiedTokenPayload(token, "test-secret")
	if err != nil {
		t.Fatalf("verify admin token payload failed: %v", err)
	}
	if got := normalizeUnifiedPrincipalType(payload, ""); got != principalTypeAdmin {
		t.Fatalf("expected admin principal type, got %q", got)
	}
	if got := normalizeUnifiedPrincipalID(payload); got != admin.UID {
		t.Fatalf("expected admin principal id %q, got %q", admin.UID, got)
	}
	if got := claimString(payload, "role"); got != admin.Type {
		t.Fatalf("expected admin role %q, got %q", admin.Type, got)
	}
	if got := normalizeUnifiedTokenKind(payload); got != tokenKindAccess {
		t.Fatalf("expected admin access token kind, got %q", got)
	}

	verifiedAdmin, err := svc.VerifyToken(context.Background(), "Bearer "+token)
	if err != nil {
		t.Fatalf("verify admin token failed: %v", err)
	}
	if verifiedAdmin.ID != admin.ID {
		t.Fatalf("expected verified admin id %d, got %d", admin.ID, verifiedAdmin.ID)
	}
	if verifiedAdmin.UID != admin.UID {
		t.Fatalf("expected verified admin uid %q, got %q", admin.UID, verifiedAdmin.UID)
	}
}

func TestEnsureBootstrapAdminRequiresExplicitPassword(t *testing.T) {
	t.Setenv("BOOTSTRAP_ADMIN_PASSWORD", "")

	svc, _ := newAdminServiceForSecurityTest(t)
	admin, created, err := svc.EnsureBootstrapAdmin(context.Background())
	if err == nil {
		t.Fatal("expected bootstrap admin creation to require explicit password")
	}
	if created {
		t.Fatal("expected bootstrap admin not to be created without explicit password")
	}
	if admin != nil {
		t.Fatalf("expected no bootstrap admin result, got %#v", admin)
	}
}

func TestUpdateRiderRejectsArbitraryPublicCertPath(t *testing.T) {
	svc, db := newAdminServiceForSecurityTest(t)

	rider := repository.Rider{
		Phone:        "13800138011",
		Name:         "Rider",
		PasswordHash: "hash",
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("create rider failed: %v", err)
	}

	if err := svc.UpdateRider(context.Background(), "1", rider.Phone, "Updated Rider", "/uploads/images/other.png", "", ""); err == nil {
		t.Fatal("expected arbitrary public cert path to be rejected")
	}
}

func TestUpdateRiderAcceptsOwnedControlledCertRefs(t *testing.T) {
	svc, db := newAdminServiceForSecurityTest(t)

	rider := repository.Rider{
		Phone:        "13800138012",
		Name:         "Rider",
		PasswordHash: "hash",
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("create rider failed: %v", err)
	}

	onboardingRef := uploadasset.BuildReference(uploadasset.DomainOnboardingDocument, "rider", "1", "id-front.png")
	if err := svc.UpdateRider(context.Background(), "1", rider.Phone, "Updated Rider", onboardingRef, "", ""); err != nil {
		t.Fatalf("expected owned onboarding ref to be accepted, got %v", err)
	}

	var updated repository.Rider
	if err := db.First(&updated, rider.ID).Error; err != nil {
		t.Fatalf("load updated rider failed: %v", err)
	}
	if updated.IDCardFront != onboardingRef {
		t.Fatalf("expected onboarding ref %q, got %q", onboardingRef, updated.IDCardFront)
	}

	privateRef := ridercert.BuildPrivateReference(rider.ID, "id_card_front", "id-front.png")
	if err := svc.UpdateRider(context.Background(), "1", rider.Phone, "Updated Rider Again", privateRef, "", ""); err != nil {
		t.Fatalf("expected rider private ref to be accepted, got %v", err)
	}
}
