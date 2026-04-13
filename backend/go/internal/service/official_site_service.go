package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	officialSiteSourceChannel             = "official_site"
	officialSiteExposureReviewPending     = "pending"
	officialSiteExposureReviewApproved    = "approved"
	officialSiteExposureReviewRejected    = "rejected"
	officialSiteExposureProcessUnresolved = "unresolved"
	officialSiteExposureProcessProcessing = "processing"
	officialSiteExposureProcessResolved   = "resolved"
	officialSiteSupportStatusOpen         = "open"
	officialSiteSupportStatusClosed       = "closed"
	officialSiteSupportSenderVisitor      = "visitor"
	officialSiteSupportSenderAdmin        = "admin"
	officialSiteBoardResolvedVisibleFor   = 30 * 24 * time.Hour
	officialSiteSupportMessageEvent       = "official_site_support_message"
	officialSiteSupportSessionEvent       = "official_site_support_session"
)

type OfficialSiteService struct {
	db       *gorm.DB
	realtime *RealtimeNotificationService
}

type OfficialSiteExposureCreateInput struct {
	Content      string
	Amount       float64
	Appeal       string
	ContactPhone string
	PhotoURLs    []string
}

type OfficialSiteExposureListParams struct {
	ReviewStatus  string
	ProcessStatus string
	Limit         int
	Offset        int
}

type OfficialSiteExposureUpdateInput struct {
	ReviewStatus  string
	ReviewRemark  string
	ProcessStatus string
	ProcessRemark string
	AdminID       string
	AdminName     string
}

type OfficialSiteExposurePublicView struct {
	ID            string     `json:"id"`
	Content       string     `json:"content"`
	Amount        float64    `json:"amount"`
	Appeal        string     `json:"appeal"`
	PhotoURLs     []string   `json:"photo_urls"`
	ReviewStatus  string     `json:"review_status"`
	ProcessStatus string     `json:"process_status"`
	HandledAt     *time.Time `json:"handled_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type OfficialSiteExposureAdminView struct {
	ID            string     `json:"id"`
	LegacyID      uint       `json:"legacy_id"`
	Content       string     `json:"content"`
	Amount        float64    `json:"amount"`
	Appeal        string     `json:"appeal"`
	ContactPhone  string     `json:"contact_phone"`
	PhotoURLs     []string   `json:"photo_urls"`
	ReviewStatus  string     `json:"review_status"`
	ReviewRemark  string     `json:"review_remark"`
	ReviewedByID  string     `json:"reviewed_by_id"`
	ReviewedBy    string     `json:"reviewed_by"`
	ReviewedAt    *time.Time `json:"reviewed_at"`
	ProcessStatus string     `json:"process_status"`
	ProcessRemark string     `json:"process_remark"`
	HandledAt     *time.Time `json:"handled_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type OfficialSiteNewsListParams struct {
	Limit  int
	Offset int
}

type OfficialSiteNewsListItem struct {
	ID        string    `json:"id"`
	LegacyID  uint      `json:"legacy_id"`
	Title     string    `json:"title"`
	Summary   string    `json:"summary"`
	Cover     string    `json:"cover"`
	Source    string    `json:"source"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type OfficialSiteNewsDetail struct {
	ID        string                 `json:"id"`
	LegacyID  uint                   `json:"legacy_id"`
	Title     string                 `json:"title"`
	Summary   string                 `json:"summary"`
	Cover     string                 `json:"cover"`
	Source    string                 `json:"source"`
	Content   map[string]interface{} `json:"content"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
}

type OfficialSiteSupportCreateInput struct {
	Nickname       string
	Contact        string
	InitialMessage string
}

type OfficialSiteSupportMessageInput struct {
	Content string
}

type OfficialSiteSupportSessionListParams struct {
	Status string
	Search string
	Limit  int
	Offset int
}

type OfficialSiteSupportSessionUpdateInput struct {
	Status      string
	AdminRemark string
}

