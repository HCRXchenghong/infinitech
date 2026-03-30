package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type RTCCallAuditService struct {
	db                *gorm.DB
	retentionWindow   time.Duration
	cleanupEnabled    bool
	cleanupInterval   time.Duration
	cleanupBatchSize  int
	cleanupMu         sync.RWMutex
	cleanupRunning    bool
	lastCleanupAt     time.Time
	lastCleanupCount  int
	lastCleanupStatus string
	lastCleanupError  string
}

type RTCCallAuditUpsertInput struct {
	CallID             string      `json:"callId"`
	CallType           string      `json:"callType"`
	CalleeRole         string      `json:"calleeRole"`
	CalleeID           string      `json:"calleeId"`
	CalleePhone        string      `json:"calleePhone"`
	ConversationID     string      `json:"conversationId"`
	OrderID            string      `json:"orderId"`
	EntryPoint         string      `json:"entryPoint"`
	Scene              string      `json:"scene"`
	ClientPlatform     string      `json:"clientPlatform"`
	ClientKind         string      `json:"clientKind"`
	Status             string      `json:"status"`
	FailureReason      string      `json:"failureReason"`
	ComplaintStatus    string      `json:"complaintStatus"`
	RecordingRetention string      `json:"recordingRetention"`
	StartedAt          *time.Time  `json:"startedAt"`
	AnsweredAt         *time.Time  `json:"answeredAt"`
	EndedAt            *time.Time  `json:"endedAt"`
	DurationSeconds    int         `json:"durationSeconds"`
	Metadata           interface{} `json:"metadata"`
}

type RTCCallAuditAdminQuery struct {
	CallerRole      string
	CalleeRole      string
	Status          string
	CallType        string
	ClientPlatform  string
	ClientKind      string
	ComplaintStatus string
	Keyword         string
	Page            int
	Limit           int
}

type RTCCallAuditAdminSummary struct {
	Total      int64 `json:"total"`
	Accepted   int64 `json:"accepted"`
	Ended      int64 `json:"ended"`
	Failed     int64 `json:"failed"`
	Complaints int64 `json:"complaints"`
}

type RTCCallAuditAdminPagination struct {
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Total int64 `json:"total"`
}

type RTCCallAuditHistoryQuery struct {
	Status   string
	CallType string
	Page     int
	Limit    int
}

type RTCCallAuditHistoryResult struct {
	Items      []repository.RTCCallAudit   `json:"items"`
	Pagination RTCCallAuditAdminPagination `json:"pagination"`
}

type RTCCallAuditAdminListResult struct {
	Items      []repository.RTCCallAudit   `json:"items"`
	Summary    RTCCallAuditAdminSummary    `json:"summary"`
	Pagination RTCCallAuditAdminPagination `json:"pagination"`
}

type RTCCallAuditAdminReviewInput struct {
	ComplaintStatus    string `json:"complaintStatus"`
	RecordingRetention string `json:"recordingRetention"`
}

type RTCCallRetentionCleanupStatus struct {
	Enabled                bool      `json:"enabled"`
	Running                bool      `json:"running"`
	RetentionHours         int64     `json:"retentionHours"`
	CleanupIntervalSeconds int64     `json:"cleanupIntervalSeconds"`
	LastCleanupAt          string    `json:"lastCleanupAt"`
	LastCleanupCount       int       `json:"lastCleanupCount"`
	LastCleanupStatus      string    `json:"lastCleanupStatus"`
	LastCleanupError       string    `json:"lastCleanupError"`
	LastCleanupAtTime      time.Time `json:"-"`
}

func NewRTCCallAuditService(db *gorm.DB, cfg *config.Config) *RTCCallAuditService {
	retentionWindow := 24 * time.Hour
	cleanupEnabled := true
	cleanupInterval := 5 * time.Minute
	cleanupBatchSize := 200

	if cfg != nil {
		if cfg.RTC.RecordingRetention > 0 {
			retentionWindow = cfg.RTC.RecordingRetention
		}
		cleanupEnabled = cfg.RTC.RetentionCleanupEnabled
		if cfg.RTC.RetentionCleanupEvery > 0 {
			cleanupInterval = cfg.RTC.RetentionCleanupEvery
		}
		if cfg.RTC.RetentionCleanupBatch > 0 {
			cleanupBatchSize = cfg.RTC.RetentionCleanupBatch
		}
	}

	return &RTCCallAuditService{
		db:               db,
		retentionWindow:  retentionWindow,
		cleanupEnabled:   cleanupEnabled,
		cleanupInterval:  cleanupInterval,
		cleanupBatchSize: cleanupBatchSize,
	}
}

