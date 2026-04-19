package service

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/uploadasset"
	"gorm.io/gorm"
)

func newOnboardingInviteServiceTestDB(t *testing.T) (*gorm.DB, *OnboardingInviteService) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "onboarding_invite_service_test.db")
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
		&repository.Merchant{},
		&repository.Rider{},
		&repository.User{},
		&repository.OnboardingInviteLink{},
		&repository.OnboardingInviteSubmission{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}
	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	return db, NewOnboardingInviteService(db)
}

func seedOnboardingInviteLink(t *testing.T, db *gorm.DB, inviteType, token string) repository.OnboardingInviteLink {
	t.Helper()

	link := repository.OnboardingInviteLink{
		InviteType:  inviteType,
		TokenHash:   hashInviteToken(token),
		TokenPrefix: "invite123",
		Status:      onboardingInviteStatusPending,
		MaxUses:     1,
		UsedCount:   0,
		ExpiresAt:   time.Now().Add(24 * time.Hour),
	}
	if err := db.Create(&link).Error; err != nil {
		t.Fatalf("seed invite link failed: %v", err)
	}
	return link
}

func seedOnboardingInvitePrivateAsset(t *testing.T, privateRoot string, link repository.OnboardingInviteLink, filename string) string {
	t.Helper()

	ref := uploadasset.BuildReference(
		uploadasset.DomainOnboardingDocument,
		onboardingInviteAssetOwnerRole,
		onboardingInviteAssetOwnerID(&link),
		filename,
	)
	_, absPath, err := uploadasset.ResolveAbsolutePath(privateRoot, ref)
	if err != nil {
		t.Fatalf("resolve onboarding invite asset failed: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(absPath), 0755); err != nil {
		t.Fatalf("create onboarding invite asset dir failed: %v", err)
	}
	if err := os.WriteFile(absPath, []byte("asset"), 0644); err != nil {
		t.Fatalf("seed onboarding invite asset failed: %v", err)
	}
	return ref
}

func TestSubmitByInviteTokenPromotesMerchantDocumentToMerchantPrivateDomain(t *testing.T) {
	db, svc := newOnboardingInviteServiceTestDB(t)
	privateRoot := t.TempDir()

	previousPrivateRoot := documentPrivateUploadsRootPath
	documentPrivateUploadsRootPath = privateRoot
	defer func() {
		documentPrivateUploadsRootPath = previousPrivateRoot
	}()

	link := seedOnboardingInviteLink(t, db, onboardingInviteTypeMerchant, "merchant-token")
	inviteRef := seedOnboardingInvitePrivateAsset(t, privateRoot, link, "license.png")
	_, invitePath, err := uploadasset.ResolveAbsolutePath(privateRoot, inviteRef)
	if err != nil {
		t.Fatalf("resolve invite asset path failed: %v", err)
	}

	submission, err := svc.SubmitByInviteToken(context.Background(), "merchant-token", OnboardingInviteSubmitRequest{
		MerchantName:         "测试商户",
		OwnerName:            "负责人",
		Phone:                "13800138001",
		Password:             "pass123456",
		BusinessLicenseImage: inviteRef,
	}, "127.0.0.1", "unit-test")
	if err != nil {
		t.Fatalf("SubmitByInviteToken failed: %v", err)
	}

	var merchant repository.Merchant
	if err := db.First(&merchant, submission.EntityID).Error; err != nil {
		t.Fatalf("load merchant failed: %v", err)
	}
	parsed, ok := uploadasset.ParseReference(merchant.BusinessLicenseImage)
	if !ok {
		t.Fatalf("expected merchant business license private ref, got %q", merchant.BusinessLicenseImage)
	}
	if parsed.Domain != uploadasset.DomainMerchantDocument || parsed.OwnerRole != "merchant" || parsed.OwnerID != strconv.FormatUint(uint64(merchant.ID), 10) {
		t.Fatalf("unexpected merchant business license ref %+v", parsed)
	}
	if submission.BusinessLicenseImage != merchant.BusinessLicenseImage {
		t.Fatalf("expected submission document %q, got %q", merchant.BusinessLicenseImage, submission.BusinessLicenseImage)
	}
	if _, err := os.Stat(invitePath); !os.IsNotExist(err) {
		t.Fatalf("expected invite-owned asset to be moved away, stat err=%v", err)
	}
}

func TestSubmitByInviteTokenTransfersRiderIDCardToOwnedPrivateRef(t *testing.T) {
	db, svc := newOnboardingInviteServiceTestDB(t)
	privateRoot := t.TempDir()

	previousPrivateRoot := documentPrivateUploadsRootPath
	documentPrivateUploadsRootPath = privateRoot
	defer func() {
		documentPrivateUploadsRootPath = previousPrivateRoot
	}()

	link := seedOnboardingInviteLink(t, db, onboardingInviteTypeRider, "rider-token")
	inviteRef := seedOnboardingInvitePrivateAsset(t, privateRoot, link, "id-card.png")
	_, invitePath, err := uploadasset.ResolveAbsolutePath(privateRoot, inviteRef)
	if err != nil {
		t.Fatalf("resolve invite asset path failed: %v", err)
	}

	submission, err := svc.SubmitByInviteToken(context.Background(), "rider-token", OnboardingInviteSubmitRequest{
		Name:                  "测试骑手",
		Phone:                 "13800138002",
		Password:              "pass123456",
		IDCardImage:           inviteRef,
		EmergencyContactName:  "家属",
		EmergencyContactPhone: "13800138003",
	}, "127.0.0.1", "unit-test")
	if err != nil {
		t.Fatalf("SubmitByInviteToken failed: %v", err)
	}

	var rider repository.Rider
	if err := db.First(&rider, submission.EntityID).Error; err != nil {
		t.Fatalf("load rider failed: %v", err)
	}
	parsed, ok := uploadasset.ParseReference(rider.IDCardFront)
	if !ok {
		t.Fatalf("expected rider id card private ref, got %q", rider.IDCardFront)
	}
	if parsed.Domain != uploadasset.DomainOnboardingDocument || parsed.OwnerRole != "rider" || parsed.OwnerID != strconv.FormatUint(uint64(rider.ID), 10) {
		t.Fatalf("unexpected rider id card ref %+v", parsed)
	}
	if submission.IDCardImage != rider.IDCardFront {
		t.Fatalf("expected submission id card %q, got %q", rider.IDCardFront, submission.IDCardImage)
	}
	if _, err := os.Stat(invitePath); !os.IsNotExist(err) {
		t.Fatalf("expected invite-owned asset to be moved away, stat err=%v", err)
	}
}
