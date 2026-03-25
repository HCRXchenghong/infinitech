package repository

import "time"

// SMSVerificationCode stores SMS code state in DB for resilient verification.
// Redis can be used as an accelerator, while DB remains the source of truth.
type SMSVerificationCode struct {
	ID uint `gorm:"primaryKey"`
	UnifiedIdentity
	Scene      string     `gorm:"size:64;not null;index:idx_sms_code_lookup,priority:1;index:idx_sms_rate_lookup,priority:1"`
	Phone      string     `gorm:"size:20;not null;index:idx_sms_code_lookup,priority:2;index:idx_sms_rate_lookup,priority:2"`
	Code       string     `gorm:"size:16;not null;index:idx_sms_code_lookup,priority:3"`
	ExpiresAt  time.Time  `gorm:"not null;index:idx_sms_code_lookup,priority:4"`
	ConsumedAt *time.Time `gorm:"index"`
	CreatedAt  time.Time  `gorm:"index:idx_sms_rate_lookup,priority:3"`
	UpdatedAt  time.Time
}

func (SMSVerificationCode) TableName() string {
	return "sms_verification_codes"
}
