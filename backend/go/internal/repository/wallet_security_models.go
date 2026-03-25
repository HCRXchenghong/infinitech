package repository

import "time"

// PaymentCallback keeps third-party callback payloads for audit and replay protection.
type PaymentCallback struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	CallbackID        string     `gorm:"size:64;uniqueIndex;not null" json:"callback_id"`
	CallbackIDRaw     string     `gorm:"size:128;index" json:"callback_id_raw,omitempty"`
	Channel           string     `gorm:"size:20;index;not null" json:"channel"` // wechat, alipay
	EventType         string     `gorm:"size:50" json:"event_type"`
	ThirdPartyOrderID string     `gorm:"size:128;index" json:"third_party_order_id"`
	TransactionID     string     `gorm:"size:64;index" json:"transaction_id"`
	TransactionIDRaw  string     `gorm:"size:128;index" json:"transaction_id_raw,omitempty"`
	Nonce             string     `gorm:"size:100" json:"nonce"`
	Signature         string     `gorm:"size:512" json:"signature"`
	Verified          bool       `gorm:"default:false" json:"verified"`
	ReplayFingerprint string     `gorm:"size:128;index" json:"replay_fingerprint"`
	Status            string     `gorm:"size:20;default:'pending';index" json:"status"`
	RequestHeaders    string     `gorm:"type:text" json:"request_headers"`
	RequestBody       string     `gorm:"type:longtext" json:"request_body"`
	ResponseBody      string     `gorm:"type:text" json:"response_body"`
	ProcessedAt       *time.Time `json:"processed_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (PaymentCallback) TableName() string {
	return "payment_callbacks"
}

// IdempotencyRecord keeps request-level idempotency snapshots.
type IdempotencyRecord struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	IdempotencyKey    string     `gorm:"size:120;uniqueIndex;not null" json:"idempotency_key"`
	IdempotencyKeyRaw string     `gorm:"size:200;index" json:"idempotency_key_raw,omitempty"`
	Scope             string     `gorm:"size:64;index;not null" json:"scope"`
	RequestHash       string     `gorm:"size:128" json:"request_hash"`
	Status            string     `gorm:"size:20;default:'processing';index" json:"status"`
	ResponseData      string     `gorm:"type:longtext" json:"response_data"`
	ExpiredAt         *time.Time `json:"expired_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (IdempotencyRecord) TableName() string {
	return "idempotency_records"
}

// ReconciliationTask tracks settlement/reconciliation jobs.
type ReconciliationTask struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	TaskID          string     `gorm:"size:64;uniqueIndex;not null" json:"task_id"`
	TaskIDRaw       string     `gorm:"size:128;index" json:"task_id_raw,omitempty"`
	TaskType        string     `gorm:"size:30;index;not null" json:"task_type"` // payment, recharge, withdraw
	Channel         string     `gorm:"size:20;index" json:"channel"`            // ifpay, wechat, alipay
	ReconcileDate   time.Time  `gorm:"type:date;index" json:"reconcile_date"`
	Status          string     `gorm:"size:20;index;default:'pending'" json:"status"`
	TotalRecords    int        `gorm:"default:0" json:"total_records"`
	MatchedRecords  int        `gorm:"default:0" json:"matched_records"`
	MismatchRecords int        `gorm:"default:0" json:"mismatch_records"`
	ErrorMessage    string     `gorm:"type:text" json:"error_message"`
	ResultData      string     `gorm:"type:longtext" json:"result_data"`
	StartedAt       *time.Time `json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (ReconciliationTask) TableName() string {
	return "reconciliation_tasks"
}
