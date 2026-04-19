package ridercert

import (
	"fmt"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/yuexiang/go-api/internal/uploadasset"
)

const PrivateScheme = "private://rider-cert/"

var allowedFields = map[string]struct{}{
	"id_card_front": {},
	"id_card_back":  {},
	"health_cert":   {},
}

func NormalizeField(raw string) (string, bool) {
	field := strings.TrimSpace(raw)
	_, ok := allowedFields[field]
	return field, ok
}

func IsPrivateReference(raw string) bool {
	return strings.HasPrefix(strings.TrimSpace(raw), PrivateScheme)
}

func BuildPrivateReference(riderID uint, field, filename string) string {
	normalizedField, ok := NormalizeField(field)
	if !ok {
		return ""
	}
	normalizedFilename := filepath.Base(strings.TrimSpace(filename))
	if normalizedFilename == "." || normalizedFilename == "" {
		return ""
	}
	return fmt.Sprintf(
		"%s%d/%s/%s",
		PrivateScheme,
		riderID,
		normalizedField,
		normalizedFilename,
	)
}

func ParsePrivateReference(raw string) (ownerID, field, filename string, ok bool) {
	value := strings.TrimSpace(raw)
	if !strings.HasPrefix(value, PrivateScheme) {
		return "", "", "", false
	}

	relative := strings.TrimPrefix(value, PrivateScheme)
	parts := strings.Split(relative, "/")
	if len(parts) != 3 {
		return "", "", "", false
	}

	normalizedField, fieldOK := NormalizeField(parts[1])
	if !fieldOK {
		return "", "", "", false
	}
	normalizedOwnerID := strings.TrimSpace(parts[0])
	normalizedFilename := filepath.Base(strings.TrimSpace(parts[2]))
	if normalizedOwnerID == "" || normalizedFilename == "." || normalizedFilename == "" {
		return "", "", "", false
	}

	return normalizedOwnerID, normalizedField, normalizedFilename, true
}

func BuildPreviewURL(riderID uint, field, raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}

	normalizedField, ok := NormalizeField(field)
	if !ok {
		return ""
	}

	expectedOwnerID := strconv.FormatUint(uint64(riderID), 10)
	if ownerID, privateField, _, privateOK := ParsePrivateReference(value); privateOK {
		if ownerID == expectedOwnerID && privateField == normalizedField {
			return fmt.Sprintf("/api/riders/%d/cert?field=%s", riderID, normalizedField)
		}
		return ""
	}

	if extracted := uploadasset.ExtractReference(value); extracted != "" && uploadasset.IsPrivateReference(extracted) {
		parsed, parsedOK := uploadasset.ParseReference(extracted)
		if !parsedOK {
			return ""
		}
		if parsed.Domain == uploadasset.DomainOnboardingDocument &&
			parsed.OwnerRole == "rider" &&
			parsed.OwnerID == expectedOwnerID {
			return uploadasset.BuildConfiguredPreviewURL(extracted)
		}
		return ""
	}

	return fmt.Sprintf("/api/riders/%d/cert?field=%s", riderID, normalizedField)
}

func NormalizeOwnedUpdateReference(riderID uint, field, raw, current string) (string, error) {
	value := strings.TrimSpace(raw)
	currentValue := strings.TrimSpace(current)
	if value == "" {
		return "", nil
	}
	if value == currentValue {
		return currentValue, nil
	}

	normalizedField, ok := NormalizeField(field)
	if !ok {
		return "", fmt.Errorf("不支持的证件字段")
	}
	expectedOwnerID := strconv.FormatUint(uint64(riderID), 10)

	if ownerID, privateField, _, privateOK := ParsePrivateReference(value); privateOK {
		if ownerID != expectedOwnerID || privateField != normalizedField {
			return "", fmt.Errorf("证件资源引用无效")
		}
		return value, nil
	}

	if extracted := uploadasset.ExtractReference(value); extracted != "" && uploadasset.IsPrivateReference(extracted) {
		parsed, parsedOK := uploadasset.ParseReference(extracted)
		if !parsedOK {
			return "", fmt.Errorf("证件资源引用无效")
		}
		if parsed.Domain == uploadasset.DomainOnboardingDocument &&
			parsed.OwnerRole == "rider" &&
			parsed.OwnerID == expectedOwnerID {
			return extracted, nil
		}
		return "", fmt.Errorf("证件资源引用无效")
	}

	if currentValue != "" && strings.HasPrefix(value, "/uploads/") && value == currentValue {
		return currentValue, nil
	}

	return "", fmt.Errorf("证件资源必须通过受控上传接口生成")
}
