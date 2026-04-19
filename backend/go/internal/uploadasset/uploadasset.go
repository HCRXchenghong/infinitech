package uploadasset

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	DomainMerchantDocument = "merchant_document"
	DomainMedicalDocument  = "medical_document"

	PrivateRefScheme  = "private://document/"
	PreviewPath       = "/api/private-assets/preview"
	DefaultPreviewTTL = 15 * time.Minute
)

type Reference struct {
	Domain    string
	OwnerRole string
	OwnerID   string
	Filename  string
}

var (
	previewSecretMu sync.RWMutex
	previewSecret   string
)

func ConfigurePreviewSigningSecret(secret string) {
	previewSecretMu.Lock()
	previewSecret = strings.TrimSpace(secret)
	previewSecretMu.Unlock()
}

func configuredPreviewSigningSecret() string {
	previewSecretMu.RLock()
	defer previewSecretMu.RUnlock()
	return previewSecret
}

func IsPrivateReference(raw string) bool {
	return strings.HasPrefix(strings.TrimSpace(raw), PrivateRefScheme)
}

func BuildReference(domain, ownerRole, ownerID, filename string) string {
	normalizedDomain := strings.ToLower(strings.TrimSpace(domain))
	normalizedRole := strings.ToLower(strings.TrimSpace(ownerRole))
	normalizedOwnerID := strings.TrimSpace(ownerID)
	normalizedFilename := filepath.Base(strings.TrimSpace(filename))
	if normalizedDomain == "" || normalizedRole == "" || normalizedOwnerID == "" {
		return ""
	}
	if normalizedFilename == "." || normalizedFilename == "" {
		return ""
	}
	return fmt.Sprintf(
		"%s%s/%s/%s/%s",
		PrivateRefScheme,
		normalizedDomain,
		normalizedRole,
		normalizedOwnerID,
		normalizedFilename,
	)
}

func ParseReference(raw string) (Reference, bool) {
	value := strings.TrimSpace(raw)
	if !strings.HasPrefix(value, PrivateRefScheme) {
		return Reference{}, false
	}

	relative := strings.TrimPrefix(value, PrivateRefScheme)
	parts := strings.Split(relative, "/")
	if len(parts) != 4 {
		return Reference{}, false
	}

	ref := Reference{
		Domain:    strings.ToLower(strings.TrimSpace(parts[0])),
		OwnerRole: strings.ToLower(strings.TrimSpace(parts[1])),
		OwnerID:   strings.TrimSpace(parts[2]),
		Filename:  filepath.Base(strings.TrimSpace(parts[3])),
	}
	if ref.Domain == "" || ref.OwnerRole == "" || ref.OwnerID == "" {
		return Reference{}, false
	}
	if ref.Filename == "." || ref.Filename == "" {
		return Reference{}, false
	}
	return ref, true
}

func BuildStorageDir(root, domain, ownerRole, ownerID string) string {
	return filepath.Join(
		strings.TrimSpace(root),
		strings.ToLower(strings.TrimSpace(domain)),
		strings.ToLower(strings.TrimSpace(ownerRole)),
		strings.TrimSpace(ownerID),
	)
}

func ResolveAbsolutePath(root, raw string) (Reference, string, error) {
	ref, ok := ParseReference(raw)
	if !ok {
		return Reference{}, "", fmt.Errorf("private asset reference is invalid")
	}

	cleanRoot := filepath.Clean(strings.TrimSpace(root))
	if cleanRoot == "" || cleanRoot == "." {
		return Reference{}, "", fmt.Errorf("private asset root is invalid")
	}

	absPath := filepath.Join(cleanRoot, ref.Domain, ref.OwnerRole, ref.OwnerID, ref.Filename)
	cleanAbsPath := filepath.Clean(absPath)
	if cleanAbsPath != cleanRoot && !strings.HasPrefix(cleanAbsPath, cleanRoot+string(filepath.Separator)) {
		return Reference{}, "", fmt.Errorf("private asset path is invalid")
	}

	return ref, cleanAbsPath, nil
}

func BuildPreviewURL(raw, secret string, now time.Time, ttl time.Duration) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if !IsPrivateReference(value) {
		return value
	}

	normalizedSecret := strings.TrimSpace(secret)
	if normalizedSecret == "" {
		return value
	}

	if ttl <= 0 {
		ttl = DefaultPreviewTTL
	}

	expiresAt := now.Add(ttl).Unix()
	query := url.Values{}
	query.Set("asset_id", value)
	query.Set("expires", strconv.FormatInt(expiresAt, 10))
	query.Set("signature", signPreviewToken(value, expiresAt, normalizedSecret))
	return PreviewPath + "?" + query.Encode()
}

func BuildConfiguredPreviewURL(raw string) string {
	return BuildPreviewURL(raw, configuredPreviewSigningSecret(), time.Now(), DefaultPreviewTTL)
}

func VerifyPreviewQuery(assetID, expiresRaw, signature, secret string, now time.Time) bool {
	ref := strings.TrimSpace(assetID)
	expiresText := strings.TrimSpace(expiresRaw)
	sig := strings.TrimSpace(signature)
	normalizedSecret := strings.TrimSpace(secret)
	if ref == "" || expiresText == "" || sig == "" || normalizedSecret == "" {
		return false
	}

	expiresAt, err := strconv.ParseInt(expiresText, 10, 64)
	if err != nil || expiresAt <= 0 {
		return false
	}
	if now.Unix() > expiresAt {
		return false
	}

	expected := signPreviewToken(ref, expiresAt, normalizedSecret)
	return hmac.Equal([]byte(expected), []byte(sig))
}

func ExtractReference(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if IsPrivateReference(value) {
		return value
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return ""
	}
	if strings.TrimSpace(parsed.Path) != PreviewPath {
		return ""
	}
	return strings.TrimSpace(parsed.Query().Get("asset_id"))
}

func signPreviewToken(ref string, expiresAt int64, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(ref))
	_, _ = mac.Write([]byte("\n"))
	_, _ = mac.Write([]byte(strconv.FormatInt(expiresAt, 10)))
	return hex.EncodeToString(mac.Sum(nil))
}
