package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/yuexiang/go-api/internal/uploadasset"
)

func resolveDocumentActorID(ctx context.Context, role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "merchant":
		return authContextString(ctx, "merchant_id")
	case "user":
		return authContextString(ctx, "user_id")
	case "admin":
		return authContextString(ctx, "admin_id")
	default:
		return ""
	}
}

func normalizePrivateDocumentReference(ctx context.Context, raw, domain string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}

	ref := uploadasset.ExtractReference(value)
	if ref == "" {
		return value, nil
	}

	parsed, ok := uploadasset.ParseReference(ref)
	if !ok {
		return "", fmt.Errorf("私有文档引用无效")
	}
	if parsed.Domain != strings.ToLower(strings.TrimSpace(domain)) {
		return "", fmt.Errorf("私有文档业务域不匹配")
	}

	operatorRole := authContextRole(ctx)
	if operatorRole == "admin" {
		return ref, nil
	}

	operatorID := resolveDocumentActorID(ctx, operatorRole)
	if operatorRole == "" || operatorID == "" {
		return "", fmt.Errorf("鉴权失败")
	}
	if parsed.OwnerRole != operatorRole || parsed.OwnerID != operatorID {
		return "", fmt.Errorf("不能使用其他账号上传的私有文档")
	}
	return ref, nil
}

func normalizeRequestExtraMedicalDocument(ctx context.Context, req map[string]interface{}) error {
	if req == nil {
		return nil
	}

	requestExtra, ok := req["requestExtra"].(map[string]interface{})
	if !ok {
		requestExtra, ok = req["request_extra"].(map[string]interface{})
	}
	if !ok || requestExtra == nil {
		return nil
	}

	raw := normalizeOptionalDocumentValue(requestExtra["prescriptionFileUrl"])
	if raw == "" {
		raw = normalizeOptionalDocumentValue(requestExtra["prescription_file_url"])
	}
	if raw == "" {
		return nil
	}

	normalized, err := normalizePrivateDocumentReference(ctx, raw, uploadasset.DomainMedicalDocument)
	if err != nil {
		return err
	}
	if normalized == "" {
		return nil
	}

	requestExtra["prescriptionFileUrl"] = normalized
	requestExtra["prescription_file_url"] = normalized
	requestExtra["prescriptionFileRef"] = normalized
	requestExtra["prescription_file_ref"] = normalized
	return nil
}

func normalizeOptionalDocumentValue(value interface{}) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}
