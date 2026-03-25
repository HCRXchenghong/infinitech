package service

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type UserAddressInput struct {
	Name      string
	Phone     string
	Tag       string
	Address   string
	Detail    string
	Latitude  float64
	Longitude float64
	IsDefault bool
}

func (s *UserService) ListAddresses(ctx context.Context, userIdentifier string) ([]map[string]interface{}, error) {
	user, err := s.resolveUserForAddress(ctx, userIdentifier)
	if err != nil {
		return nil, err
	}

	var addresses []repository.UserAddress
	if err := s.repo.DB().
		WithContext(ctx).
		Where("user_legacy_id = ?", user.ID).
		Order("is_default DESC").
		Order("updated_at DESC").
		Find(&addresses).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(addresses))
	for idx := range addresses {
		result = append(result, buildUserAddressPayload(&addresses[idx]))
	}
	return result, nil
}

func (s *UserService) GetDefaultAddress(ctx context.Context, userIdentifier string) (map[string]interface{}, error) {
	user, err := s.resolveUserForAddress(ctx, userIdentifier)
	if err != nil {
		return nil, err
	}

	address, err := s.findDefaultAddress(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if address == nil {
		return nil, nil
	}
	return buildUserAddressPayload(address), nil
}

func (s *UserService) CreateAddress(ctx context.Context, userIdentifier string, input UserAddressInput) (map[string]interface{}, error) {
	user, err := s.resolveUserForAddress(ctx, userIdentifier)
	if err != nil {
		return nil, err
	}
	normalized, err := normalizeUserAddressInput(input)
	if err != nil {
		return nil, err
	}

	var created repository.UserAddress
	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existingCount int64
		if err := tx.Model(&repository.UserAddress{}).
			Where("user_legacy_id = ?", user.ID).
			Count(&existingCount).Error; err != nil {
			return err
		}

		now := time.Now()
		uid, tsid, idErr := idkit.NextIdentityForTable(ctx, tx, (&repository.UserAddress{}).TableName(), now)
		if idErr != nil {
			return fmt.Errorf("allocate address identity failed: %w", idErr)
		}

		created = repository.UserAddress{
			UnifiedIdentity: repository.UnifiedIdentity{UID: uid, TSID: tsid},
			UserLegacyID:    user.ID,
			UserUID:         strings.TrimSpace(user.UID),
			Name:            normalized.Name,
			Phone:           normalized.Phone,
			Tag:             normalized.Tag,
			Address:         normalized.Address,
			Detail:          normalized.Detail,
			Latitude:        normalized.Latitude,
			Longitude:       normalized.Longitude,
			IsDefault:       normalized.IsDefault || existingCount == 0,
		}

		if created.IsDefault {
			if err := tx.Model(&repository.UserAddress{}).
				Where("user_legacy_id = ?", user.ID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}

		return tx.Create(&created).Error
	})
	if err != nil {
		return nil, err
	}

	return buildUserAddressPayload(&created), nil
}

func (s *UserService) UpdateAddress(ctx context.Context, userIdentifier, addressIdentifier string, input UserAddressInput) (map[string]interface{}, error) {
	user, err := s.resolveUserForAddress(ctx, userIdentifier)
	if err != nil {
		return nil, err
	}
	normalized, err := normalizeUserAddressInput(input)
	if err != nil {
		return nil, err
	}

	var updated repository.UserAddress
	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		current, err := resolveOwnedUserAddress(ctx, tx, user.ID, addressIdentifier)
		if err != nil {
			return err
		}

		current.Name = normalized.Name
		current.Phone = normalized.Phone
		current.Tag = normalized.Tag
		current.Address = normalized.Address
		current.Detail = normalized.Detail
		current.Latitude = normalized.Latitude
		current.Longitude = normalized.Longitude
		if normalized.IsDefault {
			current.IsDefault = true
			if err := tx.Model(&repository.UserAddress{}).
				Where("user_legacy_id = ? AND id <> ?", user.ID, current.ID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}

		if err := tx.Save(current).Error; err != nil {
			return err
		}
		updated = *current
		return ensureUserHasDefaultAddress(ctx, tx, user.ID)
	})
	if err != nil {
		return nil, err
	}

	return buildUserAddressPayload(&updated), nil
}

