package repository

import "time"

// GroupbuyDeal 团购商品主数据（按店铺维度配置）
type GroupbuyDeal struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ShopID         string     `gorm:"size:64;index;not null" json:"shop_id"`
	Title          string     `gorm:"size:200;not null" json:"title"`
	Description    string     `gorm:"type:text" json:"description"`
	PriceFen       int64      `gorm:"not null;default:0" json:"price_fen"`
	MarketPriceFen int64      `gorm:"default:0" json:"market_price_fen"`
	StockTotal     int        `gorm:"default:0" json:"stock_total"`
	StockSold      int        `gorm:"default:0" json:"stock_sold"`
	Status         string     `gorm:"size:20;default:'draft';index" json:"status"` // draft/online/offline
	ValidFrom      *time.Time `json:"valid_from"`
	ValidTo        *time.Time `json:"valid_to"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (GroupbuyDeal) TableName() string {
	return "groupbuy_deals"
}

// GroupbuyVoucher 团购券实例
type GroupbuyVoucher struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	VoucherNo         string     `gorm:"size:64;uniqueIndex;not null" json:"voucher_no"`
	OrderID           uint       `gorm:"index;not null" json:"order_id"`
	UserID            string     `gorm:"size:64;index;not null" json:"user_id"`
	ShopID            string     `gorm:"size:64;index;not null" json:"shop_id"`
	DealID            uint       `gorm:"index" json:"deal_id"`
	AmountFen         int64      `gorm:"default:0" json:"amount_fen"`
	Status            string     `gorm:"size:32;default:'issued';index" json:"status"` // issued/redeemed/refund_pending/refunded/expired/invalid
	ExpireAt          *time.Time `json:"expire_at"`
	RedeemedAt        *time.Time `json:"redeemed_at"`
	RedeemedBy        string     `gorm:"size:64" json:"redeemed_by"`
	RedeemDeviceID    string     `gorm:"size:80" json:"redeem_device_id"`
	LastScanTokenHash string     `gorm:"size:128" json:"last_scan_token_hash"`
	Version           int        `gorm:"default:1" json:"version"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (GroupbuyVoucher) TableName() string {
	return "groupbuy_vouchers"
}

// GroupbuyRedemptionLog 核销日志（审计）
type GroupbuyRedemptionLog struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	VoucherID         uint      `gorm:"index;not null" json:"voucher_id"`
	OrderID           uint      `gorm:"index;not null" json:"order_id"`
	ShopID            string    `gorm:"size:64;index;not null" json:"shop_id"`
	OperatorID        string    `gorm:"size:64;index" json:"operator_id"`
	DeviceID          string    `gorm:"size:80" json:"device_id"`
	ScanTokenHash     string    `gorm:"size:128" json:"scan_token_hash"`
	IdempotencyKey    string    `gorm:"size:120;index" json:"idempotency_key"`
	IdempotencyKeyRaw string    `gorm:"size:200;index" json:"idempotency_key_raw,omitempty"`
	Result            string    `gorm:"size:20;index" json:"result"` // success/duplicated/rejected
	Reason            string    `gorm:"type:text" json:"reason"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (GroupbuyRedemptionLog) TableName() string {
	return "groupbuy_redemption_logs"
}

// EventOutbox 事务事件（用于可靠通知投递）
type EventOutbox struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	EventType   string     `gorm:"size:80;index;not null" json:"event_type"`
	DedupeKey   string     `gorm:"size:160;uniqueIndex;not null" json:"dedupe_key"`
	Status      string     `gorm:"size:20;default:'pending';index" json:"status"` // pending/processed/failed
	Payload     string     `gorm:"type:text" json:"payload"`
	RetryCount  int        `gorm:"default:0" json:"retry_count"`
	LastError   string     `gorm:"type:text" json:"last_error"`
	ProcessedAt *time.Time `json:"processed_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (EventOutbox) TableName() string {
	return "event_outbox"
}

// OpNotification 运营通知（按接收者落库）
type OpNotification struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RecipientType string     `gorm:"size:20;index;not null" json:"recipient_type"` // admin/merchant/user
	RecipientID   string     `gorm:"size:64;index;not null" json:"recipient_id"`   // admin 用 * 表示全体
	EventType     string     `gorm:"size:80;index;not null" json:"event_type"`
	RelatedType   string     `gorm:"size:40;index" json:"related_type"`
	RelatedID     string     `gorm:"size:64;index" json:"related_id"`
	Title         string     `gorm:"size:255;not null" json:"title"`
	Content       string     `gorm:"type:text;not null" json:"content"`
	Payload       string     `gorm:"type:text" json:"payload"`
	IsRead        bool       `gorm:"default:false;index" json:"is_read"`
	ReadAt        *time.Time `json:"read_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func (OpNotification) TableName() string {
	return "op_notifications"
}
