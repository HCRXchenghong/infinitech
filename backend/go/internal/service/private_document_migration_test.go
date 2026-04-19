package service

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/uploadasset"
	"gorm.io/gorm"
)

func TestMigrateStoredDocumentReferencePromotesLegacyPublicPath(t *testing.T) {
	publicRoot := t.TempDir()
	privateRoot := t.TempDir()

	previousPublicRoot := documentPublicUploadsRootPath
	previousPrivateRoot := documentPrivateUploadsRootPath
	documentPublicUploadsRootPath = publicRoot
	documentPrivateUploadsRootPath = privateRoot
	defer func() {
		documentPublicUploadsRootPath = previousPublicRoot
		documentPrivateUploadsRootPath = previousPrivateRoot
	}()

	legacyPath := filepath.Join(publicRoot, uploadasset.DomainMerchantDocument, "license.png")
	if err := os.MkdirAll(filepath.Dir(legacyPath), 0755); err != nil {
		t.Fatalf("failed to create public dir: %v", err)
	}
	if err := os.WriteFile(legacyPath, []byte("merchant-license"), 0644); err != nil {
		t.Fatalf("failed to seed legacy file: %v", err)
	}

	next, changed, err := migrateStoredDocumentReference("/uploads/merchant_document/license.png", uploadasset.DomainMerchantDocument, "merchant", "18")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !changed {
		t.Fatal("expected document reference to change")
	}
	if !uploadasset.IsPrivateReference(next) {
		t.Fatalf("expected migrated private reference, got %q", next)
	}
	if _, err := os.Stat(legacyPath); !os.IsNotExist(err) {
		t.Fatalf("expected legacy file to be moved, stat err=%v", err)
	}
}

