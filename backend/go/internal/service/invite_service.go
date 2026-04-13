package service

import (
	"context"
	"fmt"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type InviteService struct {
	db     *gorm.DB
	points *PointsService
}

func NewInviteService(db *gorm.DB, points *PointsService) *InviteService {
	return &InviteService{db: db, points: points}
}

func (s *InviteService) GetOrCreateCode(ctx context.Context, userID, phone string) (*repository.InviteCode, error) {
	if userID == "" {
		userID = phone
	}
	if userID == "" {
		return nil, fmt.Errorf("userId or phone is required")
	}

	var existing repository.InviteCode
	if err := s.db.WithContext(ctx).Where("user_id = ?", userID).First(&existing).Error; err == nil {
		return &existing, nil
	}

	now := time.Now()
	code := fallbackInviteCode(now)

	record := repository.InviteCode{
		UserID:    userID,
		Phone:     phone,
		Code:      code,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if s.db != nil {
		uid, tsid, err := idkit.NextIdentityForTable(ctx, s.db, record.TableName(), now)
		if err != nil {
			return nil, fmt.Errorf("allocate invite code identity failed: %w", err)
		}
		record.UID = uid
		record.TSID = tsid
		if built := buildInviteCodeFromUID(uid); built != "" {
			record.Code = built
		}
	}
	if err := s.db.WithContext(ctx).Create(&record).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

func (s *InviteService) RecordShare(ctx context.Context, inviterUserID, inviterPhone, code string) error {
	if inviterUserID == "" {
		inviterUserID = inviterPhone
	}
	if inviterUserID == "" || code == "" {
		return fmt.Errorf("inviter and code required")
	}
	record := repository.InviteRecord{
		InviterUserID: inviterUserID,
		InviterPhone:  inviterPhone,
		InviteCode:    code,
		Status:        "shared",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	return s.db.WithContext(ctx).Create(&record).Error
}

type InviteListParams struct {
	Limit  int
	Offset int
}

func (s *InviteService) ListCodes(ctx context.Context, params InviteListParams) ([]repository.InviteCode, int64, error) {
	var list []repository.InviteCode
	var total int64
	query := s.db.WithContext(ctx).Model(&repository.InviteCode{})
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

func (s *InviteService) ListRecords(ctx context.Context, params InviteListParams) ([]repository.InviteRecord, int64, error) {
	var list []repository.InviteRecord
	var total int64
	query := s.db.WithContext(ctx).Model(&repository.InviteRecord{})
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
