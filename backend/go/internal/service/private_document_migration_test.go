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
	"github.com/yuexiang/go-api/internal/ridercert"
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

func TestMigrateStoredRiderDocumentReferencePromotesAllControlledSources(t *testing.T) {
	publicRoot := t.TempDir()
	documentPrivateRoot := t.TempDir()
	riderPrivateRoot := t.TempDir()

	previousPublicRoot := documentPublicUploadsRootPath
	previousDocumentPrivateRoot := documentPrivateUploadsRootPath
	previousRiderPrivateRoot := riderPrivateUploadsRootPath
	documentPublicUploadsRootPath = publicRoot
	documentPrivateUploadsRootPath = documentPrivateRoot
	riderPrivateUploadsRootPath = riderPrivateRoot
	defer func() {
		documentPublicUploadsRootPath = previousPublicRoot
		documentPrivateUploadsRootPath = previousDocumentPrivateRoot
		riderPrivateUploadsRootPath = previousRiderPrivateRoot
	}()

	onboardingLegacyPath := filepath.Join(publicRoot, "onboarding-invite", "invite123", "2026-04-20", "id-front.png")
	if err := os.MkdirAll(filepath.Dir(onboardingLegacyPath), 0755); err != nil {
		t.Fatalf("failed to create onboarding legacy dir: %v", err)
	}
	if err := os.WriteFile(onboardingLegacyPath, []byte("front"), 0644); err != nil {
		t.Fatalf("failed to seed onboarding legacy file: %v", err)
	}

	riderLegacyPath := filepath.Join(publicRoot, "certs", "health-cert.png")
	if err := os.MkdirAll(filepath.Dir(riderLegacyPath), 0755); err != nil {
		t.Fatalf("failed to create rider legacy dir: %v", err)
	}
	if err := os.WriteFile(riderLegacyPath, []byte("health"), 0644); err != nil {
		t.Fatalf("failed to seed rider legacy file: %v", err)
	}

	inviteRef := uploadasset.BuildReference(uploadasset.DomainOnboardingDocument, "invite", "invite123", "id-back.png")
	_, invitePath, err := uploadasset.ResolveAbsolutePath(documentPrivateRoot, inviteRef)
	if err != nil {
		t.Fatalf("resolve invite ref failed: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(invitePath), 0755); err != nil {
		t.Fatalf("failed to create invite private dir: %v", err)
	}
	if err := os.WriteFile(invitePath, []byte("back"), 0644); err != nil {
		t.Fatalf("failed to seed invite private file: %v", err)
	}

	onboardingNext, changed, err := migrateStoredRiderDocumentReference("/uploads/onboarding-invite/invite123/2026-04-20/id-front.png", 12, "id_card_front")
	if err != nil {
		t.Fatalf("expected onboarding legacy path to migrate, got %v", err)
	}
	if !changed {
		t.Fatal("expected onboarding legacy path to change")
	}
	onboardingParsed, ok := uploadasset.ParseReference(onboardingNext)
	if !ok || onboardingParsed.Domain != uploadasset.DomainOnboardingDocument || onboardingParsed.OwnerRole != "rider" || onboardingParsed.OwnerID != "12" {
		t.Fatalf("unexpected onboarding rider ref %+v", onboardingParsed)
	}

	privateNext, changed, err := migrateStoredRiderDocumentReference(inviteRef, 12, "id_card_back")
	if err != nil {
		t.Fatalf("expected onboarding private ref to transfer, got %v", err)
	}
	if !changed {
		t.Fatal("expected onboarding private ref to change")
	}
	privateParsed, ok := uploadasset.ParseReference(privateNext)
	if !ok || privateParsed.Domain != uploadasset.DomainOnboardingDocument || privateParsed.OwnerRole != "rider" || privateParsed.OwnerID != "12" {
		t.Fatalf("unexpected transferred rider ref %+v", privateParsed)
	}

	riderNext, changed, err := migrateStoredRiderDocumentReference("/uploads/certs/health-cert.png", 12, "health_cert")
	if err != nil {
		t.Fatalf("expected rider legacy cert path to migrate, got %v", err)
	}
	if !changed {
		t.Fatal("expected rider legacy cert path to change")
	}
	ownerID, parsedField, _, ok := ridercert.ParsePrivateReference(riderNext)
	if !ok || ownerID != "12" || parsedField != "health_cert" {
		t.Fatalf("unexpected rider private ref %q", riderNext)
	}
}

func TestMigrateLegacyPrivateDocumentsMigratesAllRiderDocumentFields(t *testing.T) {
	db := newPrivateDocumentMigrationTestDB(t)
	publicRoot := t.TempDir()
	documentPrivateRoot := t.TempDir()
	riderPrivateRoot := t.TempDir()

	previousPublicRoot := documentPublicUploadsRootPath
	previousDocumentPrivateRoot := documentPrivateUploadsRootPath
	previousRiderPrivateRoot := riderPrivateUploadsRootPath
	documentPublicUploadsRootPath = publicRoot
	documentPrivateUploadsRootPath = documentPrivateRoot
	riderPrivateUploadsRootPath = riderPrivateRoot
	defer func() {
		documentPublicUploadsRootPath = previousPublicRoot
		documentPrivateUploadsRootPath = previousDocumentPrivateRoot
		riderPrivateUploadsRootPath = previousRiderPrivateRoot
	}()

	frontLegacyPath := filepath.Join(publicRoot, "onboarding-invite", "invite123", "2026-04-20", "id-front.png")
	if err := os.MkdirAll(filepath.Dir(frontLegacyPath), 0755); err != nil {
		t.Fatalf("failed to create front legacy dir: %v", err)
	}
	if err := os.WriteFile(frontLegacyPath, []byte("front"), 0644); err != nil {
		t.Fatalf("failed to seed front legacy file: %v", err)
	}

	healthLegacyPath := filepath.Join(publicRoot, "certs", "health.png")
	if err := os.MkdirAll(filepath.Dir(healthLegacyPath), 0755); err != nil {
		t.Fatalf("failed to create health legacy dir: %v", err)
	}
	if err := os.WriteFile(healthLegacyPath, []byte("health"), 0644); err != nil {
		t.Fatalf("failed to seed health legacy file: %v", err)
	}

	backInviteRef := uploadasset.BuildReference(uploadasset.DomainOnboardingDocument, "invite", "invite123", "id-back.png")
	_, backInvitePath, err := uploadasset.ResolveAbsolutePath(documentPrivateRoot, backInviteRef)
	if err != nil {
		t.Fatalf("resolve back invite ref failed: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(backInvitePath), 0755); err != nil {
		t.Fatalf("failed to create back invite dir: %v", err)
	}
	if err := os.WriteFile(backInvitePath, []byte("back"), 0644); err != nil {
		t.Fatalf("failed to seed back invite file: %v", err)
	}

	rider := repository.Rider{
		Phone:        "13800138013",
		Name:         "Migrating Rider",
		PasswordHash: "hash",
		IDCardFront:  "/uploads/onboarding-invite/invite123/2026-04-20/id-front.png",
		IDCardBack:   backInviteRef,
		HealthCert:   "/uploads/certs/health.png",
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("seed rider failed: %v", err)
	}

	stats, err := MigrateLegacyPrivateDocuments(context.Background(), db)
	if err != nil {
		t.Fatalf("MigrateLegacyPrivateDocuments failed: %v", err)
	}
	if stats.RidersUpdated != 1 || stats.RiderFieldsMoved != 3 {
		t.Fatalf("unexpected rider migration stats: %+v", stats)
	}

	var updated repository.Rider
	if err := db.First(&updated, rider.ID).Error; err != nil {
		t.Fatalf("load migrated rider failed: %v", err)
	}

	frontParsed, ok := uploadasset.ParseReference(updated.IDCardFront)
	if !ok || frontParsed.Domain != uploadasset.DomainOnboardingDocument || frontParsed.OwnerRole != "rider" || frontParsed.OwnerID != strconv.FormatUint(uint64(rider.ID), 10) {
		t.Fatalf("unexpected migrated front ref %+v", frontParsed)
	}

	backParsed, ok := uploadasset.ParseReference(updated.IDCardBack)
	if !ok || backParsed.Domain != uploadasset.DomainOnboardingDocument || backParsed.OwnerRole != "rider" || backParsed.OwnerID != strconv.FormatUint(uint64(rider.ID), 10) {
		t.Fatalf("unexpected migrated back ref %+v", backParsed)
	}

	ownerID, field, _, ok := ridercert.ParsePrivateReference(updated.HealthCert)
	if !ok || ownerID != strconv.FormatUint(uint64(rider.ID), 10) || field != "health_cert" {
		t.Fatalf("unexpected migrated health cert ref %q", updated.HealthCert)
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
