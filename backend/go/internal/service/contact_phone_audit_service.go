package service

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

var phoneDigitsPattern = regexp.MustCompile(`\d+`)

type PhoneContactAuditService struct {
	db *gorm.DB
}

type PhoneContactAuditInput struct {
	TargetRole     string      `json:"targetRole"`
	TargetID       string      `json:"targetId"`
	TargetPhone    string      `json:"targetPhone"`
	ContactChannel string      `json:"contactChannel"`
	EntryPoint     string      `json:"entryPoint"`
	Scene          string      `json:"scene"`
	OrderID        string      `json:"orderId"`
	RoomID         string      `json:"roomId"`
	PagePath       string      `json:"pagePath"`
	ClientPlatform string      `json:"clientPlatform"`
	ClientResult   string      `json:"clientResult"`
	Metadata       interface{} `json:"metadata"`
}

type PhoneContactAuditAdminQuery struct {
	ActorRole      string
	TargetRole     string
	ContactChannel string
	EntryPoint     string
	Scene          string
	ClientPlatform string
	ClientResult   string
	Keyword        string
	Page           int
	Limit          int
}

type PhoneContactAuditAdminSummary struct {
	Total   int64 `json:"total"`
	Clicked int64 `json:"clicked"`
	Opened  int64 `json:"opened"`
	Failed  int64 `json:"failed"`
}

type PhoneContactAuditAdminPagination struct {
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Total int64 `json:"total"`
}

type PhoneContactAuditAdminListResult struct {
	Items      []repository.PhoneContactAudit   `json:"items"`
	Summary    PhoneContactAuditAdminSummary    `json:"summary"`
	Pagination PhoneContactAuditAdminPagination `json:"pagination"`
}

func NewPhoneContactAuditService(db *gorm.DB) *PhoneContactAuditService {
	return &PhoneContactAuditService{db: db}
}

func (s *PhoneContactAuditService) RecordPhoneClick(ctx context.Context, input PhoneContactAuditInput) (*repository.PhoneContactAudit, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("contact audit service unavailable")
	}

	actorRole, actorID, actorPhone, err := resolveContactAuditActor(ctx)
	if err != nil {
		return nil, err
	}

	targetPhone := normalizeContactPhone(input.TargetPhone)
	if targetPhone == "" {
		return nil, fmt.Errorf("targetPhone is required")
	}
	targetRole := normalizeContactAuditRole(input.TargetRole)
	if targetRole == "" {
		return nil, fmt.Errorf("targetRole is required")
	}

	contactChannel := strings.ToLower(strings.TrimSpace(input.ContactChannel))
	if contactChannel == "" {
		contactChannel = "system_phone"
	}
	if contactChannel != "system_phone" {
		return nil, fmt.Errorf("contactChannel must be system_phone")
	}

	clientResult := normalizeContactAuditResult(input.ClientResult)
	metadata, err := stringifyContactAuditMetadata(input.Metadata)
	if err != nil {
		return nil, err
	}

	record := &repository.PhoneContactAudit{
		ActorRole:      actorRole,
		ActorID:        actorID,
		ActorPhone:     actorPhone,
		TargetRole:     targetRole,
		TargetID:       truncateString(strings.TrimSpace(input.TargetID), 32),
		TargetPhone:    truncateString(targetPhone, 20),
		ContactChannel: contactChannel,
		EntryPoint:     truncateString(strings.TrimSpace(input.EntryPoint), 64),
		Scene:          truncateString(strings.TrimSpace(input.Scene), 64),
		OrderID:        truncateString(strings.TrimSpace(input.OrderID), 32),
		RoomID:         truncateString(strings.TrimSpace(input.RoomID), 64),
		PagePath:       truncateString(strings.TrimSpace(input.PagePath), 255),
		ClientPlatform: truncateString(strings.TrimSpace(input.ClientPlatform), 32),
		ClientResult:   clientResult,
		Metadata:       metadata,
	}

	if err := s.db.WithContext(ctx).Create(record).Error; err != nil {
		return nil, err
	}
	return record, nil
}

func (s *PhoneContactAuditService) ListForAdmin(ctx context.Context, query PhoneContactAuditAdminQuery) (*PhoneContactAuditAdminListResult, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("contact audit service unavailable")
	}

	page, limit := normalizePhoneContactAuditPagination(query.Page, query.Limit)
	total := int64(0)
	baseQuery := s.buildAdminListQuery(ctx, query)
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	items := make([]repository.PhoneContactAudit, 0, limit)
	if err := s.buildAdminListQuery(ctx, query).
		Order("created_at DESC, id DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&items).Error; err != nil {
		return nil, err
	}

	summary := PhoneContactAuditAdminSummary{Total: total}
	grouped := make([]struct {
		ClientResult string
		Count        int64
	}, 0, 4)
	if err := s.buildAdminListQuery(ctx, query).
		Select("client_result, COUNT(*) AS count").
		Group("client_result").
		Scan(&grouped).Error; err != nil {
		return nil, err
	}
	for _, item := range grouped {
		switch normalizeContactAuditResult(item.ClientResult) {
		case "clicked":
			summary.Clicked = item.Count
		case "opened":
			summary.Opened = item.Count
		case "failed":
			summary.Failed = item.Count
		}
	}

	return &PhoneContactAuditAdminListResult{
		Items:   items,
		Summary: summary,
		Pagination: PhoneContactAuditAdminPagination{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	}, nil
}

