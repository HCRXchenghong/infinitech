package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	couponSourceMerchant        = "merchant"
	couponSourceCustomerService = "customer_service"
	couponSource1788            = "port_1788"
	couponConditionThreshold    = "threshold"
	couponConditionNoThreshold  = "no_threshold"
	couponFundingSourcePlatform = "platform"
)

type CouponService interface {
	// 优惠券管理
	CreateCoupon(ctx context.Context, req *CreateCouponRequest) (*CreateCouponResult, error)
	UpdateCoupon(ctx context.Context, id string, req *UpdateCouponRequest) error
	DeleteCoupon(ctx context.Context, id string) error
	GetCouponByID(ctx context.Context, id string) (*repository.Coupon, error)
	ListCoupons(ctx context.Context, query CouponListQuery) ([]*repository.Coupon, int64, error)
	ListCouponIssueLogs(ctx context.Context, couponID string, query CouponIssueLogListQuery) ([]*repository.CouponIssueLog, int64, error)
	GetShopCoupons(ctx context.Context, shopID string) ([]*repository.Coupon, error)
	GetActiveCoupons(ctx context.Context, shopID string) ([]*repository.Coupon, error)

	// 公开领券链接（1788）
	GetCouponByClaimToken(ctx context.Context, token string) (*repository.Coupon, error)
	ClaimCouponByToken(ctx context.Context, token, phone string) error

	// 客服发券
	IssueCouponToPhone(ctx context.Context, couponID string, phone, channel string) error

	// 用户优惠券
	ReceiveCoupon(ctx context.Context, userID string, couponID string) error
	GetUserCoupons(ctx context.Context, userID string, status string) ([]*repository.UserCoupon, error)
	GetAvailableCoupons(ctx context.Context, userID string, shopID string, orderAmount float64) ([]*repository.UserCoupon, error)
	UseCoupon(ctx context.Context, userCouponID uint, orderID string) error
	SyncExpiredCoupons(ctx context.Context) (int64, error)
}

type couponService struct {
	couponRepo    repository.CouponRepository
	walletRepo    repository.WalletRepository
	claimLinkBase string
}

func NewCouponService(couponRepo repository.CouponRepository, walletRepo repository.WalletRepository) CouponService {
	baseURL := resolvePublicLandingBaseURL("COUPON_CLAIM_LINK_BASE_URL")

	if walletRepo == nil && couponRepo != nil && couponRepo.DB() != nil {
		walletRepo = repository.NewWalletRepository(couponRepo.DB())
	}

	return &couponService{
		couponRepo:    couponRepo,
		walletRepo:    walletRepo,
		claimLinkBase: baseURL,
	}
}

type CreateCouponRequest struct {
	ShopID           uint      `json:"shopId"`
	Name             string    `json:"name" binding:"required"`
	Source           string    `json:"source"` // merchant/customer_service/port_1788
	Type             string    `json:"type"`   // fixed/percent
	Amount           float64   `json:"amount"`
	MinAmount        float64   `json:"minAmount"`
	ConditionType    string    `json:"conditionType"` // threshold/no_threshold
	MaxDiscount      *float64  `json:"maxDiscount"`
	BudgetCost       int64     `json:"budgetCost"` // 分
	FundingSource    string    `json:"fundingSource"`
	TotalCount       int       `json:"totalCount"`
	ValidFrom        time.Time `json:"validFrom" binding:"required"`
	ValidUntil       time.Time `json:"validUntil" binding:"required"`
	ClaimLinkEnabled bool      `json:"claimLinkEnabled"`
	Description      string    `json:"description"`
}

type CreateCouponResult struct {
	Coupon   *repository.Coupon `json:"coupon"`
	ClaimURL string             `json:"claimUrl,omitempty"`
}