type OfficialSiteSupportSessionPublicView struct {
	Token              string    `json:"token"`
	Nickname           string    `json:"nickname"`
	Contact            string    `json:"contact"`
	Status             string    `json:"status"`
	UnreadVisitorCount int       `json:"unread_visitor_count"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type OfficialSiteSupportSessionAdminView struct {
	ID                 string     `json:"id"`
	LegacyID           uint       `json:"legacy_id"`
	Token              string     `json:"token"`
	Nickname           string     `json:"nickname"`
	Contact            string     `json:"contact"`
	Status             string     `json:"status"`
	AdminRemark        string     `json:"admin_remark"`
	LastMessagePreview string     `json:"last_message_preview"`
	LastActor          string     `json:"last_actor"`
	LastMessageAt      *time.Time `json:"last_message_at"`
	UnreadAdminCount   int        `json:"unread_admin_count"`
	UnreadVisitorCount int        `json:"unread_visitor_count"`
	ClosedAt           *time.Time `json:"closed_at"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type OfficialSiteSupportMessageView struct {
	ID         string     `json:"id"`
	LegacyID   uint       `json:"legacy_id"`
	SenderType string     `json:"sender_type"`
	SenderName string     `json:"sender_name"`
	Content    string     `json:"content"`
	ReadAt     *time.Time `json:"read_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

type OfficialSiteSupportSessionRealtimeView struct {
	ID                 string     `json:"id"`
	LegacyID           uint       `json:"legacy_id"`
	Token              string     `json:"token"`
	Nickname           string     `json:"nickname"`
	Contact            string     `json:"contact"`
	Status             string     `json:"status"`
	LastMessagePreview string     `json:"last_message_preview"`
	LastActor          string     `json:"last_actor"`
	LastMessageAt      *time.Time `json:"last_message_at"`
	UnreadAdminCount   int        `json:"unread_admin_count"`
	UnreadVisitorCount int        `json:"unread_visitor_count"`
	ClosedAt           *time.Time `json:"closed_at"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

func NewOfficialSiteService(db *gorm.DB, realtime *RealtimeNotificationService) *OfficialSiteService {
	return &OfficialSiteService{db: db, realtime: realtime}
}

func (s *OfficialSiteService) CreateExposure(ctx context.Context, input OfficialSiteExposureCreateInput) (*repository.OfficialSiteExposure, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	content := strings.TrimSpace(input.Content)
	appeal := strings.TrimSpace(input.Appeal)
	contactPhone := strings.TrimSpace(input.ContactPhone)
	if content == "" {
		return nil, fmt.Errorf("content is required")
	}
	if appeal == "" {
		return nil, fmt.Errorf("appeal is required")
	}
	if contactPhone == "" {
		return nil, fmt.Errorf("contact phone is required")
	}

	now := time.Now()
	record := &repository.OfficialSiteExposure{
		Content:       content,
		Amount:        normalizeOfficialSiteAmount(input.Amount),
		Appeal:        appeal,
		ContactPhone:  contactPhone,
		PhotoURLsJSON: encodeOfficialSiteStringList(sanitizeOfficialSiteURLs(input.PhotoURLs, 6)),
		ReviewStatus:  officialSiteExposureReviewPending,
		ProcessStatus: officialSiteExposureProcessUnresolved,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := s.db.WithContext(ctx).Create(record).Error; err != nil {
		return nil, err
	}
	return record, nil
}

func (s *OfficialSiteService) ListPublicExposures(ctx context.Context) ([]OfficialSiteExposurePublicView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	cutoff := time.Now().Add(-officialSiteBoardResolvedVisibleFor)
	var records []repository.OfficialSiteExposure
	if err := s.db.WithContext(ctx).
		Where("review_status = ?", officialSiteExposureReviewApproved).
		Where("handled_at IS NULL OR handled_at >= ?", cutoff).
		Order("CASE WHEN handled_at IS NULL THEN 0 ELSE 1 END ASC").
		Order("created_at DESC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	result := make([]OfficialSiteExposurePublicView, 0, len(records))
	for _, item := range records {
		result = append(result, mapOfficialSiteExposurePublic(item))
	}
	return result, nil
}

func (s *OfficialSiteService) GetPublicExposureDetail(ctx context.Context, rawID string) (*OfficialSiteExposurePublicView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	resolvedID, err := resolveEntityID(ctx, s.db, (&repository.OfficialSiteExposure{}).TableName(), rawID)
	if err != nil {
		return nil, err
	}

	cutoff := time.Now().Add(-officialSiteBoardResolvedVisibleFor)
	var record repository.OfficialSiteExposure
	if err := s.db.WithContext(ctx).
		Where("id = ?", resolvedID).
		Where("review_status = ?", officialSiteExposureReviewApproved).
		Where("handled_at IS NULL OR handled_at >= ?", cutoff).
		First(&record).Error; err != nil {
		return nil, err
	}

	result := mapOfficialSiteExposurePublic(record)
	return &result, nil
}

func (s *OfficialSiteService) ListPublicNews(ctx context.Context, params OfficialSiteNewsListParams) ([]OfficialSiteNewsListItem, int64, error) {
	if s.db == nil {
		return nil, 0, fmt.Errorf("database unavailable")
	}

	limit := params.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	var (
		records []repository.Notification
		total   int64
	)

	query := s.db.WithContext(ctx).
		Model(&repository.Notification{}).
		Where("is_published = ?", true)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&records).Error; err != nil {
		return nil, 0, err
	}

	result := make([]OfficialSiteNewsListItem, 0, len(records))
	for _, item := range records {
		result = append(result, mapOfficialSiteNewsListItem(item))
	}
	return result, total, nil
}

func (s *OfficialSiteService) GetPublicNewsDetail(ctx context.Context, rawID string) (*OfficialSiteNewsDetail, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	resolvedID, err := resolveEntityID(ctx, s.db, (&repository.Notification{}).TableName(), rawID)
	if err != nil {
		return nil, err
	}

	var record repository.Notification
	if err := s.db.WithContext(ctx).
		Where("id = ?", resolvedID).
		Where("is_published = ?", true).
		First(&record).Error; err != nil {
		return nil, err
	}

	result := mapOfficialSiteNewsDetail(record)
	return &result, nil
}

func (s *OfficialSiteService) ListAdminExposures(ctx context.Context, params OfficialSiteExposureListParams) ([]OfficialSiteExposureAdminView, int64, error) {
	if s.db == nil {
		return nil, 0, fmt.Errorf("database unavailable")
	}

	var (
		records []repository.OfficialSiteExposure
		total   int64
	)
	query := s.db.WithContext(ctx).Model(&repository.OfficialSiteExposure{})
	if params.ReviewStatus != "" {
		query = query.Where("review_status = ?", params.ReviewStatus)
	}
	if params.ProcessStatus != "" {
		query = query.Where("process_status = ?", params.ProcessStatus)
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

	result := make([]OfficialSiteExposureAdminView, 0, len(records))
	for _, item := range records {
		result = append(result, mapOfficialSiteExposureAdmin(item))
	}
	return result, total, nil
}

func (s *OfficialSiteService) UpdateExposure(ctx context.Context, rawID string, input OfficialSiteExposureUpdateInput) (*OfficialSiteExposureAdminView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	reviewStatus := normalizeOfficialSiteExposureReviewStatus(input.ReviewStatus)
	processStatus := normalizeOfficialSiteExposureProcessStatus(input.ProcessStatus)
	if reviewStatus == "" && processStatus == "" && strings.TrimSpace(input.ReviewRemark) == "" && strings.TrimSpace(input.ProcessRemark) == "" {
		return nil, fmt.Errorf("no updates provided")
	}

	resolvedID, err := resolveEntityID(ctx, s.db, (&repository.OfficialSiteExposure{}).TableName(), rawID)
	if err != nil {
		return nil, err
	}

	var updated repository.OfficialSiteExposure
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var record repository.OfficialSiteExposure
		if err := tx.First(&record, resolvedID).Error; err != nil {
			return err
		}

		now := time.Now()
		changes := map[string]interface{}{
			"updated_at": now,
		}
		if reviewStatus != "" {
			changes["review_status"] = reviewStatus
			changes["review_remark"] = strings.TrimSpace(input.ReviewRemark)
			changes["reviewed_at"] = now
			changes["reviewed_by_id"] = strings.TrimSpace(input.AdminID)
			changes["reviewed_by"] = strings.TrimSpace(input.AdminName)
		} else if strings.TrimSpace(input.ReviewRemark) != "" {
			changes["review_remark"] = strings.TrimSpace(input.ReviewRemark)
		}

		if processStatus != "" {
			changes["process_status"] = processStatus
			changes["process_remark"] = strings.TrimSpace(input.ProcessRemark)
			if processStatus == officialSiteExposureProcessResolved {
				changes["handled_at"] = now
			} else {
				changes["handled_at"] = nil
			}
		} else if strings.TrimSpace(input.ProcessRemark) != "" {
			changes["process_remark"] = strings.TrimSpace(input.ProcessRemark)
		}

		if err := tx.Model(&record).Updates(changes).Error; err != nil {
			return err
		}
		return tx.First(&updated, resolvedID).Error
	})
	if err != nil {
		return nil, err
	}

	view := mapOfficialSiteExposureAdmin(updated)
	return &view, nil
}

func (s *OfficialSiteService) CreateOfficialSiteCooperation(ctx context.Context, nickname, contact, direction string) (*repository.CooperationRequest, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	nickname = strings.TrimSpace(nickname)
	contact = strings.TrimSpace(contact)
	direction = strings.TrimSpace(direction)
	if nickname == "" {
		nickname = "官网访客"
	}
	if contact == "" {
		return nil, fmt.Errorf("contact is required")
	}
	if direction == "" {
		return nil, fmt.Errorf("cooperation direction is required")
	}

	now := time.Now()
	record := &repository.CooperationRequest{
		Company:         "官网商务合作",
		ContactName:     nickname,
		ContactPhone:    contact,
		CooperationType: "official_site_business",
		SourceChannel:   officialSiteSourceChannel,
		Description:     direction,
		Status:          "pending",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.db.WithContext(ctx).Create(record).Error; err != nil {
		return nil, err
	}
	return record, nil
}

func (s *OfficialSiteService) ListOfficialSiteCooperations(ctx context.Context, params CooperationListParams) ([]repository.CooperationRequest, int64, error) {
	if s.db == nil {
		return nil, 0, fmt.Errorf("database unavailable")
	}
	params.SourceChannel = officialSiteSourceChannel
	return NewCooperationService(s.db).List(ctx, params)
}

func (s *OfficialSiteService) UpdateOfficialSiteCooperation(ctx context.Context, rawID, status, remark string) error {
	if s.db == nil {
		return fmt.Errorf("database unavailable")
	}

	normalizedStatus := strings.TrimSpace(status)
	switch normalizedStatus {
	case "pending", "processing", "done":
	default:
		return fmt.Errorf("invalid status")
	}

	resolvedID, err := resolveEntityID(ctx, s.db, (&repository.CooperationRequest{}).TableName(), rawID)
	if err != nil {
		return err
	}

	result := s.db.WithContext(ctx).
		Model(&repository.CooperationRequest{}).
		Where("id = ? AND source_channel = ?", resolvedID, officialSiteSourceChannel).
		Updates(map[string]interface{}{
			"status":       normalizedStatus,
			"admin_remark": strings.TrimSpace(remark),
			"updated_at":   time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *OfficialSiteService) CreateSupportSession(ctx context.Context, input OfficialSiteSupportCreateInput) (*OfficialSiteSupportSessionPublicView, []OfficialSiteSupportMessageView, error) {
	if s.db == nil {
		return nil, nil, fmt.Errorf("database unavailable")
	}

	content := strings.TrimSpace(input.InitialMessage)
	if content == "" {
		return nil, nil, fmt.Errorf("initial message is required")
	}
	now := time.Now()
	session := repository.OfficialSiteSupportSession{
		SessionToken:       generateOfficialSiteSessionToken(),
		Nickname:           normalizeOfficialSiteNickname(input.Nickname),
		Contact:            strings.TrimSpace(input.Contact),
		Status:             officialSiteSupportStatusOpen,
		LastMessagePreview: clipOfficialSitePreview(content),
		LastActor:          officialSiteSupportSenderVisitor,
		LastMessageAt:      &now,
		UnreadAdminCount:   1,
		UnreadVisitorCount: 0,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	message := repository.OfficialSiteSupportMessage{
		SenderType: officialSiteSupportSenderVisitor,
		SenderName: session.Nickname,
		Content:    content,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&session).Error; err != nil {
			return err
		}
		message.SessionID = session.ID
		return tx.Create(&message).Error
	}); err != nil {
		return nil, nil, err
	}

	sessionView := mapOfficialSiteSupportSessionPublic(session)
	messageView := mapOfficialSiteSupportMessage(message)
	s.publishSupportMessageRealtimeBestEffort(ctx, session, message)
	return &sessionView, []OfficialSiteSupportMessageView{messageView}, nil
}

func (s *OfficialSiteService) GetSupportSessionByToken(ctx context.Context, token string) (*OfficialSiteSupportSessionPublicView, error) {
	record, err := s.loadSupportSessionByTokenRecord(ctx, token)
	if err != nil {
		return nil, err
	}
	view := mapOfficialSiteSupportSessionPublic(*record)
	return &view, nil
}

func (s *OfficialSiteService) GetSupportSessionMessagesByToken(ctx context.Context, token string) (*OfficialSiteSupportSessionPublicView, []OfficialSiteSupportMessageView, error) {
	if s.db == nil {
		return nil, nil, fmt.Errorf("database unavailable")
	}

	var (
		session          repository.OfficialSiteSupportSession
		messages         []repository.OfficialSiteSupportMessage
		hadVisitorUnread bool
	)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("session_token = ?", strings.TrimSpace(token)).First(&session).Error; err != nil {
			return err
		}
		hadVisitorUnread = session.UnreadVisitorCount > 0
		now := time.Now()
		if err := tx.Model(&repository.OfficialSiteSupportMessage{}).
			Where("session_id = ? AND sender_type = ? AND read_at IS NULL", session.ID, officialSiteSupportSenderAdmin).
			Update("read_at", now).Error; err != nil {
			return err
		}
		if err := tx.Model(&session).Updates(map[string]interface{}{
			"unread_visitor_count": 0,
			"updated_at":           now,
		}).Error; err != nil {
			return err
		}
		return tx.Where("session_id = ?", session.ID).Order("created_at ASC").Find(&messages).Error
	})
	if err != nil {
		return nil, nil, err
	}

	session.UnreadVisitorCount = 0
	sessionView := mapOfficialSiteSupportSessionPublic(session)
	if hadVisitorUnread {
		s.publishSupportSessionRealtimeBestEffort(ctx, session)
	}
	return &sessionView, mapOfficialSiteSupportMessages(messages), nil
}

func (s *OfficialSiteService) AppendVisitorSupportMessage(ctx context.Context, token string, input OfficialSiteSupportMessageInput) (*OfficialSiteSupportMessageView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	content := strings.TrimSpace(input.Content)
	if content == "" {
		return nil, fmt.Errorf("content is required")
	}

	trimmedToken := strings.TrimSpace(token)
	var created repository.OfficialSiteSupportMessage
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var session repository.OfficialSiteSupportSession
		if err := tx.Where("session_token = ?", trimmedToken).First(&session).Error; err != nil {
			return err
		}

		now := time.Now()
		created = repository.OfficialSiteSupportMessage{
			SessionID:  session.ID,
			SenderType: officialSiteSupportSenderVisitor,
			SenderName: normalizeOfficialSiteNickname(session.Nickname),
			Content:    content,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		return tx.Model(&session).Updates(map[string]interface{}{
			"status":               officialSiteSupportStatusOpen,
			"closed_at":            nil,
			"last_message_preview": clipOfficialSitePreview(content),
			"last_actor":           officialSiteSupportSenderVisitor,
			"last_message_at":      now,
			"unread_admin_count":   gorm.Expr("unread_admin_count + ?", 1),
			"updated_at":           now,
		}).Error
	})
	if err != nil {
		return nil, err
	}

	view := mapOfficialSiteSupportMessage(created)
	if updatedSession, loadErr := s.loadSupportSessionByTokenRecord(ctx, trimmedToken); loadErr == nil {
		s.publishSupportMessageRealtimeBestEffort(ctx, *updatedSession, created)
	}
	return &view, nil
}

func (s *OfficialSiteService) ListAdminSupportSessions(ctx context.Context, params OfficialSiteSupportSessionListParams) ([]OfficialSiteSupportSessionAdminView, int64, error) {
	if s.db == nil {
		return nil, 0, fmt.Errorf("database unavailable")
	}

	var (
		records []repository.OfficialSiteSupportSession
		total   int64
	)
	query := s.db.WithContext(ctx).Model(&repository.OfficialSiteSupportSession{})
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	search := strings.TrimSpace(params.Search)
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("nickname LIKE ? OR contact LIKE ? OR last_message_preview LIKE ?", like, like, like)
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
	if err := query.Order("COALESCE(last_message_at, created_at) DESC").Find(&records).Error; err != nil {
		return nil, 0, err
	}

	result := make([]OfficialSiteSupportSessionAdminView, 0, len(records))
	for _, item := range records {
		result = append(result, mapOfficialSiteSupportSessionAdmin(item))
	}
	return result, total, nil
}

func (s *OfficialSiteService) GetAdminSupportSessionMessages(ctx context.Context, rawID string) (*OfficialSiteSupportSessionAdminView, []OfficialSiteSupportMessageView, error) {
	if s.db == nil {
		return nil, nil, fmt.Errorf("database unavailable")
	}

	resolvedID, err := resolveEntityID(ctx, s.db, (&repository.OfficialSiteSupportSession{}).TableName(), rawID)
	if err != nil {
		return nil, nil, err
	}

	var (
		session        repository.OfficialSiteSupportSession
		messages       []repository.OfficialSiteSupportMessage
		hadAdminUnread bool
	)
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&session, resolvedID).Error; err != nil {
			return err
		}
		hadAdminUnread = session.UnreadAdminCount > 0
		now := time.Now()
		if err := tx.Model(&repository.OfficialSiteSupportMessage{}).
			Where("session_id = ? AND sender_type = ? AND read_at IS NULL", session.ID, officialSiteSupportSenderVisitor).
			Update("read_at", now).Error; err != nil {
			return err
		}
		if err := tx.Model(&session).Updates(map[string]interface{}{
			"unread_admin_count": 0,
			"updated_at":         now,
		}).Error; err != nil {
			return err
		}
		return tx.Where("session_id = ?", session.ID).Order("created_at ASC").Find(&messages).Error
	})
	if err != nil {
		return nil, nil, err
	}

	session.UnreadAdminCount = 0
	sessionView := mapOfficialSiteSupportSessionAdmin(session)
	if hadAdminUnread {
		s.publishSupportSessionRealtimeBestEffort(ctx, session)
	}
	return &sessionView, mapOfficialSiteSupportMessages(messages), nil
}

