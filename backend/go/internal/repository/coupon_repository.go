package repository

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Coupon 优惠券模型
type Coupon struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ShopID         uint           `gorm:"not null;index" json:"shopId"`
	Name           string         `gorm:"size:100;not null" json:"name"`
	Source         string         `gorm:"size:30;default:'merchant';index" json:"source"` // merchant, customer_service, port_1788
	Type           string         `gorm:"size:20;not null" json:"type"`                   // fixed, percent
	Amount         float64        `gorm:"type:decimal(10,2);not null" json:"amount"`
	MinAmount      float64        `gorm:"type:decimal(10,2);default:0" json:"minAmount"`
	ConditionType  string         `gorm:"size:20;default:'threshold'" json:"conditionType"` // threshold, no_threshold
	MaxDiscount    *float64       `gorm:"type:decimal(10,2)" json:"maxDiscount"`
	FundingSource  string         `gorm:"size:20;default:'platform';index" json:"fundingSource"` // platform
	BudgetCost     int64          `gorm:"default:0" json:"budgetCost"`                           // 单次发券预扣成本（分）
	ClaimEnabled   bool           `gorm:"default:false;index" json:"claimEnabled"`
	ClaimToken     string         `gorm:"size:64;index" json:"-"`
	ClaimTokenRef  string         `gorm:"size:16;index" json:"claimTokenRef"` // 仅展示前缀，避免页面泄露完整 token
	TotalCount     int            `gorm:"default:0" json:"totalCount"`
	ReceivedCount  int            `gorm:"default:0" json:"receivedCount"`
	UsedCount      int            `gorm:"default:0" json:"usedCount"`
	ValidFrom      time.Time      `gorm:"not null;index:idx_valid_time" json:"validFrom"`
	ValidUntil     time.Time      `gorm:"not null;index:idx_valid_time" json:"validUntil"`
	Status         string         `gorm:"size:20;default:'active';index" json:"status"`
	Description    string         `gorm:"type:text" json:"description"`
	ClaimURL       string         `gorm:"-" json:"claimUrl,omitempty"`
	RemainingCount int            `gorm:"-" json:"remainingCount,omitempty"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserCoupon 用户优惠券模型
type UserCoupon struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	UserID     string     `gorm:"size:50;not null;index" json:"userId"`
	CouponID   uint       `gorm:"not null;index" json:"couponId"`
	Status     string     `gorm:"size:20;default:'unused';index" json:"status"` // unused, used, expired
	Source     string     `gorm:"size:30;default:'app'" json:"source"`
	OrderID    *string    `gorm:"size:50;index" json:"orderId"`
	ReceivedAt time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"receivedAt"`
	UsedAt     *time.Time `json:"usedAt"`
	ExpiredAt  *time.Time `json:"expiredAt"`
	// 平台收益联动字段（分）
	BudgetDeductedAmount int64          `gorm:"default:0" json:"budgetDeductedAmount"`
	BudgetDeductedAt     *time.Time     `json:"budgetDeductedAt"`
	BudgetRefundedAmount int64          `gorm:"default:0" json:"budgetRefundedAmount"`
	BudgetRefundedAt     *time.Time     `json:"budgetRefundedAt"`
	CreatedAt            time.Time      `json:"createdAt"`
	UpdatedAt            time.Time      `json:"updatedAt"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
	Coupon               *Coupon        `gorm:"foreignKey:CouponID" json:"coupon,omitempty"`
}

type CouponListParams struct {
	ShopID   *uint
	Source   string
	Status   string
	Keyword  string
	Limit    int
	Offset   int
	WithLink bool
}

type CouponIssueLog struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	CouponID      uint      `gorm:"index;not null" json:"couponId"`
	CouponName    string    `gorm:"size:100" json:"couponName"`
	CouponSource  string    `gorm:"size:30;index" json:"couponSource"`
	IssueChannel  string    `gorm:"size:30;index" json:"issueChannel"` // admin_panel, support_chat, monitor_chat
	Phone         string    `gorm:"size:20;index" json:"phone"`
	Status        string    `gorm:"size:20;index" json:"status"` // success, failed
	FailureReason string    `gorm:"type:text" json:"failureReason"`
	IssuedByRole  string    `gorm:"size:20;index" json:"issuedByRole"`
	IssuedByID    string    `gorm:"size:50;index" json:"issuedById"`
	IssuedByName  string    `gorm:"size:100" json:"issuedByName"`
	CreatedAt     time.Time `json:"createdAt"`
}

type CouponIssueLogListParams struct {
	CouponID uint
	Status   string
	Keyword  string
	Limit    int
	Offset   int
}

// CouponRepository 优惠券仓库接口
type CouponRepository interface {
	// 优惠券管理
	DB() *gorm.DB
	CreateCoupon(ctx context.Context, coupon *Coupon) error
	UpdateCoupon(ctx context.Context, id uint, updates map[string]interface{}) error
	DeleteCoupon(ctx context.Context, id uint) error
	GetCouponByID(ctx context.Context, id uint) (*Coupon, error)
	GetCouponByClaimToken(ctx context.Context, token string) (*Coupon, error)
	MerchantOwnsShop(ctx context.Context, shopID uint, merchantID int64) (bool, error)
	GetShopCoupons(ctx context.Context, shopID uint) ([]*Coupon, error)
	GetActiveCoupons(ctx context.Context, shopID uint) ([]*Coupon, error)
	ListCoupons(ctx context.Context, params CouponListParams) ([]*Coupon, int64, error)
	CreateCouponIssueLog(ctx context.Context, log *CouponIssueLog) error
	ListCouponIssueLogs(ctx context.Context, params CouponIssueLogListParams) ([]*CouponIssueLog, int64, error)

	// 用户优惠券
	ReceiveCoupon(ctx context.Context, userID string, couponID uint) error
	GetUserCoupons(ctx context.Context, userID string, status string) ([]*UserCoupon, error)
	GetAvailableCoupons(ctx context.Context, userID string, shopID uint, orderAmount float64) ([]*UserCoupon, error)
	UseCoupon(ctx context.Context, userCouponID uint, orderID string) error
	CheckCouponAvailability(ctx context.Context, userID string, couponID uint) (bool, error)
	ExpireCouponsAndRefund(ctx context.Context) (int64, error)
}

type couponRepository struct {
	db *gorm.DB
}

const (
	platformWalletUserID   = "platform_revenue"
	platformWalletUserType = "platform"
)

// NewCouponRepository 创建优惠券仓库实例
func NewCouponRepository(db *gorm.DB) CouponRepository {
	return &couponRepository{db: db}
}

func (r *couponRepository) DB() *gorm.DB {
	return r.db
}

// CreateCoupon 创建优惠券
func (r *couponRepository) CreateCoupon(ctx context.Context, coupon *Coupon) error {
	return r.db.WithContext(ctx).Create(coupon).Error
}

// UpdateCoupon 更新优惠券
func (r *couponRepository) UpdateCoupon(ctx context.Context, id uint, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(&Coupon{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteCoupon 删除优惠券
func (r *couponRepository) DeleteCoupon(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&Coupon{}, id).Error
}

// GetCouponByID 根据ID获取优惠券
func (r *couponRepository) GetCouponByID(ctx context.Context, id uint) (*Coupon, error) {
	var coupon Coupon
	err := r.db.WithContext(ctx).First(&coupon, id).Error
	if err != nil {
		return nil, err
	}
	return &coupon, nil
}

// GetCouponByClaimToken 根据领券 token 获取券
func (r *couponRepository) GetCouponByClaimToken(ctx context.Context, token string) (*Coupon, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, gorm.ErrRecordNotFound
	}

	var coupon Coupon
	err := r.db.WithContext(ctx).
		Where("claim_enabled = ? AND claim_token = ?", true, token).
		First(&coupon).Error
	if err != nil {
		return nil, err
	}
	return &coupon, nil
}

// GetShopCoupons 获取店铺所有优惠券
func (r *couponRepository) GetShopCoupons(ctx context.Context, shopID uint) ([]*Coupon, error) {
	var coupons []*Coupon
	err := r.db.WithContext(ctx).
		Where("shop_id = ? OR shop_id = 0", shopID).
		Order("created_at DESC").
		Find(&coupons).Error
	return coupons, err
}

func (r *couponRepository) ListCoupons(ctx context.Context, params CouponListParams) ([]*Coupon, int64, error) {
	var (
		items []*Coupon
		total int64
	)

	query := r.db.WithContext(ctx).Model(&Coupon{})
	if params.ShopID != nil {
		query = query.Where("shop_id = ?", *params.ShopID)
	}
	if src := strings.TrimSpace(params.Source); src != "" {
		query = query.Where("source = ?", src)
	}
	if status := strings.TrimSpace(params.Status); status != "" {
		query = query.Where("status = ?", status)
	}
	if keyword := strings.TrimSpace(params.Keyword); keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("name LIKE ? OR description LIKE ?", like, like)
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

	if err := query.Order("created_at DESC").Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *couponRepository) CreateCouponIssueLog(ctx context.Context, log *CouponIssueLog) error {
	if log == nil {
		return nil
	}
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *couponRepository) ListCouponIssueLogs(ctx context.Context, params CouponIssueLogListParams) ([]*CouponIssueLog, int64, error) {
	var (
		items []*CouponIssueLog
		total int64
	)

	query := r.db.WithContext(ctx).Model(&CouponIssueLog{})
	if params.CouponID > 0 {
		query = query.Where("coupon_id = ?", params.CouponID)
	}
	if status := strings.TrimSpace(params.Status); status != "" {
		query = query.Where("status = ?", status)
	}
	if keyword := strings.TrimSpace(params.Keyword); keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where(
			"phone LIKE ? OR failure_reason LIKE ? OR issued_by_name LIKE ? OR issued_by_id LIKE ?",
			like, like, like, like,
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
	if err := query.Order("created_at DESC").Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// GetActiveCoupons 获取店铺活动中的优惠券
func (r *couponRepository) GetActiveCoupons(ctx context.Context, shopID uint) ([]*Coupon, error) {
	var coupons []*Coupon
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("(shop_id = ? OR shop_id = 0) AND status = ? AND valid_from <= ? AND valid_until >= ?",
			shopID, "active", now, now).
		Where("total_count = 0 OR received_count < total_count").
		Order("created_at DESC").
		Find(&coupons).Error
	return coupons, err
}

// ReceiveCoupon 用户领取优惠券
func (r *couponRepository) ReceiveCoupon(ctx context.Context, userID string, couponID uint) error {
	now := time.Now()
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 检查优惠券是否存在且可领取
		var coupon Coupon
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&coupon, couponID).Error; err != nil {
			return err
		}
		if coupon.Status != "active" {
			return fmt.Errorf("优惠券已下架")
		}
		if now.Before(coupon.ValidFrom) || now.After(coupon.ValidUntil) {
			return fmt.Errorf("优惠券不在有效期内")
		}

		// 检查是否已领取
		var count int64
		tx.Model(&UserCoupon{}).Where("user_id = ? AND coupon_id = ?", userID, couponID).Count(&count)
		if count > 0 {
			return gorm.ErrDuplicatedKey
		}

		// 检查库存
		if coupon.TotalCount > 0 && coupon.ReceivedCount >= coupon.TotalCount {
			return gorm.ErrRecordNotFound
		}

		budgetCost := resolveCouponBudgetCost(&coupon)

		// 创建用户优惠券
		userCoupon := &UserCoupon{
			UserID:     userID,
			CouponID:   couponID,
			Status:     "unused",
			Source:     resolveUserCouponSource(&coupon),
			ReceivedAt: now,
		}
		if err := tx.Create(userCoupon).Error; err != nil {
			return err
		}

		if budgetCost > 0 && shouldUsePlatformBudget(&coupon) {
			idempotencyKey := fmt.Sprintf("coupon_deduct_%d", userCoupon.ID)
			description := fmt.Sprintf("发券预扣（券ID:%d 用户:%s）", coupon.ID, userID)
			if err := applyPlatformBudgetChangeTx(tx, idempotencyKey, "coupon_issue_deduct", fmt.Sprintf("%d", userCoupon.ID), -budgetCost, description); err != nil {
				return err
			}
			if err := tx.Model(&UserCoupon{}).
				Where("id = ?", userCoupon.ID).
				Updates(map[string]interface{}{
					"budget_deducted_amount": budgetCost,
					"budget_deducted_at":     now,
				}).Error; err != nil {
				return err
			}
		}

		// 更新领取数量
		return tx.Model(&Coupon{}).Where("id = ?", couponID).
			UpdateColumn("received_count", gorm.Expr("received_count + 1")).Error
	})
}

// GetUserCoupons 获取用户优惠券列表
func (r *couponRepository) GetUserCoupons(ctx context.Context, userID string, status string) ([]*UserCoupon, error) {
	var userCoupons []*UserCoupon
	query := r.db.WithContext(ctx).Preload("Coupon").Where("user_id = ?", userID)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	err := query.Order("received_at DESC").Find(&userCoupons).Error
	return userCoupons, err
}

// GetAvailableCoupons 获取用户可用优惠券
func (r *couponRepository) GetAvailableCoupons(ctx context.Context, userID string, shopID uint, orderAmount float64) ([]*UserCoupon, error) {
	var userCoupons []*UserCoupon
	now := time.Now()

	err := r.db.WithContext(ctx).
		Preload("Coupon").
		Joins("JOIN coupons ON coupons.id = user_coupons.coupon_id").
		Where("user_coupons.user_id = ?", userID).
		Where("user_coupons.status = ?", "unused").
		Where("(coupons.shop_id = ? OR coupons.shop_id = 0)", shopID).
		Where("coupons.valid_from <= ? AND coupons.valid_until >= ?", now, now).
		Where("coupons.min_amount <= ?", orderAmount).
		Order("coupons.amount DESC").
		Find(&userCoupons).Error

	return userCoupons, err
}

// UseCoupon 使用优惠券
func (r *couponRepository) UseCoupon(ctx context.Context, userCouponID uint, orderID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 更新用户优惠券状态
		now := time.Now()
		if err := tx.Model(&UserCoupon{}).Where("id = ? AND status = ?", userCouponID, "unused").
			Updates(map[string]interface{}{
				"status":   "used",
				"order_id": orderID,
				"used_at":  now,
			}).Error; err != nil {
			return err
		}

		// 获取优惠券ID
		var userCoupon UserCoupon
		if err := tx.First(&userCoupon, userCouponID).Error; err != nil {
			return err
		}

		// 更新优惠券使用数量
		return tx.Model(&Coupon{}).Where("id = ?", userCoupon.CouponID).
			UpdateColumn("used_count", gorm.Expr("used_count + 1")).Error
	})
}

func (r *couponRepository) ExpireCouponsAndRefund(ctx context.Context) (int64, error) {
	return SyncExpiredCouponsAndPlatformBudget(ctx, r.db)
}

// CheckCouponAvailability 检查用户是否可以领取优惠券
func (r *couponRepository) CheckCouponAvailability(ctx context.Context, userID string, couponID uint) (bool, error) {
	// 检查是否已领取
	var count int64
	err := r.db.WithContext(ctx).Model(&UserCoupon{}).
		Where("user_id = ? AND coupon_id = ?", userID, couponID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	if count > 0 {
		return false, nil
	}

	// 检查优惠券库存
	var coupon Coupon
	if err := r.db.WithContext(ctx).First(&coupon, couponID).Error; err != nil {
		return false, err
	}

	if coupon.TotalCount > 0 && coupon.ReceivedCount >= coupon.TotalCount {
		return false, nil
	}

	return true, nil
}

func (r *couponRepository) MerchantOwnsShop(ctx context.Context, shopID uint, merchantID int64) (bool, error) {
	if shopID == 0 || merchantID <= 0 {
		return false, nil
	}
	var total int64
	if err := r.db.WithContext(ctx).
		Model(&Shop{}).
		Where("id = ? AND merchant_id = ?", shopID, merchantID).
		Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}

// SyncExpiredCouponsAndPlatformBudget 标记过期券并将未使用券金额回补到平台收益钱包。
func SyncExpiredCouponsAndPlatformBudget(ctx context.Context, db *gorm.DB) (int64, error) {
	if db == nil {
		return 0, nil
	}

	var totalExpired int64
	const batchSize = 200

	for {
		now := time.Now()
		var candidateIDs []uint
		if err := db.WithContext(ctx).
			Model(&UserCoupon{}).
			Select("user_coupons.id").
			Joins("JOIN coupons ON coupons.id = user_coupons.coupon_id").
			Where("user_coupons.status = ? AND coupons.valid_until < ?", "unused", now).
			Limit(batchSize).
			Pluck("user_coupons.id", &candidateIDs).Error; err != nil {
			return totalExpired, err
		}
		if len(candidateIDs) == 0 {
			break
		}

		if err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			for _, id := range candidateIDs {
				var userCoupon UserCoupon
				if err := tx.
					Clauses(clause.Locking{Strength: "UPDATE"}).
					Preload("Coupon").
					First(&userCoupon, id).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						continue
					}
					return err
				}
				if userCoupon.Status != "unused" {
					continue
				}
				if userCoupon.Coupon == nil {
					continue
				}
				if !time.Now().After(userCoupon.Coupon.ValidUntil) {
					continue
				}

				expiredAt := time.Now()
				updates := map[string]interface{}{
					"status":     "expired",
					"expired_at": expiredAt,
				}

				refundAmount := userCoupon.BudgetDeductedAmount
				if refundAmount > 0 && userCoupon.BudgetRefundedAt == nil && shouldUsePlatformBudget(userCoupon.Coupon) {
					idempotencyKey := fmt.Sprintf("coupon_refund_%d", userCoupon.ID)
					description := fmt.Sprintf("优惠券过期回补（券ID:%d 用户:%s）", userCoupon.CouponID, userCoupon.UserID)
					if err := applyPlatformBudgetChangeTx(tx, idempotencyKey, "coupon_expire_refund", fmt.Sprintf("%d", userCoupon.ID), refundAmount, description); err != nil {
						return err
					}
					updates["budget_refunded_amount"] = refundAmount
					updates["budget_refunded_at"] = expiredAt
				}

				result := tx.Model(&UserCoupon{}).
					Where("id = ? AND status = ?", userCoupon.ID, "unused").
					Updates(updates)
				if result.Error != nil {
					return result.Error
				}
				if result.RowsAffected > 0 {
					totalExpired++
				}
			}
			return nil
		}); err != nil {
			return totalExpired, err
		}

		if len(candidateIDs) < batchSize {
			break
		}
	}

	return totalExpired, nil
}

func resolveCouponBudgetCost(coupon *Coupon) int64 {
	if coupon == nil {
		return 0
	}
	if coupon.BudgetCost > 0 {
		return coupon.BudgetCost
	}
	if strings.EqualFold(strings.TrimSpace(coupon.Type), "fixed") {
		return yuanToFen(coupon.Amount)
	}
	if strings.EqualFold(strings.TrimSpace(coupon.Type), "percent") && coupon.MaxDiscount != nil && *coupon.MaxDiscount > 0 {
		return yuanToFen(*coupon.MaxDiscount)
	}
	return 0
}

func resolveUserCouponSource(coupon *Coupon) string {
	if coupon == nil {
		return "app"
	}
	src := strings.TrimSpace(coupon.Source)
	if src == "" {
		return "app"
	}
	return src
}

func shouldUsePlatformBudget(coupon *Coupon) bool {
	if coupon == nil {
		return true
	}
	source := strings.ToLower(strings.TrimSpace(coupon.FundingSource))
	return source == "" || source == "platform"
}

func yuanToFen(amount float64) int64 {
	return int64(math.Round(amount * 100))
}

func applyPlatformBudgetChangeTx(tx *gorm.DB, idempotencyKey, txType, businessID string, delta int64, description string) error {
	if tx == nil || delta == 0 {
		return nil
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		return fmt.Errorf("idempotency key is required")
	}
	ctx := context.Background()
	if tx.Statement != nil && tx.Statement.Context != nil {
		ctx = tx.Statement.Context
	}

	idempotencyRaw := ""
	if !idkit.UIDPattern.MatchString(idempotencyKey) {
		idempotencyRaw = idempotencyKey
		standard, _, err := idkit.NextUIDWithDB(ctx, tx, "77")
		if err != nil {
			return err
		}
		idempotencyKey = standard
	}

	var existed WalletTransaction
	if err := tx.
		Where("idempotency_key = ? OR idempotency_key_raw = ?", idempotencyKey, idempotencyRaw).
		First(&existed).Error; err == nil {
		return nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	account, err := ensurePlatformWalletAccountTx(tx)
	if err != nil {
		return err
	}

	before := account.Balance
	after := before + delta
	now := time.Now()
	transactionID, _, err := idkit.NextUIDWithDB(ctx, tx, "72")
	if err != nil {
		return err
	}

	if err := tx.Model(&WalletAccount{}).
		Where("id = ?", account.ID).
		Updates(map[string]interface{}{
			"balance":             after,
			"total_balance":       after + account.FrozenBalance,
			"last_transaction_id": transactionID,
			"last_transaction_at": now,
		}).Error; err != nil {
		return err
	}

	amount := delta
	if amount < 0 {
		amount = -amount
	}

	record := &WalletTransaction{
		TransactionID:     transactionID,
		TransactionIDRaw:  "",
		IdempotencyKey:    idempotencyKey,
		IdempotencyKeyRaw: idempotencyRaw,
		UserID:            platformWalletUserID,
		UserType:          platformWalletUserType,
		Type:              txType,
		BusinessType:      "coupon_budget",
		BusinessID:        businessID,
		Amount:            amount,
		BalanceBefore:     before,
		BalanceAfter:      after,
		PaymentMethod:     "system",
		Status:            "success",
		Description:       description,
		CompletedAt:       &now,
	}
	if err := tx.Create(record).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil
		}
		return err
	}
	return nil
}

func ensurePlatformWalletAccountTx(tx *gorm.DB) (*WalletAccount, error) {
	var account WalletAccount
	err := tx.
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ? AND user_type = ?", platformWalletUserID, platformWalletUserType).
		First(&account).Error
	if err == nil {
		return &account, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	account = WalletAccount{
		UserID:   platformWalletUserID,
		UserType: platformWalletUserType,
		Status:   "active",
	}
	if err := tx.Create(&account).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			var retry WalletAccount
			if retryErr := tx.
				Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("user_id = ? AND user_type = ?", platformWalletUserID, platformWalletUserType).
				First(&retry).Error; retryErr == nil {
				return &retry, nil
			}
		}
		return nil, err
	}
	return &account, nil
}
