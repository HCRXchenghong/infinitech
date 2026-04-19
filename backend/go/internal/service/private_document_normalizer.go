package service

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/yuexiang/go-api/internal/uploadasset"
)

var documentPublicUploadsRootPath = filepath.Join(".", "data", "uploads")
var documentPrivateUploadsRootPath = filepath.Join(".", "data", "private", "uploads")

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
	operatorRole := authContextRole(ctx)
	operatorID := resolveDocumentActorID(ctx, operatorRole)
	if operatorRole == "" || operatorID == "" {
		return "", fmt.Errorf("鉴权失败")
	}

	return normalizePrivateDocumentReferenceForOwner(raw, domain, operatorRole, operatorID)
}

func normalizePrivateDocumentReferenceForOwner(raw, domain, ownerRole, ownerID string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}

	ref := uploadasset.ExtractReference(value)
	if ref == "" {
		return "", fmt.Errorf("敏感文档必须通过受控上传接口生成")
	}
	if normalizedLegacyPath, normalizedDomain, ok := uploadasset.NormalizeProtectedLegacyPath(ref); ok {
		if normalizedDomain != strings.ToLower(strings.TrimSpace(domain)) {
			return "", fmt.Errorf("私有文档业务域不匹配")
		}
		nextRef, _, err := uploadasset.PromoteLegacyProtectedAsset(
			normalizedLegacyPath,
			domain,
			ownerRole,
			ownerID,
			documentPublicUploadsRootPath,
			documentPrivateUploadsRootPath,
		)
		if err != nil {
			return "", err
		}
		return nextRef, nil
	}

	parsed, ok := uploadasset.ParseReference(ref)
	if !ok {
		return "", fmt.Errorf("私有文档引用无效")
	}
	if parsed.Domain != strings.ToLower(strings.TrimSpace(domain)) {
		return "", fmt.Errorf("私有文档业务域不匹配")
	}

	normalizedOwnerRole := strings.ToLower(strings.TrimSpace(ownerRole))
	normalizedOwnerID := strings.TrimSpace(ownerID)
	if normalizedOwnerRole == "admin" {
		return ref, nil
	}

	if parsed.OwnerRole != normalizedOwnerRole || parsed.OwnerID != normalizedOwnerID {
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
