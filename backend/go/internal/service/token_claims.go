package service

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

const (
	tokenKindAccess  = "access"
	tokenKindRefresh = "refresh"

	principalTypeUser     = "user"
	principalTypeMerchant = "merchant"
	principalTypeRider    = "rider"
	principalTypeAdmin    = "admin"
)

func normalizeBearerTokenString(token string) string {
	value := strings.TrimSpace(token)
	if strings.HasPrefix(strings.ToLower(value), "bearer ") {
		return strings.TrimSpace(value[7:])
	}
	return value
}

func claimString(payload map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		value, ok := payload[key]
		if !ok || value == nil {
			continue
		}
		switch typed := value.(type) {
		case string:
			if trimmed := strings.TrimSpace(typed); trimmed != "" {
				return trimmed
			}
		case fmt.Stringer:
			if trimmed := strings.TrimSpace(typed.String()); trimmed != "" {
				return trimmed
			}
		case float64:
			if typed > 0 {
				return strconv.FormatInt(int64(typed), 10)
			}
		case int:
			if typed > 0 {
				return strconv.Itoa(typed)
			}
		case int64:
			if typed > 0 {
				return strconv.FormatInt(typed, 10)
			}
		case uint:
			if typed > 0 {
				return strconv.FormatUint(uint64(typed), 10)
			}
		case uint64:
			if typed > 0 {
				return strconv.FormatUint(typed, 10)
			}
		}
	}
	return ""
}

func claimInt64(payload map[string]interface{}, keys ...string) int64 {
	for _, key := range keys {
		value, ok := payload[key]
		if !ok || value == nil {
			continue
		}
		switch typed := value.(type) {
		case float64:
			if typed > 0 {
				return int64(typed)
			}
		case int:
			if typed > 0 {
				return int64(typed)
			}
		case int64:
			if typed > 0 {
				return typed
			}
		case uint:
			if typed > 0 {
				return int64(typed)
			}
		case uint64:
			if typed > 0 {
				return int64(typed)
			}
		case string:
			parsed, err := strconv.ParseInt(strings.TrimSpace(typed), 10, 64)
			if err == nil && parsed > 0 {
				return parsed
			}
		}
	}
	return 0
}