func (s *PhoneContactAuditService) buildAdminListQuery(ctx context.Context, query PhoneContactAuditAdminQuery) *gorm.DB {
	db := s.db.WithContext(ctx).Model(&repository.PhoneContactAudit{})

	if actorRole := normalizeContactAuditRole(query.ActorRole); actorRole != "" {
		db = db.Where("actor_role = ?", actorRole)
	}
	if targetRole := normalizeContactAuditRole(query.TargetRole); targetRole != "" {
		db = db.Where("target_role = ?", targetRole)
	}
	if contactChannel := strings.ToLower(strings.TrimSpace(query.ContactChannel)); contactChannel != "" {
		db = db.Where("contact_channel = ?", contactChannel)
	}
	if entryPoint := strings.TrimSpace(query.EntryPoint); entryPoint != "" {
		db = db.Where("entry_point = ?", entryPoint)
	}
	if scene := strings.TrimSpace(query.Scene); scene != "" {
		db = db.Where("scene = ?", scene)
	}
	if clientPlatform := strings.TrimSpace(query.ClientPlatform); clientPlatform != "" {
		db = db.Where("client_platform = ?", clientPlatform)
	}
	if clientResult := normalizeContactAuditAdminResultFilter(query.ClientResult); clientResult != "" {
		db = db.Where("client_result = ?", clientResult)
	}
	if keyword := strings.TrimSpace(query.Keyword); keyword != "" {
		like := "%" + keyword + "%"
		db = db.Where(
			"(actor_id LIKE ? OR actor_phone LIKE ? OR target_id LIKE ? OR target_phone LIKE ? OR order_id LIKE ? OR room_id LIKE ? OR page_path LIKE ? OR metadata LIKE ?)",
			like, like, like, like, like, like, like, like,
		)
	}

	return db
}

func normalizePhoneContactAuditPagination(page, limit int) (int, int) {
	if page <= 0 {
		page = 1
	}
	switch {
	case limit <= 0:
		limit = 20
	case limit > 100:
		limit = 100
	}
	return page, limit
}

func normalizeContactAuditAdminResultFilter(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "clicked":
		return "clicked"
	case "opened":
		return "opened"
	case "failed":
		return "failed"
	default:
		return ""
	}
}

func resolveContactAuditActor(ctx context.Context) (string, string, string, error) {
	switch authContextRole(ctx) {
	case "user":
		actorID := strings.TrimSpace(authContextString(ctx, "user_id"))
		if actorID == "" {
			return "", "", "", fmt.Errorf("%w: missing user identity", ErrUnauthorized)
		}
		return "user", actorID, strings.TrimSpace(authContextString(ctx, "user_phone")), nil
	case "merchant":
		actorID := strings.TrimSpace(authContextString(ctx, "merchant_id"))
		if actorID == "" {
			return "", "", "", fmt.Errorf("%w: missing merchant identity", ErrUnauthorized)
		}
		return "merchant", actorID, strings.TrimSpace(authContextString(ctx, "merchant_phone")), nil
	case "rider":
		actorID := strings.TrimSpace(authContextString(ctx, "rider_id"))
		if actorID == "" {
			return "", "", "", fmt.Errorf("%w: missing rider identity", ErrUnauthorized)
		}
		return "rider", actorID, strings.TrimSpace(authContextString(ctx, "rider_phone")), nil
	case "admin":
		actorID := strings.TrimSpace(authContextString(ctx, "admin_id"))
		if actorID == "" {
			return "", "", "", fmt.Errorf("%w: missing admin identity", ErrUnauthorized)
		}
		return "admin", actorID, "", nil
	default:
		return "", "", "", fmt.Errorf("%w: invalid operator role", ErrUnauthorized)
	}
}

func normalizeContactAuditRole(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "shop", "merchant":
		return "merchant"
	case "user", "customer":
		return "user"
	case "rider":
		return "rider"
	case "admin", "support":
		return "admin"
	default:
		return ""
	}
}

func normalizeContactAuditResult(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "clicked":
		return "clicked"
	case "opened":
		return "opened"
	case "failed":
		return "failed"
	default:
		return "clicked"
	}
}

func normalizeContactPhone(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	parts := phoneDigitsPattern.FindAllString(value, -1)
	if len(parts) == 0 {
		return value
	}
	return strings.Join(parts, "")
}

func stringifyContactAuditMetadata(payload interface{}) (string, error) {
	if payload == nil {
		return "", nil
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("invalid metadata")
	}
	text := strings.TrimSpace(string(raw))
	if text == "" || text == "null" || text == "{}" || text == "[]" {
		return "", nil
	}
	return text, nil
}

func truncateString(value string, maxLen int) string {
	if maxLen <= 0 {
		return ""
	}
	if len(value) <= maxLen {
		return value
	}
	return value[:maxLen]
}
