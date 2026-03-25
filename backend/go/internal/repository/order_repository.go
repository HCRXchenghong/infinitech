package repository

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Order represents order record.
type Order struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	DailyOrderID                string     `gorm:"index" json:"daily_order_id"`
	DailyOrderNumber            int        `json:"daily_order_number"`
	UserID                      string     `gorm:"index" json:"user_id"`
	CustomerName                string     `json:"customer_name"`
	CustomerPhone               string     `json:"customer_phone"`
	RiderID                     string     `gorm:"index" json:"rider_id"`
	RiderName                   string     `json:"rider_name"`
	RiderPhone                  string     `json:"rider_phone"`
	MerchantID                  string     `gorm:"index" json:"merchant_id"`
	ShopID                      string     `gorm:"index" json:"shop_id"`
	ShopName                    string     `json:"shop_name"`
	BizType                     string     `gorm:"size:20;default:'takeout';index" json:"biz_type"` // takeout/groupbuy
	Status                      string     `gorm:"index" json:"status"`
	ServiceType                 string     `json:"service_type"`
	ServiceDescription          string     `json:"service_description"`
	PackageName                 string     `json:"package_name"`
	PackagePrice                float64    `json:"package_price"`
	PhoneModel                  string     `json:"phone_model"`
	SpecialNotes                string     `json:"special_notes"`
	PreferredTime               string     `json:"preferred_time"`
	FoodRequest                 string     `json:"food_request"`
	FoodShop                    string     `json:"food_shop"`
	FoodAllergies               string     `json:"food_allergies"`
	TasteNotes                  string     `json:"taste_notes"`
	DrinkRequest                string     `json:"drink_request"`
	DrinkPickupCode             string     `json:"drink_pickup_code"`
	DrinkSugar                  string     `json:"drink_sugar"`
	DrinkPickupQRImage          string     `json:"drink_pickup_qr_image"`
	DeliveryRequest             string     `json:"delivery_request"`
	DeliveryName                string     `json:"delivery_name"`
	DeliveryPhone               string     `json:"delivery_phone"`
	DeliveryCodes               string     `json:"delivery_codes"`
	DeliveryPhoto               string     `json:"delivery_photo"`
	DeliveryMessage             string     `json:"delivery_message"`
	DeliveryPhotoTime           string     `json:"delivery_photo_time"`
	ErrandRequest               string     `json:"errand_request"`
	ErrandLocation              string     `json:"errand_location"`
	ErrandRequirements          string     `json:"errand_requirements"`
	DormNumber                  string     `json:"dorm_number"`
	Address                     string     `json:"address"`
	TotalPrice                  float64    `json:"total_price"`
	RiderQuotedPrice            float64    `json:"rider_quoted_price"`
	DeliveryFee                 float64    `json:"delivery_fee"`
	ProductPrice                float64    `json:"product_price"`
	Items                       string     `gorm:"type:text" json:"items"`
	RawPayload                  string     `gorm:"type:text" json:"raw_payload"`
	PaymentMethod               string     `gorm:"size:20;default:'ifpay'" json:"payment_method"`
	PaymentStatus               string     `gorm:"size:20;default:'unpaid';index" json:"payment_status"`
	PaymentTransactionID        string     `gorm:"size:64" json:"payment_transaction_id"`
	PaymentTime                 *time.Time `json:"payment_time"`
	RefundTransactionID         string     `gorm:"size:64" json:"refund_transaction_id"`
	RefundAmount                int64      `gorm:"default:0" json:"refund_amount"`
	RefundTime                  *time.Time `json:"refund_time"`
	PlatformCommission          int64      `gorm:"default:0" json:"platform_commission"`
	RiderIncome                 int64      `gorm:"default:0" json:"rider_income"`
	MerchantIncome              int64      `gorm:"default:0" json:"merchant_income"`
	AcceptedAt                  *time.Time `json:"accepted_at"`
	PaidAt                      *time.Time `json:"paid_at"`
	CompletedAt                 *time.Time `json:"completed_at"`
	LatestExceptionReason       string     `gorm:"type:text" json:"latest_exception_reason"`
	LatestExceptionReporterID   string     `gorm:"index" json:"latest_exception_reporter_id"`
	LatestExceptionReporterRole string     `gorm:"size:20;index" json:"latest_exception_reporter_role"`
	LatestExceptionReportedAt   *time.Time `json:"latest_exception_reported_at"`
	ExceptionReports            string     `gorm:"type:text" json:"exception_reports"`
	IsReviewed                  bool       `gorm:"default:false;index" json:"is_reviewed"`
	ReviewedAt                  *time.Time `json:"reviewed_at"`
	CreatedAt                   time.Time  `json:"created_at"`
	UpdatedAt                   time.Time  `json:"updated_at"`
}

