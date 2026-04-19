package ridercert

import (
	"strings"
	"testing"

	"github.com/yuexiang/go-api/internal/uploadasset"
)

func TestNormalizeOwnedUpdateReferenceAcceptsOwnedRefs(t *testing.T) {
	privateRef := BuildPrivateReference(12, "id_card_front", "id-front.png")
	if privateRef == "" {
		t.Fatal("expected rider private ref")
	}

	next, err := NormalizeOwnedUpdateReference(12, "id_card_front", privateRef, "")
	if err != nil {
		t.Fatalf("expected rider private ref to pass, got %v", err)
	}
	if next != privateRef {
		t.Fatalf("expected rider private ref %q, got %q", privateRef, next)
	}

	onboardingRef := uploadasset.BuildReference(uploadasset.DomainOnboardingDocument, "rider", "12", "id-front.png")
	next, err = NormalizeOwnedUpdateReference(12, "id_card_front", onboardingRef, "")
	if err != nil {
		t.Fatalf("expected onboarding rider ref to pass, got %v", err)
	}
	if next != onboardingRef {
		t.Fatalf("expected onboarding ref %q, got %q", onboardingRef, next)
	}
}

func TestNormalizeOwnedUpdateReferenceRejectsForeignOrPublicRefs(t *testing.T) {
	if _, err := NormalizeOwnedUpdateReference(12, "id_card_front", BuildPrivateReference(13, "id_card_front", "id-front.png"), ""); err == nil {
		t.Fatal("expected foreign rider private ref to be rejected")
	}

	foreignOnboarding := uploadasset.BuildReference(uploadasset.DomainOnboardingDocument, "rider", "99", "id-front.png")
	if _, err := NormalizeOwnedUpdateReference(12, "id_card_front", foreignOnboarding, ""); err == nil {
		t.Fatal("expected foreign onboarding ref to be rejected")
	}

	if _, err := NormalizeOwnedUpdateReference(12, "id_card_front", "/uploads/images/other.png", ""); err == nil {
		t.Fatal("expected arbitrary public upload path to be rejected")
	}
}

func TestNormalizeOwnedUpdateReferenceAllowsCurrentLegacyPublicPathOnlyWhenUnchanged(t *testing.T) {
	current := "/uploads/id-front.png"
	next, err := NormalizeOwnedUpdateReference(12, "id_card_front", current, current)
	if err != nil {
		t.Fatalf("expected unchanged legacy path to remain usable during transition, got %v", err)
	}
	if next != current {
		t.Fatalf("expected current legacy path %q, got %q", current, next)
	}

	if _, err := NormalizeOwnedUpdateReference(12, "id_card_front", "/uploads/other.png", current); err == nil {
		t.Fatal("expected different legacy public path to be rejected")
	}
}

func TestBuildPreviewURLPrefersControlledRoutes(t *testing.T) {
	uploadasset.ConfigurePreviewSigningSecret("preview-secret")
	t.Cleanup(func() {
		uploadasset.ConfigurePreviewSigningSecret("")
	})

	privateRef := BuildPrivateReference(12, "id_card_front", "id-front.png")
	if got := BuildPreviewURL(12, "id_card_front", privateRef); got != "/api/riders/12/cert?field=id_card_front" {
		t.Fatalf("unexpected rider private preview url %q", got)
	}

	onboardingRef := uploadasset.BuildReference(uploadasset.DomainOnboardingDocument, "rider", "12", "id-front.png")
	if got := BuildPreviewURL(12, "id_card_front", onboardingRef); got == "" || got == onboardingRef || !strings.HasPrefix(got, "/api/private-assets/preview?") {
		t.Fatalf("expected controlled onboarding preview url, got %q", got)
	}
}