func TestMigrateOrderRawPayloadMedicalDocumentCanonicalizesPreviewTarget(t *testing.T) {
	publicRoot := t.TempDir()
	privateRoot := t.TempDir()

	previousPublicRoot := documentPublicUploadsRootPath
	previousPrivateRoot := documentPrivateUploadsRootPath
	documentPublicUploadsRootPath = publicRoot
	documentPrivateUploadsRootPath = privateRoot
	defer func() {
		documentPublicUploadsRootPath = previousPublicRoot
		documentPrivateUploadsRootPath = previousPrivateRoot
	}()

	legacyPath := filepath.Join(publicRoot, uploadasset.DomainMedicalDocument, "rx.png")
	if err := os.MkdirAll(filepath.Dir(legacyPath), 0755); err != nil {
		t.Fatalf("failed to create public dir: %v", err)
	}
	if err := os.WriteFile(legacyPath, []byte("rx-image"), 0644); err != nil {
		t.Fatalf("failed to seed medical file: %v", err)
	}

	rawPayload, err := json.Marshal(map[string]interface{}{
		"requestExtra": map[string]interface{}{
			"prescriptionFileUrl": "/uploads/medical_document/rx.png",
		},
	})
	if err != nil {
		t.Fatalf("failed to build payload: %v", err)
	}

	nextPayload, changed, err := migrateOrderRawPayloadMedicalDocument(string(rawPayload), "42")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !changed {
		t.Fatal("expected payload migration to change raw payload")
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal([]byte(nextPayload), &decoded); err != nil {
		t.Fatalf("failed to decode next payload: %v", err)
	}
	requestExtra := decoded["requestExtra"].(map[string]interface{})
	nextRef := requestExtra["prescriptionFileUrl"].(string)
	if !uploadasset.IsPrivateReference(nextRef) {
		t.Fatalf("expected private reference, got %q", nextRef)
	}
	if requestExtra["prescriptionFileRef"] != nextRef {
		t.Fatalf("expected prescriptionFileRef to mirror next ref, got %v", requestExtra["prescriptionFileRef"])
	}
}

func TestMigrateStoredMerchantDocumentReferencePromotesLegacyOnboardingPath(t *testing.T) {
	publicRoot := t.TempDir()
	privateRoot := t.TempDir()

	previousPublicRoot := documentPublicUploadsRootPath
	previousPrivateRoot := documentPrivateUploadsRootPath
	documentPublicUploadsRootPath = publicRoot
	documentPrivateUploadsRootPath = privateRoot
	defer func() {
		documentPublicUploadsRootPath = previousPublicRoot
		documentPrivateUploadsRootPath = previousPrivateRoot
	}()

	legacyPath := filepath.Join(publicRoot, "onboarding-invite", "invite123", "2026-04-20", "license.png")
	if err := os.MkdirAll(filepath.Dir(legacyPath), 0755); err != nil {
		t.Fatalf("failed to create onboarding public dir: %v", err)
	}
	if err := os.WriteFile(legacyPath, []byte("invite-license"), 0644); err != nil {
		t.Fatalf("failed to seed onboarding invite file: %v", err)
	}

	next, changed, err := migrateStoredMerchantDocumentReference("/uploads/onboarding-invite/invite123/2026-04-20/license.png", "18")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !changed {
		t.Fatal("expected merchant document migration to change reference")
	}

	parsed, ok := uploadasset.ParseReference(next)
	if !ok {
		t.Fatalf("expected migrated private reference, got %q", next)
	}
	if parsed.Domain != uploadasset.DomainMerchantDocument || parsed.OwnerRole != "merchant" || parsed.OwnerID != "18" {
		t.Fatalf("unexpected migrated merchant ref %+v", parsed)
	}
}

func TestMigrateStoredRiderOnboardingDocumentReferenceTransfersInviteRef(t *testing.T) {
	privateRoot := t.TempDir()

	previousPrivateRoot := documentPrivateUploadsRootPath
	documentPrivateUploadsRootPath = privateRoot
	defer func() {
		documentPrivateUploadsRootPath = previousPrivateRoot
	}()

	inviteRef := uploadasset.BuildReference(uploadasset.DomainOnboardingDocument, "invite", "invite123", "id-card.png")
	_, invitePath, err := uploadasset.ResolveAbsolutePath(privateRoot, inviteRef)
	if err != nil {
		t.Fatalf("resolve invite ref failed: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(invitePath), 0755); err != nil {
		t.Fatalf("create invite private dir failed: %v", err)
	}
	if err := os.WriteFile(invitePath, []byte("id-card"), 0644); err != nil {
		t.Fatalf("seed invite private asset failed: %v", err)
	}

	next, changed, err := migrateStoredRiderOnboardingDocumentReference(inviteRef, "12")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !changed {
		t.Fatal("expected rider onboarding document migration to change reference")
	}

	parsed, ok := uploadasset.ParseReference(next)
	if !ok {
		t.Fatalf("expected rider private reference, got %q", next)
	}
	if parsed.Domain != uploadasset.DomainOnboardingDocument || parsed.OwnerRole != "rider" || parsed.OwnerID != "12" {
		t.Fatalf("unexpected migrated rider ref %+v", parsed)
	}
}

func TestMigrateLegacyPrivateDocumentsReusesEntityPrivateRefForSubmission(t *testing.T) {
	db := newPrivateDocumentMigrationTestDB(t)
	publicRoot := t.TempDir()
	privateRoot := t.TempDir()

	previousPublicRoot := documentPublicUploadsRootPath
	previousPrivateRoot := documentPrivateUploadsRootPath
	documentPublicUploadsRootPath = publicRoot
	documentPrivateUploadsRootPath = privateRoot
	defer func() {
		documentPublicUploadsRootPath = previousPublicRoot
		documentPrivateUploadsRootPath = previousPrivateRoot
	}()

	legacyPath := filepath.Join(publicRoot, "onboarding-invite", "invite123", "2026-04-20", "license.png")
	if err := os.MkdirAll(filepath.Dir(legacyPath), 0755); err != nil {
		t.Fatalf("failed to create onboarding public dir: %v", err)
	}
	if err := os.WriteFile(legacyPath, []byte("invite-license"), 0644); err != nil {
		t.Fatalf("failed to seed onboarding invite file: %v", err)
	}

	merchant := repository.Merchant{
		BusinessLicenseImage: "/uploads/onboarding-invite/invite123/2026-04-20/license.png",
	}
	if err := db.Create(&merchant).Error; err != nil {
		t.Fatalf("seed merchant failed: %v", err)
	}
	submission := repository.OnboardingInviteSubmission{
		InviteType:           "merchant",
		EntityType:           "merchant",
		EntityID:             merchant.ID,
		BusinessLicenseImage: merchant.BusinessLicenseImage,
	}
	if err := db.Create(&submission).Error; err != nil {
		t.Fatalf("seed onboarding submission failed: %v", err)
	}

	stats, err := MigrateLegacyPrivateDocuments(context.Background(), db)
	if err != nil {
		t.Fatalf("MigrateLegacyPrivateDocuments failed: %v", err)
	}
	if stats.MerchantsUpdated != 1 || stats.OnboardingSubmissionsUpdated != 1 {
		t.Fatalf("unexpected migration stats: %+v", stats)
	}

	var nextMerchant repository.Merchant
	if err := db.First(&nextMerchant, merchant.ID).Error; err != nil {
		t.Fatalf("load migrated merchant failed: %v", err)
	}
	var nextSubmission repository.OnboardingInviteSubmission
	if err := db.First(&nextSubmission, submission.ID).Error; err != nil {
		t.Fatalf("load migrated submission failed: %v", err)
	}

	parsed, ok := uploadasset.ParseReference(nextMerchant.BusinessLicenseImage)
	if !ok {
		t.Fatalf("expected merchant business license to become private ref, got %q", nextMerchant.BusinessLicenseImage)
	}
	if parsed.Domain != uploadasset.DomainMerchantDocument || parsed.OwnerRole != "merchant" || parsed.OwnerID != strconv.FormatUint(uint64(merchant.ID), 10) {
		t.Fatalf("unexpected migrated merchant ref %+v", parsed)
	}
	if nextSubmission.BusinessLicenseImage != nextMerchant.BusinessLicenseImage {
		t.Fatalf("expected submission to reuse merchant ref %q, got %q", nextMerchant.BusinessLicenseImage, nextSubmission.BusinessLicenseImage)
	}
}

func newPrivateDocumentMigrationTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "private_document_migration_test.db")
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
		&repository.OnboardingInviteSubmission{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}
	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	return db
}
