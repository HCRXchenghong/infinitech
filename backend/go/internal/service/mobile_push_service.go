package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MobilePushService struct {
	db                 *gorm.DB
	admin              *AdminService
	dispatchEnabled    bool
	dispatchProvider   PushDispatchProvider
	dispatchBatchSize  int
	dispatchMaxRetries int
	retryBackoff       time.Duration
	pollInterval       time.Duration
}

type MobilePushOptions struct {
	DispatchEnabled bool
	ProviderName    string
	WebhookURL      string
	RequestTimeout  time.Duration
	PollInterval    time.Duration
	BatchSize       int
	MaxRetries      int
	RetryBackoff    time.Duration
}

func NewMobilePushService(db *gorm.DB, cfg *config.Config, admin *AdminService) *MobilePushService {
	options := MobilePushOptions{}
	if cfg != nil {
		options = MobilePushOptions{
			DispatchEnabled: cfg.Push.DispatchEnabled,
			ProviderName:    cfg.Push.DispatchProvider,
			WebhookURL:      cfg.Push.WebhookURL,
			RequestTimeout:  cfg.Push.RequestTimeout,
			PollInterval:    cfg.Push.PollInterval,
			BatchSize:       cfg.Push.BatchSize,
			MaxRetries:      cfg.Push.MaxRetries,
			RetryBackoff:    cfg.Push.RetryBackoff,
		}
	}
	return newMobilePushServiceWithOptions(db, admin, options)
}

func newMobilePushServiceWithOptions(db *gorm.DB, admin *AdminService, options MobilePushOptions) *MobilePushService {
	service := &MobilePushService{
		db:                 db,
		admin:              admin,
		dispatchEnabled:    options.DispatchEnabled,
		dispatchBatchSize:  options.BatchSize,
		dispatchMaxRetries: options.MaxRetries,
		retryBackoff:       options.RetryBackoff,
		pollInterval:       options.PollInterval,
	}
	if service.dispatchBatchSize <= 0 {
		service.dispatchBatchSize = 100
	}
	if service.dispatchMaxRetries < 0 {
		service.dispatchMaxRetries = 0
	}
	if service.retryBackoff <= 0 {
		service.retryBackoff = time.Minute
	}
	if service.pollInterval <= 0 {
		service.pollInterval = 15 * time.Second
	}
	service.dispatchProvider = newPushDispatchProvider(options)
	return service
}

type PushRegistrationInput struct {
	UserID      string `json:"userId"`
	UserType    string `json:"userType"`
	DeviceToken string `json:"deviceToken"`
	AppVersion  string `json:"appVersion"`
	Locale      string `json:"locale"`
	Timezone    string `json:"timezone"`
	AppEnv      string `json:"appEnv"`
}

type PushUnregisterInput struct {
	UserID      string `json:"userId"`
	UserType    string `json:"userType"`
	DeviceToken string `json:"deviceToken"`
}

type PushAckInput struct {
	MessageID string `json:"messageId"`
	Action    string `json:"action"`
	Timestamp string `json:"timestamp"`
}

func (s *MobilePushService) RegisterDevice(ctx context.Context, input PushRegistrationInput) (*repository.PushDevice, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("%w: push service unavailable", ErrUnauthorized)
	}

	deviceToken := strings.TrimSpace(input.DeviceToken)
	if deviceToken == "" {
		return nil, fmt.Errorf("deviceToken is required")
	}

	authType, authID, err := s.resolveAuthIdentity(ctx)
	if err != nil {
		return nil, err
	}

	userType := normalizePushUserType(input.UserType)
	if userType == "" {
		userType = authType
	}
	if userType != authType {
		return nil, fmt.Errorf("%w: userType mismatch", ErrForbidden)
	}

	userID := strings.TrimSpace(input.UserID)
	if userID == "" {
		userID = authID
	}
	if userID != authID {
		return nil, fmt.Errorf("%w: userId mismatch", ErrForbidden)
	}

	appEnv := strings.ToLower(strings.TrimSpace(input.AppEnv))
	if appEnv == "" {
		appEnv = "prod"
	}
	now := time.Now()

	record := repository.PushDevice{
		UserID:           userID,
		UserType:         userType,
		DeviceToken:      deviceToken,
		AppEnv:           appEnv,
		AppVersion:       strings.TrimSpace(input.AppVersion),
		Locale:           strings.TrimSpace(input.Locale),
		Timezone:         strings.TrimSpace(input.Timezone),
		IsActive:         true,
		LastSeenAt:       now,
		LastRegisteredAt: now,
	}

	if err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "device_token"}, {Name: "user_id"}, {Name: "user_type"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"app_env":            record.AppEnv,
				"app_version":        record.AppVersion,
				"locale":             record.Locale,
				"timezone":           record.Timezone,
				"is_active":          true,
				"last_seen_at":       now,
				"last_registered_at": now,
				"updated_at":         now,
			}),
		}).
		Create(&record).Error; err != nil {
		return nil, err
	}

	if err := s.db.WithContext(ctx).
		Where("device_token = ? AND user_id = ? AND user_type = ?", deviceToken, userID, userType).
		First(&record).Error; err != nil {
		return nil, err
	}

	return &record, nil
}

