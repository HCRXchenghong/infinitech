package repository

import "time"

// CooperationRequest represents a business cooperation submission.
type CooperationRequest struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Company         string    `gorm:"size:120" json:"company"`
	ContactName     string    `gorm:"size:50" json:"contact_name"`
	ContactPhone    string    `gorm:"size:20" json:"contact_phone"`
	CooperationType string    `gorm:"size:50" json:"cooperation_type"`
	City            string    `gorm:"size:50" json:"city"`
	Description     string    `gorm:"type:text" json:"description"`
	Status          string    `gorm:"size:20;default:'pending'" json:"status"`
	AdminRemark     string    `gorm:"type:text" json:"admin_remark"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (CooperationRequest) TableName() string {
	return "cooperation_requests"
}

// InviteCode represents invite code for user.
type InviteCode struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserID    string    `gorm:"index" json:"user_id"`
	Phone     string    `gorm:"size:20" json:"phone"`
	Code      string    `gorm:"size:20;uniqueIndex" json:"code"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (InviteCode) TableName() string {
	return "invite_codes"
}

// InviteRecord represents an invite share/usage record.
type InviteRecord struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	InviterUserID string    `gorm:"index" json:"inviter_user_id"`
	InviterPhone  string    `gorm:"size:20" json:"inviter_phone"`
	InviteCode    string    `gorm:"size:20" json:"invite_code"`
	InviteePhone  string    `gorm:"size:20" json:"invitee_phone"`
	InviteeUserID string    `gorm:"index" json:"invitee_user_id"`
	Status        string    `gorm:"size:20;default:'shared'" json:"status"`
	RewardPoints  int       `gorm:"default:0" json:"reward_points"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (InviteRecord) TableName() string {
	return "invite_records"
}

// PointsGood represents a points mall good.
type PointsGood struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Name      string    `gorm:"size:120" json:"name"`
	Points    int       `gorm:"default:0" json:"points"`
	ShipFee   float64   `gorm:"type:decimal(10,2);default:0" json:"ship_fee"`
	Tag       string    `gorm:"size:20" json:"tag"`
	Type      string    `gorm:"size:20;default:'goods'" json:"type"`
	Desc      string    `gorm:"type:text" json:"desc"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	Stock     int       `gorm:"default:0" json:"stock"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (PointsGood) TableName() string {
	return "points_goods"
}

// PointsRedemption represents redemption order.
type PointsRedemption struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserID    string    `gorm:"index" json:"user_id"`
	UserPhone string    `gorm:"size:20" json:"user_phone"`
	GoodID    uint      `gorm:"index" json:"good_id"`
	GoodName  string    `gorm:"size:120" json:"good_name"`
	Points    int       `gorm:"default:0" json:"points"`
	ShipFee   float64   `gorm:"type:decimal(10,2);default:0" json:"ship_fee"`
	Status    string    `gorm:"size:20;default:'pending'" json:"status"`
	Address   string    `gorm:"type:text" json:"address"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (PointsRedemption) TableName() string {
	return "points_redemptions"
}

// PointsLedger tracks points changes with optional expiration.
type PointsLedger struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserID    string     `gorm:"index" json:"user_id"`
	OrderID   string     `gorm:"index" json:"order_id"`
	Change    int        `gorm:"default:0" json:"change"`
	Type      string     `gorm:"size:20" json:"type"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func (PointsLedger) TableName() string {
	return "points_ledger"
}
