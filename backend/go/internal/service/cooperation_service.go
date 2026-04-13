package service

import (
	"context"
	"fmt"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type CooperationService struct {
	db *gorm.DB
}

func NewCooperationService(db *gorm.DB) *CooperationService {
	return &CooperationService{db: db}
}

func (s *CooperationService) Create(ctx context.Context, req *repository.CooperationRequest) error {
	if req.ContactName == "" || req.ContactPhone == "" || req.Description == "" {
		return fmt.Errorf("contact name, phone and description are required")
	}
	if req.Company == "" {
		req.Company = "未填写主题"
	}
	if req.CooperationType == "" {
		req.CooperationType = "cooperation"
	}
	if req.SourceChannel == "" {
		req.SourceChannel = "general"
	}
	req.Status = "pending"
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()
	return s.db.WithContext(ctx).Create(req).Error
}

type CooperationListParams struct {
	Status        string
	SourceChannel string
	Limit         int
	Offset        int
}

func (s *CooperationService) List(ctx context.Context, params CooperationListParams) ([]repository.CooperationRequest, int64, error) {
	var list []repository.CooperationRequest
	var total int64

	query := s.db.WithContext(ctx).Model(&repository.CooperationRequest{})
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.SourceChannel != "" {
		query = query.Where("source_channel = ?", params.SourceChannel)
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

func (s *CooperationService) UpdateStatus(ctx context.Context, id string, status, remark string) error {
	if status == "" {
		return fmt.Errorf("status is required")
	}
	resolvedID, err := resolveEntityID(ctx, s.db, "cooperation_requests", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).
		Model(&repository.CooperationRequest{}).
		Where("id = ?", resolvedID).
		Updates(map[string]interface{}{
			"status":       status,
			"admin_remark": remark,
			"updated_at":   time.Now(),
		}).Error
}
