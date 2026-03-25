package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type OpNotificationService struct {
	db *gorm.DB
}

func NewOpNotificationService(db *gorm.DB) *OpNotificationService {
	return &OpNotificationService{db: db}
}

type opNotificationTarget struct {
	RecipientType string
	RecipientID   string
}

func (s *OpNotificationService) List(ctx context.Context, page, limit int, unreadOnly bool) (map[string]interface{}, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	role := authContextRole(ctx)
	query := s.db.WithContext(ctx).Model(&repository.OpNotification{})

	switch role {
	case "admin":
		adminID := authContextString(ctx, "admin_id")
		if adminID != "" {
			query = query.Where("recipient_type = ? AND recipient_id IN ?", "admin", []string{"*", adminID})
		} else {
			query = query.Where("recipient_type = ? AND recipient_id = ?", "admin", "*")
		}
	case "merchant":
		merchantID := authContextString(ctx, "merchant_id")
		if merchantID == "" {
			return nil, fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		query = query.Where("recipient_type = ? AND recipient_id = ?", "merchant", merchantID)
	case "user":
		userID := authContextString(ctx, "user_id")
		if userID == "" {
			return nil, fmt.Errorf("%w: user identity is missing", ErrUnauthorized)
		}
		query = query.Where("recipient_type = ? AND recipient_id = ?", "user", userID)
	default:
		return nil, fmt.Errorf("%w: invalid operator role", ErrUnauthorized)
	}

	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var records []repository.OpNotification
	if err := query.
		Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&records).Error; err != nil {
		return nil, err
	}

	list := make([]map[string]interface{}, 0, len(records))
	for i := range records {
		item := records[i]
		publicID := interface{}(item.ID)
		if uid := strings.TrimSpace(item.UID); uid != "" {
			publicID = uid
		}
		list = append(list, map[string]interface{}{
			"id":             publicID,
			"recipientType":  item.RecipientType,
			"recipient_type": item.RecipientType,
			"recipientId":    item.RecipientID,
			"recipient_id":   item.RecipientID,
			"eventType":      item.EventType,
			"event_type":     item.EventType,
			"relatedType":    item.RelatedType,
			"related_type":   item.RelatedType,
			"relatedId":      item.RelatedID,
			"related_id":     item.RelatedID,
			"title":          item.Title,
			"content":        item.Content,
			"payload":        item.Payload,
			"isRead":         item.IsRead,
			"is_read":        item.IsRead,
			"readAt":         item.ReadAt,
			"read_at":        item.ReadAt,
			"createdAt":      item.CreatedAt.Format(time.RFC3339),
			"created_at":     item.CreatedAt,
		})
	}

	return map[string]interface{}{
		"list":  list,
		"total": total,
		"page":  page,
		"limit": limit,
	}, nil
}

func (s *OpNotificationService) MarkRead(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "op_notifications", id)
	if err != nil {
		return fmt.Errorf("invalid notification id")
	}
	role := authContextRole(ctx)
	query := s.db.WithContext(ctx).Model(&repository.OpNotification{}).Where("id = ?", resolvedID)

	switch role {
	case "admin":
		adminID := authContextString(ctx, "admin_id")
		if adminID != "" {
			query = query.Where("recipient_type = ? AND recipient_id IN ?", "admin", []string{"*", adminID})
		} else {
			query = query.Where("recipient_type = ? AND recipient_id = ?", "admin", "*")
		}
	case "merchant":
		merchantID := authContextString(ctx, "merchant_id")
		if merchantID == "" {
			return fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		query = query.Where("recipient_type = ? AND recipient_id = ?", "merchant", merchantID)
	case "user":
		userID := authContextString(ctx, "user_id")
		if userID == "" {
			return fmt.Errorf("%w: user identity is missing", ErrUnauthorized)
		}
		query = query.Where("recipient_type = ? AND recipient_id = ?", "user", userID)
	default:
		return fmt.Errorf("%w: invalid operator role", ErrUnauthorized)
	}

	res := query.Updates(map[string]interface{}{
		"is_read": true,
		"read_at": time.Now(),
	})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("%w: notification not found", ErrForbidden)
	}
	return nil
}

