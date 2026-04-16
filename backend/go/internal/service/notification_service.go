package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm/clause"
)

type NotificationService struct {
	repo     repository.NotificationRepository
	notifier *RealtimeNotificationService
}

func NewNotificationService(repo repository.NotificationRepository, notifier *RealtimeNotificationService) *NotificationService {
	return &NotificationService{
		repo:     repo,
		notifier: notifier,
	}
}

type NotificationListItem struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Summary   string `json:"summary"`
	Cover     string `json:"cover"`
	Source    string `json:"source"`
	CreatedAt string `json:"created_at"`
	IsRead    bool   `json:"is_read"`
}

type NotificationDetail struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title"`
	Content   map[string]interface{} `json:"content"`
	Cover     string                 `json:"cover"`
	Source    string                 `json:"source"`
	Time      string                 `json:"time"`
	CreatedAt string                 `json:"created_at"`
	IsRead    bool                   `json:"is_read"`
}

type NotificationStats struct {
	UnreadCount   int64  `json:"unread_count"`
	LatestAt      string `json:"latest_at,omitempty"`
	LatestTitle   string `json:"latest_title,omitempty"`
	LatestSummary string `json:"latest_summary,omitempty"`
}

func (s *NotificationService) GetNotificationList(ctx context.Context, page, pageSize int) ([]NotificationListItem, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize
	total, err := s.repo.CountPublishedNotifications(ctx)
	if err != nil {
		return nil, 0, err
	}

	notifications, err := s.repo.GetNotificationList(ctx, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	actorType, actorID, err := s.resolveActor(ctx)
	if err != nil {
		return nil, 0, err
	}

	readStatus, err := s.getReadStatusMap(ctx, notifications, actorType, actorID)
	if err != nil {
		return nil, 0, err
	}

	result := make([]NotificationListItem, 0, len(notifications))
	for _, notification := range notifications {
		result = append(result, NotificationListItem{
			ID:        notification.UID,
			Title:     notification.Title,
			Summary:   s.extractSummary(notification.Content),
			Cover:     notification.Cover,
			Source:    notification.Source,
			CreatedAt: notification.CreatedAt.Format("2006-01-02 15:04"),
			IsRead:    readStatus[notification.ID],
		})
	}

	return result, total, nil
}

func (s *NotificationService) GetNotificationStats(ctx context.Context) (*NotificationStats, error) {
	actorType, actorID, err := s.resolveActor(ctx)
	if err != nil {
		return nil, err
	}

	stats := &NotificationStats{}
	db := s.repo.DB().WithContext(ctx)

	if err := db.
		Model(&repository.Notification{}).
		Joins(
			"LEFT JOIN notification_read_records ON notification_read_records.notification_id = notifications.id AND notification_read_records.actor_type = ? AND notification_read_records.actor_id = ?",
			actorType,
			actorID,
		).
		Where("notifications.is_published = ?", true).
		Where("notification_read_records.id IS NULL").
		Count(&stats.UnreadCount).Error; err != nil {
		return nil, err
	}

	var latest repository.Notification
	if err := db.
		Model(&repository.Notification{}).
		Where("is_published = ?", true).
		Order("created_at DESC").
		First(&latest).Error; err == nil {
		stats.LatestAt = latest.CreatedAt.Format("2006-01-02 15:04")
		stats.LatestTitle = latest.Title
		stats.LatestSummary = s.extractSummary(latest.Content)
	}

	return stats, nil
}

func (s *NotificationService) GetNotificationDetail(ctx context.Context, id string) (*NotificationDetail, error) {
	actorType, actorID, err := s.resolveActor(ctx)
	if err != nil {
		return nil, err
	}

	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "notifications", id)
	if err != nil {
		return nil, err
	}

	notification, err := s.repo.GetNotificationByID(ctx, resolvedID)
	if err != nil {
		return nil, err
	}

	isRead, err := s.isNotificationRead(ctx, notification.ID, actorType, actorID)
	if err != nil {
		return nil, err
	}

	var content map[string]interface{}
	if err := json.Unmarshal([]byte(notification.Content), &content); err != nil {
		content = map[string]interface{}{
			"text": notification.Content,
		}
	}

	return &NotificationDetail{
		ID:        notification.UID,
		Title:     notification.Title,
		Content:   content,
		Cover:     notification.Cover,
		Source:    notification.Source,
		Time:      notification.CreatedAt.Format("2006-01-02 15:04"),
		CreatedAt: notification.CreatedAt.Format(time.RFC3339),
		IsRead:    isRead,
	}, nil
}