func (s *OfficialSiteService) AppendAdminSupportMessage(ctx context.Context, rawID string, input OfficialSiteSupportMessageInput, adminName string) (*OfficialSiteSupportMessageView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	content := strings.TrimSpace(input.Content)
	if content == "" {
		return nil, fmt.Errorf("content is required")
	}
	resolvedID, err := resolveEntityID(ctx, s.db, (&repository.OfficialSiteSupportSession{}).TableName(), rawID)
	if err != nil {
		return nil, err
	}

	var created repository.OfficialSiteSupportMessage
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var session repository.OfficialSiteSupportSession
		if err := tx.First(&session, resolvedID).Error; err != nil {
			return err
		}

		now := time.Now()
		created = repository.OfficialSiteSupportMessage{
			SessionID:  session.ID,
			SenderType: officialSiteSupportSenderAdmin,
			SenderName: normalizeOfficialSiteAdminName(adminName),
			Content:    content,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		return tx.Model(&session).Updates(map[string]interface{}{
			"status":               officialSiteSupportStatusOpen,
			"closed_at":            nil,
			"last_message_preview": clipOfficialSitePreview(content),
			"last_actor":           officialSiteSupportSenderAdmin,
			"last_message_at":      now,
			"unread_visitor_count": gorm.Expr("unread_visitor_count + ?", 1),
			"updated_at":           now,
		}).Error
	})
	if err != nil {
		return nil, err
	}

	view := mapOfficialSiteSupportMessage(created)
	if updatedSession, loadErr := s.loadSupportSessionByIDRecord(ctx, resolvedID); loadErr == nil {
		s.publishSupportMessageRealtimeBestEffort(ctx, *updatedSession, created)
	}
	return &view, nil
}