type UpdateCouponRequest struct {
	Name          *string    `json:"name"`
	Status        *string    `json:"status"`
	TotalCount    *int       `json:"totalCount"`
	MinAmount     *float64   `json:"minAmount"`
	ConditionType *string    `json:"conditionType"`
	BudgetCost    *int64     `json:"budgetCost"`
	FundingSource *string    `json:"fundingSource"`
	ValidFrom     *time.Time `json:"validFrom"`
	ValidUntil    *time.Time `json:"validUntil"`
	Description   *string    `json:"description"`
}

type CouponListQuery struct {
	ShopID  string
	Source  string
	Status  string
	Keyword string
	Page    int
	Limit   int
}

type CouponIssueLogListQuery struct {
	Status  string
	Keyword string
	Page    int
	Limit   int
}

func (s *couponService) CreateCoupon(ctx context.Context, req *CreateCouponRequest) (*CreateCouponResult, error) {
	if req == nil {
		return nil, errors.New("请求不能为空")
	}
	if s.couponRepo == nil {
		return nil, errors.New("优惠券服务未初始化")
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("优惠券名称不能为空")
	}

	source, err := normalizeCouponSource(req.Source, authContextRole(ctx))
	if err != nil {
		return nil, err
	}
	if source == couponSourceMerchant {
		if req.ShopID == 0 {
			return nil, errors.New("商户优惠券必须绑定店铺")
		}
	}
	if err := s.ensureMerchantCanAccessShop(ctx, req.ShopID); err != nil {
		return nil, err
	}

	couponType := strings.ToLower(strings.TrimSpace(req.Type))
	if couponType == "" {
		couponType = "fixed"
	}
	if couponType != "fixed" && couponType != "percent" {
		return nil, errors.New("优惠券类型仅支持 fixed / percent")
	}
	if req.Amount <= 0 {
		return nil, errors.New("优惠金额必须大于0")
	}

	if req.ValidFrom.IsZero() || req.ValidUntil.IsZero() {
		return nil, errors.New("优惠券有效期不能为空")
	}
	if req.ValidFrom.After(req.ValidUntil) {
		return nil, errors.New("有效期开始时间不能晚于结束时间")
	}
	if req.TotalCount < 0 {
		return nil, errors.New("优惠券数量不能小于0")
	}

	minAmount := req.MinAmount
	conditionType := normalizeConditionType(req.ConditionType, minAmount)
	if conditionType == couponConditionNoThreshold {
		minAmount = 0
	}

	fundingSource := normalizeFundingSource(req.FundingSource)
	budgetCost, err := resolveCreateBudgetCost(couponType, req.Amount, req.MaxDiscount, req.BudgetCost, fundingSource)
	if err != nil {
		return nil, err
	}

	claimEnabled := req.ClaimLinkEnabled || source == couponSource1788
	claimToken := ""
	claimTokenRef := ""
	claimURL := ""
	if claimEnabled {
		token, tokenErr := generateCouponClaimToken(18)
		if tokenErr != nil {
			return nil, fmt.Errorf("生成领券链接失败: %w", tokenErr)
		}
		claimToken = token
		claimTokenRef = token
		if len(claimTokenRef) > 8 {
			claimTokenRef = claimTokenRef[:8]
		}
		claimURL = s.buildClaimURL(token)
	}

	coupon := &repository.Coupon{
		ShopID:        req.ShopID,
		Name:          name,
		Source:        source,
		Type:          couponType,
		Amount:        req.Amount,
		MinAmount:     minAmount,
		ConditionType: conditionType,
		MaxDiscount:   req.MaxDiscount,
		FundingSource: fundingSource,
		BudgetCost:    budgetCost,
		ClaimEnabled:  claimEnabled,
		ClaimToken:    claimToken,
		ClaimTokenRef: claimTokenRef,
		TotalCount:    req.TotalCount,
		ValidFrom:     req.ValidFrom,
		ValidUntil:    req.ValidUntil,
		Status:        "active",
		Description:   strings.TrimSpace(req.Description),
	}
	if err := s.couponRepo.CreateCoupon(ctx, coupon); err != nil {
		return nil, err
	}

	coupon.RemainingCount = calcCouponRemainingCount(coupon)
	coupon.ClaimURL = claimURL

	return &CreateCouponResult{
		Coupon:   coupon,
		ClaimURL: claimURL,
	}, nil
}