func (s *NotificationService) MarkNotificationRead(ctx context.Context, id string) error {
	actorType, actorID, err := s.resolveActor(ctx)
	if err != nil {
		return err
	}

	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "notifications", id)
	if err != nil {
		return err
	}

	return s.upsertReadRecords(ctx, actorType, actorID, []uint{resolvedID}, time.Now())
}

func (s *NotificationService) MarkAllRead(ctx context.Context) error {
	actorType, actorID, err := s.resolveActor(ctx)
	if err != nil {
		return err
	}

	var ids []uint
	err = s.repo.DB().WithContext(ctx).
		Model(&repository.Notification{}).
		Joins(
			"LEFT JOIN notification_read_records ON notification_read_records.notification_id = notifications.id AND notification_read_records.actor_type = ? AND notification_read_records.actor_id = ?",
			actorType,
			actorID,
		).
		Where("notifications.is_published = ?", true).
		Where("notification_read_records.id IS NULL").
		Order("notifications.created_at DESC").
		Pluck("notifications.id", &ids).Error
	if err != nil {
		return err
	}

	return s.upsertReadRecords(ctx, actorType, actorID, ids, time.Now())
}

func (s *NotificationService) extractSummary(contentJSON string) string {
	var content map[string]interface{}
	if err := json.Unmarshal([]byte(contentJSON), &content); err != nil {
		if len(contentJSON) > 50 {
			return contentJSON[:50] + "..."
		}
		return contentJSON
	}

	if blocks, ok := content["blocks"].([]interface{}); ok {
		for _, block := range blocks {
			blockMap, ok := block.(map[string]interface{})
			if !ok {
				continue
			}
			blockType, _ := blockMap["type"].(string)
			if blockType != "p" {
				continue
			}
			text, _ := blockMap["text"].(string)
			text = strings.TrimSpace(text)
			if text == "" {
				continue
			}
			if len(text) > 50 {
				return text[:50] + "..."
			}
			return text
		}
	}

	return "查看详情"
}

func (s *NotificationService) GetAllNotifications(ctx context.Context, page, pageSize int) ([]repository.Notification, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize
	total, err := s.repo.CountAllNotifications(ctx)
	if err != nil {
		return nil, 0, err
	}

	records, err := s.repo.GetAllNotifications(ctx, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	return records, total, nil
}

func (s *NotificationService) GetNotificationByIDAdmin(ctx context.Context, id string) (*repository.Notification, error) {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "notifications", id)
	if err != nil {
		return nil, err
	}
	return s.repo.GetNotificationByIDAnyStatus(ctx, resolvedID)
}

func (s *NotificationService) CreateNotification(ctx context.Context, title, content, cover, source string, isPublished bool) (*repository.Notification, error) {
	if source == "" {
		source = "悦享e食"
	}

	notification := &repository.Notification{
		Title:       title,
		Content:     content,
		Cover:       cover,
		Source:      source,
		IsPublished: isPublished,
	}

	if err := s.repo.CreateNotification(ctx, notification); err != nil {
		return nil, err
	}

	if notification.IsPublished {
		s.dispatchPublishedNotification(ctx, notification, "notification.published")
	}

	return notification, nil
}

func (s *NotificationService) UpdateNotification(ctx context.Context, id string, title, content, cover, source string, isPublished *bool) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "notifications", id)
	if err != nil {
		return err
	}

	existing, err := s.repo.GetNotificationByIDAnyStatus(ctx, resolvedID)
	if err != nil {
		return err
	}

	notification := &repository.Notification{
		Title:   title,
		Content: content,
		Cover:   cover,
		Source:  source,
	}

	if isPublished != nil {
		notification.IsPublished = *isPublished
	}

	if err := s.repo.UpdateNotification(ctx, resolvedID, notification); err != nil {
		return err
	}

	updated, err := s.repo.GetNotificationByIDAnyStatus(ctx, resolvedID)
	if err != nil {
		return err
	}

	switch {
	case !existing.IsPublished && updated.IsPublished:
		s.dispatchPublishedNotification(ctx, updated, "notification.published")
	case existing.IsPublished && updated.IsPublished:
		s.dispatchPublishedNotification(ctx, updated, "notification.updated")
	}

	return nil
}

