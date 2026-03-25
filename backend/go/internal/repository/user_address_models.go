package repository

import (
	"strings"
	"time"
)

// UserAddress represents a persisted delivery address owned by a user.
type UserAddress struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserLegacyID uint      `gorm:"index;not null" json:"userLegacyId,omitempty"`
	UserUID      string    `gorm:"size:14;index" json:"userId,omitempty"`
	Name         string    `gorm:"size:50;not null" json:"name"`
	Phone        string    `gorm:"size:20;not null" json:"phone"`
	Tag          string    `gorm:"size:20" json:"tag"`
	Address      string    `gorm:"size:255;not null" json:"address"`
	Detail       string    `gorm:"size:255" json:"detail"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	IsDefault    bool      `gorm:"default:false;index" json:"isDefault"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (UserAddress) TableName() string {
	return "user_addresses"
}

func (a *UserAddress) FullAddress() string {
	if a == nil {
		return ""
	}
	base := strings.TrimSpace(a.Address)
	detail := strings.TrimSpace(a.Detail)
	if base == "" {
		return detail
	}
	if detail == "" {
		return base
	}
	return strings.TrimSpace(base + " " + detail)
}
