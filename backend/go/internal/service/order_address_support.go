package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func (s *OrderService) resolveOrderUser(ctx context.Context, rawUserID string) (*repository.User, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("db not ready")
	}

	normalizedID := strings.TrimSpace(rawUserID)
	if normalizedID == "" {
		return nil, fmt.Errorf("userId is required")
	}

	if resolvedID, err := resolveEntityID(ctx, s.db, "users", normalizedID); err == nil {
		var user repository.User
		if err := s.db.WithContext(ctx).Where("id = ?", resolvedID).First(&user).Error; err == nil {
			return &user, nil
		}
	}

	var user repository.User
	if err := s.db.WithContext(ctx).Where("phone = ?", normalizedID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (s *OrderService) resolveUserAddressForOrder(ctx context.Context, rawUserID, rawAddressID string) (*repository.User, *repository.UserAddress, error) {
	user, err := s.resolveOrderUser(ctx, rawUserID)
	if err != nil {
		return nil, nil, err
	}

	addressID := strings.TrimSpace(rawAddressID)
	if addressID == "" {
		var fallback repository.UserAddress
		if err := s.db.WithContext(ctx).
			Where("user_legacy_id = ? AND is_default = ?", user.ID, true).
			First(&fallback).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return user, nil, nil
			}
			return nil, nil, err
		}
		return user, &fallback, nil
	}

	var address repository.UserAddress
	if err := findOwnedUserAddressByAnyID(ctx, s.db, user.ID, addressID, &address); err != nil {
		return nil, nil, err
	}

	return user, &address, nil
}