func (s *RTCCallAuditService) RetentionCleanupStatusSnapshot() RTCCallRetentionCleanupStatus {
	if s == nil {
		return RTCCallRetentionCleanupStatus{}
	}

	s.cleanupMu.RLock()
	defer s.cleanupMu.RUnlock()

	snapshot := RTCCallRetentionCleanupStatus{
		Enabled:                s.cleanupEnabled,
		Running:                s.cleanupRunning,
		RetentionHours:         int64(s.retentionWindow / time.Hour),
		CleanupIntervalSeconds: int64(s.cleanupInterval / time.Second),
		LastCleanupCount:       s.lastCleanupCount,
		LastCleanupStatus:      s.lastCleanupStatus,
		LastCleanupError:       s.lastCleanupError,
		LastCleanupAtTime:      s.lastCleanupAt,
	}
	if !s.lastCleanupAt.IsZero() {
		snapshot.LastCleanupAt = s.lastCleanupAt.Format(time.RFC3339)
	}
	return snapshot
}

func (s *RTCCallAuditService) StartRetentionCleanupWorker(ctx context.Context) {
	if s == nil || s.db == nil {
		return
	}
	if !s.cleanupEnabled {
		s.setCleanupRunning(false)
		s.recordCleanupCycle("disabled", 0, nil)
		log.Println("[rtc-retention] cleanup worker disabled")
		return
	}

	s.setCleanupRunning(true)
	cleared, err := s.RunRetentionCleanupCycle(ctx, s.cleanupBatchSize)
	s.recordCleanupCycle(statusForCleanupErr(err), cleared, err)
	if err != nil {
		log.Printf("[rtc-retention] initial cleanup cycle failed: %v", err)
	}

	ticker := time.NewTicker(s.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.setCleanupRunning(false)
			s.recordCleanupCycle("stopped", 0, nil)
			log.Println("[rtc-retention] cleanup worker stopped")
			return
		case <-ticker.C:
			cleared, err := s.RunRetentionCleanupCycle(ctx, s.cleanupBatchSize)
			s.recordCleanupCycle(statusForCleanupErr(err), cleared, err)
			if err != nil {
				log.Printf("[rtc-retention] cleanup cycle failed: %v", err)
			}
		}
	}
}

func (s *RTCCallAuditService) RunRetentionCleanupCycle(ctx context.Context, limit int) (int, error) {
	if s == nil || s.db == nil || !s.cleanupEnabled {
		return 0, nil
	}
	if limit <= 0 {
		limit = s.cleanupBatchSize
	}
	if limit <= 0 {
		limit = 200
	}

	cutoff := time.Now().Add(-s.retentionWindow)
	var ids []uint
	if err := s.db.WithContext(ctx).
		Model(&repository.RTCCallAudit{}).
		Select("id").
		Where("recording_retention = ?", "standard").
		Where("complaint_status IN ?", []string{"none", "resolved"}).
		Where("ended_at IS NOT NULL AND ended_at <= ?", cutoff).
		Where("status IN ?", []string{"ended", "rejected", "busy", "cancelled", "failed", "timeout"}).
		Order("ended_at ASC, id ASC").
		Limit(limit).
		Pluck("id", &ids).Error; err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, nil
	}

	updates := map[string]interface{}{
		"recording_retention": "cleared",
		"updated_at":          time.Now(),
	}
	result := s.db.WithContext(ctx).
		Model(&repository.RTCCallAudit{}).
		Where("id IN ?", ids).
		Updates(updates)
	if result.Error != nil {
		return 0, result.Error
	}
	return int(result.RowsAffected), nil
}

func (s *RTCCallAuditService) RunRetentionCleanupCycleNow(ctx context.Context, limit int) (int, error) {
	cleared, err := s.RunRetentionCleanupCycle(ctx, limit)
	s.recordCleanupCycle(statusForCleanupErr(err), cleared, err)
	return cleared, err
}