func (s *MobilePushService) UnregisterDevice(ctx context.Context, input PushUnregisterInput) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("%w: push service unavailable", ErrUnauthorized)
	}

	deviceToken := strings.TrimSpace(input.DeviceToken)
	if deviceToken == "" {
		return fmt.Errorf("deviceToken is required")
	}

	authType, authID, err := s.resolveAuthIdentity(ctx)
	if err != nil {
		return err
	}

	userType := normalizePushUserType(input.UserType)
	if userType == "" {
		userType = authType
	}
	if userType != authType {
		return fmt.Errorf("%w: userType mismatch", ErrForbidden)
	}

	userID := strings.TrimSpace(input.UserID)
	if userID == "" {
		userID = authID
	}
	if userID != authID {
		return fmt.Errorf("%w: userId mismatch", ErrForbidden)
	}

	now := time.Now()
	res := s.db.WithContext(ctx).
		Model(&repository.PushDevice{}).
		Where("device_token = ? AND user_id = ? AND user_type = ?", deviceToken, userID, userType).
		Updates(map[string]interface{}{
			"is_active":    false,
			"last_seen_at": now,
			"updated_at":   now,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("%w: device not found", ErrForbidden)
	}
	return nil
}

func (s *MobilePushService) AckDelivery(ctx context.Context, input PushAckInput) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("%w: push service unavailable", ErrUnauthorized)
	}

	messageID := strings.TrimSpace(input.MessageID)
	if messageID == "" {
		return fmt.Errorf("messageId is required")
	}

	action := strings.ToLower(strings.TrimSpace(input.Action))
	if action != "received" && action != "opened" {
		return fmt.Errorf("action must be received or opened")
	}

	authType, authID, err := s.resolveAuthIdentity(ctx)
	if err != nil {
		return err
	}

	ackAt := time.Now()
	if raw := strings.TrimSpace(input.Timestamp); raw != "" {
		if parsed, parseErr := time.Parse(time.RFC3339, raw); parseErr == nil {
			ackAt = parsed
		}
	}

	changes := map[string]interface{}{
		"action":          action,
		"status":          "acknowledged",
		"acknowledged_at": ackAt,
		"updated_at":      time.Now(),
	}

	res := s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Where("message_id = ? AND user_id = ? AND user_type = ?", messageID, authID, authType).
		Updates(changes)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected > 0 {
		return nil
	}

	record := repository.PushDelivery{
		MessageID:         messageID,
		UserID:            authID,
		UserType:          authType,
		Status:            "acknowledged",
		Action:            action,
		AcknowledgedAt:    &ackAt,
		DispatchProvider:  "",
		ProviderMessageID: "",
	}
	return s.db.WithContext(ctx).Create(&record).Error
}

func (s *MobilePushService) resolveAuthIdentity(ctx context.Context) (string, string, error) {
	role := authContextRole(ctx)
	switch role {
	case "user":
		id := strings.TrimSpace(authContextString(ctx, "user_id"))
		if id == "" {
			return "", "", fmt.Errorf("%w: missing user identity", ErrUnauthorized)
		}
		return "customer", id, nil
	case "rider":
		id := strings.TrimSpace(authContextString(ctx, "rider_id"))
		if id == "" {
			return "", "", fmt.Errorf("%w: missing rider identity", ErrUnauthorized)
		}
		return "rider", id, nil
	case "merchant":
		id := strings.TrimSpace(authContextString(ctx, "merchant_id"))
		if id == "" {
			return "", "", fmt.Errorf("%w: missing merchant identity", ErrUnauthorized)
		}
		return "merchant", id, nil
	case "admin":
		id := strings.TrimSpace(authContextString(ctx, "admin_id"))
		if id == "" {
			return "", "", fmt.Errorf("%w: missing admin identity", ErrUnauthorized)
		}
		return "admin", id, nil
	default:
		return "", "", fmt.Errorf("%w: invalid operator role", ErrUnauthorized)
	}
}

func normalizePushUserType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "user", "customer":
		return "customer"
	case "rider":
		return "rider"
	case "merchant":
		return "merchant"
	case "admin":
		return "admin"
	default:
		return ""
	}
}