func (s *NotificationService) DeleteNotification(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "notifications", id)
	if err != nil {
		return err
	}
	return s.repo.DeleteNotification(ctx, resolvedID)
}

func (s *NotificationService) dispatchPublishedNotification(ctx context.Context, notification *repository.Notification, eventType string) {
	if s == nil || s.notifier == nil || notification == nil || !notification.IsPublished {
		return
	}

	notificationID := strings.TrimSpace(notification.UID)
	if notificationID == "" {
		notificationID = fmt.Sprintf("%d", notification.ID)
	}

	envelope := RealtimeNotificationEnvelope{
		EventType: eventType,
		Title:     firstNonEmptyText(strings.TrimSpace(notification.Title), "官方通知"),
		Content:   s.extractSummary(notification.Content),
		Route:     "/pages/message/notification-list/index",
		Payload: map[string]interface{}{
			"notificationId": notificationID,
			"source":         firstNonEmptyText(strings.TrimSpace(notification.Source), "悦享e食"),
		},
		RefreshTargets: []string{"notifications"},
	}

	s.notifier.BroadcastPlatformEventBestEffort(ctx, []RealtimeBroadcastRecipient{
		{Role: "user"},
		{Role: "rider"},
		{Role: "merchant"},
		{Role: "admin"},
	}, envelope)
}

func (s *NotificationService) resolveActor(ctx context.Context) (string, string, error) {
	role := authContextRole(ctx)
	var actorID string

	switch role {
	case "admin":
		actorID = authContextString(ctx, "admin_id")
	case "merchant":
		actorID = authContextString(ctx, "merchant_id")
	case "rider":
		actorID = authContextString(ctx, "rider_id")
	case "user":
		actorID = authContextString(ctx, "user_id")
	default:
		return "", "", fmt.Errorf("%w: invalid operator role", ErrUnauthorized)
	}

	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return "", "", fmt.Errorf("%w: missing actor identity", ErrUnauthorized)
	}

	return role, actorID, nil
}

func (s *NotificationService) getReadStatusMap(ctx context.Context, notifications []repository.Notification, actorType, actorID string) (map[uint]bool, error) {
	status := make(map[uint]bool, len(notifications))
	if len(notifications) == 0 {
		return status, nil
	}

	ids := make([]uint, 0, len(notifications))
	for _, notification := range notifications {
		ids = append(ids, notification.ID)
	}

	var records []repository.NotificationReadRecord
	if err := s.repo.DB().WithContext(ctx).
		Model(&repository.NotificationReadRecord{}).
		Where("notification_id IN ?", ids).
		Where("actor_type = ? AND actor_id = ?", actorType, actorID).
		Find(&records).Error; err != nil {
		return nil, err
	}

	for _, record := range records {
		status[record.NotificationID] = true
	}
	return status, nil
}

func (s *NotificationService) isNotificationRead(ctx context.Context, notificationID uint, actorType, actorID string) (bool, error) {
	var count int64
	err := s.repo.DB().WithContext(ctx).
		Model(&repository.NotificationReadRecord{}).
		Where("notification_id = ?", notificationID).
		Where("actor_type = ? AND actor_id = ?", actorType, actorID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *NotificationService) upsertReadRecords(ctx context.Context, actorType, actorID string, notificationIDs []uint, readAt time.Time) error {
	if len(notificationIDs) == 0 {
		return nil
	}

	records := make([]repository.NotificationReadRecord, 0, len(notificationIDs))
	for _, notificationID := range notificationIDs {
		if notificationID == 0 {
			continue
		}
		records = append(records, repository.NotificationReadRecord{
			NotificationID: notificationID,
			ActorType:      actorType,
			ActorID:        actorID,
			ReadAt:         readAt,
		})
	}
	if len(records) == 0 {
		return nil
	}

	return s.repo.DB().WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "notification_id"},
				{Name: "actor_type"},
				{Name: "actor_id"},
			},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"read_at":    readAt,
				"updated_at": readAt,
			}),
		}).
		Create(&records).Error
}
