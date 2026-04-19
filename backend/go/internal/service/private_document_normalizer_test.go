package service

import (
	"context"
	"testing"
	"time"

	"github.com/yuexiang/go-api/internal/uploadasset"
)

func TestNormalizePrivateDocumentReferenceAllowsCurrentMerchant(t *testing.T) {
	ctx := context.Background()
	ctx = context.WithValue(ctx, "operator_role", "merchant")
	ctx = context.WithValue(ctx, "merchant_id", "18")

	ref := uploadasset.BuildReference(uploadasset.DomainMerchantDocument, "merchant", "18", "license.png")
	previewURL := uploadasset.BuildPreviewURL(ref, "preview-secret", testNow(), uploadasset.DefaultPreviewTTL)

	normalized, err := normalizePrivateDocumentReference(ctx, previewURL, uploadasset.DomainMerchantDocument)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if normalized != ref {
		t.Fatalf("expected ref %q, got %q", ref, normalized)
	}
}

func TestNormalizePrivateDocumentReferenceRejectsCrossMerchantReference(t *testing.T) {
	ctx := context.Background()
	ctx = context.WithValue(ctx, "operator_role", "merchant")
	ctx = context.WithValue(ctx, "merchant_id", "18")

	ref := uploadasset.BuildReference(uploadasset.DomainMerchantDocument, "merchant", "99", "license.png")
	if _, err := normalizePrivateDocumentReference(ctx, ref, uploadasset.DomainMerchantDocument); err == nil {
		t.Fatal("expected cross-merchant reference to be rejected")
	}
}

func TestNormalizeRequestExtraMedicalDocumentCanonicalizesPreviewURL(t *testing.T) {
	ctx := context.Background()
	ctx = context.WithValue(ctx, "operator_role", "user")
	ctx = context.WithValue(ctx, "user_id", "42")

	ref := uploadasset.BuildReference(uploadasset.DomainMedicalDocument, "user", "42", "rx.png")
	req := map[string]interface{}{
		"requestExtra": map[string]interface{}{
			"prescriptionFileUrl": uploadasset.BuildPreviewURL(ref, "preview-secret", testNow(), uploadasset.DefaultPreviewTTL),
		},
	}

	if err := normalizeRequestExtraMedicalDocument(ctx, req); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	requestExtra := req["requestExtra"].(map[string]interface{})
	if requestExtra["prescriptionFileUrl"] != ref {
		t.Fatalf("expected prescriptionFileUrl to be canonicalized to %q, got %v", ref, requestExtra["prescriptionFileUrl"])
	}
	if requestExtra["prescriptionFileRef"] != ref {
		t.Fatalf("expected prescriptionFileRef to be set, got %v", requestExtra["prescriptionFileRef"])
	}
}

func testNow() time.Time {
	return time.Unix(1_700_000_000, 0)
}
