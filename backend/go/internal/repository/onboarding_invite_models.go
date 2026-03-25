package repository

import "time"

// OnboardingInviteLink represents one-time invite links for onboarding.
type OnboardingInviteLink struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	InviteType    string     `gorm:"size:20;index;not null" json:"invite_type"` // merchant/rider/old_user
	TokenHash     string     `gorm:"size:64;uniqueIndex;not null" json:"-"`
	TokenPrefix   string     `gorm:"size:16;index;not null" json:"token_prefix"`
	Status        string     `gorm:"size:20;index;default:'pending'" json:"status"` // pending/used/expired/revoked
	MaxUses       int        `gorm:"not null;default:1" json:"max_uses"`
	UsedCount     int        `gorm:"not null;default:0" json:"used_count"`
	ExpiresAt     time.Time  `gorm:"index;not null" json:"expires_at"`
	CreatedByID   uint       `gorm:"index" json:"created_by_id"`
	CreatedByName string     `gorm:"size:100" json:"created_by_name"`
	Note          string     `gorm:"size:255" json:"note"`
	UsedAt        *time.Time `json:"used_at"`
	UsedIP        string     `gorm:"size:64" json:"used_ip"`
	UsedUserAgent string     `gorm:"size:255" json:"used_user_agent"`
	SubmissionID  *uint      `gorm:"index" json:"submission_id"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func (OnboardingInviteLink) TableName() string {
	return "onboarding_invite_links"
}

// OnboardingInviteSubmission keeps submitted onboarding information from invite links.
type OnboardingInviteSubmission struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	InviteLinkID          *uint     `gorm:"index" json:"invite_link_id"`
	InviteType            string    `gorm:"size:20;index;not null" json:"invite_type"` // merchant/rider/old_user
	Source                string    `gorm:"size:20;default:'invite'" json:"source"`    // invite/manual
	CustomerName          string    `gorm:"size:50" json:"customer_name"`
	MerchantName          string    `gorm:"size:100" json:"merchant_name"`
	OwnerName             string    `gorm:"size:50" json:"owner_name"`
	RiderName             string    `gorm:"size:50" json:"rider_name"`
	Phone                 string    `gorm:"size:20;index" json:"phone"`
	BusinessLicenseImage  string    `gorm:"size:500" json:"business_license_image"`
	IDCardImage           string    `gorm:"size:500" json:"id_card_image"`
	EmergencyContactName  string    `gorm:"size:50" json:"emergency_contact_name"`
	EmergencyContactPhone string    `gorm:"size:20" json:"emergency_contact_phone"`
	EntityType            string    `gorm:"size:20" json:"entity_type"` // merchant/rider/customer
	EntityID              uint      `gorm:"index" json:"entity_id"`
	Status                string    `gorm:"size:20;default:'created'" json:"status"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

func (OnboardingInviteSubmission) TableName() string {
	return "onboarding_invite_submissions"
}
