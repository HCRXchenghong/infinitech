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
