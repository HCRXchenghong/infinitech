package repository

import "time"

// RTCCallAudit stores server-side RTC call lifecycle records for audit.
type RTCCallAudit struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	CallIDRaw          string     `gorm:"size:128;index" json:"call_id_raw,omitempty"`
	CallType           string     `gorm:"size:20;index;not null" json:"call_type"`
	CallerRole         string     `gorm:"size:20;index;not null" json:"caller_role"`
	CallerID           string     `gorm:"size:32;index;not null" json:"caller_id"`
	CallerPhone        string     `gorm:"size:20;index" json:"caller_phone"`
	CalleeRole         string     `gorm:"size:20;index;not null" json:"callee_role"`
	CalleeID           string     `gorm:"size:32;index" json:"callee_id"`
	CalleePhone        string     `gorm:"size:20;index" json:"callee_phone"`
	ConversationID     string     `gorm:"size:64;index" json:"conversation_id"`
	OrderID            string     `gorm:"size:32;index" json:"order_id"`
	EntryPoint         string     `gorm:"size:64;index" json:"entry_point"`
	Scene              string     `gorm:"size:64;index" json:"scene"`
	ClientPlatform     string     `gorm:"size:32;index" json:"client_platform"`
	ClientKind         string     `gorm:"size:20;index" json:"client_kind"`
	Status             string     `gorm:"size:32;index;not null" json:"status"`
	FailureReason      string     `gorm:"size:128" json:"failure_reason"`
	ComplaintStatus    string     `gorm:"size:32;index" json:"complaint_status"`
	RecordingRetention string     `gorm:"size:32" json:"recording_retention"`
	StartedAt          *time.Time `gorm:"index" json:"started_at"`
	AnsweredAt         *time.Time `json:"answered_at"`
	EndedAt            *time.Time `json:"ended_at"`
	DurationSeconds    int        `gorm:"default:0" json:"duration_seconds"`
	Metadata           string     `gorm:"type:text" json:"metadata"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

func (RTCCallAudit) TableName() string {
	return "rtc_call_audits"
}