func (s *couponService) UpdateCoupon(ctx context.Context, id string, req *UpdateCouponRequest) error {
	if req == nil {
		return errors.New("请求不能为空")
	}
	resolvedCouponID, err := resolveEntityID(ctx, s.couponRepo.DB(), "coupons", id)
	if err != nil {
		return err
	}
	if err := s.ensureMerchantCanAccessCoupon(ctx, resolvedCouponID); err != nil {
		return err
	}

	updates := make(map[string]interface{})

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return errors.New("优惠券名称不能为空")
		}
		updates["name"] = name
	}
	if req.Status != nil {
		status := strings.ToLower(strings.TrimSpace(*req.Status))
		switch status {
		case "active", "inactive":
			updates["status"] = status
		default:
			return errors.New("优惠券状态仅支持 active/inactive")
		}
	}
	if req.TotalCount != nil {
		if *req.TotalCount < 0 {
			return errors.New("优惠券数量不能小于0")
		}
		updates["total_count"] = *req.TotalCount
	}
	if req.MinAmount != nil {
		value := *req.MinAmount
		if value < 0 {
			return errors.New("门槛金额不能小于0")
		}
		updates["min_amount"] = value
		if value <= 0 {
			updates["condition_type"] = couponConditionNoThreshold
		} else {
			updates["condition_type"] = couponConditionThreshold
		}
	}
	if req.ConditionType != nil {
		conditionType := normalizeConditionType(*req.ConditionType, 1)
		updates["condition_type"] = conditionType
		if conditionType == couponConditionNoThreshold {
			updates["min_amount"] = 0
		}
	}
	if req.BudgetCost != nil {
		if *req.BudgetCost < 0 {
			return errors.New("预算成本不能小于0")
		}
		updates["budget_cost"] = *req.BudgetCost
	}
	if req.FundingSource != nil {
		updates["funding_source"] = normalizeFundingSource(*req.FundingSource)
	}
	if req.ValidFrom != nil {
		updates["valid_from"] = *req.ValidFrom
	}
	if req.ValidUntil != nil {
		updates["valid_until"] = *req.ValidUntil
	}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}

	if len(updates) == 0 {
		return errors.New("没有需要更新的字段")
	}

	return s.couponRepo.UpdateCoupon(ctx, resolvedCouponID, updates)
}

func (s *couponService) DeleteCoupon(ctx context.Context, id string) error {
	resolvedCouponID, err := resolveEntityID(ctx, s.couponRepo.DB(), "coupons", id)
	if err != nil {
		return err
	}
	if err := s.ensureMerchantCanAccessCoupon(ctx, resolvedCouponID); err != nil {
		return err
	}
	return s.couponRepo.DeleteCoupon(ctx, resolvedCouponID)
}

func (s *couponService) GetCouponByID(ctx context.Context, id string) (*repository.Coupon, error) {
	resolvedCouponID, err := resolveEntityID(ctx, s.couponRepo.DB(), "coupons", id)
	if err != nil {
		return nil, err
	}
	return s.couponRepo.GetCouponByID(ctx, resolvedCouponID)
}

func (s *couponService) ListCoupons(ctx context.Context, query CouponListQuery) ([]*repository.Coupon, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.Limit <= 0 {
		query.Limit = 20
	}
	if query.Limit > 200 {
		query.Limit = 200
	}
	if _, err := s.SyncExpiredCoupons(ctx); err != nil {
		return nil, 0, err
	}

	var shopIDPtr *uint
	if strings.TrimSpace(query.ShopID) != "" {
		resolvedShopID, err := resolveEntityID(ctx, s.couponRepo.DB(), "shops", query.ShopID)
		if err != nil {
			return nil, 0, err
		}
		shopIDPtr = &resolvedShopID
	}

	items, total, err := s.couponRepo.ListCoupons(ctx, repository.CouponListParams{
		ShopID:  shopIDPtr,
		Source:  strings.TrimSpace(query.Source),
		Status:  strings.TrimSpace(query.Status),
		Keyword: strings.TrimSpace(query.Keyword),
		Limit:   query.Limit,
		Offset:  (query.Page - 1) * query.Limit,
	})
	if err != nil {
		return nil, 0, err
	}
	for _, item := range items {
		if item == nil {
			continue
		}
		item.RemainingCount = calcCouponRemainingCount(item)
		if item.ClaimEnabled && strings.TrimSpace(item.ClaimToken) != "" {
			item.ClaimURL = s.buildClaimURL(item.ClaimToken)
		}
	}

	return items, total, nil
}

