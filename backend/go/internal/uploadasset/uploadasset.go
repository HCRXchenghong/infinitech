package uploadasset

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	DomainMerchantDocument   = "merchant_document"
	DomainMedicalDocument    = "medical_document"
	DomainOnboardingDocument = "onboarding_document"

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

func NormalizeProtectedLegacyPath(raw string) (string, string, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", "", false
	}

	if parsed, err := url.Parse(value); err == nil && strings.TrimSpace(parsed.Path) != "" {
		value = strings.TrimSpace(parsed.Path)
	}

	if !strings.HasPrefix(value, "/uploads/") {
		return "", "", false
	}

	cleanPath := path.Clean(value)
	switch {
	case strings.HasPrefix(cleanPath, "/uploads/"+DomainMerchantDocument+"/"):
		return cleanPath, DomainMerchantDocument, true
	case strings.HasPrefix(cleanPath, "/uploads/"+DomainMedicalDocument+"/"):
		return cleanPath, DomainMedicalDocument, true
	case strings.HasPrefix(cleanPath, "/uploads/onboarding-invite/"):
		return cleanPath, DomainOnboardingDocument, true
	default:
		return "", "", false
	}
}

func ResolveLegacyProtectedAbsolutePath(publicRoot, raw string) (string, string, string, error) {
	normalizedPath, domain, ok := NormalizeProtectedLegacyPath(raw)
	if !ok {
		return "", "", "", fmt.Errorf("legacy protected asset path is invalid")
	}

	relative := strings.TrimPrefix(normalizedPath, "/uploads/")
	relative = filepath.Clean(filepath.FromSlash(relative))
	if relative == "." || relative == "" || strings.HasPrefix(relative, "..") {
		return "", "", "", fmt.Errorf("legacy protected asset path is invalid")
	}

	cleanRoot := filepath.Clean(strings.TrimSpace(publicRoot))
	if cleanRoot == "" || cleanRoot == "." {
		return "", "", "", fmt.Errorf("legacy protected asset root is invalid")
	}

	absPath := filepath.Join(cleanRoot, relative)
	cleanAbsPath := filepath.Clean(absPath)
	if cleanAbsPath != cleanRoot && !strings.HasPrefix(cleanAbsPath, cleanRoot+string(filepath.Separator)) {
		return "", "", "", fmt.Errorf("legacy protected asset path is invalid")
	}

	filename := filepath.Base(cleanAbsPath)
	if filename == "." || filename == "" {
		return "", "", "", fmt.Errorf("legacy protected asset path is invalid")
	}

	return domain, cleanAbsPath, filename, nil
}

func PromoteLegacyProtectedAsset(raw, domain, ownerRole, ownerID, publicRoot, privateRoot string) (string, bool, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false, nil
	}

	if extracted := ExtractReference(value); extracted != "" {
		value = extracted
	}
	if IsPrivateReference(value) {
		return value, false, nil
	}

	resolvedPath, resolvedDomain, ok := NormalizeProtectedLegacyPath(value)
	if !ok {
		return value, false, nil
	}
	if strings.ToLower(strings.TrimSpace(domain)) != resolvedDomain {
		return "", false, fmt.Errorf("legacy protected asset domain mismatch")
	}

	_, srcPath, filename, err := ResolveLegacyProtectedAbsolutePath(publicRoot, resolvedPath)
	if err != nil {
		return "", false, err
	}
	if _, statErr := os.Stat(srcPath); statErr != nil {
		if os.IsNotExist(statErr) {
			return "", false, fmt.Errorf("legacy protected asset is missing")
		}
		return "", false, fmt.Errorf("legacy protected asset read failed")
	}

	normalizedExt := strings.ToLower(filepath.Ext(filename))
	destFilename := fmt.Sprintf("%d_%s_%s%s", time.Now().UnixNano(), strings.TrimSpace(ownerID), strings.ToLower(strings.TrimSpace(domain)), normalizedExt)
	destDir := BuildStorageDir(privateRoot, domain, ownerRole, ownerID)
	destPath := filepath.Join(destDir, destFilename)
	if err := moveFileReplace(srcPath, destPath); err != nil {
		return "", false, fmt.Errorf("legacy protected asset migration failed")
	}

	return BuildReference(domain, ownerRole, ownerID, destFilename), true, nil
}

