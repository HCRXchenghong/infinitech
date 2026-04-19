package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/uploadasset"
	"gorm.io/gorm"
)

type PrivateDocumentMigrationStats struct {
	MerchantsUpdated     int
	MerchantFieldsMoved  int
	ShopsUpdated         int
	ShopFieldsMoved      int
	OrdersUpdated        int
	OrderPayloadsUpdated int
	Errors               int
}

func MigrateLegacyPrivateDocuments(ctx context.Context, db *gorm.DB) (PrivateDocumentMigrationStats, error) {
	if db == nil {
		return PrivateDocumentMigrationStats{}, fmt.Errorf("database is nil")
	}

	stats := PrivateDocumentMigrationStats{}

	if err := migrateLegacyMerchantDocuments(ctx, db, &stats); err != nil {
		return stats, err
	}
	if err := migrateLegacyShopDocuments(ctx, db, &stats); err != nil {
		return stats, err
	}
	if err := migrateLegacyMedicalOrderDocuments(ctx, db, &stats); err != nil {
		return stats, err
	}

	return stats, nil
}

func migrateLegacyMerchantDocuments(ctx context.Context, db *gorm.DB, stats *PrivateDocumentMigrationStats) error {
	if !db.Migrator().HasTable(&repository.Merchant{}) {
		return nil
	}

	var merchants []repository.Merchant
	if err := db.WithContext(ctx).
		Select("id", "business_license_image").
		Find(&merchants).Error; err != nil {
		return fmt.Errorf("load merchants for private document migration failed: %w", err)
	}

	for _, merchant := range merchants {
		current := strings.TrimSpace(merchant.BusinessLicenseImage)
		next, changed, err := migrateStoredDocumentReference(current, uploadasset.DomainMerchantDocument, "merchant", strconv.FormatUint(uint64(merchant.ID), 10))
		if err != nil {
			stats.Errors++
			continue
		}
		if !changed || next == current {
			continue
		}
		if err := db.WithContext(ctx).
			Model(&repository.Merchant{}).
			Where("id = ?", merchant.ID).
			Update("business_license_image", next).Error; err != nil {
			stats.Errors++
			continue
		}
		stats.MerchantsUpdated++
		stats.MerchantFieldsMoved++
	}

	return nil
}

func migrateLegacyShopDocuments(ctx context.Context, db *gorm.DB, stats *PrivateDocumentMigrationStats) error {
	if !db.Migrator().HasTable(&repository.Shop{}) {
		return nil
	}

	var shops []repository.Shop
	if err := db.WithContext(ctx).
		Select(
			"id",
			"merchant_id",
			"merchant_qualification",
			"food_business_license",
			"id_card_front_image",
			"id_card_back_image",
			"health_cert_front_image",
			"health_cert_back_image",
		).
		Find(&shops).Error; err != nil {
		return fmt.Errorf("load shops for private document migration failed: %w", err)
	}

	for _, shop := range shops {
		ownerID := strconv.FormatUint(uint64(shop.MerchantID), 10)
		updates := map[string]interface{}{}

		fieldUpdates := map[string]string{
			"merchant_qualification":  shop.MerchantQualification,
			"food_business_license":   shop.FoodBusinessLicense,
			"id_card_front_image":     shop.IDCardFrontImage,
			"id_card_back_image":      shop.IDCardBackImage,
			"health_cert_front_image": shop.HealthCertFrontImage,
			"health_cert_back_image":  shop.HealthCertBackImage,
		}

		for column, current := range fieldUpdates {
			next, changed, err := migrateStoredDocumentReference(current, uploadasset.DomainMerchantDocument, "merchant", ownerID)
			if err != nil {
				stats.Errors++
				continue
			}
			if !changed || strings.TrimSpace(next) == strings.TrimSpace(current) {
				continue
			}
			updates[column] = next
			stats.ShopFieldsMoved++
		}

		if len(updates) == 0 {
			continue
		}
		if err := db.WithContext(ctx).Model(&repository.Shop{}).Where("id = ?", shop.ID).Updates(updates).Error; err != nil {
			stats.Errors++
			continue
		}
		stats.ShopsUpdated++
	}

	return nil
}

