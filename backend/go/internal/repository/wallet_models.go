package repository

import "time"

// WalletAccount stores user wallet balances in cents.
type WalletAccount struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserID              string     `gorm:"size:50;not null;index;uniqueIndex:idx_wallet_accounts_user_identity" json:"user_id"`
	UserType            string     `gorm:"size:20;not null;index;uniqueIndex:idx_wallet_accounts_user_identity" json:"user_type"` // customer, rider, merchant
	Balance             int64      `gorm:"default:0;not null" json:"balance"`
	FrozenBalance       int64      `gorm:"default:0;not null" json:"frozen_balance"`
	TotalBalance        int64      `gorm:"default:0;not null" json:"total_balance"`
	Version             int        `gorm:"default:0;not null" json:"version"`
	LastTransactionID   string     `gorm:"size:64" json:"last_transaction_id"`
	LastTransactionAt   *time.Time `json:"last_transaction_at"`
	DailyRechargeAmount int64      `gorm:"default:0" json:"daily_recharge_amount"`
	DailyWithdrawAmount int64      `gorm:"default:0" json:"daily_withdraw_amount"`
	DailyPaymentAmount  int64      `gorm:"default:0" json:"daily_payment_amount"`
	DailyRechargeCount  int        `gorm:"default:0" json:"daily_recharge_count"`
	DailyWithdrawCount  int        `gorm:"default:0" json:"daily_withdraw_count"`
	LastDailyResetAt    *time.Time `gorm:"type:date" json:"last_daily_reset_at"`
	Status              string     `gorm:"size:20;default:'active';index" json:"status"` // active, frozen, closed
	FrozenReason        string     `gorm:"type:text" json:"frozen_reason"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

func (WalletAccount) TableName() string {
	return "wallet_accounts"
}

// WalletTransaction is immutable ledger-like transaction record.
type WalletTransaction struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	TransactionID           string     `gorm:"size:64;uniqueIndex;not null" json:"transaction_id"`
	TransactionIDRaw        string     `gorm:"size:128;index" json:"transaction_id_raw,omitempty"`
	IdempotencyKey          string     `gorm:"size:80;uniqueIndex" json:"idempotency_key"`
	IdempotencyKeyRaw       string     `gorm:"size:160;index" json:"idempotency_key_raw,omitempty"`
	UserID                  string     `gorm:"size:50;index;not null" json:"user_id"`
	UserType                string     `gorm:"size:20;index;not null" json:"user_type"`
	Type                    string     `gorm:"size:30;index;not null" json:"type"`
	BusinessType            string     `gorm:"size:30" json:"business_type"`
	BusinessID              string     `gorm:"size:64;index" json:"business_id"`
	Amount                  int64      `gorm:"not null" json:"amount"`
	BalanceBefore           int64      `gorm:"not null" json:"balance_before"`
	BalanceAfter            int64      `gorm:"not null" json:"balance_after"`
	PaymentMethod           string     `gorm:"size:20;default:'ifpay'" json:"payment_method"` // ifpay, wechat, alipay, admin
	PaymentChannel          string     `gorm:"size:50" json:"payment_channel"`
	ThirdPartyOrderID       string     `gorm:"size:128" json:"third_party_order_id"`
	ThirdPartyTransactionID string     `gorm:"size:128" json:"third_party_transaction_id"`
	Status                  string     `gorm:"size:20;index;default:'pending'" json:"status"` // pending, processing, success, failed, cancelled
	Description             string     `gorm:"type:text" json:"description"`
	Remark                  string     `gorm:"type:text" json:"remark"`
	OperatorID              string     `gorm:"size:50" json:"operator_id"`
	OperatorName            string     `gorm:"size:100" json:"operator_name"`
	OperatorIP              string     `gorm:"size:50" json:"operator_ip"`
	Signature               string     `gorm:"size:256" json:"signature"`
	RequestData             string     `gorm:"type:text" json:"request_data"`
	ResponseData            string     `gorm:"type:text" json:"response_data"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
	CompletedAt             *time.Time `json:"completed_at"`
}

func (WalletTransaction) TableName() string {
	return "wallet_transactions"
}