func (s *RTCCallAuditService) setCleanupRunning(running bool) {
	if s == nil {
		return
	}
	s.cleanupMu.Lock()
	defer s.cleanupMu.Unlock()
	s.cleanupRunning = running
}

func (s *RTCCallAuditService) recordCleanupCycle(status string, count int, err error) {
	if s == nil {
		return
	}
	s.cleanupMu.Lock()
	defer s.cleanupMu.Unlock()
	s.lastCleanupAt = time.Now()
	s.lastCleanupCount = count
	s.lastCleanupStatus = strings.TrimSpace(status)
	if err != nil {
		s.lastCleanupError = strings.TrimSpace(err.Error())
	} else {
		s.lastCleanupError = ""
	}
}

func statusForCleanupErr(err error) string {
	if err != nil {
		return "error"
	}
	return "ok"
}

func (s *RTCCallAuditService) UpsertCall(ctx context.Context, input RTCCallAuditUpsertInput) (*repository.RTCCallAudit, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("rtc call audit service unavailable")
	}

	callerRole, callerID, callerPhone, err := resolveContactAuditActor(ctx)
	if err != nil {
		return nil, err
	}

	calleeRole := normalizeContactAuditRole(input.CalleeRole)
	if calleeRole == "" {
		return nil, fmt.Errorf("calleeRole is required")
	}

	callType := normalizeRTCCallType(input.CallType)
	status := normalizeRTCCallStatus(input.Status)
	complaintStatus := normalizeRTCCallComplaintStatus(input.ComplaintStatus)
	recordingRetention := normalizeRTCCallRecordingRetention(input.RecordingRetention)
	metadata, err := stringifyContactAuditMetadata(input.Metadata)
	if err != nil {
		return nil, err
	}

	uid, rawCallID, err := normalizeUnifiedRefID(ctx, s.db, bucketRTCCallAudit, input.CallID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	record := &repository.RTCCallAudit{}
	findQuery := s.db.WithContext(ctx).Where("uid = ?", uid)
	if rawCallID != "" {
		findQuery = findQuery.Or("call_id_raw = ?", rawCallID)
	}
	findErr := findQuery.First(record).Error
	if findErr != nil && findErr != gorm.ErrRecordNotFound {
		return nil, findErr
	}

	if findErr == nil {
		if err := ensureRTCCallAuditActor(record, callerRole, callerID); err != nil {
			return nil, err
		}
	} else {
		record.UID = uid
		record.CallIDRaw = rawCallID
		record.CallType = callType
		record.CallerRole = callerRole
		record.CallerID = truncateString(callerID, 32)
		record.CallerPhone = truncateString(callerPhone, 20)
	}

	record.CallType = callType
	record.CalleeRole = calleeRole
	record.CalleeID = truncateString(strings.TrimSpace(input.CalleeID), 32)
	record.CalleePhone = truncateString(normalizeContactPhone(input.CalleePhone), 20)
	record.ConversationID = truncateString(strings.TrimSpace(input.ConversationID), 64)
	record.OrderID = truncateString(strings.TrimSpace(input.OrderID), 32)
	record.EntryPoint = truncateString(strings.TrimSpace(input.EntryPoint), 64)
	record.Scene = truncateString(strings.TrimSpace(input.Scene), 64)
	record.ClientPlatform = truncateString(strings.TrimSpace(input.ClientPlatform), 32)
	record.ClientKind = truncateString(strings.TrimSpace(input.ClientKind), 20)
	record.Status = status
	record.FailureReason = truncateString(strings.TrimSpace(input.FailureReason), 128)
	record.ComplaintStatus = complaintStatus
	record.RecordingRetention = recordingRetention
	record.Metadata = metadata
	record.StartedAt = normalizeRTCCallStartedAt(record.StartedAt, input.StartedAt, status, now)
	record.AnsweredAt = normalizeRTCCallAnsweredAt(record.AnsweredAt, input.AnsweredAt, status, now)
	record.EndedAt = normalizeRTCCallEndedAt(record.EndedAt, input.EndedAt, status, now)
	record.DurationSeconds = normalizeRTCCallDuration(record.AnsweredAt, record.EndedAt, input.DurationSeconds)

	if findErr == gorm.ErrRecordNotFound {
		if err := s.db.WithContext(ctx).Create(record).Error; err != nil {
			return nil, err
		}
		return record, nil
	}

	if err := s.db.WithContext(ctx).Save(record).Error; err != nil {
		return nil, err
	}
	return record, nil
}