func (s *couponService) ListCouponIssueLogs(ctx context.Context, couponID string, query CouponIssueLogListQuery) ([]*repository.CouponIssueLog, int64, error) {
	resolvedCouponID, err := resolveEntityID(ctx, s.couponRepo.DB(), "coupons", couponID)
	if err != nil {
		return nil, 0, errors.New("优惠券ID不能为空")
	}
	if err := s.ensureMerchantCanAccessCoupon(ctx, resolvedCouponID); err != nil {
		return nil, 0, err
	}
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.Limit <= 0 {
		query.Limit = 20
	}
	if query.Limit > 200 {
		query.Limit = 200
	}

	return s.couponRepo.ListCouponIssueLogs(ctx, repository.CouponIssueLogListParams{
		CouponID: resolvedCouponID,
		Status:   strings.TrimSpace(query.Status),
		Keyword:  strings.TrimSpace(query.Keyword),
		Limit:    query.Limit,
		Offset:   (query.Page - 1) * query.Limit,
	})
}

func (s *couponService) GetShopCoupons(ctx context.Context, shopID string) ([]*repository.Coupon, error) {
	resolvedShopID, err := resolveEntityID(ctx, s.couponRepo.DB(), "shops", shopID)
	if err != nil {
		return nil, err
	}
	if _, err := s.SyncExpiredCoupons(ctx); err != nil {
		return nil, err
	}
	items, err := s.couponRepo.GetShopCoupons(ctx, resolvedShopID)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		if item == nil {
			continue
		}
		item.RemainingCount = calcCouponRemainingCount(item)
	}
	return items, nil
}

func (s *couponService) GetActiveCoupons(ctx context.Context, shopID string) ([]*repository.Coupon, error) {
	resolvedShopID, err := resolveEntityID(ctx, s.couponRepo.DB(), "shops", shopID)
	if err != nil {
		return nil, err
	}
	if _, err := s.SyncExpiredCoupons(ctx); err != nil {
		return nil, err
	}
	items, err := s.couponRepo.GetActiveCoupons(ctx, resolvedShopID)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		if item == nil {
			continue
		}
		item.RemainingCount = calcCouponRemainingCount(item)
	}
	return items, nil
}

func (s *couponService) GetCouponByClaimToken(ctx context.Context, token string) (*repository.Coupon, error) {
	if _, err := s.SyncExpiredCoupons(ctx); err != nil {
		return nil, err
	}

	coupon, err := s.couponRepo.GetCouponByClaimToken(ctx, token)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if coupon.Status != "active" {
		return nil, errors.New("优惠券已下架")
	}
	if now.Before(coupon.ValidFrom) || now.After(coupon.ValidUntil) {
		return nil, errors.New("优惠券不在有效期内")
	}
	if coupon.TotalCount > 0 && coupon.ReceivedCount >= coupon.TotalCount {
		return nil, errors.New("优惠券已领完")
	}

	coupon.RemainingCount = calcCouponRemainingCount(coupon)
	coupon.ClaimURL = s.buildClaimURL(token)
	return coupon, nil
}

func (s *couponService) ClaimCouponByToken(ctx context.Context, token, phone string) error {
	phone = strings.TrimSpace(phone)
	if !isValidMainlandPhone(phone) {
		return errors.New("请输入正确的注册手机号")
	}

	coupon, err := s.GetCouponByClaimToken(ctx, token)
	if err != nil {
		return err
	}

	couponID := strings.TrimSpace(coupon.UID)
	if couponID == "" {
		couponID = strconv.FormatUint(uint64(coupon.ID), 10)
	}
	return s.ReceiveCoupon(ctx, phone, couponID)
}

