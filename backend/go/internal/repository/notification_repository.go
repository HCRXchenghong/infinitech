package repository

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Notification 通知模型
type Notification struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Title       string         `gorm:"type:varchar(255);not null" json:"title"`
	Content     string         `gorm:"type:text;not null" json:"content"` // JSON 格式存储富文本内容
	Cover       string         `gorm:"type:varchar(500)" json:"cover"`    // 封面图 URL
	Source      string         `gorm:"type:varchar(100);default:'悦享e食'" json:"source"`
	IsPublished bool           `gorm:"default:false" json:"is_published"` // 是否发布
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Notification) TableName() string {
	return "notifications"
}

type NotificationReadRecord struct {
	ID             uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	NotificationID uint      `gorm:"not null;index;uniqueIndex:uk_notification_reader,priority:1" json:"notification_id"`
	ActorType      string    `gorm:"size:20;not null;uniqueIndex:uk_notification_reader,priority:2" json:"actor_type"`
	ActorID        string    `gorm:"size:64;not null;uniqueIndex:uk_notification_reader,priority:3" json:"actor_id"`
	ReadAt         time.Time `gorm:"not null" json:"read_at"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (NotificationReadRecord) TableName() string {
	return "notification_read_records"
}

type NotificationRepository interface {
	DB() *gorm.DB
	// GetNotificationList 获取通知列表（只返回已发布的）
	GetNotificationList(ctx context.Context, limit, offset int) ([]Notification, error)
	CountPublishedNotifications(ctx context.Context) (int64, error)
	// GetNotificationByID 根据 ID 获取通知详情
	GetNotificationByID(ctx context.Context, id uint) (*Notification, error)
	// GetNotificationByIDAnyStatus 根据 ID 获取通知详情（包含未发布）
	GetNotificationByIDAnyStatus(ctx context.Context, id uint) (*Notification, error)
	// CreateNotification 创建通知（管理后台使用）
	CreateNotification(ctx context.Context, notification *Notification) error
	// UpdateNotification 更新通知（管理后台使用）
	UpdateNotification(ctx context.Context, id uint, notification *Notification) error
	// DeleteNotification 删除通知（管理后台使用）
	DeleteNotification(ctx context.Context, id uint) error
	// GetAllNotifications 获取所有通知（管理后台使用，包括未发布的）
	GetAllNotifications(ctx context.Context, limit, offset int) ([]Notification, error)
	CountAllNotifications(ctx context.Context) (int64, error)
}

type notificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) DB() *gorm.DB {
	return r.db
}

func (r *notificationRepository) GetNotificationList(ctx context.Context, limit, offset int) ([]Notification, error) {
	var notifications []Notification
	err := r.db.WithContext(ctx).
		Where("is_published = ?", true).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error
	return notifications, err
}

func (r *notificationRepository) CountPublishedNotifications(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).
		Model(&Notification{}).
		Where("is_published = ?", true).
		Count(&total).Error
	return total, err
}

func (r *notificationRepository) GetNotificationByID(ctx context.Context, id uint) (*Notification, error) {
	var notification Notification
	err := r.db.WithContext(ctx).
		Where("id = ? AND is_published = ?", id, true).
		First(&notification).Error
	if err != nil {
		return nil, err
	}
	return &notification, nil
}

func (r *notificationRepository) GetNotificationByIDAnyStatus(ctx context.Context, id uint) (*Notification, error) {
	var notification Notification
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&notification).Error
	if err != nil {
		return nil, err
	}
	return &notification, nil
}

func (r *notificationRepository) CreateNotification(ctx context.Context, notification *Notification) error {
	return r.db.WithContext(ctx).Create(notification).Error
}

func (r *notificationRepository) UpdateNotification(ctx context.Context, id uint, notification *Notification) error {
	return r.db.WithContext(ctx).
		Model(&Notification{}).
		Where("id = ?", id).
		Updates(notification).Error
}

func (r *notificationRepository) DeleteNotification(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&Notification{}).Error
}

func (r *notificationRepository) GetAllNotifications(ctx context.Context, limit, offset int) ([]Notification, error) {
	var notifications []Notification
	err := r.db.WithContext(ctx).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error
	return notifications, err
}

func (r *notificationRepository) CountAllNotifications(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).
		Model(&Notification{}).
		Count(&total).Error
	return total, err
}
