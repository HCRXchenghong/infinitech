package repository

import "time"

// SettlementSubject defines who can receive internal settlement income.
type SettlementSubject struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Name              string    `gorm:"size:120;not null" json:"name"`
	SubjectType       string    `gorm:"size:30;index;not null" json:"subject_type"` // school, platform, merchant, rider, custom
	ScopeType         string    `gorm:"size:30;index;default:'global'" json:"scope_type"`
	ScopeID           string    `gorm:"size:64;index" json:"scope_id"`
	ExternalAccount   string    `gorm:"size:128" json:"external_account"`
	ExternalChannel   string    `gorm:"size:30" json:"external_channel"`
	AccountHolderName string    `gorm:"size:120" json:"account_holder_name"`
	Enabled           bool      `gorm:"default:true;index" json:"enabled"`
	SortOrder         int       `gorm:"default:0" json:"sort_order"`
	Notes             string    `gorm:"type:text" json:"notes"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (SettlementSubject) TableName() string {
	return "settlement_subjects"
}

// SettlementRuleSet stores a versioned rule bundle for a scope.
type SettlementRuleSet struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Name          string     `gorm:"size:120;not null" json:"name"`
	ScopeType     string     `gorm:"size:30;index;default:'global'" json:"scope_type"`
	ScopeID       string     `gorm:"size:64;index" json:"scope_id"`
	Version       int        `gorm:"default:1" json:"version"`
	IsDefault     bool       `gorm:"default:false;index" json:"is_default"`
	Enabled       bool       `gorm:"default:true;index" json:"enabled"`
	EffectiveFrom *time.Time `json:"effective_from"`
	Notes         string     `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func (SettlementRuleSet) TableName() string {
	return "settlement_rule_sets"
}

// SettlementRuleStep stores one ordered step inside a rule set.
type SettlementRuleStep struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RuleSetUID         string    `gorm:"size:64;index;not null" json:"rule_set_uid"`
	SettlementSubjectUID string  `gorm:"size:64;index;not null" json:"settlement_subject_uid"`
	StepOrder          int       `gorm:"default:0;index" json:"step_order"`
	CalcType           string    `gorm:"size:40;index;not null" json:"calc_type"` // percent_of_gross, tiered_by_order_amount, fixed_amount, remainder
	PercentBasisPoints int64     `gorm:"default:0" json:"percent_basis_points"`
	FixedAmount        int64     `gorm:"default:0" json:"fixed_amount"`
	MinOrderAmount     int64     `gorm:"default:0" json:"min_order_amount"`
	MaxOrderAmount     int64     `gorm:"default:0" json:"max_order_amount"`
	TierJSON           string    `gorm:"type:text" json:"tier_json"`
	Enabled            bool      `gorm:"default:true;index" json:"enabled"`
	Notes              string    `gorm:"type:text" json:"notes"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

func (SettlementRuleStep) TableName() string {
	return "settlement_rule_steps"
}

// OrderSettlementSnapshot stores the frozen rule/result for one order.
type OrderSettlementSnapshot struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	OrderID        string     `gorm:"size:64;index;not null" json:"order_id"`
	RuleSetUID     string     `gorm:"size:64;index" json:"rule_set_uid"`
	OrderAmount    int64      `gorm:"default:0" json:"order_amount"`
	Status         string     `gorm:"size:30;index;default:'pending_settlement'" json:"status"`
	SnapshotJSON   string     `gorm:"type:text" json:"snapshot_json"`
	SettledAt      *time.Time `json:"settled_at"`
	ReversedAt     *time.Time `json:"reversed_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (OrderSettlementSnapshot) TableName() string {
	return "order_settlement_snapshots"
}

// SettlementLedgerEntry stores one settlement posting per target subject.
type SettlementLedgerEntry struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	OrderID              string     `gorm:"size:64;index;not null" json:"order_id"`
	SettlementSubjectUID string     `gorm:"size:64;index;not null" json:"settlement_subject_uid"`
	SubjectType          string     `gorm:"size:30;index;not null" json:"subject_type"`
	EntryType            string     `gorm:"size:30;index;not null" json:"entry_type"`
	Amount               int64      `gorm:"default:0" json:"amount"`
	Status               string     `gorm:"size:30;index;default:'pending_settlement'" json:"status"`
	OccurredAt           *time.Time `json:"occurred_at"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

func (SettlementLedgerEntry) TableName() string {
	return "settlement_ledger_entries"
}

// WithdrawFeeRule defines fee tiers for withdrawals.
type WithdrawFeeRule struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserType          string    `gorm:"size:20;index;not null" json:"user_type"` // customer, rider, merchant
	WithdrawMethod    string    `gorm:"size:20;index;not null" json:"withdraw_method"` // wechat, alipay, bank_card
	MinAmount         int64     `gorm:"default:0" json:"min_amount"`
	MaxAmount         int64     `gorm:"default:0" json:"max_amount"`
	RateBasisPoints   int64     `gorm:"default:0" json:"rate_basis_points"`
	MinFee            int64     `gorm:"default:0" json:"min_fee"`
	MaxFee            int64     `gorm:"default:0" json:"max_fee"`
	Enabled           bool      `gorm:"default:true;index" json:"enabled"`
	SortOrder         int       `gorm:"default:0" json:"sort_order"`
	Notes             string    `gorm:"type:text" json:"notes"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (WithdrawFeeRule) TableName() string {
	return "withdraw_fee_rules"
}

// RiderDepositRecord tracks the rider acceptance deposit lifecycle.
type RiderDepositRecord struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RiderID            string     `gorm:"size:64;index;not null" json:"rider_id"`
	Amount             int64      `gorm:"default:0" json:"amount"`
	PaymentMethod      string     `gorm:"size:20;index" json:"payment_method"`
	RechargeOrderID    string     `gorm:"size:64;index" json:"recharge_order_id"`
	WithdrawRequestID  string     `gorm:"size:64;index" json:"withdraw_request_id"`
	Status             string     `gorm:"size:30;index;default:'unpaid'" json:"status"` // unpaid, paid_locked, withdrawable, withdrawing, refunded
	LastAcceptedAt     *time.Time `json:"last_accepted_at"`
	LockedAt           *time.Time `json:"locked_at"`
	WithdrawableAt     *time.Time `json:"withdrawable_at"`
	RefundedAt         *time.Time `json:"refunded_at"`
	Notes              string     `gorm:"type:text" json:"notes"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

func (RiderDepositRecord) TableName() string {
	return "rider_deposit_records"
}