func (s *couponService) IssueCouponToPhone(ctx context.Context, couponID string, phone, channel string) error {
	resolvedCouponID, err := resolveEntityID(ctx, s.couponRepo.DB(), "coupons", couponID)
	if err != nil {
		return err
	}

	phone = strings.TrimSpace(phone)
	channel = normalizeIssueChannel(channel)

	coupon, couponErr := s.couponRepo.GetCouponByID(ctx, resolvedCouponID)
	if couponErr != nil {
		if !isValidMainlandPhone(phone) {
			phone = ""
		}
		s.createIssueAuditLog(ctx, resolvedCouponID, nil, phone, channel, "failed", "优惠券不存在")
		return couponErr
	}

	if !isValidMainlandPhone(phone) {
		phoneErr := errors.New("请输入正确的注册手机号")
		s.createIssueAuditLog(ctx, resolvedCouponID, coupon, phone, channel, "failed", phoneErr.Error())
		return phoneErr
	}

	if err := s.ReceiveCoupon(ctx, phone, couponID); err != nil {
		s.createIssueAuditLog(ctx, resolvedCouponID, coupon, phone, channel, "failed", err.Error())
		return err
	}

	s.createIssueAuditLog(ctx, resolvedCouponID, coupon, phone, channel, "success", "")
	return nil
}

func (s *couponService) ReceiveCoupon(ctx context.Context, userID string, couponID string) error {
	resolvedCouponID, err := resolveEntityID(ctx, s.couponRepo.DB(), "coupons", couponID)
	if err != nil {
		return err
	}
	if _, err := s.SyncExpiredCoupons(ctx); err != nil {
		return err
	}

	resolvedUserID, err := s.resolveCustomerWalletUserID(ctx, userID)
	if err != nil {
		return err
	}

	available, err := s.couponRepo.CheckCouponAvailability(ctx, resolvedUserID, resolvedCouponID)
	if err != nil {
		return err
	}
	if !available {
		return errors.New("优惠券已领取或库存不足")
	}

	return s.couponRepo.ReceiveCoupon(ctx, resolvedUserID, resolvedCouponID)
}

func (s *couponService) GetUserCoupons(ctx context.Context, userID string, status string) ([]*repository.UserCoupon, error) {
	resolvedUserID, err := s.resolveCustomerWalletUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if _, err := s.SyncExpiredCoupons(ctx); err != nil {
		return nil, err
	}
	return s.couponRepo.GetUserCoupons(ctx, resolvedUserID, strings.TrimSpace(status))
}

func (s *couponService) GetAvailableCoupons(ctx context.Context, userID string, shopID string, orderAmount float64) ([]*repository.UserCoupon, error) {
	resolvedShopID, err := resolveEntityID(ctx, s.couponRepo.DB(), "shops", shopID)
	if err != nil {
		return nil, err
	}
	resolvedUserID, err := s.resolveCustomerWalletUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if _, err := s.SyncExpiredCoupons(ctx); err != nil {
		return nil, err
	}
	return s.couponRepo.GetAvailableCoupons(ctx, resolvedUserID, resolvedShopID, orderAmount)
}

func (s *couponService) UseCoupon(ctx context.Context, userCouponID uint, orderID string) error {
	return s.couponRepo.UseCoupon(ctx, userCouponID, orderID)
}

func (s *couponService) SyncExpiredCoupons(ctx context.Context) (int64, error) {
	if s.couponRepo == nil {
		return 0, nil
	}
	return s.couponRepo.ExpireCouponsAndRefund(ctx)
}

