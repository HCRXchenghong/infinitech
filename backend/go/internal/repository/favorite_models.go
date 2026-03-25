package repository

import "time"

// UserFavorite represents a user's favorited shop.
type UserFavorite struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserID    uint      `gorm:"index:idx_user_shop,unique;not null" json:"user_id"`
	ShopID    uint      `gorm:"index:idx_user_shop,unique;not null" json:"shop_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (UserFavorite) TableName() string {
	return "user_favorites"
}
