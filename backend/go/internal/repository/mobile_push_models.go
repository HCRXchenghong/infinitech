package repository

import "time"

// PushDevice stores APNs device registrations for mobile clients.
type PushDevice struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserID           string    `gorm:"size:32;index:idx_push_device_user,priority:1;uniqueIndex:uniq_push_device,priority:2;not null" json:"user_id"`
	UserType         string    `gorm:"size:20;index:idx_push_device_user,priority:2;uniqueIndex:uniq_push_device,priority:3;not null" json:"user_type"`
	DeviceToken      string    `gorm:"size:255;index:idx_push_device_token,priority:1;uniqueIndex:uniq_push_device,priority:1;not null" json:"device_token"`
	AppEnv           string    `gorm:"size:20;default:prod" json:"app_env"`
	AppVersion       string    `gorm:"size:32" json:"app_version"`
	Locale           string    `gorm:"size:20" json:"locale"`
	Timezone         string    `gorm:"size:64" json:"timezone"`
	IsActive         bool      `gorm:"default:true;index" json:"is_active"`
	LastSeenAt       time.Time `json:"last_seen_at"`
	LastRegisteredAt time.Time `json:"last_registered_at"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (PushDevice) TableName() string {
	return "push_devices"
}

// PushDelivery records push delivery/ack lifecycle for audit and retry analysis.
type PushDelivery struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	MessageID      string     `gorm:"size:64;uniqueIndex;not null" json:"message_id"`
	UserID         string     `gorm:"size:32;index" json:"user_id"`
	UserType       string     `gorm:"size:20;index" json:"user_type"`
	DeviceToken    string     `gorm:"size:255;index" json:"device_token"`
	EventType      string     `gorm:"size:64;index" json:"event_type"`
	Status         string     `gorm:"size:32;index" json:"status"`
	Action         string     `gorm:"size:32" json:"action"`
	Payload        string     `gorm:"type:text" json:"payload"`
	RetryCount     int        `gorm:"default:0" json:"retry_count"`
	SentAt         *time.Time `gorm:"type:datetime" json:"sent_at"`
	AcknowledgedAt *time.Time `gorm:"type:datetime" json:"acknowledged_at"`
	ErrorCode      string     `gorm:"size:64" json:"error_code"`
	ErrorMessage   string     `gorm:"type:text" json:"error_message"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (PushDelivery) TableName() string {
	return "push_deliveries"
}

// PushTemplate keeps optional push copy templates for event types.
type PushTemplate struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	EventType string    `gorm:"size:64;uniqueIndex;not null" json:"event_type"`
	Title     string    `gorm:"size:200;not null" json:"title"`
	Body      string    `gorm:"type:text;not null" json:"body"`
	Platform  string    `gorm:"size:20;default:ios" json:"platform"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (PushTemplate) TableName() string {
	return "push_templates"
}