func (s *OfficialSiteService) UpdateSupportSession(ctx context.Context, rawID string, input OfficialSiteSupportSessionUpdateInput) (*OfficialSiteSupportSessionAdminView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	status := normalizeOfficialSiteSupportStatus(input.Status)
	if status == "" && strings.TrimSpace(input.AdminRemark) == "" {
		return nil, fmt.Errorf("no updates provided")
	}
	resolvedID, err := resolveEntityID(ctx, s.db, (&repository.OfficialSiteSupportSession{}).TableName(), rawID)
	if err != nil {
		return nil, err
	}

	var updated repository.OfficialSiteSupportSession
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var session repository.OfficialSiteSupportSession
		if err := tx.First(&session, resolvedID).Error; err != nil {
			return err
		}

		now := time.Now()
		changes := map[string]interface{}{
			"updated_at":   now,
			"admin_remark": strings.TrimSpace(input.AdminRemark),
		}
		if status != "" {
			changes["status"] = status
			if status == officialSiteSupportStatusClosed {
				changes["closed_at"] = now
			} else {
				changes["closed_at"] = nil
			}
		}
		if err := tx.Model(&session).Updates(changes).Error; err != nil {
			return err
		}
		return tx.First(&updated, resolvedID).Error
	})
	if err != nil {
		return nil, err
	}

	view := mapOfficialSiteSupportSessionAdmin(updated)
	s.publishSupportSessionRealtimeBestEffort(ctx, updated)
	return &view, nil
}

