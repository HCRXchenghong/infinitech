package handler

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/yuexiang/go-api/internal/uploadasset"
)

func TestPromoteLegacyRiderCertReferenceMovesFileIntoPrivateStorage(t *testing.T) {
	tempDir := t.TempDir()
	previousUploadsRoot := riderPublicUploadsRootPath
	previousPrivateRoot := riderCertPrivateRootPath
	riderPublicUploadsRootPath = filepath.Join(tempDir, "uploads")
	riderCertPrivateRootPath = filepath.Join(tempDir, "private")
	defer func() {
		riderPublicUploadsRootPath = previousUploadsRoot
		riderCertPrivateRootPath = previousPrivateRoot
	}()

	if err := os.MkdirAll(riderPublicUploadsRootPath, 0755); err != nil {
		t.Fatalf("create legacy uploads root failed: %v", err)
	}
	legacyPath := filepath.Join(riderPublicUploadsRootPath, "id-front.png")
	if err := os.WriteFile(legacyPath, []byte("fake-image"), 0644); err != nil {
		t.Fatalf("seed legacy cert failed: %v", err)
	}

	ref, changed, err := promoteLegacyRiderCertReference(12, "id_card_front", "/uploads/id-front.png")
	if err != nil {
		t.Fatalf("promote legacy cert failed: %v", err)
	}
	if !changed {
		t.Fatal("expected legacy cert promotion to report changed")
	}
	if !strings.HasPrefix(ref, riderCertPrivateScheme+"12/id_card_front/") {
		t.Fatalf("unexpected private ref %q", ref)
	}
	if _, err := os.Stat(legacyPath); !os.IsNotExist(err) {
		t.Fatalf("expected legacy public file to be moved away, got err=%v", err)
	}

	privatePath, _, err := resolveRiderCertPrivateAbsPath(12, "id_card_front", ref)
	if err != nil {
		t.Fatalf("resolve private ref failed: %v", err)
	}
	if _, err := os.Stat(privatePath); err != nil {
		t.Fatalf("expected private cert file to exist, got %v", err)
	}
}

func TestResolveLegacyUploadAbsPathRejectsTraversal(t *testing.T) {
	if _, _, err := resolveLegacyUploadAbsPath("/uploads/../../etc/passwd"); err == nil {
		t.Fatal("expected traversal path to be rejected")
	}
}

func TestPromoteLegacyRiderCertReferenceAllowsOwnedOnboardingPrivateRef(t *testing.T) {
	ref := uploadasset.BuildReference(uploadasset.DomainOnboardingDocument, "rider", "12", "id-front.png")

	next, changed, err := promoteLegacyRiderCertReference(12, "id_card_front", ref)
	if err != nil {
		t.Fatalf("expected private onboarding ref to be accepted, got %v", err)
	}
	if changed {
		t.Fatal("expected owned private onboarding ref to remain in place")
	}
	if next != ref {
		t.Fatalf("expected ref %q, got %q", ref, next)
	}
}
