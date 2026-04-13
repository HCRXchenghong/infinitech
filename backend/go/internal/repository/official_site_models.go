package repository

import "time"

type OfficialSiteExposure struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Content       string     `gorm:"type:text" json:"content"`
	Amount        float64    `gorm:"type:decimal(10,2);default:0" json:"amount"`
	Appeal        string     `gorm:"type:text" json:"appeal"`
	ContactPhone  string     `gorm:"size:32" json:"contact_phone"`
	PhotoURLsJSON string     `gorm:"column:photo_urls_json;type:text" json:"-"`
	ReviewStatus  string     `gorm:"size:20;index;default:'pending'" json:"review_status"`
	ReviewRemark  string     `gorm:"type:text" json:"review_remark"`
	ReviewedByID  string     `gorm:"size:40" json:"reviewed_by_id"`
	ReviewedBy    string     `gorm:"size:80" json:"reviewed_by"`
	ReviewedAt    *time.Time `json:"reviewed_at"`
	ProcessStatus string     `gorm:"size:20;index;default:'unresolved'" json:"process_status"`
	ProcessRemark string     `gorm:"type:text" json:"process_remark"`
	HandledAt     *time.Time `json:"handled_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func (OfficialSiteExposure) TableName() string {
	return "official_site_exposures"
}

type OfficialSiteSupportSession struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	SessionToken       string     `gorm:"size:64;uniqueIndex;not null" json:"session_token"`
	Nickname           string     `gorm:"size:60" json:"nickname"`
	Contact            string     `gorm:"size:80" json:"contact"`
	Status             string     `gorm:"size:20;index;default:'open'" json:"status"`
	AdminRemark        string     `gorm:"type:text" json:"admin_remark"`
	LastMessagePreview string     `gorm:"size:240" json:"last_message_preview"`
	LastActor          string     `gorm:"size:20" json:"last_actor"`
	LastMessageAt      *time.Time `json:"last_message_at"`
	UnreadAdminCount   int        `gorm:"default:0" json:"unread_admin_count"`
	UnreadVisitorCount int        `gorm:"default:0" json:"unread_visitor_count"`
	ClosedAt           *time.Time `json:"closed_at"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

func (OfficialSiteSupportSession) TableName() string {
	return "official_site_support_sessions"
}

type OfficialSiteSupportMessage struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	SessionID  uint       `gorm:"index;not null" json:"session_id"`
	SenderType string     `gorm:"size:20;index;not null" json:"sender_type"`
	SenderName string     `gorm:"size:80" json:"sender_name"`
	Content    string     `gorm:"type:text" json:"content"`
	ReadAt     *time.Time `json:"read_at"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

func (OfficialSiteSupportMessage) TableName() string {
	return "official_site_support_messages"
}
