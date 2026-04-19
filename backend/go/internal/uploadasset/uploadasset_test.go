package uploadasset

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestBuildAndParseReference(t *testing.T) {
	ref := BuildReference(DomainMerchantDocument, "merchant", "18", "license.png")
	if ref == "" {
		t.Fatal("expected reference")
	}

	parsed, ok := ParseReference(ref)
	if !ok {
		t.Fatal("expected parsed reference")
	}
	if parsed.Domain != DomainMerchantDocument {
		t.Fatalf("expected domain %q, got %q", DomainMerchantDocument, parsed.Domain)
	}
	if parsed.OwnerRole != "merchant" || parsed.OwnerID != "18" {
		t.Fatalf("unexpected owner: %+v", parsed)
	}
	if parsed.Filename != "license.png" {
		t.Fatalf("expected filename license.png, got %q", parsed.Filename)
	}
}

func TestResolveAbsolutePathRejectsTraversal(t *testing.T) {
	if _, _, err := ResolveAbsolutePath("/tmp/private", BuildReference(DomainMerchantDocument, "merchant", "9", "../evil.png")); err != nil {
		t.Fatalf("expected filepath.Base to normalize filename, got error: %v", err)
	}
}

func TestBuildPreviewURLAndVerify(t *testing.T) {
	ref := BuildReference(DomainMedicalDocument, "user", "42", "rx.png")
	now := time.Unix(1_700_000_000, 0)
	previewURL := BuildPreviewURL(ref, "preview-secret", now, 10*time.Minute)
	if previewURL == "" || previewURL == ref {
		t.Fatalf("expected signed preview url, got %q", previewURL)
	}

	extracted := ExtractReference(previewURL)
	if extracted != ref {
		t.Fatalf("expected extracted reference %q, got %q", ref, extracted)
	}

	values, err := parsePreviewQuery(previewURL)
	if err != nil {
		t.Fatalf("failed to parse preview query: %v", err)
	}

	if !VerifyPreviewQuery(ref, values["expires"], values["signature"], "preview-secret", now.Add(5*time.Minute)) {
		t.Fatal("expected preview query to verify")
	}
	if VerifyPreviewQuery(ref, values["expires"], values["signature"], "preview-secret", now.Add(11*time.Minute)) {
		t.Fatal("expected expired preview query to fail")
	}
}

func TestBuildPreviewURLSignsProtectedLegacyPath(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	previewURL := BuildPreviewURL("/uploads/merchant_document/license.png", "preview-secret", now, 10*time.Minute)
	if !strings.Contains(previewURL, PreviewPath) {
		t.Fatalf("expected preview url to use controlled preview path, got %q", previewURL)
	}

	values, err := parsePreviewQuery(previewURL)
	if err != nil {
		t.Fatalf("failed to parse preview query: %v", err)
	}
	if values["asset_id"] != "/uploads/merchant_document/license.png" {
		t.Fatalf("expected asset_id to preserve legacy path, got %q", values["asset_id"])
	}
}

func TestBuildPreviewURLSignsLegacyOnboardingInvitePath(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	previewURL := BuildPreviewURL("/uploads/onboarding-invite/token/2026-04-20/license.png", "preview-secret", now, 10*time.Minute)
	if !strings.Contains(previewURL, PreviewPath) {
		t.Fatalf("expected preview url to use controlled preview path, got %q", previewURL)
	}

	values, err := parsePreviewQuery(previewURL)
	if err != nil {
		t.Fatalf("failed to parse preview query: %v", err)
	}
	if values["asset_id"] != "/uploads/onboarding-invite/token/2026-04-20/license.png" {
		t.Fatalf("expected onboarding asset_id to preserve legacy path, got %q", values["asset_id"])
	}
}

func TestPromoteLegacyProtectedAssetMovesFile(t *testing.T) {
	publicRoot := t.TempDir()
	privateRoot := t.TempDir()

	legacyPath := filepath.Join(publicRoot, DomainMedicalDocument, "rx.png")
	if err := os.MkdirAll(filepath.Dir(legacyPath), 0755); err != nil {
		t.Fatalf("failed to create legacy dir: %v", err)
	}
	if err := os.WriteFile(legacyPath, []byte("rx"), 0644); err != nil {
		t.Fatalf("failed to seed legacy file: %v", err)
	}

	ref, changed, err := PromoteLegacyProtectedAsset("/uploads/medical_document/rx.png", DomainMedicalDocument, "user", "42", publicRoot, privateRoot)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !changed {
		t.Fatal("expected asset to be moved")
	}
	if !IsPrivateReference(ref) {
		t.Fatalf("expected private ref, got %q", ref)
	}
	if _, err := os.Stat(legacyPath); !os.IsNotExist(err) {
		t.Fatalf("expected legacy file to be moved away, stat err=%v", err)
	}
}

func TestTransferPrivateAssetMovesFileBetweenOwners(t *testing.T) {
	privateRoot := t.TempDir()

	initialRef := BuildReference(DomainOnboardingDocument, "invite", "invite-uid", "license.png")
	_, initialPath, err := ResolveAbsolutePath(privateRoot, initialRef)
	if err != nil {
		t.Fatalf("resolve initial path failed: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(initialPath), 0755); err != nil {
		t.Fatalf("create private dir failed: %v", err)
	}
	if err := os.WriteFile(initialPath, []byte("license"), 0644); err != nil {
		t.Fatalf("seed private asset failed: %v", err)
	}

	nextRef, changed, err := TransferPrivateAsset(
		initialRef,
		DomainOnboardingDocument,
		"invite",
		"invite-uid",
		DomainMerchantDocument,
		"merchant",
		"18",
		privateRoot,
	)
	if err != nil {
		t.Fatalf("transfer private asset failed: %v", err)
	}
	if !changed {
		t.Fatal("expected transfer to report changed")
	}
	if !strings.HasPrefix(nextRef, PrivateRefScheme+DomainMerchantDocument+"/merchant/18/") {
		t.Fatalf("unexpected transferred ref %q", nextRef)
	}
	if _, err := os.Stat(initialPath); !os.IsNotExist(err) {
		t.Fatalf("expected source file to move away, stat err=%v", err)
	}

	_, nextPath, err := ResolveAbsolutePath(privateRoot, nextRef)
	if err != nil {
		t.Fatalf("resolve transferred path failed: %v", err)
	}
	if _, err := os.Stat(nextPath); err != nil {
		t.Fatalf("expected transferred file to exist, got %v", err)
	}
}

func parsePreviewQuery(raw string) (map[string]string, error) {
	values := map[string]string{}
	parts := strings.SplitN(raw, "?", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("missing query")
	}
	query, err := url.ParseQuery(parts[1])
	if err != nil {
		return nil, err
	}
	for key := range query {
		values[key] = query.Get(key)
	}
	return values, nil
}
