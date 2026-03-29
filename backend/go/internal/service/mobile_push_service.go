package service

import (
	"context"
	"fmt"
	"strings"
	"sync"
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
	statusMu           sync.RWMutex
	workerRunning      bool
	lastCycleAt        time.Time
	lastSuccessAt      time.Time
	lastCycleStatus    string
	lastProcessedCount int
	consecutiveFailure int
	lastError          string
}

type MobilePushWorkerStatus struct {
	Enabled                 bool                    `json:"enabled"`
	Running                 bool                    `json:"running"`
	Provider                string                  `json:"provider"`
	WebhookAuthConfigured   bool                    `json:"webhookAuthConfigured"`
	WebhookSignatureEnabled bool                    `json:"webhookSignatureEnabled"`
	PollIntervalSeconds     int                     `json:"pollIntervalSeconds"`
	BatchSize               int                     `json:"batchSize"`
	LastCycleStatus         string                  `json:"lastCycleStatus"`
	LastProcessedCount      int                     `json:"lastProcessedCount"`
	LastCycleAt             string                  `json:"lastCycleAt,omitempty"`
	LastSuccessAt           string                  `json:"lastSuccessAt,omitempty"`
	ConsecutiveFailures     int                     `json:"consecutiveFailures"`
	LastError               string                  `json:"lastError,omitempty"`
	Queue                   MobilePushQueueSnapshot `json:"queue"`
}

type MobilePushQueueSnapshot struct {
	Total                        int64  `json:"total"`
	Queued                       int64  `json:"queued"`
	Pending                      int64  `json:"pending"`
	RetryPending                 int64  `json:"retryPending"`
	Dispatching                  int64  `json:"dispatching"`
	Sent                         int64  `json:"sent"`
	Failed                       int64  `json:"failed"`
	Acknowledged                 int64  `json:"acknowledged"`
	OldestQueuedAt               string `json:"oldestQueuedAt,omitempty"`
	OldestQueuedAgeSeconds       int64  `json:"oldestQueuedAgeSeconds"`
	OldestRetryPendingAt         string `json:"oldestRetryPendingAt,omitempty"`
	OldestRetryPendingAgeSeconds int64  `json:"oldestRetryPendingAgeSeconds"`
	OldestDispatchingAt          string `json:"oldestDispatchingAt,omitempty"`
	OldestDispatchingAgeSeconds  int64  `json:"oldestDispatchingAgeSeconds"`
	LatestSentAt                 string `json:"latestSentAt,omitempty"`
	LatestFailedAt               string `json:"latestFailedAt,omitempty"`
	LatestAcknowledgedAt         string `json:"latestAcknowledgedAt,omitempty"`
}

type MobilePushOptions struct {
	DispatchEnabled   bool
	ProviderName      string
	WebhookURL        string
	WebhookSecret     string
	WebhookAuthHeader string
	WebhookAuthValue  string
	RequestTimeout    time.Duration
	PollInterval      time.Duration
	BatchSize         int
	MaxRetries        int
	RetryBackoff      time.Duration
}

