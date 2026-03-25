package repository

import "time"

// ExternalAuthSession stores short-lived external auth results so tokens are
// never exposed in redirect query strings.
type ExternalAuthSession struct {
	ID           uint       `gorm:"primaryKey"`
	Provider     string     `gorm:"size:32;index;not null"`
	SessionToken string     `gorm:"size:96;uniqueIndex;not null"`
	Payload      string     `gorm:"type:text;not null"`
	ExpiresAt    time.Time  `gorm:"index;not null"`
	ConsumedAt   *time.Time `gorm:"index"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (ExternalAuthSession) TableName() string {
	return "external_auth_sessions"
}
