package uploadasset

import (
	"fmt"
	"net/url"
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
