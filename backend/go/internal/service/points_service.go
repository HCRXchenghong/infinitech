package service

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type PointsService struct {
	db *gorm.DB
}

func NewPointsService(db *gorm.DB) *PointsService {
	return &PointsService{db: db}
}

func (s *PointsService) EnsureDefaultGoods(ctx context.Context) error {
	var count int64
	if err := s.db.WithContext(ctx).Model(&repository.PointsGood{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	defaultGoods := []repository.PointsGood{
		{Name: "拉布布钥匙扣", Points: 500, ShipFee: 5, Tag: "实物", Type: "goods", Desc: "萌趣随身小物", IsActive: true},
		{Name: "抽纸两包", Points: 600, ShipFee: 5, Tag: "实物", Type: "goods", Desc: "日常必备好物", IsActive: true},
		{Name: "薰衣草洗衣液（活力28）", Points: 800, ShipFee: 5, Tag: "实物", Type: "goods", Desc: "清新留香", IsActive: true},
		{Name: "小杯子（随机样式）", Points: 800, ShipFee: 5, Tag: "实物", Type: "goods", Desc: "日常饮水好搭档", IsActive: true},
		{Name: "黄金VIP 1个月", Points: 5000, ShipFee: 0, Tag: "VIP", Type: "vip", Desc: "升级 VIP 体验", IsActive: true},
		{Name: "尊贵VIP 1个月", Points: 8000, ShipFee: 0, Tag: "VIP", Type: "vip", Desc: "尊享专属权益", IsActive: true},
	}
	return s.db.WithContext(ctx).Create(&defaultGoods).Error
}

func (s *PointsService) ListGoods(ctx context.Context, includeInactive bool) ([]repository.PointsGood, error) {
	if err := s.EnsureDefaultGoods(ctx); err != nil {
		return nil, err
	}

	query := s.db.WithContext(ctx).Model(&repository.PointsGood{})
	if !includeInactive {
		query = query.Where("is_active = ?", true)
	}

	var goods []repository.PointsGood
	if err := query.Order("id ASC").Find(&goods).Error; err != nil {
		return nil, err
	}
	return goods, nil
}

func (s *PointsService) CreateGood(ctx context.Context, good *repository.PointsGood) error {
	return s.db.WithContext(ctx).Create(good).Error
}

func (s *PointsService) UpdateGood(ctx context.Context, id string, updates map[string]interface{}) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "points_goods", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Model(&repository.PointsGood{}).Where("id = ?", resolvedID).Updates(updates).Error
}

func (s *PointsService) DeleteGood(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "points_goods", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Delete(&repository.PointsGood{}, resolvedID).Error
}

func (s *PointsService) GetBalance(ctx context.Context, userID string) (int, error) {
	if userID == "" {
		return 0, fmt.Errorf("userId is required")
	}
	now := time.Now()
	var total int64
	if err := s.db.WithContext(ctx).
		Model(&repository.PointsLedger{}).
		Where("user_id = ? AND (expires_at IS NULL OR expires_at > ?)", userID, now).
		Select("COALESCE(SUM(`change`), 0)").
		Scan(&total).Error; err != nil {
		return 0, err
	}
	return int(total), nil
}

func (s *PointsService) EarnPoints(ctx context.Context, userID, orderID string, amount float64, multiplier int) (int, int, error) {
	if userID == "" {
		return 0, 0, fmt.Errorf("userId is required")
	}
	if multiplier <= 0 {
		multiplier = 1
	}
	base := int(math.Floor(amount))
	if base <= 0 {
		balance, err := s.GetBalance(ctx, userID)
		return balance, 0, err
	}

	if orderID != "" {
		var count int64
		if err := s.db.WithContext(ctx).
			Model(&repository.PointsLedger{}).
			Where("user_id = ? AND order_id = ? AND type IN ('earn','bonus')", userID, orderID).
			Count(&count).Error; err == nil && count > 0 {
			balance, err := s.GetBalance(ctx, userID)
			return balance, 0, err
		}
	}

	now := time.Now()
	expire := now.AddDate(0, 3, 0)
	entries := []repository.PointsLedger{
		{
			UserID:    userID,
			OrderID:   orderID,
			Change:    base,
			Type:      "earn",
			ExpiresAt: &expire,
			CreatedAt: now,
		},
	}
	bonus := 0
	if multiplier > 1 {
		bonus = base * (multiplier - 1)
		entries = append(entries, repository.PointsLedger{
			UserID:    userID,
			OrderID:   orderID,
			Change:    bonus,
			Type:      "bonus",
			ExpiresAt: &expire,
			CreatedAt: now,
		})
	}

	if err := s.db.WithContext(ctx).Create(&entries).Error; err != nil {
		return 0, 0, err
	}
	balance, err := s.GetBalance(ctx, userID)
	return balance, base + bonus, err
}

func (s *PointsService) RefundPoints(ctx context.Context, userID, orderID string) (int, int, error) {
	if userID == "" || orderID == "" {
		return 0, 0, fmt.Errorf("userId and orderId are required")
	}
	var sum int64
	if err := s.db.WithContext(ctx).
		Model(&repository.PointsLedger{}).
		Where("user_id = ? AND order_id = ? AND type IN ('earn','bonus')", userID, orderID).
		Select("COALESCE(SUM(`change`), 0)").
		Scan(&sum).Error; err != nil {
		return 0, 0, err
	}
	if sum == 0 {
		balance, err := s.GetBalance(ctx, userID)
		return balance, 0, err
	}

	entry := repository.PointsLedger{
		UserID:    userID,
		OrderID:   orderID,
		Change:    int(-sum),
		Type:      "refund",
		ExpiresAt: nil,
		CreatedAt: time.Now(),
	}
	if err := s.db.WithContext(ctx).Create(&entry).Error; err != nil {
		return 0, 0, err
	}
	balance, err := s.GetBalance(ctx, userID)
	return balance, int(sum), err
}

func (s *PointsService) RedeemPoints(ctx context.Context, userID, phone string, goodID uint) (*repository.PointsRedemption, int, error) {
	if userID == "" {
		return nil, 0, fmt.Errorf("userId is required")
	}
	var good repository.PointsGood
	if err := s.db.WithContext(ctx).First(&good, goodID).Error; err != nil {
		return nil, 0, err
	}
	if !good.IsActive {
		return nil, 0, fmt.Errorf("goods not active")
	}

	balance, err := s.GetBalance(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	if balance < good.Points {
		return nil, balance, fmt.Errorf("points not enough")
	}

	redemption := &repository.PointsRedemption{
		UserID:    userID,
		UserPhone: phone,
		GoodID:    good.ID,
		GoodName:  good.Name,
		Points:    good.Points,
		ShipFee:   good.ShipFee,
		Status:    "pending",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(redemption).Error; err != nil {
			return err
		}
		ledger := repository.PointsLedger{
			UserID:    userID,
			OrderID:   fmt.Sprintf("redeem-%d", redemption.ID),
			Change:    -good.Points,
			Type:      "redeem",
			ExpiresAt: nil,
			CreatedAt: time.Now(),
		}
		return tx.Create(&ledger).Error
	}); err != nil {
		return nil, balance, err
	}

	newBalance, err := s.GetBalance(ctx, userID)
	return redemption, newBalance, err
}

type PointsRedemptionListParams struct {
	Status string
	Limit  int
	Offset int
}

func (s *PointsService) ListRedemptions(ctx context.Context, params PointsRedemptionListParams) ([]repository.PointsRedemption, int64, error) {
	var records []repository.PointsRedemption
	var total int64

	query := s.db.WithContext(ctx).Model(&repository.PointsRedemption{})
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
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

	if err := query.Order("created_at DESC").Find(&records).Error; err != nil {
		return nil, 0, err
	}
	return records, total, nil
}

func (s *PointsService) UpdateRedemptionStatus(ctx context.Context, id string, status string) error {
	if status == "" {
		return fmt.Errorf("status required")
	}
	resolvedID, err := resolveEntityID(ctx, s.db, "points_redemptions", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).
		Model(&repository.PointsRedemption{}).
		Where("id = ?", resolvedID).
		Updates(map[string]interface{}{
			"status":     status,
			"updated_at": time.Now(),
		}).Error
}

func (s *PointsService) GenerateInviteCode(seed string) string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	suffix := "8888"
	if len(seed) >= 4 {
		suffix = seed[len(seed)-4:]
	}
	return fmt.Sprintf("YX%s%02d", suffix, r.Intn(90)+10)
}