type RechargeOrder struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	OrderID           string     `gorm:"size:64;uniqueIndex;not null" json:"order_id"`
	TransactionID     string     `gorm:"size:64;index" json:"transaction_id"`
	TransactionIDRaw  string     `gorm:"size:128;index" json:"transaction_id_raw,omitempty"`
	UserID            string     `gorm:"size:50;index;not null" json:"user_id"`
	UserType          string     `gorm:"size:20;not null" json:"user_type"`
	Amount            int64      `gorm:"not null" json:"amount"`
	ActualAmount      int64      `json:"actual_amount"`
	PaymentMethod     string     `gorm:"size:20;not null" json:"payment_method"` // wechat, alipay, ifpay
	PaymentChannel    string     `gorm:"size:50" json:"payment_channel"`
	ThirdPartyOrderID string     `gorm:"size:128;uniqueIndex" json:"third_party_order_id"`
	Status            string     `gorm:"size:20;index;default:'pending'" json:"status"` // pending, paid, success, failed, timeout
	CallbackData      string     `gorm:"type:text" json:"callback_data"`
	CallbackAt        *time.Time `json:"callback_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	PaidAt            *time.Time `json:"paid_at"`
	ExpiredAt         *time.Time `json:"expired_at"`
}

func (RechargeOrder) TableName() string {
	return "recharge_orders"
}

type WithdrawRequest struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RequestID               string     `gorm:"size:64;uniqueIndex;not null" json:"request_id"`
	RequestIDRaw            string     `gorm:"size:128;index" json:"request_id_raw,omitempty"`
	TransactionID           string     `gorm:"size:64;index" json:"transaction_id"`
	TransactionIDRaw        string     `gorm:"size:128;index" json:"transaction_id_raw,omitempty"`
	UserID                  string     `gorm:"size:50;index;not null" json:"user_id"`
	UserType                string     `gorm:"size:20;not null" json:"user_type"`
	Amount                  int64      `gorm:"not null" json:"amount"`
	Fee                     int64      `gorm:"default:0" json:"fee"`
	ActualAmount            int64      `gorm:"not null" json:"actual_amount"`
	WithdrawMethod          string     `gorm:"size:20;not null" json:"withdraw_method"`
	WithdrawAccount         string     `gorm:"size:128;not null" json:"withdraw_account"`
	WithdrawName            string     `gorm:"size:100" json:"withdraw_name"`
	BankName                string     `gorm:"size:100" json:"bank_name"`
	BankBranch              string     `gorm:"size:200" json:"bank_branch"`
	Status                  string     `gorm:"size:20;index;default:'pending'" json:"status"`
	ReviewerID              string     `gorm:"size:50" json:"reviewer_id"`
	ReviewerName            string     `gorm:"size:100" json:"reviewer_name"`
	ReviewRemark            string     `gorm:"type:text" json:"review_remark"`
	RejectReason            string     `gorm:"type:text" json:"reject_reason"`
	ReviewedAt              *time.Time `json:"reviewed_at"`
	ThirdPartyOrderID       string     `gorm:"size:128" json:"third_party_order_id"`
	TransferResult          string     `gorm:"type:text" json:"transfer_result"`
	PayoutVoucherURL        string     `gorm:"size:512" json:"payout_voucher_url"`
	PayoutReferenceNo       string     `gorm:"size:128" json:"payout_reference_no"`
	PayoutSourceBankName    string     `gorm:"size:100" json:"payout_source_bank_name"`
	PayoutSourceBankBranch  string     `gorm:"size:200" json:"payout_source_bank_branch"`
	PayoutSourceCardNo      string     `gorm:"size:128" json:"payout_source_card_no"`
	PayoutSourceAccountName string     `gorm:"size:100" json:"payout_source_account_name"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
	CompletedAt             *time.Time `json:"completed_at"`
}

func (WithdrawRequest) TableName() string {
	return "withdraw_requests"
}

type AdminWalletOperation struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	OperationID      string     `gorm:"size:64;uniqueIndex;not null" json:"operation_id"`
	OperationIDRaw   string     `gorm:"size:128;index" json:"operation_id_raw,omitempty"`
	TransactionID    string     `gorm:"size:64;index" json:"transaction_id"`
	TransactionIDRaw string     `gorm:"size:128;index" json:"transaction_id_raw,omitempty"`
	TargetUserID     string     `gorm:"size:50;index;not null" json:"target_user_id"`
	TargetUserType   string     `gorm:"size:20;not null" json:"target_user_type"`
	OperationType    string     `gorm:"size:20;not null" json:"operation_type"`
	Amount           int64      `gorm:"not null" json:"amount"`
	AdminID          string     `gorm:"size:50;index;not null" json:"admin_id"`
	AdminName        string     `gorm:"size:100;not null" json:"admin_name"`
	AdminIP          string     `gorm:"size:50;not null" json:"admin_ip"`
	Reason           string     `gorm:"type:text;not null" json:"reason"`
	Remark           string     `gorm:"type:text" json:"remark"`
	RequiresApproval bool       `gorm:"default:false" json:"requires_approval"`
	ApproverID       string     `gorm:"size:50" json:"approver_id"`
	ApproverName     string     `gorm:"size:100" json:"approver_name"`
	ApprovalStatus   string     `gorm:"size:20" json:"approval_status"`
	ApprovedAt       *time.Time `json:"approved_at"`
	CreatedAt        time.Time  `json:"created_at"`
}

func (AdminWalletOperation) TableName() string {
	return "admin_wallet_operations"
}