func NewMobilePushService(db *gorm.DB, cfg *config.Config, admin *AdminService) *MobilePushService {
	options := MobilePushOptions{}
	if cfg != nil {
		options = MobilePushOptions{
			DispatchEnabled:   cfg.Push.DispatchEnabled,
			ProviderName:      cfg.Push.DispatchProvider,
			WebhookURL:        cfg.Push.WebhookURL,
			WebhookSecret:     cfg.Push.WebhookSecret,
			WebhookAuthHeader: cfg.Push.WebhookAuthHeader,
			WebhookAuthValue:  cfg.Push.WebhookAuthValue,
			RequestTimeout:    cfg.Push.RequestTimeout,
			PollInterval:      cfg.Push.PollInterval,
			BatchSize:         cfg.Push.BatchSize,
			MaxRetries:        cfg.Push.MaxRetries,
			RetryBackoff:      cfg.Push.RetryBackoff,
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
	if service.dispatchEnabled {
		service.lastCycleStatus = "not_started"
	} else {
		service.lastCycleStatus = "disabled"
	}
	return service
}

func (s *MobilePushService) setWorkerRunning(running bool) {
	if s == nil {
		return
	}
	s.statusMu.Lock()
	s.workerRunning = running
	s.statusMu.Unlock()
}

func (s *MobilePushService) recordDispatchCycle(status string, processed int, err error) {
	if s == nil {
		return
	}
	s.statusMu.Lock()
	defer s.statusMu.Unlock()
	cycleAt := time.Now()
	s.lastCycleAt = cycleAt
	s.lastCycleStatus = strings.TrimSpace(status)
	s.lastProcessedCount = processed
	if err != nil {
		s.consecutiveFailure++
		s.lastError = strings.TrimSpace(err.Error())
	} else {
		if strings.EqualFold(strings.TrimSpace(status), "ok") {
			s.lastSuccessAt = cycleAt
		}
		s.consecutiveFailure = 0
		s.lastError = ""
	}
}

func parsePushAggregateTimeValue(raw interface{}) (time.Time, bool) {
	switch value := raw.(type) {
	case nil:
		return time.Time{}, false
	case time.Time:
		if value.IsZero() {
			return time.Time{}, false
		}
		return value, true
	case *time.Time:
		if value == nil || value.IsZero() {
			return time.Time{}, false
		}
		return *value, true
	case []byte:
		return parsePushAggregateTimeString(string(value))
	case string:
		return parsePushAggregateTimeString(value)
	default:
		return parsePushAggregateTimeString(fmt.Sprint(value))
	}
}

func parsePushAggregateTimeString(raw string) (time.Time, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return time.Time{}, false
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed, true
		}
		if parsed, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func scanPushAggregateTime(query *gorm.DB) (time.Time, bool) {
	if query == nil {
		return time.Time{}, false
	}
	row := query.Row()
	if row == nil {
		return time.Time{}, false
	}
	var raw interface{}
	if err := row.Scan(&raw); err != nil {
		return time.Time{}, false
	}
	return parsePushAggregateTimeValue(raw)
}

func (s *MobilePushService) QueueSnapshot(ctx context.Context) MobilePushQueueSnapshot {
	snapshot := MobilePushQueueSnapshot{}
	if s == nil || s.db == nil {
		return snapshot
	}
	if ctx == nil {
		ctx = context.Background()
	}

	type queueRow struct {
		Status string
		Count  int64
	}

	var rows []queueRow
	if err := s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Select("status, COUNT(*) AS count").
		Group("status").
		Scan(&rows).Error; err != nil {
		return snapshot
	}

	for _, row := range rows {
		count := row.Count
		if count <= 0 {
			continue
		}
		snapshot.Total += count
		switch strings.ToLower(strings.TrimSpace(row.Status)) {
		case "queued":
			snapshot.Queued += count
		case "pending":
			snapshot.Pending += count
		case "retry_pending":
			snapshot.RetryPending += count
		case "dispatching":
			snapshot.Dispatching += count
		case "sent":
			snapshot.Sent += count
		case "failed":
			snapshot.Failed += count
		case "acknowledged":
			snapshot.Acknowledged += count
		}
	}

	now := time.Now()
	if queuedAt, ok := scanPushAggregateTime(s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Select("MIN(created_at)").
		Where("status IN ?", []string{"queued", "pending", "retry_pending"})); ok {
		snapshot.OldestQueuedAt = queuedAt.Format(time.RFC3339)
		ageSeconds := int64(now.Sub(queuedAt) / time.Second)
		if ageSeconds > 0 {
			snapshot.OldestQueuedAgeSeconds = ageSeconds
		}
	}

	if retryPendingAt, ok := scanPushAggregateTime(s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Select("MIN(next_retry_at)").
		Where("status = ? AND next_retry_at IS NOT NULL", "retry_pending")); ok {
		snapshot.OldestRetryPendingAt = retryPendingAt.Format(time.RFC3339)
		ageSeconds := int64(now.Sub(retryPendingAt) / time.Second)
		if ageSeconds > 0 {
			snapshot.OldestRetryPendingAgeSeconds = ageSeconds
		}
	}

	if dispatchingAt, ok := scanPushAggregateTime(s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Select("MIN(updated_at)").
		Where("status = ?", "dispatching")); ok {
		snapshot.OldestDispatchingAt = dispatchingAt.Format(time.RFC3339)
		ageSeconds := int64(now.Sub(dispatchingAt) / time.Second)
		if ageSeconds > 0 {
			snapshot.OldestDispatchingAgeSeconds = ageSeconds
		}
	}

	if latestSentAt, ok := scanPushAggregateTime(s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Select("MAX(sent_at)").
		Where("sent_at IS NOT NULL")); ok {
		snapshot.LatestSentAt = latestSentAt.Format(time.RFC3339)
	}

	if latestFailedAt, ok := scanPushAggregateTime(s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Select("MAX(updated_at)").
		Where("status = ?", "failed")); ok {
		snapshot.LatestFailedAt = latestFailedAt.Format(time.RFC3339)
	}

	if latestAcknowledgedAt, ok := scanPushAggregateTime(s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Select("MAX(acknowledged_at)").
		Where("acknowledged_at IS NOT NULL")); ok {
		snapshot.LatestAcknowledgedAt = latestAcknowledgedAt.Format(time.RFC3339)
	}

	return snapshot
}

func (s *MobilePushService) WorkerStatusSnapshot(ctx context.Context) MobilePushWorkerStatus {
	if s == nil {
		return MobilePushWorkerStatus{
			Enabled:         false,
			Running:         false,
			Provider:        "",
			BatchSize:       0,
			LastCycleStatus: "unavailable",
		}
	}

	s.statusMu.RLock()
	running := s.workerRunning
	lastCycleAt := s.lastCycleAt
	lastSuccessAt := s.lastSuccessAt
	lastCycleStatus := strings.TrimSpace(s.lastCycleStatus)
	lastProcessedCount := s.lastProcessedCount
	consecutiveFailure := s.consecutiveFailure
	lastError := s.lastError
	s.statusMu.RUnlock()

	provider := ""
	if s.dispatchProvider != nil {
		provider = strings.TrimSpace(s.dispatchProvider.Name())
	}
	if lastCycleStatus == "" {
		if s.dispatchEnabled {
			lastCycleStatus = "not_started"
		} else {
			lastCycleStatus = "disabled"
		}
	}

	snapshot := MobilePushWorkerStatus{
		Enabled:                 s.dispatchEnabled,
		Running:                 running,
		Provider:                provider,
		WebhookAuthConfigured:   false,
		WebhookSignatureEnabled: false,
		PollIntervalSeconds:     int(s.pollInterval / time.Second),
		BatchSize:               s.dispatchBatchSize,
		LastCycleStatus:         lastCycleStatus,
		LastProcessedCount:      lastProcessedCount,
		ConsecutiveFailures:     consecutiveFailure,
		LastError:               strings.TrimSpace(lastError),
	}
	if webhookProvider, ok := s.dispatchProvider.(*pushWebhookDispatcher); ok {
		snapshot.WebhookAuthConfigured = strings.TrimSpace(webhookProvider.authHeader) != "" && strings.TrimSpace(webhookProvider.authValue) != ""
		snapshot.WebhookSignatureEnabled = strings.TrimSpace(webhookProvider.secret) != ""
	}
	if !lastCycleAt.IsZero() {
		snapshot.LastCycleAt = lastCycleAt.Format(time.RFC3339)
	}
	if !lastSuccessAt.IsZero() {
		snapshot.LastSuccessAt = lastSuccessAt.Format(time.RFC3339)
	}
	snapshot.Queue = s.QueueSnapshot(ctx)
	return snapshot
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