func migrateLegacyMedicalOrderDocuments(ctx context.Context, db *gorm.DB, stats *PrivateDocumentMigrationStats) error {
	if !db.Migrator().HasTable(&repository.Order{}) {
		return nil
	}

	var orders []repository.Order
	if err := db.WithContext(ctx).
		Select("id", "user_id", "raw_payload").
		Where("raw_payload LIKE ?", "%prescriptionFileUrl%").
		Or("raw_payload LIKE ?", "%prescription_file_url%").
		Find(&orders).Error; err != nil {
		return fmt.Errorf("load orders for private document migration failed: %w", err)
	}

	for _, order := range orders {
		nextPayload, changed, err := migrateOrderRawPayloadMedicalDocument(strings.TrimSpace(order.RawPayload), strings.TrimSpace(order.UserID))
		if err != nil {
			stats.Errors++
			continue
		}
		if !changed || nextPayload == strings.TrimSpace(order.RawPayload) {
			continue
		}
		if err := db.WithContext(ctx).
			Model(&repository.Order{}).
			Where("id = ?", order.ID).
			Update("raw_payload", nextPayload).Error; err != nil {
			stats.Errors++
			continue
		}
		stats.OrdersUpdated++
		stats.OrderPayloadsUpdated++
	}

	return nil
}

func migrateStoredDocumentReference(raw, domain, ownerRole, ownerID string) (string, bool, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false, nil
	}

	ref := uploadasset.ExtractReference(value)
	if ref == "" {
		return value, false, nil
	}

	if uploadasset.IsPrivateReference(ref) {
		parsed, ok := uploadasset.ParseReference(ref)
		if !ok {
			return "", false, fmt.Errorf("private document reference is invalid")
		}
		if parsed.Domain != strings.ToLower(strings.TrimSpace(domain)) {
			return "", false, fmt.Errorf("private document domain mismatch")
		}
		return ref, ref != value, nil
	}

	normalizedLegacyPath, normalizedDomain, ok := uploadasset.NormalizeProtectedLegacyPath(ref)
	if !ok {
		return value, false, nil
	}
	if normalizedDomain != strings.ToLower(strings.TrimSpace(domain)) {
		return "", false, fmt.Errorf("private document domain mismatch")
	}

	nextRef, moved, err := uploadasset.PromoteLegacyProtectedAsset(
		normalizedLegacyPath,
		domain,
		ownerRole,
		ownerID,
		documentPublicUploadsRootPath,
		documentPrivateUploadsRootPath,
	)
	if err != nil {
		return "", false, err
	}
	return nextRef, moved || nextRef != value, nil
}

func migrateOrderRawPayloadMedicalDocument(rawPayload, userID string) (string, bool, error) {
	rawPayload = strings.TrimSpace(rawPayload)
	userID = strings.TrimSpace(userID)
	if rawPayload == "" || userID == "" {
		return rawPayload, false, nil
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(rawPayload), &payload); err != nil {
		return "", false, err
	}

	requestExtra, ok := payload["requestExtra"].(map[string]interface{})
	if !ok {
		requestExtra, ok = payload["request_extra"].(map[string]interface{})
	}
	if !ok || requestExtra == nil {
		return rawPayload, false, nil
	}

	raw := normalizeOptionalDocumentValue(requestExtra["prescriptionFileUrl"])
	if raw == "" {
		raw = normalizeOptionalDocumentValue(requestExtra["prescription_file_url"])
	}
	if raw == "" {
		return rawPayload, false, nil
	}

	normalized, err := normalizePrivateDocumentReferenceForOwner(raw, uploadasset.DomainMedicalDocument, "user", userID)
	if err != nil {
		return "", false, err
	}
	if normalized == "" || normalized == raw {
		return rawPayload, false, nil
	}

	requestExtra["prescriptionFileUrl"] = normalized
	requestExtra["prescription_file_url"] = normalized
	requestExtra["prescriptionFileRef"] = normalized
	requestExtra["prescription_file_ref"] = normalized

	if _, ok := payload["requestExtra"]; ok {
		payload["requestExtra"] = requestExtra
	}
	if _, ok := payload["request_extra"]; ok {
		payload["request_extra"] = requestExtra
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", false, err
	}
	return string(encoded), true, nil
}