func (s *RTCCallAuditService) ListForAdmin(ctx context.Context, query RTCCallAuditAdminQuery) (*RTCCallAuditAdminListResult, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("rtc call audit service unavailable")
	}

	page, limit := normalizePhoneContactAuditPagination(query.Page, query.Limit)
	total := int64(0)
	baseQuery := s.buildAdminListQuery(ctx, query)
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	items := make([]repository.RTCCallAudit, 0, limit)
	if err := s.buildAdminListQuery(ctx, query).
		Order("created_at DESC, id DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&items).Error; err != nil {
		return nil, err
	}

	summary := RTCCallAuditAdminSummary{Total: total}
	grouped := make([]struct {
		Status string
		Count  int64
	}, 0, 6)
	if err := s.buildAdminListQuery(ctx, query).
		Select("status, COUNT(*) AS count").
		Group("status").
		Scan(&grouped).Error; err != nil {
		return nil, err
	}
	for _, item := range grouped {
		switch normalizeRTCCallStatus(item.Status) {
		case "accepted":
			summary.Accepted = item.Count
		case "ended":
			summary.Ended = item.Count
		case "failed", "rejected", "busy", "timeout", "cancelled":
			summary.Failed += item.Count
		}
	}

	var complaints int64
	if err := s.buildAdminListQuery(ctx, query).
		Where("complaint_status = ?", "reported").
		Count(&complaints).Error; err != nil {
		return nil, err
	}
	summary.Complaints = complaints

	return &RTCCallAuditAdminListResult{
		Items:   items,
		Summary: summary,
		Pagination: RTCCallAuditAdminPagination{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	}, nil
}

func (s *RTCCallAuditService) GetCall(ctx context.Context, callID string) (*repository.RTCCallAudit, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("rtc call audit service unavailable")
	}

	actorRole, actorID, _, err := resolveContactAuditActor(ctx)
	if err != nil {
		return nil, err
	}

	uid, rawCallID, err := normalizeUnifiedRefID(ctx, s.db, bucketRTCCallAudit, callID)
	if err != nil {
		return nil, err
	}

	record := &repository.RTCCallAudit{}
	query := s.db.WithContext(ctx).Model(&repository.RTCCallAudit{}).Where("uid = ?", uid)
	if rawCallID != "" {
		query = query.Or("call_id_raw = ?", rawCallID)
	}
	if err := query.First(record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: rtc call audit not found", ErrForbidden)
		}
		return nil, err
	}

	if err := ensureRTCCallAuditActor(record, actorRole, actorID); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *RTCCallAuditService) AdminReviewCall(ctx context.Context, callID string, input RTCCallAuditAdminReviewInput) (*repository.RTCCallAudit, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("rtc call audit service unavailable")
	}

	actorRole, _, _, err := resolveContactAuditActor(ctx)
	if err != nil {
		return nil, err
	}
	if actorRole != "admin" {
		return nil, fmt.Errorf("%w: admin permission required", ErrForbidden)
	}

	record, err := s.findCallByID(ctx, callID)
	if err != nil {
		return nil, err
	}

	complaintProvided := strings.TrimSpace(input.ComplaintStatus) != ""
	retentionProvided := strings.TrimSpace(input.RecordingRetention) != ""
	if !complaintProvided && !retentionProvided {
		return nil, fmt.Errorf("complaintStatus or recordingRetention is required")
	}

	complaintStatus := normalizeRTCCallComplaintStatus(record.ComplaintStatus)
	if complaintProvided {
		complaintStatus = normalizeRTCCallComplaintStatus(input.ComplaintStatus)
	}

	recordingRetention := normalizeRTCCallRecordingRetention(record.RecordingRetention)
	if retentionProvided {
		recordingRetention = normalizeRTCCallRecordingRetention(input.RecordingRetention)
	}

	switch complaintStatus {
	case "reported":
		if !retentionProvided || recordingRetention == "standard" {
			recordingRetention = "frozen"
		}
	case "resolved":
		if !retentionProvided && recordingRetention == "frozen" {
			recordingRetention = "cleared"
		}
	case "none":
		if !retentionProvided && recordingRetention == "frozen" {
			recordingRetention = "standard"
		}
	}

	record.ComplaintStatus = complaintStatus
	record.RecordingRetention = recordingRetention
	if err := s.db.WithContext(ctx).Save(record).Error; err != nil {
		return nil, err
	}
	return record, nil
}