func (s *UserService) DeleteAddress(ctx context.Context, userIdentifier, addressIdentifier string) error {
	user, err := s.resolveUserForAddress(ctx, userIdentifier)
	if err != nil {
		return err
	}

	return s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		current, err := resolveOwnedUserAddress(ctx, tx, user.ID, addressIdentifier)
		if err != nil {
			return err
		}
		if err := tx.Delete(&repository.UserAddress{}, current.ID).Error; err != nil {
			return err
		}
		return ensureUserHasDefaultAddress(ctx, tx, user.ID)
	})
}

func (s *UserService) SetDefaultAddress(ctx context.Context, userIdentifier, addressIdentifier string) (map[string]interface{}, error) {
	user, err := s.resolveUserForAddress(ctx, userIdentifier)
	if err != nil {
		return nil, err
	}

	var address repository.UserAddress
	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		current, err := resolveOwnedUserAddress(ctx, tx, user.ID, addressIdentifier)
		if err != nil {
			return err
		}

		if err := tx.Model(&repository.UserAddress{}).
			Where("user_legacy_id = ?", user.ID).
			Update("is_default", false).Error; err != nil {
			return err
		}

		current.IsDefault = true
		if err := tx.Save(current).Error; err != nil {
			return err
		}
		address = *current
		return nil
	})
	if err != nil {
		return nil, err
	}

	return buildUserAddressPayload(&address), nil
}

func (s *UserService) resolveUserForAddress(ctx context.Context, userIdentifier string) (*repository.User, error) {
	normalizedID := strings.TrimSpace(userIdentifier)
	if normalizedID == "" {
		return nil, fmt.Errorf("invalid user id")
	}

	if resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "users", normalizedID); err == nil {
		user, getErr := s.repo.GetByID(ctx, resolvedID)
		if getErr == nil {
			return user, nil
		}
	}

	return s.repo.GetByPhone(ctx, normalizedID)
}

func (s *UserService) findDefaultAddress(ctx context.Context, userLegacyID uint) (*repository.UserAddress, error) {
	if userLegacyID == 0 {
		return nil, nil
	}

	var address repository.UserAddress
	if err := s.repo.DB().WithContext(ctx).
		Where("user_legacy_id = ? AND is_default = ?", userLegacyID, true).
		First(&address).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			if err := s.repo.DB().WithContext(ctx).
				Where("user_legacy_id = ?", userLegacyID).
				Order("updated_at DESC").
				First(&address).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return nil, nil
				}
				return nil, err
			}
			return &address, nil
		}
		return nil, err
	}
	return &address, nil
}

func normalizeUserAddressInput(input UserAddressInput) (UserAddressInput, error) {
	normalized := UserAddressInput{
		Name:      strings.TrimSpace(input.Name),
		Phone:     strings.TrimSpace(input.Phone),
		Tag:       strings.TrimSpace(input.Tag),
		Address:   strings.TrimSpace(input.Address),
		Detail:    strings.TrimSpace(input.Detail),
		Latitude:  input.Latitude,
		Longitude: input.Longitude,
		IsDefault: input.IsDefault,
	}

	if normalized.Name == "" {
		return UserAddressInput{}, fmt.Errorf("name is required")
	}
	if utf8.RuneCountInString(normalized.Name) > 50 {
		return UserAddressInput{}, fmt.Errorf("name is too long")
	}
	if !isValidPhone(normalized.Phone) {
		return UserAddressInput{}, fmt.Errorf("invalid phone format")
	}
	if normalized.Address == "" {
		return UserAddressInput{}, fmt.Errorf("address is required")
	}
	if utf8.RuneCountInString(normalized.Address) > 255 {
		return UserAddressInput{}, fmt.Errorf("address is too long")
	}
	if utf8.RuneCountInString(normalized.Detail) > 255 {
		return UserAddressInput{}, fmt.Errorf("detail is too long")
	}
	if utf8.RuneCountInString(normalized.Tag) > 20 {
		return UserAddressInput{}, fmt.Errorf("tag is too long")
	}
	if normalized.Latitude != 0 && math.Abs(normalized.Latitude) > 90 {
		return UserAddressInput{}, fmt.Errorf("invalid latitude")
	}
	if normalized.Longitude != 0 && math.Abs(normalized.Longitude) > 180 {
		return UserAddressInput{}, fmt.Errorf("invalid longitude")
	}

	return normalized, nil
}

