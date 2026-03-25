package repository

import "time"

// CaptchaChallenge stores image captcha state for public flows such as registration.
type CaptchaChallenge struct {
	ID uint `gorm:"primaryKey"`
	UnifiedIdentity
	SessionID  string     `gorm:"size:128;not null;uniqueIndex" json:"session_id"`
	Code       string     `gorm:"size:16;not null" json:"-"`
	ExpiresAt  time.Time  `gorm:"not null;index" json:"expires_at"`
	ConsumedAt *time.Time `gorm:"index" json:"consumed_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

func (CaptchaChallenge) TableName() string {
	return "captcha_challenges"
}