func (s *couponService) resolveCustomerWalletUserID(ctx context.Context, raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		value = strings.TrimSpace(authContextString(ctx, "user_phone"))
		if value == "" {
			value = strings.TrimSpace(authContextString(ctx, "user_id"))
		}
	}
	if value == "" {
		return "", errors.New("用户ID不能为空")
	}

	if s.walletRepo == nil || s.walletRepo.DB() == nil {
		return value, nil
	}

	db := s.walletRepo.DB().WithContext(ctx)

	if isValidMainlandPhone(value) {
		var user repository.User
		if err := db.Where("phone = ?", value).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return "", errors.New("该手机号未注册")
			}
			return "", err
		}
		return strings.TrimSpace(user.Phone), nil
	}

	if numericID, parseErr := strconv.Atoi(value); parseErr == nil && numericID > 0 {
		var user repository.User
		if err := db.Where("id = ? OR role_id = ?", numericID, numericID).First(&user).Error; err == nil {
			phone := strings.TrimSpace(user.Phone)
			if phone == "" {
				return "", errors.New("用户手机号为空，无法领券")
			}
			return phone, nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", err
		}
	}

	var account repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", value, "customer").First(&account).Error; err == nil {
		return value, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}

	return "", errors.New("未找到用户，请输入注册手机号")
}

func (s *couponService) buildClaimURL(token string) string {
	token = strings.TrimSpace(token)
	if token == "" {
		return ""
	}
	base := strings.TrimRight(strings.TrimSpace(s.claimLinkBase), "/")
	if base == "" {
		base = resolvePublicLandingBaseURL("COUPON_CLAIM_LINK_BASE_URL")
	}
	return fmt.Sprintf("%s/coupon/%s", base, token)
}

func (s *couponService) ensureMerchantCanAccessCoupon(ctx context.Context, couponID uint) error {
	if authContextRole(ctx) != "merchant" {
		return nil
	}

	merchantID := authContextInt64(ctx, "merchant_id")
	if merchantID <= 0 {
		return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
	}

	coupon, err := s.couponRepo.GetCouponByID(ctx, couponID)
	if err != nil {
		return err
	}
	if coupon == nil {
		return errors.New("优惠券不存在")
	}

	owned, err := s.couponRepo.MerchantOwnsShop(ctx, coupon.ShopID, merchantID)
	if err != nil {
		return err
	}
	if !owned {
		return fmt.Errorf("%w: merchant cannot operate this coupon", ErrForbidden)
	}
	return nil
}

func (s *couponService) ensureMerchantCanAccessShop(ctx context.Context, shopID uint) error {
	if authContextRole(ctx) != "merchant" {
		return nil
	}

	merchantID := authContextInt64(ctx, "merchant_id")
	if merchantID <= 0 {
		return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
	}
	if shopID == 0 {
		return fmt.Errorf("%w: merchant must specify own shop", ErrForbidden)
	}

	owned, err := s.couponRepo.MerchantOwnsShop(ctx, shopID, merchantID)
	if err != nil {
		return err
	}
	if !owned {
		return fmt.Errorf("%w: merchant cannot operate this shop", ErrForbidden)
	}
	return nil
}

func (s *couponService) createIssueAuditLog(
	ctx context.Context,
	couponID uint,
	coupon *repository.Coupon,
	phone, channel, status, reason string,
) {
	if s.couponRepo == nil {
		return
	}

	issuedByRole, issuedByID, issuedByName := resolveIssueOperator(ctx)
	logRecord := &repository.CouponIssueLog{
		CouponID:      couponID,
		CouponName:    "",
		CouponSource:  "",
		IssueChannel:  normalizeIssueChannel(channel),
		Phone:         strings.TrimSpace(phone),
		Status:        normalizeIssueLogStatus(status),
		FailureReason: strings.TrimSpace(reason),
		IssuedByRole:  issuedByRole,
		IssuedByID:    issuedByID,
		IssuedByName:  issuedByName,
	}
	if coupon != nil {
		logRecord.CouponName = strings.TrimSpace(coupon.Name)
		logRecord.CouponSource = strings.TrimSpace(coupon.Source)
	}

	_ = s.couponRepo.CreateCouponIssueLog(ctx, logRecord)
}

