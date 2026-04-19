package service

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/yuexiang/go-api/internal/uploadasset"
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
