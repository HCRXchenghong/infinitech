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
	MerchantsUpdated                int
	MerchantFieldsMoved             int
	RidersUpdated                   int
	RiderFieldsMoved                int
	ShopsUpdated                    int
	ShopFieldsMoved                 int
	OnboardingSubmissionsUpdated    int
	OnboardingSubmissionFieldsMoved int
	OrdersUpdated                   int
	OrderPayloadsUpdated            int
	Errors                          int
}

func MigrateLegacyPrivateDocuments(ctx context.Context, db *gorm.DB) (PrivateDocumentMigrationStats, error) {
	if db == nil {
		return PrivateDocumentMigrationStats{}, fmt.Errorf("database is nil")
	}

	stats := PrivateDocumentMigrationStats{}

	if err := migrateLegacyMerchantDocuments(ctx, db, &stats); err != nil {
		return stats, err
	}
	if err := migrateLegacyRiderDocuments(ctx, db, &stats); err != nil {
		return stats, err
	}
	if err := migrateLegacyShopDocuments(ctx, db, &stats); err != nil {
		return stats, err
	}
	if err := migrateLegacyOnboardingSubmissionDocuments(ctx, db, &stats); err != nil {
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
		next, changed, err := migrateStoredMerchantDocumentReference(current, strconv.FormatUint(uint64(merchant.ID), 10))
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

func migrateLegacyRiderDocuments(ctx context.Context, db *gorm.DB, stats *PrivateDocumentMigrationStats) error {
	if !db.Migrator().HasTable(&repository.Rider{}) {
		return nil
	}

	var riders []repository.Rider
	if err := db.WithContext(ctx).
		Select("id", "id_card_front").
		Find(&riders).Error; err != nil {
		return fmt.Errorf("load riders for private document migration failed: %w", err)
	}

	for _, rider := range riders {
		current := strings.TrimSpace(rider.IDCardFront)
		next, changed, err := migrateStoredRiderOnboardingDocumentReference(current, strconv.FormatUint(uint64(rider.ID), 10))
		if err != nil {
			stats.Errors++
			continue
		}
		if !changed || next == current {
			continue
		}
		if err := db.WithContext(ctx).
			Model(&repository.Rider{}).
			Where("id = ?", rider.ID).
			Update("id_card_front", next).Error; err != nil {
			stats.Errors++
			continue
		}
		stats.RidersUpdated++
		stats.RiderFieldsMoved++
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

func migrateLegacyOnboardingSubmissionDocuments(ctx context.Context, db *gorm.DB, stats *PrivateDocumentMigrationStats) error {
	if !db.Migrator().HasTable(&repository.OnboardingInviteSubmission{}) {
		return nil
	}

	var submissions []repository.OnboardingInviteSubmission
	if err := db.WithContext(ctx).
		Select("id", "entity_type", "entity_id", "business_license_image", "id_card_image").
		Find(&submissions).Error; err != nil {
		return fmt.Errorf("load onboarding submissions for private document migration failed: %w", err)
	}

	for _, submission := range submissions {
		updates := map[string]interface{}{}
		entityType := strings.TrimSpace(submission.EntityType)
		entityID := strconv.FormatUint(uint64(submission.EntityID), 10)

		switch entityType {
		case "merchant":
			next := strings.TrimSpace(submission.BusinessLicenseImage)
			if submission.EntityID > 0 && db.Migrator().HasTable(&repository.Merchant{}) {
				var merchant repository.Merchant
				if err := db.WithContext(ctx).Select("id", "business_license_image").Where("id = ?", submission.EntityID).First(&merchant).Error; err == nil {
					next = strings.TrimSpace(merchant.BusinessLicenseImage)
				}
			}
			if strings.TrimSpace(next) == "" {
				var err error
				var changed bool
				next, changed, err = migrateStoredMerchantDocumentReference(submission.BusinessLicenseImage, entityID)
				if err != nil {
					stats.Errors++
					continue
				}
				if !changed && strings.TrimSpace(next) == strings.TrimSpace(submission.BusinessLicenseImage) {
					continue
				}
			}
			if strings.TrimSpace(next) != "" && strings.TrimSpace(next) != strings.TrimSpace(submission.BusinessLicenseImage) {
				updates["business_license_image"] = next
				stats.OnboardingSubmissionFieldsMoved++
			}
		case "rider":
			next := strings.TrimSpace(submission.IDCardImage)
			if submission.EntityID > 0 && db.Migrator().HasTable(&repository.Rider{}) {
				var rider repository.Rider
				if err := db.WithContext(ctx).Select("id", "id_card_front").Where("id = ?", submission.EntityID).First(&rider).Error; err == nil {
					next = strings.TrimSpace(rider.IDCardFront)
				}
			}
			if strings.TrimSpace(next) == "" {
				var err error
				var changed bool
				next, changed, err = migrateStoredRiderOnboardingDocumentReference(submission.IDCardImage, entityID)
				if err != nil {
					stats.Errors++
					continue
				}
				if !changed && strings.TrimSpace(next) == strings.TrimSpace(submission.IDCardImage) {
					continue
				}
			}
			if strings.TrimSpace(next) != "" && strings.TrimSpace(next) != strings.TrimSpace(submission.IDCardImage) {
				updates["id_card_image"] = next
				stats.OnboardingSubmissionFieldsMoved++
			}
		}

		if len(updates) == 0 {
			continue
		}
		if err := db.WithContext(ctx).Model(&repository.OnboardingInviteSubmission{}).Where("id = ?", submission.ID).Updates(updates).Error; err != nil {
			stats.Errors++
			continue
		}
		stats.OnboardingSubmissionsUpdated++
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

func migrateStoredMerchantDocumentReference(raw, ownerID string) (string, bool, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false, nil
	}

	ref := uploadasset.ExtractReference(value)
	if ref == "" {
		return value, false, nil
	}

	normalizedOwnerID := strings.TrimSpace(ownerID)
	if uploadasset.IsPrivateReference(ref) {
		parsed, ok := uploadasset.ParseReference(ref)
		if !ok {
			return "", false, fmt.Errorf("private document reference is invalid")
		}
		switch parsed.Domain {
		case uploadasset.DomainMerchantDocument:
			return ref, ref != value, nil
		case uploadasset.DomainOnboardingDocument:
			nextRef, moved, err := uploadasset.TransferPrivateAsset(
				ref,
				uploadasset.DomainOnboardingDocument,
				"",
				"",
				uploadasset.DomainMerchantDocument,
				"merchant",
				normalizedOwnerID,
				documentPrivateUploadsRootPath,
			)
			if err != nil {
				return "", false, err
			}
			return nextRef, moved || nextRef != value, nil
		default:
			return "", false, fmt.Errorf("private document domain mismatch")
		}
	}

	normalizedLegacyPath, normalizedDomain, ok := uploadasset.NormalizeProtectedLegacyPath(ref)
	if !ok {
		return value, false, nil
	}

	switch normalizedDomain {
	case uploadasset.DomainMerchantDocument:
		nextRef, moved, err := uploadasset.PromoteLegacyProtectedAsset(
			normalizedLegacyPath,
			uploadasset.DomainMerchantDocument,
			"merchant",
			normalizedOwnerID,
			documentPublicUploadsRootPath,
			documentPrivateUploadsRootPath,
		)
		if err != nil {
			return "", false, err
		}
		return nextRef, moved || nextRef != value, nil
	case uploadasset.DomainOnboardingDocument:
		onboardingRef, _, err := uploadasset.PromoteLegacyProtectedAsset(
			normalizedLegacyPath,
			uploadasset.DomainOnboardingDocument,
			"merchant",
			normalizedOwnerID,
			documentPublicUploadsRootPath,
			documentPrivateUploadsRootPath,
		)
		if err != nil {
			return "", false, err
		}
		nextRef, _, err := uploadasset.TransferPrivateAsset(
			onboardingRef,
			uploadasset.DomainOnboardingDocument,
			"merchant",
			normalizedOwnerID,
			uploadasset.DomainMerchantDocument,
			"merchant",
			normalizedOwnerID,
			documentPrivateUploadsRootPath,
		)
		if err != nil {
			return "", false, err
		}
		return nextRef, true, nil
	default:
		return "", false, fmt.Errorf("private document domain mismatch")
	}
}

func migrateStoredRiderOnboardingDocumentReference(raw, ownerID string) (string, bool, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false, nil
	}
	if strings.HasPrefix(value, "private://rider-cert/") {
		return value, false, nil
	}

	ref := uploadasset.ExtractReference(value)
	if ref == "" {
		return value, false, nil
	}

	normalizedOwnerID := strings.TrimSpace(ownerID)
	if uploadasset.IsPrivateReference(ref) {
		parsed, ok := uploadasset.ParseReference(ref)
		if !ok {
			return "", false, fmt.Errorf("private document reference is invalid")
		}
		if parsed.Domain != uploadasset.DomainOnboardingDocument {
			return "", false, fmt.Errorf("private document domain mismatch")
		}
		nextRef, moved, err := uploadasset.TransferPrivateAsset(
			ref,
			uploadasset.DomainOnboardingDocument,
			"",
			"",
			uploadasset.DomainOnboardingDocument,
			"rider",
			normalizedOwnerID,
			documentPrivateUploadsRootPath,
		)
		if err != nil {
			return "", false, err
		}
		return nextRef, moved || nextRef != value, nil
	}

	normalizedLegacyPath, normalizedDomain, ok := uploadasset.NormalizeProtectedLegacyPath(ref)
	if !ok {
		return value, false, nil
	}
	if normalizedDomain != uploadasset.DomainOnboardingDocument {
		return value, false, nil
	}

	nextRef, moved, err := uploadasset.PromoteLegacyProtectedAsset(
		normalizedLegacyPath,
		uploadasset.DomainOnboardingDocument,
		"rider",
		normalizedOwnerID,
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