func (s *RTCCallAuditService) ListHistory(ctx context.Context, query RTCCallAuditHistoryQuery) (*RTCCallAuditHistoryResult, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("rtc call audit service unavailable")
	}

	actorRole, actorID, _, err := resolveContactAuditActor(ctx)
	if err != nil {
		return nil, err
	}

	page, limit := normalizePhoneContactAuditPagination(query.Page, query.Limit)
	db := s.buildActorHistoryQuery(ctx, actorRole, actorID, query)

	total := int64(0)
	if err := db.Count(&total).Error; err != nil {
		return nil, err
	}

	items := make([]repository.RTCCallAudit, 0, limit)
	if err := s.buildActorHistoryQuery(ctx, actorRole, actorID, query).
		Order("created_at DESC, id DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&items).Error; err != nil {
		return nil, err
	}

	return &RTCCallAuditHistoryResult{
		Items: items,
		Pagination: RTCCallAuditAdminPagination{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	}, nil
}

func (s *RTCCallAuditService) findCallByID(ctx context.Context, callID string) (*repository.RTCCallAudit, error) {
	uid, rawCallID, err := normalizeUnifiedRefID(ctx, s.db, bucketRTCCallAudit, callID)
	if err != nil {
		return nil, err
	}

	record := &repository.RTCCallAudit{}
	query := s.db.WithContext(ctx).Model(&repository.RTCCallAudit{}).Where("uid = ?", uid)
	if rawCallID != "" {
		query = query.Or("call_id_raw = ?", rawCallID)
	}
	if err := query.First(record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: rtc call audit not found", ErrForbidden)
		}
		return nil, err
	}
	return record, nil
}

func (s *RTCCallAuditService) buildAdminListQuery(ctx context.Context, query RTCCallAuditAdminQuery) *gorm.DB {
	db := s.db.WithContext(ctx).Model(&repository.RTCCallAudit{})

	if role := normalizeContactAuditRole(query.CallerRole); role != "" {
		db = db.Where("caller_role = ?", role)
	}
	if role := normalizeContactAuditRole(query.CalleeRole); role != "" {
		db = db.Where("callee_role = ?", role)
	}
	if status := normalizeRTCCallStatusFilter(query.Status); status != "" {
		db = db.Where("status = ?", status)
	}
	if callType := normalizeRTCCallTypeFilter(query.CallType); callType != "" {
		db = db.Where("call_type = ?", callType)
	}
	if clientPlatform := strings.TrimSpace(query.ClientPlatform); clientPlatform != "" {
		db = db.Where("client_platform = ?", clientPlatform)
	}
	if clientKind := strings.TrimSpace(query.ClientKind); clientKind != "" {
		db = db.Where("client_kind = ?", clientKind)
	}
	if complaintStatus := normalizeRTCCallComplaintStatusFilter(query.ComplaintStatus); complaintStatus != "" {
		db = db.Where("complaint_status = ?", complaintStatus)
	}
	if keyword := strings.TrimSpace(query.Keyword); keyword != "" {
		like := "%" + keyword + "%"
		db = db.Where(
			"(uid LIKE ? OR call_id_raw LIKE ? OR caller_id LIKE ? OR caller_phone LIKE ? OR callee_id LIKE ? OR callee_phone LIKE ? OR order_id LIKE ? OR conversation_id LIKE ? OR failure_reason LIKE ? OR metadata LIKE ?)",
			like, like, like, like, like, like, like, like, like, like,
		)
	}
	return db
}

