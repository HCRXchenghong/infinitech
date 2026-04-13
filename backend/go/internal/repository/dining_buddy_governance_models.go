package repository

import "time"

type DiningBuddyReport struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	TargetType       string     `gorm:"size:20;index;not null" json:"target_type"`
	TargetID         string     `gorm:"size:64;index;not null" json:"target_id"`
	PartyID          uint       `gorm:"index" json:"party_id"`
	MessageID        uint       `gorm:"index" json:"message_id"`
	TargetUserID     uint       `gorm:"index" json:"target_user_id"`
	ReporterUserID   uint       `gorm:"index;not null" json:"reporter_user_id"`
	ReporterUserUID  string     `gorm:"size:18;index" json:"reporter_user_uid"`
	ReporterName     string     `gorm:"size:50" json:"reporter_name"`
	Reason           string     `gorm:"size:120;not null" json:"reason"`
	Description      string     `gorm:"size:500" json:"description"`
	Status           string     `gorm:"size:20;index;default:'pending'" json:"status"`
	ResolutionAction string     `gorm:"size:40" json:"resolution_action"`
	ResolutionNote   string     `gorm:"size:500" json:"resolution_note"`
	HandledByAdminID uint       `gorm:"index" json:"handled_by_admin_id"`
	HandledByName    string     `gorm:"size:50" json:"handled_by_name"`
	ResolvedAt       *time.Time `json:"resolved_at"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (DiningBuddyReport) TableName() string {
	return "dining_buddy_reports"
}

type DiningBuddySensitiveWord struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Word        string    `gorm:"size:80;uniqueIndex;not null" json:"word"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	Description string    `gorm:"size:255" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (DiningBuddySensitiveWord) TableName() string {
	return "dining_buddy_sensitive_words"
}

type DiningBuddyUserRestriction struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	UserID           uint       `gorm:"not null;uniqueIndex" json:"user_id"`
	UserUID          string     `gorm:"size:18;index" json:"user_uid"`
	UserName         string     `gorm:"size:50" json:"user_name"`
	RestrictionType  string     `gorm:"size:20;index;not null" json:"restriction_type"`
	Reason           string     `gorm:"size:255" json:"reason"`
	Note             string     `gorm:"size:500" json:"note"`
	ExpiresAt        *time.Time `json:"expires_at"`
	CreatedByAdminID uint       `gorm:"index" json:"created_by_admin_id"`
	CreatedByName    string     `gorm:"size:50" json:"created_by_name"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (DiningBuddyUserRestriction) TableName() string {
	return "dining_buddy_user_restrictions"
}

type DiningBuddyAuditLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Action       string    `gorm:"size:40;index;not null" json:"action"`
	TargetType   string    `gorm:"size:20;index;not null" json:"target_type"`
	TargetID     string    `gorm:"size:64;index" json:"target_id"`
	OperatorRole string    `gorm:"size:20;index;default:'admin'" json:"operator_role"`
	OperatorID   string    `gorm:"size:64;index" json:"operator_id"`
	OperatorName string    `gorm:"size:50" json:"operator_name"`
	Summary      string    `gorm:"size:255" json:"summary"`
	DetailJSON   string    `gorm:"type:text" json:"detail_json"`
	CreatedAt    time.Time `json:"created_at"`
}

func (DiningBuddyAuditLog) TableName() string {
	return "dining_buddy_audit_logs"
}