// FinancialLogAudit stores immutable snapshots before sensitive financial-log mutations.
type FinancialLogAudit struct {
	ID              uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	Action          string    `gorm:"size:20;index;not null" json:"action"`
	SourceType      string    `gorm:"size:30;index;not null" json:"source_type"`
	SourceRecordID  uint      `gorm:"index" json:"source_record_id"`
	SourceRecordUID string    `gorm:"size:64;index" json:"source_record_uid"`
	BatchID         string    `gorm:"size:64;index" json:"batch_id"`
	OperatorRole    string    `gorm:"size:20;index;not null" json:"operator_role"`
	OperatorID      string    `gorm:"size:64;index;not null" json:"operator_id"`
	OperatorName    string    `gorm:"size:100" json:"operator_name"`
	Reason          string    `gorm:"type:text" json:"reason"`
	Snapshot        string    `gorm:"type:longtext;not null" json:"snapshot"`
	CreatedAt       time.Time `json:"created_at"`
}

func (FinancialLogAudit) TableName() string {
	return "financial_log_audits"
}

type FinancialStatistic struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	StatDate                time.Time `gorm:"type:date;index:uk_date_type,unique;not null" json:"stat_date"`
	StatType                string    `gorm:"size:20;index:uk_date_type,unique;not null" json:"stat_type"` // daily, weekly, monthly, quarterly, yearly
	TotalTransactionAmount  int64     `gorm:"default:0" json:"total_transaction_amount"`
	TotalOrderAmount        int64     `gorm:"default:0" json:"total_order_amount"`
	TotalOrderCount         int       `gorm:"default:0" json:"total_order_count"`
	TotalRefundAmount       int64     `gorm:"default:0" json:"total_refund_amount"`
	TotalRefundCount        int       `gorm:"default:0" json:"total_refund_count"`
	TotalCompensationAmount int64     `gorm:"default:0" json:"total_compensation_amount"`
	TotalCompensationCount  int       `gorm:"default:0" json:"total_compensation_count"`
	PlatformRevenue         int64     `gorm:"default:0" json:"platform_revenue"`
	PlatformCommission      int64     `gorm:"default:0" json:"platform_commission"`
	PlatformServiceFee      int64     `gorm:"default:0" json:"platform_service_fee"`
	RiderTotalIncome        int64     `gorm:"default:0" json:"rider_total_income"`
	RiderOrderCount         int       `gorm:"default:0" json:"rider_order_count"`
	ActiveRiderCount        int       `gorm:"default:0" json:"active_rider_count"`
	MerchantTotalIncome     int64     `gorm:"default:0" json:"merchant_total_income"`
	MerchantOrderCount      int       `gorm:"default:0" json:"merchant_order_count"`
	ActiveMerchantCount     int       `gorm:"default:0" json:"active_merchant_count"`
	CustomerPaymentAmount   int64     `gorm:"default:0" json:"customer_payment_amount"`
	CustomerOrderCount      int       `gorm:"default:0" json:"customer_order_count"`
	ActiveCustomerCount     int       `gorm:"default:0" json:"active_customer_count"`
	TotalRechargeAmount     int64     `gorm:"default:0" json:"total_recharge_amount"`
	TotalWithdrawAmount     int64     `gorm:"default:0" json:"total_withdraw_amount"`
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

func (FinancialStatistic) TableName() string {
	return "financial_statistics"
}

type UserFinancialDetail struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserID              string    `gorm:"size:50;index;not null;index:uk_user_date_type,unique" json:"user_id"`
	UserType            string    `gorm:"size:20;index;not null" json:"user_type"`
	StatDate            time.Time `gorm:"type:date;index;not null;index:uk_user_date_type,unique" json:"stat_date"`
	StatType            string    `gorm:"size:20;not null;index:uk_user_date_type,unique" json:"stat_type"`
	TotalIncome         int64     `gorm:"default:0" json:"total_income"`
	OrderIncome         int64     `gorm:"default:0" json:"order_income"`
	TipIncome           int64     `gorm:"default:0" json:"tip_income"`
	BonusIncome         int64     `gorm:"default:0" json:"bonus_income"`
	TotalExpense        int64     `gorm:"default:0" json:"total_expense"`
	OrderExpense        int64     `gorm:"default:0" json:"order_expense"`
	OrderCount          int       `gorm:"default:0" json:"order_count"`
	CompletedOrderCount int       `gorm:"default:0" json:"completed_order_count"`
	CancelledOrderCount int       `gorm:"default:0" json:"cancelled_order_count"`
	RefundAmount        int64     `gorm:"default:0" json:"refund_amount"`
	CompensationAmount  int64     `gorm:"default:0" json:"compensation_amount"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

func (UserFinancialDetail) TableName() string {
	return "user_financial_details"
}