func TransferPrivateAsset(raw, expectedDomain, expectedOwnerRole, expectedOwnerID, targetDomain, targetOwnerRole, targetOwnerID, privateRoot string) (string, bool, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false, nil
	}

	refValue := ExtractReference(value)
	if refValue == "" || !IsPrivateReference(refValue) {
		return "", false, fmt.Errorf("private asset reference is invalid")
	}

	parsed, ok := ParseReference(refValue)
	if !ok {
		return "", false, fmt.Errorf("private asset reference is invalid")
	}

	normalizedExpectedDomain := strings.ToLower(strings.TrimSpace(expectedDomain))
	normalizedExpectedOwnerRole := strings.ToLower(strings.TrimSpace(expectedOwnerRole))
	normalizedExpectedOwnerID := strings.TrimSpace(expectedOwnerID)
	if normalizedExpectedDomain != "" && parsed.Domain != normalizedExpectedDomain {
		return "", false, fmt.Errorf("private asset domain mismatch")
	}
	if normalizedExpectedOwnerRole != "" && parsed.OwnerRole != normalizedExpectedOwnerRole {
		return "", false, fmt.Errorf("private asset owner mismatch")
	}
	if normalizedExpectedOwnerID != "" && parsed.OwnerID != normalizedExpectedOwnerID {
		return "", false, fmt.Errorf("private asset owner mismatch")
	}

	normalizedTargetDomain := strings.ToLower(strings.TrimSpace(targetDomain))
	normalizedTargetOwnerRole := strings.ToLower(strings.TrimSpace(targetOwnerRole))
	normalizedTargetOwnerID := strings.TrimSpace(targetOwnerID)
	if normalizedTargetDomain == "" || normalizedTargetOwnerRole == "" || normalizedTargetOwnerID == "" {
		return "", false, fmt.Errorf("private asset target is invalid")
	}

	targetRef := BuildReference(normalizedTargetDomain, normalizedTargetOwnerRole, normalizedTargetOwnerID, parsed.Filename)
	if targetRef == "" {
		return "", false, fmt.Errorf("private asset target is invalid")
	}
	if parsed.Domain == normalizedTargetDomain &&
		parsed.OwnerRole == normalizedTargetOwnerRole &&
		parsed.OwnerID == normalizedTargetOwnerID {
		return targetRef, targetRef != value, nil
	}

	_, srcPath, err := ResolveAbsolutePath(privateRoot, refValue)
	if err != nil {
		return "", false, err
	}
	if _, statErr := os.Stat(srcPath); statErr != nil {
		if os.IsNotExist(statErr) {
			return "", false, fmt.Errorf("private asset is missing")
		}
		return "", false, fmt.Errorf("private asset read failed")
	}

	normalizedExt := strings.ToLower(filepath.Ext(parsed.Filename))
	destFilename := fmt.Sprintf(
		"%d_%s_%s%s",
		time.Now().UnixNano(),
		normalizedTargetOwnerID,
		normalizedTargetDomain,
		normalizedExt,
	)
	destDir := BuildStorageDir(privateRoot, normalizedTargetDomain, normalizedTargetOwnerRole, normalizedTargetOwnerID)
	destPath := filepath.Join(destDir, destFilename)
	if err := moveFileReplace(srcPath, destPath); err != nil {
		return "", false, fmt.Errorf("private asset transfer failed")
	}

	return BuildReference(normalizedTargetDomain, normalizedTargetOwnerRole, normalizedTargetOwnerID, destFilename), true, nil
}

func BuildPreviewURL(raw, secret string, now time.Time, ttl time.Duration) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}

	if extracted := ExtractReference(value); extracted != "" {
		value = extracted
	}

	if !IsPrivateReference(value) {
		if normalizedLegacyPath, _, ok := NormalizeProtectedLegacyPath(value); ok {
			value = normalizedLegacyPath
		} else {
			return value
		}
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
	if normalizedLegacyPath, _, ok := NormalizeProtectedLegacyPath(value); ok {
		return normalizedLegacyPath
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

func moveFileReplace(srcPath, destPath string) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}
	if err := os.Rename(srcPath, destPath); err == nil {
		return nil
	}

	srcFile, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	destFile, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	if _, err := io.Copy(destFile, srcFile); err != nil {
		destFile.Close()
		return err
	}
	if err := destFile.Close(); err != nil {
		return err
	}
	return os.Remove(srcPath)
}