func (s *OpNotificationService) NotifyAfterSalesCreated(ctx context.Context, req *repository.AfterSalesRequest) error {
	if req == nil || req.ID == 0 {
		return nil
	}
	title := "新的退款/售后申请"
	content := fmt.Sprintf("售后单 %s 已提交，订单号 %s", req.RequestNo, req.OrderNo)
	payload := map[string]interface{}{
		"afterSalesId": req.ID,
		"requestNo":    req.RequestNo,
		"orderId":      req.OrderID,
		"orderNo":      req.OrderNo,
		"shopId":       req.ShopID,
		"shopName":     req.ShopName,
		"status":       req.Status,
		"bizType":      req.BizType,
	}
	return s.publishAfterSalesEvent(ctx, "AFTER_SALES_CREATED", fmt.Sprintf("after_sales_created_%d", req.ID), title, content, req, payload)
}

func (s *OpNotificationService) NotifyAfterSalesUpdated(ctx context.Context, req *repository.AfterSalesRequest) error {
	if req == nil || req.ID == 0 {
		return nil
	}
	title := "售后状态更新"
	content := fmt.Sprintf("售后单 %s 状态已更新为 %s", req.RequestNo, req.Status)
	payload := map[string]interface{}{
		"afterSalesId": req.ID,
		"requestNo":    req.RequestNo,
		"orderId":      req.OrderID,
		"orderNo":      req.OrderNo,
		"shopId":       req.ShopID,
		"shopName":     req.ShopName,
		"status":       req.Status,
		"bizType":      req.BizType,
	}
	return s.publishAfterSalesEvent(ctx, "AFTER_SALES_UPDATED", fmt.Sprintf("after_sales_updated_%d_%s", req.ID, req.Status), title, content, req, payload)
}

func (s *OpNotificationService) publishAfterSalesEvent(
	ctx context.Context,
	eventType string,
	dedupeKey string,
	title string,
	content string,
	req *repository.AfterSalesRequest,
	payload map[string]interface{},
) error {
	if s == nil || s.db == nil {
		return nil
	}

	targets := make([]opNotificationTarget, 0, 4)
	merchantIDs, err := s.resolveMerchantRecipients(ctx, req.ShopID)
	if err != nil {
		return err
	}
	for _, merchantID := range merchantIDs {
		targets = append(targets, opNotificationTarget{
			RecipientType: "merchant",
			RecipientID:   merchantID,
		})
	}
	targets = append(targets, opNotificationTarget{
		RecipientType: "admin",
		RecipientID:   "*",
	})

	payloadBytes, _ := json.Marshal(payload)

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing repository.EventOutbox
		find := tx.
			Model(&repository.EventOutbox{}).
			Select("id").
			Where("dedupe_key = ?", dedupeKey).
			Limit(1).
			Find(&existing)
		if find.Error != nil {
			return find.Error
		}
		if find.RowsAffected > 0 {
			return nil
		}

		outbox := repository.EventOutbox{
			EventType: eventType,
			DedupeKey: dedupeKey,
			Status:    "pending",
			Payload:   string(payloadBytes),
		}
		if err := tx.Create(&outbox).Error; err != nil {
			return err
		}

		for _, target := range targets {
			record := &repository.OpNotification{
				RecipientType: strings.TrimSpace(target.RecipientType),
				RecipientID:   strings.TrimSpace(target.RecipientID),
				EventType:     eventType,
				RelatedType:   "after_sales",
				RelatedID:     strconv.FormatUint(uint64(req.ID), 10),
				Title:         title,
				Content:       content,
				Payload:       string(payloadBytes),
				IsRead:        false,
			}
			if record.RecipientType == "" || record.RecipientID == "" {
				continue
			}
			if err := tx.Create(record).Error; err != nil {
				return err
			}
		}

		now := time.Now()
		if err := tx.Model(&repository.EventOutbox{}).
			Where("id = ?", outbox.ID).
			Updates(map[string]interface{}{
				"status":       "processed",
				"processed_at": now,
				"updated_at":   now,
			}).Error; err != nil {
			return err
		}

		return nil
	})
}

func (s *OpNotificationService) resolveMerchantRecipients(ctx context.Context, shopID string) ([]string, error) {
	shopID = strings.TrimSpace(shopID)
	if shopID == "" {
		return nil, nil
	}
	var rows []struct {
		MerchantID uint `gorm:"column:merchant_id"`
	}
	if err := s.db.WithContext(ctx).
		Table("shops").
		Select("merchant_id").
		Where("id = ?", shopID).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]string, 0, len(rows))
	seen := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		if row.MerchantID == 0 {
			continue
		}
		idText := strconv.FormatUint(uint64(row.MerchantID), 10)
		if _, ok := seen[idText]; ok {
			continue
		}
		seen[idText] = struct{}{}
		result = append(result, idText)
	}
	return result, nil
}
