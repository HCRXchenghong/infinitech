package repository

import "time"

// PhoneContactAudit stores system phone contact click/open intents for audit.
type PhoneContactAudit struct {
	ID             uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	ActorRole      string    `gorm:"size:20;index;not null" json:"actor_role"`
	ActorID        string    `gorm:"size:32;index;not null" json:"actor_id"`
	ActorPhone     string    `gorm:"size:20;index" json:"actor_phone"`
	TargetRole     string    `gorm:"size:20;index" json:"target_role"`
	TargetID       string    `gorm:"size:32;index" json:"target_id"`
	TargetPhone    string    `gorm:"size:20;index;not null" json:"target_phone"`
	ContactChannel string    `gorm:"size:32;index;not null" json:"contact_channel"`
	EntryPoint     string    `gorm:"size:64;index" json:"entry_point"`
	Scene          string    `gorm:"size:64;index" json:"scene"`
	OrderID        string    `gorm:"size:32;index" json:"order_id"`
	RoomID         string    `gorm:"size:64;index" json:"room_id"`
	PagePath       string    `gorm:"size:255" json:"page_path"`
	ClientPlatform string    `gorm:"size:32;index" json:"client_platform"`
	ClientResult   string    `gorm:"size:20;index" json:"client_result"`
	Metadata       string    `gorm:"type:text" json:"metadata"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (PhoneContactAudit) TableName() string {
	return "phone_contact_audits"
}
