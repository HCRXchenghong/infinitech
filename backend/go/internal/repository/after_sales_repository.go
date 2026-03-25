package repository

import (
	"context"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

// AfterSalesRequest represents a user submitted after-sales request.
type AfterSalesRequest struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RequestNo             string     `gorm:"size:40;uniqueIndex;not null" json:"request_no"`
	OrderID               uint       `gorm:"index;not null" json:"order_id"`
	OrderNo               string     `gorm:"size:64;index" json:"order_no"`
	UserID                string     `gorm:"size:64;index;not null" json:"user_id"`
	ShopID                string     `gorm:"size:64;index" json:"shop_id"`
	ShopName              string     `gorm:"size:120" json:"shop_name"`
	BizType               string     `gorm:"size:20;default:'takeout';index" json:"biz_type"` // takeout/groupbuy
	InitiatorRole         string     `gorm:"size:20;default:'user'" json:"initiator_role"`    // user/merchant/admin
	RedeemStateSnapshot   string     `gorm:"size:32;default:'unredeemed'" json:"redeem_state_snapshot"`
	Type                  string     `gorm:"size:32;index;not null" json:"type"`
	Status                string     `gorm:"size:32;index;default:'pending'" json:"status"`
	ProblemDesc           string     `gorm:"type:text;not null" json:"problem_desc"`
	SelectedProducts      string     `gorm:"type:text" json:"selected_products"`
	EvidenceImages        string     `gorm:"type:text" json:"evidence_images"`
	ContactPhone          string     `gorm:"size:20;index" json:"contact_phone"`
	RequestedRefundAmount int64      `gorm:"default:0" json:"requested_refund_amount"`
	ShouldRefund          bool       `gorm:"default:false" json:"should_refund"`
	RefundAmount          int64      `gorm:"default:0" json:"refund_amount"`
	RefundReason          string     `gorm:"type:text" json:"refund_reason"`
	RefundTransactionID   string     `gorm:"size:64;index" json:"refund_transaction_id"`
	RefundedAt            *time.Time `json:"refunded_at"`
	AdminRemark           string     `gorm:"type:text" json:"admin_remark"`
	ProcessedBy           string     `gorm:"size:64" json:"processed_by"`
	ProcessedAt           *time.Time `json:"processed_at"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

func (AfterSalesRequest) TableName() string {
	return "after_sales_requests"
}

type ListAfterSalesParams struct {
	Search     string
	Status     string
	MerchantID int64
	Limit      int
	Offset     int
}

type AfterSalesRepository interface {
	Create(ctx context.Context, req *AfterSalesRequest) error
	GetByID(ctx context.Context, id uint) (*AfterSalesRequest, error)
	List(ctx context.Context, params ListAfterSalesParams) ([]AfterSalesRequest, int64, error)
	ListByUserID(ctx context.Context, userID string) ([]AfterSalesRequest, error)
	MerchantOwnsShop(ctx context.Context, merchantID int64, shopID string) (bool, error)
	UpdateStatus(ctx context.Context, id uint, updates map[string]interface{}) error
	ClearProcessed(ctx context.Context) (int64, error)
	ClearAll(ctx context.Context) (int64, error)
}

type afterSalesRepository struct {
	db *gorm.DB
}

func NewAfterSalesRepository(db *gorm.DB) AfterSalesRepository {
	return &afterSalesRepository{db: db}
}

func (r *afterSalesRepository) Create(ctx context.Context, req *AfterSalesRequest) error {
	return r.db.WithContext(ctx).Create(req).Error
}

func (r *afterSalesRepository) GetByID(ctx context.Context, id uint) (*AfterSalesRequest, error) {
	var req AfterSalesRequest
	if err := r.db.WithContext(ctx).First(&req, id).Error; err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *afterSalesRepository) List(ctx context.Context, params ListAfterSalesParams) ([]AfterSalesRequest, int64, error) {
	var list []AfterSalesRequest
	var total int64

	query := r.db.WithContext(ctx).Model(&AfterSalesRequest{})
	if params.MerchantID > 0 {
		var merchantShopIDs []uint
		if err := r.db.WithContext(ctx).
			Table("shops").
			Select("id").
			Where("merchant_id = ?", params.MerchantID).
			Find(&merchantShopIDs).Error; err != nil {
			return nil, 0, err
		}

		if len(merchantShopIDs) == 0 {
			return []AfterSalesRequest{}, 0, nil
		}

		shopIDs := make([]string, 0, len(merchantShopIDs))
		for _, shopID := range merchantShopIDs {
			shopIDs = append(shopIDs, strconv.FormatUint(uint64(shopID), 10))
		}
		query = query.Where("shop_id IN ?", shopIDs)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.Search != "" {
		like := "%" + params.Search + "%"
		query = query.Where(
			"request_no LIKE ? OR order_no LIKE ? OR user_id LIKE ? OR contact_phone LIKE ? OR shop_name LIKE ?",
			like, like, like, like, like,
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Order("created_at DESC").Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (r *afterSalesRepository) ListByUserID(ctx context.Context, userID string) ([]AfterSalesRequest, error) {
	var list []AfterSalesRequest
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&list).Error
	return list, err
}

func (r *afterSalesRepository) MerchantOwnsShop(ctx context.Context, merchantID int64, shopID string) (bool, error) {
	if merchantID <= 0 {
		return false, nil
	}
	shopID = strings.TrimSpace(shopID)
	if shopID == "" {
		return false, nil
	}

	shopIDUint64, err := strconv.ParseUint(shopID, 10, 64)
	if err != nil || shopIDUint64 == 0 {
		return false, nil
	}

	var total int64
	if err := r.db.WithContext(ctx).
		Table("shops").
		Where("id = ? AND merchant_id = ?", uint(shopIDUint64), merchantID).
		Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}

func (r *afterSalesRepository) UpdateStatus(ctx context.Context, id uint, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&AfterSalesRequest{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *afterSalesRepository) ClearProcessed(ctx context.Context) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("status <> ?", "pending").
		Delete(&AfterSalesRequest{})
	return result.RowsAffected, result.Error
}

func (r *afterSalesRepository) ClearAll(ctx context.Context) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("1 = 1").
		Delete(&AfterSalesRequest{})
	return result.RowsAffected, result.Error
}