func resolveIssueOperator(ctx context.Context) (role, id, name string) {
	role = strings.ToLower(strings.TrimSpace(authContextRole(ctx)))
	switch role {
	case "admin":
		id = strings.TrimSpace(authContextString(ctx, "admin_id"))
		name = strings.TrimSpace(authContextString(ctx, "admin_name"))
	case "merchant":
		id = strings.TrimSpace(authContextString(ctx, "merchant_id"))
		name = strings.TrimSpace(authContextString(ctx, "merchant_phone"))
	case "user":
		id = strings.TrimSpace(authContextString(ctx, "user_id"))
		name = strings.TrimSpace(authContextString(ctx, "user_phone"))
	default:
		role = "system"
		id = "system"
		name = "system"
	}

	if id == "" {
		id = "unknown"
	}
	if name == "" {
		name = id
	}
	return role, id, name
}

func normalizeIssueChannel(channel string) string {
	value := strings.ToLower(strings.TrimSpace(channel))
	switch value {
	case "support_chat", "monitor_chat", "admin_panel":
		return value
	default:
		return "admin_panel"
	}
}

func normalizeIssueLogStatus(status string) string {
	value := strings.ToLower(strings.TrimSpace(status))
	if value == "success" {
		return "success"
	}
	return "failed"
}

func normalizeCouponSource(source, role string) (string, error) {
	value := strings.ToLower(strings.TrimSpace(source))
	if value == "" {
		if strings.TrimSpace(role) == "merchant" {
			return couponSourceMerchant, nil
		}
		return couponSourceCustomerService, nil
	}
	switch value {
	case couponSourceMerchant, couponSourceCustomerService, couponSource1788:
		return value, nil
	case "platform":
		return couponSourceCustomerService, nil
	default:
		return "", errors.New("优惠券来源不支持")
	}
}

func normalizeConditionType(conditionType string, minAmount float64) string {
	value := strings.ToLower(strings.TrimSpace(conditionType))
	switch value {
	case couponConditionNoThreshold:
		return couponConditionNoThreshold
	case couponConditionThreshold:
		return couponConditionThreshold
	default:
		if minAmount <= 0 {
			return couponConditionNoThreshold
		}
		return couponConditionThreshold
	}
}

func normalizeFundingSource(source string) string {
	value := strings.ToLower(strings.TrimSpace(source))
	if value == "" {
		return couponFundingSourcePlatform
	}
	return value
}

func resolveCreateBudgetCost(couponType string, amount float64, maxDiscount *float64, budgetCost int64, fundingSource string) (int64, error) {
	if normalizeFundingSource(fundingSource) != couponFundingSourcePlatform {
		return 0, nil
	}
	if budgetCost > 0 {
		return budgetCost, nil
	}

	if strings.EqualFold(couponType, "fixed") {
		return int64(math.Round(amount * 100)), nil
	}
	if strings.EqualFold(couponType, "percent") {
		if maxDiscount == nil || *maxDiscount <= 0 {
			return 0, errors.New("百分比券请设置最大优惠金额或预算成本")
		}
		return int64(math.Round(*maxDiscount * 100)), nil
	}
	return 0, nil
}

func calcCouponRemainingCount(coupon *repository.Coupon) int {
	if coupon == nil {
		return 0
	}
	if coupon.TotalCount <= 0 {
		return -1
	}
	remaining := coupon.TotalCount - coupon.ReceivedCount
	if remaining < 0 {
		return 0
	}
	return remaining
}

func isValidMainlandPhone(phone string) bool {
	value := strings.TrimSpace(phone)
	if len(value) != 11 {
		return false
	}
	if value[0] != '1' {
		return false
	}
	for i := 0; i < len(value); i++ {
		if value[i] < '0' || value[i] > '9' {
			return false
		}
	}
	return true
}

func generateCouponClaimToken(byteLength int) (string, error) {
	if byteLength <= 0 {
		byteLength = 18
	}
	raw := make([]byte, byteLength)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}