func (s *RTCCallAuditService) buildActorHistoryQuery(ctx context.Context, actorRole, actorID string, query RTCCallAuditHistoryQuery) *gorm.DB {
	db := s.db.WithContext(ctx).Model(&repository.RTCCallAudit{})
	if actorRole != "admin" {
		db = db.Where(
			"(caller_role = ? AND caller_id = ?) OR (callee_role = ? AND callee_id = ?)",
			actorRole, actorID, actorRole, actorID,
		)
	}
	if status := normalizeRTCCallStatusFilter(query.Status); status != "" {
		db = db.Where("status = ?", status)
	}
	if callType := normalizeRTCCallTypeFilter(query.CallType); callType != "" {
		db = db.Where("call_type = ?", callType)
	}
	return db
}

func ensureRTCCallAuditActor(record *repository.RTCCallAudit, actorRole, actorID string) error {
	if record == nil {
		return fmt.Errorf("rtc call audit record not found")
	}
	if actorRole == "admin" {
		return nil
	}
	if record.CallerRole == actorRole && record.CallerID == actorID {
		return nil
	}
	if record.CalleeRole == actorRole && record.CalleeID == actorID {
		return nil
	}
	return fmt.Errorf("%w: no permission to update this rtc call", ErrForbidden)
}

func normalizeRTCCallType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "audio", "voice":
		return "audio"
	default:
		return "audio"
	}
}

func normalizeRTCCallTypeFilter(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "audio":
		return "audio"
	default:
		return ""
	}
}

func normalizeRTCCallStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "initiated":
		return "initiated"
	case "ringing":
		return "ringing"
	case "accepted", "connected":
		return "accepted"
	case "rejected":
		return "rejected"
	case "busy":
		return "busy"
	case "cancelled", "canceled":
		return "cancelled"
	case "ended", "completed":
		return "ended"
	case "failed":
		return "failed"
	case "timeout":
		return "timeout"
	default:
		return "initiated"
	}
}

func normalizeRTCCallStatusFilter(raw string) string {
	trimmed := strings.ToLower(strings.TrimSpace(raw))
	if trimmed == "" {
		return ""
	}
	switch normalizeRTCCallStatus(trimmed) {
	case "initiated", "ringing", "accepted", "rejected", "busy", "cancelled", "ended", "failed", "timeout":
		return normalizeRTCCallStatus(trimmed)
	default:
		return ""
	}
}

func normalizeRTCCallComplaintStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "none":
		return "none"
	case "reported":
		return "reported"
	case "resolved":
		return "resolved"
	default:
		return "none"
	}
}

func normalizeRTCCallComplaintStatusFilter(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "none", "reported", "resolved":
		return strings.ToLower(strings.TrimSpace(raw))
	default:
		return ""
	}
}

func normalizeRTCCallRecordingRetention(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "standard":
		return "standard"
	case "frozen":
		return "frozen"
	case "cleared":
		return "cleared"
	default:
		return "standard"
	}
}

func normalizeRTCCallStartedAt(current, incoming *time.Time, status string, now time.Time) *time.Time {
	if incoming != nil && !incoming.IsZero() {
		return incoming
	}
	if current != nil && !current.IsZero() {
		return current
	}
	if status == "initiated" || status == "ringing" || status == "accepted" || status == "ended" {
		value := now
		return &value
	}
	return nil
}

func normalizeRTCCallAnsweredAt(current, incoming *time.Time, status string, now time.Time) *time.Time {
	if incoming != nil && !incoming.IsZero() {
		return incoming
	}
	if current != nil && !current.IsZero() {
		return current
	}
	if status == "accepted" || status == "ended" {
		value := now
		return &value
	}
	return current
}

func normalizeRTCCallEndedAt(current, incoming *time.Time, status string, now time.Time) *time.Time {
	if incoming != nil && !incoming.IsZero() {
		return incoming
	}
	if current != nil && !current.IsZero() {
		return current
	}
	switch status {
	case "rejected", "busy", "cancelled", "ended", "failed", "timeout":
		value := now
		return &value
	default:
		return current
	}
}

func normalizeRTCCallDuration(answeredAt, endedAt *time.Time, incoming int) int {
	if incoming > 0 {
		return incoming
	}
	if answeredAt == nil || endedAt == nil {
		return 0
	}
	if endedAt.Before(*answeredAt) {
		return 0
	}
	return int(endedAt.Sub(*answeredAt).Seconds())
}