func (s *OfficialSiteService) loadSupportSessionByTokenRecord(ctx context.Context, token string) (*repository.OfficialSiteSupportSession, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	var session repository.OfficialSiteSupportSession
	if err := s.db.WithContext(ctx).
		Where("session_token = ?", strings.TrimSpace(token)).
		First(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *OfficialSiteService) loadSupportSessionByIDRecord(ctx context.Context, id uint) (*repository.OfficialSiteSupportSession, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	var session repository.OfficialSiteSupportSession
	if err := s.db.WithContext(ctx).First(&session, id).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *OfficialSiteService) publishSupportSessionRealtimeBestEffort(ctx context.Context, session repository.OfficialSiteSupportSession) {
	if s == nil || s.realtime == nil {
		return
	}

	s.realtime.PublishSocketCustomEventBestEffort(ctx, officialSiteSupportSessionEvent, officialSiteSupportRecipients(session), map[string]interface{}{
		"source":        officialSiteSourceChannel,
		"session_id":    session.UID,
		"session_token": session.SessionToken,
		"session":       mapOfficialSiteSupportSessionRealtime(session),
	})
}

func (s *OfficialSiteService) publishSupportMessageRealtimeBestEffort(ctx context.Context, session repository.OfficialSiteSupportSession, message repository.OfficialSiteSupportMessage) {
	if s == nil || s.realtime == nil {
		return
	}

	s.realtime.PublishSocketCustomEventBestEffort(ctx, officialSiteSupportMessageEvent, officialSiteSupportRecipients(session), map[string]interface{}{
		"source":        officialSiteSourceChannel,
		"session_id":    session.UID,
		"session_token": session.SessionToken,
		"session":       mapOfficialSiteSupportSessionRealtime(session),
		"message":       mapOfficialSiteSupportMessage(message),
	})
}

func officialSiteSupportRecipients(session repository.OfficialSiteSupportSession) []SocketCustomRecipient {
	recipients := []SocketCustomRecipient{{
		Role:   "admin",
		UserID: "*",
	}}
	if strings.TrimSpace(session.SessionToken) != "" {
		recipients = append(recipients, SocketCustomRecipient{
			Role:   "site_visitor",
			UserID: strings.TrimSpace(session.SessionToken),
		})
	}
	return recipients
}

func normalizeOfficialSiteAmount(value float64) float64 {
	if value < 0 {
		return 0
	}
	return value
}

func sanitizeOfficialSiteURLs(raw []string, maxCount int) []string {
	result := make([]string, 0, len(raw))
	seen := make(map[string]struct{}, len(raw))
	for _, item := range raw {
		value := strings.TrimSpace(item)
		if value == "" {
			continue
		}
		if !strings.HasPrefix(value, "/uploads/") && !strings.HasPrefix(value, "http://") && !strings.HasPrefix(value, "https://") {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
		if maxCount > 0 && len(result) >= maxCount {
			break
		}
	}
	return result
}

func encodeOfficialSiteStringList(values []string) string {
	if len(values) == 0 {
		return "[]"
	}
	encoded, err := json.Marshal(values)
	if err != nil {
		return "[]"
	}
	return string(encoded)
}

func decodeOfficialSiteStringList(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []string{}
	}
	var values []string
	if err := json.Unmarshal([]byte(trimmed), &values); err != nil {
		return []string{}
	}
	return values
}

func normalizeOfficialSiteExposureReviewStatus(value string) string {
	switch strings.TrimSpace(value) {
	case officialSiteExposureReviewPending, officialSiteExposureReviewApproved, officialSiteExposureReviewRejected:
		return strings.TrimSpace(value)
	default:
		return ""
	}
}

func normalizeOfficialSiteExposureProcessStatus(value string) string {
	switch strings.TrimSpace(value) {
	case officialSiteExposureProcessUnresolved, officialSiteExposureProcessProcessing, officialSiteExposureProcessResolved:
		return strings.TrimSpace(value)
	default:
		return ""
	}
}

func normalizeOfficialSiteSupportStatus(value string) string {
	switch strings.TrimSpace(value) {
	case officialSiteSupportStatusOpen, officialSiteSupportStatusClosed:
		return strings.TrimSpace(value)
	default:
		return ""
	}
}

func normalizeOfficialSiteNickname(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "官网访客"
	}
	return trimmed
}