func resolveOwnedUserAddress(ctx context.Context, db *gorm.DB, userLegacyID uint, addressIdentifier string) (*repository.UserAddress, error) {
	if db == nil {
		return nil, fmt.Errorf("db not ready")
	}
	if userLegacyID == 0 {
		return nil, fmt.Errorf("invalid user id")
	}

	var address repository.UserAddress
	if err := findOwnedUserAddressByAnyID(ctx, db, userLegacyID, strings.TrimSpace(addressIdentifier), &address); err != nil {
		return nil, err
	}
	return &address, nil
}

func findOwnedUserAddressByAnyID(ctx context.Context, db *gorm.DB, userLegacyID uint, rawID string, target *repository.UserAddress) error {
	if db == nil {
		return fmt.Errorf("db not ready")
	}
	if target == nil {
		return fmt.Errorf("target is required")
	}

	normalizedID := strings.TrimSpace(rawID)
	if normalizedID == "" {
		return fmt.Errorf("invalid address id")
	}

	if parsed, err := strconv.ParseUint(normalizedID, 10, 64); err == nil && parsed > 0 {
		err = db.WithContext(ctx).
			Where("id = ? AND user_legacy_id = ?", uint(parsed), userLegacyID).
			First(target).Error
		if err == nil {
			return nil
		}
		if err != gorm.ErrRecordNotFound {
			return err
		}
	}

	err := db.WithContext(ctx).
		Where("user_legacy_id = ? AND (uid = ? OR tsid = ?)", userLegacyID, normalizedID, normalizedID).
		First(target).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("%w: address not found", ErrForbidden)
		}
		return err
	}
	return nil
}

func ensureUserHasDefaultAddress(ctx context.Context, tx *gorm.DB, userLegacyID uint) error {
	if tx == nil || userLegacyID == 0 {
		return nil
	}

	var count int64
	if err := tx.WithContext(ctx).
		Model(&repository.UserAddress{}).
		Where("user_legacy_id = ? AND is_default = ?", userLegacyID, true).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	var fallback repository.UserAddress
	if err := tx.WithContext(ctx).
		Where("user_legacy_id = ?", userLegacyID).
		Order("updated_at DESC").
		First(&fallback).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil
		}
		return err
	}

	return tx.WithContext(ctx).
		Model(&repository.UserAddress{}).
		Where("id = ?", fallback.ID).
		Update("is_default", true).Error
}

func buildUserAddressPayload(address *repository.UserAddress) map[string]interface{} {
	if address == nil {
		return nil
	}

	publicID := strings.TrimSpace(address.UID)
	if publicID == "" && address.ID > 0 {
		publicID = strconv.FormatUint(uint64(address.ID), 10)
	}

	return map[string]interface{}{
		"id":          publicID,
		"tsid":        strings.TrimSpace(address.TSID),
		"legacyId":    address.ID,
		"name":        strings.TrimSpace(address.Name),
		"phone":       strings.TrimSpace(address.Phone),
		"tag":         strings.TrimSpace(address.Tag),
		"address":     strings.TrimSpace(address.Address),
		"detail":      strings.TrimSpace(address.Detail),
		"fullAddress": address.FullAddress(),
		"latitude":    address.Latitude,
		"longitude":   address.Longitude,
		"isDefault":   address.IsDefault,
		"createdAt":   address.CreatedAt,
		"updatedAt":   address.UpdatedAt,
	}
}