func claimStringSlice(payload map[string]interface{}, keys ...string) []string {
	for _, key := range keys {
		value, ok := payload[key]
		if !ok || value == nil {
			continue
		}

		var result []string
		switch typed := value.(type) {
		case []string:
			for _, item := range typed {
				if trimmed := strings.TrimSpace(item); trimmed != "" {
					result = append(result, trimmed)
				}
			}
		case []interface{}:
			for _, item := range typed {
				if trimmed := strings.TrimSpace(fmt.Sprint(item)); trimmed != "" {
					result = append(result, trimmed)
				}
			}
		case string:
			if trimmed := strings.TrimSpace(typed); trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return nil
}

func normalizeUnifiedTokenKind(payload map[string]interface{}) string {
	kind := strings.ToLower(strings.TrimSpace(claimString(payload, "token_kind", "tokenKind")))
	if kind == tokenKindAccess || kind == tokenKindRefresh {
		return kind
	}
	legacyType := strings.ToLower(strings.TrimSpace(claimString(payload, "type")))
	if legacyType == tokenKindAccess || legacyType == tokenKindRefresh {
		return legacyType
	}
	return tokenKindAccess
}

func normalizeUnifiedPrincipalType(payload map[string]interface{}, fallback string) string {
	candidate := strings.ToLower(strings.TrimSpace(claimString(payload, "principal_type", "principalType")))
	if candidate != "" {
		if candidate == "super_admin" {
			return principalTypeAdmin
		}
		return candidate
	}

	roleCandidate := strings.ToLower(strings.TrimSpace(claimString(payload, "role", "userType")))
	switch roleCandidate {
	case principalTypeUser, principalTypeMerchant, principalTypeRider, principalTypeAdmin:
		return roleCandidate
	case "super_admin":
		return principalTypeAdmin
	}

	legacyType := strings.ToLower(strings.TrimSpace(claimString(payload, "type")))
	switch legacyType {
	case principalTypeUser, principalTypeMerchant, principalTypeRider, principalTypeAdmin:
		return legacyType
	case "super_admin":
		return principalTypeAdmin
	}

	return strings.ToLower(strings.TrimSpace(fallback))
}

func normalizeUnifiedPrincipalID(payload map[string]interface{}) string {
	return claimString(
		payload,
		"principal_id",
		"principalId",
		"id",
		"sub",
		"adminId",
		"admin_id",
		"userId",
		"principal_legacy_id",
		"phone",
	)
}

func buildUnifiedScope(principalType, role, tokenKind string) []string {
	scope := []string{
		"api",
		"principal:" + strings.TrimSpace(principalType),
		"token:" + strings.TrimSpace(tokenKind),
	}
	if normalizedRole := strings.TrimSpace(role); normalizedRole != "" {
		scope = append(scope, "role:"+normalizedRole)
	}
	return scope
}

func nextUnifiedSessionID(prefix string) string {
	randomBytes := make([]byte, 8)
	if _, err := rand.Read(randomBytes); err != nil {
		return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s_%d_%s", prefix, time.Now().UnixNano(), hex.EncodeToString(randomBytes))
}

func principalIDForUnifiedToken(uid string, numericID int64) string {
	if trimmedUID := strings.TrimSpace(uid); trimmedUID != "" {
		return trimmedUID
	}
	if numericID > 0 {
		return strconv.FormatInt(numericID, 10)
	}
	return ""
}

func buildBusinessTokenPayload(principalType string, numericID int64, uid, phone, name, role, tokenKind string, expiry time.Duration) map[string]interface{} {
	now := time.Now()
	principalID := principalIDForUnifiedToken(uid, numericID)
	normalizedPrincipalType := strings.TrimSpace(principalType)
	normalizedRole := strings.TrimSpace(role)
	if normalizedRole == "" {
		normalizedRole = normalizedPrincipalType
	}
	payload := map[string]interface{}{
		"sub":                 principalID,
		"principal_type":      normalizedPrincipalType,
		"principal_id":        principalID,
		"principal_legacy_id": numericID,
		"role":                normalizedRole,
		"session_id":          nextUnifiedSessionID(normalizedPrincipalType),
		"scope":               buildUnifiedScope(normalizedPrincipalType, normalizedRole, tokenKind),
		"token_kind":          tokenKind,
		"phone":               strings.TrimSpace(phone),
		"userId":              numericID,
		"id":                  principalID,
		"type":                tokenKind,
		"exp":                 now.Add(expiry).Unix(),
		"iat":                 now.Unix(),
	}
	if trimmedName := strings.TrimSpace(name); trimmedName != "" {
		payload["name"] = trimmedName
	}
	return payload
}

func buildAdminTokenPayload(admin repository.Admin) map[string]interface{} {
	now := time.Now()
	role := strings.TrimSpace(admin.Type)
	if role == "" {
		role = principalTypeAdmin
	}
	principalID := principalIDForUnifiedToken(admin.UID, int64(admin.ID))
	payload := map[string]interface{}{
		"phone":               strings.TrimSpace(admin.Phone),
		"userId":              admin.ID,
		"id":                  principalID,
		"sub":                 principalID,
		"adminId":             principalID,
		"name":                strings.TrimSpace(admin.Name),
		"type":                role,
		"principal_type":      principalTypeAdmin,
		"principal_id":        principalID,
		"principal_legacy_id": admin.ID,
		"role":                role,
		"session_id":          nextUnifiedSessionID(principalTypeAdmin),
		"scope":               buildUnifiedScope(principalTypeAdmin, role, tokenKindAccess),
		"token_kind":          tokenKindAccess,
		"exp":                 now.Add(7 * 24 * time.Hour).Unix(),
		"iat":                 now.Unix(),
	}
	return payload
}

func signUnifiedTokenPayload(secret string, payload map[string]interface{}) (string, error) {
	resolvedSecret := strings.TrimSpace(secret)
	if resolvedSecret == "" {
		return "", fmt.Errorf("token secret is required")
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	payloadBase64 := base64.URLEncoding.EncodeToString(payloadJSON)
	mac := hmac.New(sha256.New, []byte(resolvedSecret))
	mac.Write([]byte(payloadBase64))
	signature := base64.URLEncoding.EncodeToString(mac.Sum(nil))
	return payloadBase64 + "." + signature, nil
}

func verifyUnifiedTokenPayload(tokenString, secret string) (map[string]interface{}, error) {
	resolvedSecret := strings.TrimSpace(secret)
	if resolvedSecret == "" {
		return nil, fmt.Errorf("token secret is required")
	}
	token := normalizeBearerTokenString(tokenString)
	if token == "" {
		return nil, fmt.Errorf("missing token")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid token format")
	}

	payloadBase64 := parts[0]
	signature := parts[1]

	mac := hmac.New(sha256.New, []byte(resolvedSecret))
	mac.Write([]byte(payloadBase64))
	expectedSignature := base64.URLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return nil, fmt.Errorf("invalid signature")
	}

	payloadJSON, err := base64.URLEncoding.DecodeString(payloadBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload")
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse payload")
	}

	exp := claimInt64(payload, "exp")
	if exp <= 0 {
		return nil, fmt.Errorf("invalid exp field")
	}
	if time.Now().Unix() > exp {
		return nil, fmt.Errorf("token expired")
	}

	return payload, nil
}

func unifiedPrincipalMatchesEntity(principalID string, uid string, legacyID uint, phone string) bool {
	normalizedPrincipalID := strings.TrimSpace(principalID)
	if normalizedPrincipalID == "" {
		return true
	}
	if normalizedPrincipalID == strings.TrimSpace(uid) {
		return true
	}
	if legacyID > 0 && normalizedPrincipalID == strconv.FormatUint(uint64(legacyID), 10) {
		return true
	}
	return normalizedPrincipalID == strings.TrimSpace(phone)
}