func normalizeOfficialSiteAdminName(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "管理员"
	}
	return trimmed
}

func clipOfficialSitePreview(value string) string {
	trimmed := strings.TrimSpace(value)
	if len([]rune(trimmed)) <= 80 {
		return trimmed
	}
	return string([]rune(trimmed)[:80])
}

func generateOfficialSiteSessionToken() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("site-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

func mapOfficialSiteExposurePublic(item repository.OfficialSiteExposure) OfficialSiteExposurePublicView {
	return OfficialSiteExposurePublicView{
		ID:            item.UID,
		Content:       item.Content,
		Amount:        item.Amount,
		Appeal:        item.Appeal,
		PhotoURLs:     decodeOfficialSiteStringList(item.PhotoURLsJSON),
		ReviewStatus:  item.ReviewStatus,
		ProcessStatus: item.ProcessStatus,
		HandledAt:     item.HandledAt,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
	}
}

func mapOfficialSiteExposureAdmin(item repository.OfficialSiteExposure) OfficialSiteExposureAdminView {
	return OfficialSiteExposureAdminView{
		ID:            item.UID,
		LegacyID:      item.ID,
		Content:       item.Content,
		Amount:        item.Amount,
		Appeal:        item.Appeal,
		ContactPhone:  item.ContactPhone,
		PhotoURLs:     decodeOfficialSiteStringList(item.PhotoURLsJSON),
		ReviewStatus:  item.ReviewStatus,
		ReviewRemark:  item.ReviewRemark,
		ReviewedByID:  item.ReviewedByID,
		ReviewedBy:    item.ReviewedBy,
		ReviewedAt:    item.ReviewedAt,
		ProcessStatus: item.ProcessStatus,
		ProcessRemark: item.ProcessRemark,
		HandledAt:     item.HandledAt,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
	}
}

func mapOfficialSiteNewsListItem(item repository.Notification) OfficialSiteNewsListItem {
	return OfficialSiteNewsListItem{
		ID:        item.UID,
		LegacyID:  item.ID,
		Title:     item.Title,
		Summary:   extractOfficialSiteNewsSummary(item.Content),
		Cover:     strings.TrimSpace(item.Cover),
		Source:    firstNonEmptyText(strings.TrimSpace(item.Source), "官方公告"),
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}

func mapOfficialSiteNewsDetail(item repository.Notification) OfficialSiteNewsDetail {
	return OfficialSiteNewsDetail{
		ID:        item.UID,
		LegacyID:  item.ID,
		Title:     item.Title,
		Summary:   extractOfficialSiteNewsSummary(item.Content),
		Cover:     strings.TrimSpace(item.Cover),
		Source:    firstNonEmptyText(strings.TrimSpace(item.Source), "官方公告"),
		Content:   decodeOfficialSiteNewsContent(item.Content),
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}

func mapOfficialSiteSupportSessionPublic(item repository.OfficialSiteSupportSession) OfficialSiteSupportSessionPublicView {
	return OfficialSiteSupportSessionPublicView{
		Token:              item.SessionToken,
		Nickname:           normalizeOfficialSiteNickname(item.Nickname),
		Contact:            item.Contact,
		Status:             item.Status,
		UnreadVisitorCount: item.UnreadVisitorCount,
		CreatedAt:          item.CreatedAt,
		UpdatedAt:          item.UpdatedAt,
	}
}

func mapOfficialSiteSupportSessionAdmin(item repository.OfficialSiteSupportSession) OfficialSiteSupportSessionAdminView {
	return OfficialSiteSupportSessionAdminView{
		ID:                 item.UID,
		LegacyID:           item.ID,
		Token:              item.SessionToken,
		Nickname:           normalizeOfficialSiteNickname(item.Nickname),
		Contact:            item.Contact,
		Status:             item.Status,
		AdminRemark:        item.AdminRemark,
		LastMessagePreview: item.LastMessagePreview,
		LastActor:          item.LastActor,
		LastMessageAt:      item.LastMessageAt,
		UnreadAdminCount:   item.UnreadAdminCount,
		UnreadVisitorCount: item.UnreadVisitorCount,
		ClosedAt:           item.ClosedAt,
		CreatedAt:          item.CreatedAt,
		UpdatedAt:          item.UpdatedAt,
	}
}

func mapOfficialSiteSupportMessage(item repository.OfficialSiteSupportMessage) OfficialSiteSupportMessageView {
	return OfficialSiteSupportMessageView{
		ID:         item.UID,
		LegacyID:   item.ID,
		SenderType: item.SenderType,
		SenderName: item.SenderName,
		Content:    item.Content,
		ReadAt:     item.ReadAt,
		CreatedAt:  item.CreatedAt,
	}
}

func mapOfficialSiteSupportSessionRealtime(item repository.OfficialSiteSupportSession) OfficialSiteSupportSessionRealtimeView {
	return OfficialSiteSupportSessionRealtimeView{
		ID:                 item.UID,
		LegacyID:           item.ID,
		Token:              item.SessionToken,
		Nickname:           normalizeOfficialSiteNickname(item.Nickname),
		Contact:            strings.TrimSpace(item.Contact),
		Status:             strings.TrimSpace(item.Status),
		LastMessagePreview: strings.TrimSpace(item.LastMessagePreview),
		LastActor:          strings.TrimSpace(item.LastActor),
		LastMessageAt:      item.LastMessageAt,
		UnreadAdminCount:   item.UnreadAdminCount,
		UnreadVisitorCount: item.UnreadVisitorCount,
		ClosedAt:           item.ClosedAt,
		CreatedAt:          item.CreatedAt,
		UpdatedAt:          item.UpdatedAt,
	}
}

func mapOfficialSiteSupportMessages(items []repository.OfficialSiteSupportMessage) []OfficialSiteSupportMessageView {
	result := make([]OfficialSiteSupportMessageView, 0, len(items))
	for _, item := range items {
		result = append(result, mapOfficialSiteSupportMessage(item))
	}
	return result
}

func decodeOfficialSiteNewsContent(raw string) map[string]interface{} {
	content := map[string]interface{}{}
	if err := json.Unmarshal([]byte(raw), &content); err == nil && len(content) > 0 {
		return content
	}

	text := strings.TrimSpace(raw)
	if text == "" {
		return map[string]interface{}{"blocks": []map[string]string{}}
	}
	return map[string]interface{}{
		"blocks": []map[string]string{
			{
				"type": "p",
				"text": text,
			},
		},
	}
}

func extractOfficialSiteNewsSummary(raw string) string {
	content := decodeOfficialSiteNewsContent(raw)
	blocks, _ := content["blocks"].([]interface{})
	for _, block := range blocks {
		blockMap, ok := block.(map[string]interface{})
		if !ok {
			continue
		}
		blockType := strings.TrimSpace(fmt.Sprint(blockMap["type"]))
		if blockType != "p" && blockType != "quote" && blockType != "h2" {
			continue
		}
		text := strings.TrimSpace(fmt.Sprint(blockMap["text"]))
		if text == "" {
			continue
		}
		runes := []rune(text)
		if len(runes) > 80 {
			return string(runes[:80]) + "..."
		}
		return text
	}

	text := strings.TrimSpace(raw)
	runes := []rune(text)
	if len(runes) > 80 {
		return string(runes[:80]) + "..."
	}
	if text == "" {
		return "查看详情"
	}
	return text
}