func (Order) TableName() string {
	return "orders"
}

type ListOrdersParams struct {
	Search  string
	Status  string
	BizType string
	Limit   int
	Offset  int
}

type OrderRepository interface {
	Create(ctx context.Context, order *Order) error
	GetByID(ctx context.Context, id uint) (*Order, error)
	IsOrderOwnedByMerchant(ctx context.Context, orderID uint, merchantID string) (bool, error)
	ListByUserID(ctx context.Context, userID string) ([]Order, error)
	List(ctx context.Context, params ListOrdersParams) ([]Order, int64, error)
	GetRiderRating(ctx context.Context, riderID, riderPhone string) (float64, int, error)
	MarkReviewed(ctx context.Context, id uint) (*Order, error)
	DeleteByUserID(ctx context.Context, userID string) (int64, error)
	DeleteByRiderID(ctx context.Context, riderID string) (int64, error)
	DeleteAll(ctx context.Context) (int64, error)
}

type orderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) Create(ctx context.Context, order *Order) error {
	return r.db.WithContext(ctx).Create(order).Error
}

func (r *orderRepository) GetByID(ctx context.Context, id uint) (*Order, error) {
	var order Order
	if err := r.db.WithContext(ctx).First(&order, id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *orderRepository) IsOrderOwnedByMerchant(ctx context.Context, orderID uint, merchantID string) (bool, error) {
	merchantID = strings.TrimSpace(merchantID)
	if orderID == 0 || merchantID == "" {
		return false, nil
	}

	var total int64
	err := r.db.WithContext(ctx).
		Table("orders AS o").
		Joins("LEFT JOIN shops AS s ON s.id = o.shop_id").
		Where("o.id = ?", orderID).
		Where("(o.merchant_id = ? OR s.merchant_id = ?)", merchantID, merchantID).
		Count(&total).Error
	if err != nil {
		return false, err
	}
	return total > 0, nil
}

func (r *orderRepository) ListByUserID(ctx context.Context, userID string) ([]Order, error) {
	var orders []Order
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&orders).Error
	return orders, err
}

func (r *orderRepository) List(ctx context.Context, params ListOrdersParams) ([]Order, int64, error) {
	var orders []Order
	var total int64

	query := r.db.WithContext(ctx).Model(&Order{})
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.BizType != "" {
		if params.BizType == "takeout" {
			query = query.Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", params.BizType)
		} else {
			query = query.Where("biz_type = ?", params.BizType)
		}
	}
	if params.Search != "" {
		like := "%" + params.Search + "%"
		query = query.Where(
			"uid LIKE ? OR tsid LIKE ? OR CAST(id AS TEXT) LIKE ? OR daily_order_id LIKE ? OR user_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR rider_name LIKE ? OR rider_phone LIKE ?",
			like, like, like, like, like, like, like, like, like,
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

	if err := query.Order("created_at DESC").Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *orderRepository) GetRiderRating(ctx context.Context, riderID, riderPhone string) (float64, int, error) {
	query := r.db.WithContext(ctx).Model(&Rider{})
	if riderID != "" && riderPhone != "" {
		query = query.Where("id = ? OR phone = ?", riderID, riderPhone)
	} else if riderID != "" {
		query = query.Where("id = ?", riderID)
	} else if riderPhone != "" {
		query = query.Where("phone = ?", riderPhone)
	} else {
		return 0, 0, nil
	}

	var rider Rider
	if err := query.First(&rider).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return 0, 0, nil
		}
		return 0, 0, err
	}
	if rider.RatingCount == 0 && rider.Rating <= 0 {
		return 5, 0, nil
	}
	return rider.Rating, rider.RatingCount, nil
}

func (r *orderRepository) MarkReviewed(ctx context.Context, id uint) (*Order, error) {
	now := time.Now()
	if err := r.db.WithContext(ctx).
		Model(&Order{}).
		Where("id = ? AND is_reviewed = ?", id, false).
		Updates(map[string]interface{}{
			"is_reviewed": true,
			"reviewed_at": now,
		}).Error; err != nil {
		return nil, err
	}

	var order Order
	if err := r.db.WithContext(ctx).First(&order, id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *orderRepository) DeleteByUserID(ctx context.Context, userID string) (int64, error) {
	res := r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&Order{})
	return res.RowsAffected, res.Error
}

func (r *orderRepository) DeleteByRiderID(ctx context.Context, riderID string) (int64, error) {
	res := r.db.WithContext(ctx).Where("rider_id = ?", riderID).Delete(&Order{})
	return res.RowsAffected, res.Error
}

func (r *orderRepository) DeleteAll(ctx context.Context) (int64, error) {
	res := r.db.WithContext(ctx).Where("1 = 1").Delete(&Order{})
	return res.RowsAffected, res.Error
}
