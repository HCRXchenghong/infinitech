package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type DiningBuddyReportInput struct {
	TargetType  string `json:"target_type"`
	TargetID    string `json:"target_id"`
	Reason      string `json:"reason"`
	Description string `json:"description"`
}

type DiningBuddyAdminPartyQuery struct {
	Category string
	Status   string
	Search   string
	Limit    int
}

func (s *DiningBuddyService) diningBuddyDB(db *gorm.DB) *gorm.DB {
	if db != nil {
		return db
	}
	return s.db
}

func (s *DiningBuddyService) loadDiningBuddySettings(ctx context.Context) DiningBuddySettings {
	return s.loadDiningBuddySettingsWithDB(ctx, nil)
}

func (s *DiningBuddyService) loadDiningBuddySettingsWithDB(ctx context.Context, db *gorm.DB) DiningBuddySettings {
	settings := DefaultDiningBuddySettings()
	_ = LoadJSONSetting(ctx, s.diningBuddyDB(db), SettingKeyDiningBuddySettings, &settings)
	return NormalizeDiningBuddySettings(settings)
}

func (s *DiningBuddyService) syncExpiredParties(ctx context.Context, db *gorm.DB, settings DiningBuddySettings) error {
	if db == nil {
		return nil
	}
	cutoff := time.Now().Add(-time.Duration(settings.AutoCloseExpiredHours) * time.Hour)
	return db.WithContext(ctx).
		Model(&repository.DiningBuddyParty{}).
		Where("status IN ?", []string{diningBuddyStatusOpen, diningBuddyStatusFull}).
		Where("created_at <= ?", cutoff).
		Update("status", diningBuddyStatusClosed).Error
}

func (s *DiningBuddyService) ensureDiningBuddyFeatureEnabled(ctx context.Context) error {
	return s.ensureDiningBuddyFeatureEnabledWithDB(ctx, nil)
}

func (s *DiningBuddyService) ensureDiningBuddyFeatureEnabledWithDB(ctx context.Context, db *gorm.DB) error {
	settings := s.loadDiningBuddySettingsWithDB(ctx, db)
	if !settings.Enabled {
		return fmt.Errorf("%w: dining buddy disabled", ErrForbidden)
	}
	return s.syncExpiredParties(ctx, s.diningBuddyDB(db), settings)
}

func (s *DiningBuddyService) activeDiningBuddyRestriction(ctx context.Context, userID uint) (*repository.DiningBuddyUserRestriction, error) {
	return s.activeDiningBuddyRestrictionWithDB(ctx, nil, userID)
}

func (s *DiningBuddyService) activeDiningBuddyRestrictionWithDB(ctx context.Context, db *gorm.DB, userID uint) (*repository.DiningBuddyUserRestriction, error) {
	activeDB := s.diningBuddyDB(db)
	if userID == 0 || activeDB == nil {
		return nil, nil
	}
	var restriction repository.DiningBuddyUserRestriction
	if err := activeDB.WithContext(ctx).Where("user_id = ?", userID).First(&restriction).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		if isMissingTableError(err) {
			return nil, nil
		}
		return nil, err
	}
	if restriction.ExpiresAt != nil && restriction.ExpiresAt.Before(time.Now()) {
		_ = activeDB.WithContext(ctx).Delete(&repository.DiningBuddyUserRestriction{}, restriction.ID).Error
		return nil, nil
	}
	return &restriction, nil
}

func (s *DiningBuddyService) ensureDiningBuddyJoinable(ctx context.Context, userID uint, category string) error {
	return s.ensureDiningBuddyJoinableWithDB(ctx, nil, userID, category)
}

func (s *DiningBuddyService) ensureDiningBuddyJoinableWithDB(ctx context.Context, db *gorm.DB, userID uint, category string) error {
	if err := s.ensureDiningBuddyFeatureEnabledWithDB(ctx, db); err != nil {
		return err
	}
	restriction, err := s.activeDiningBuddyRestrictionWithDB(ctx, db, userID)
	if err != nil {
		return err
	}
	if restriction != nil && strings.TrimSpace(restriction.RestrictionType) == "ban" {
		return fmt.Errorf("%w: user is banned", ErrForbidden)
	}
	settings := s.loadDiningBuddySettingsWithDB(ctx, db)
	categorySettings, ok := FindDiningBuddyCategory(settings, category)
	if !ok || !categorySettings.Enabled {
		return fmt.Errorf("%w: category disabled", ErrForbidden)
	}
	return nil
}

func (s *DiningBuddyService) ensureDiningBuddySendable(ctx context.Context, userID uint, party *repository.DiningBuddyParty) error {
	return s.ensureDiningBuddySendableWithDB(ctx, nil, userID, party)
}

func (s *DiningBuddyService) ensureDiningBuddySendableWithDB(ctx context.Context, db *gorm.DB, userID uint, party *repository.DiningBuddyParty) error {
	if err := s.ensureDiningBuddyFeatureEnabledWithDB(ctx, db); err != nil {
		return err
	}
	restriction, err := s.activeDiningBuddyRestrictionWithDB(ctx, db, userID)
	if err != nil {
		return err
	}
	if restriction != nil {
		switch strings.TrimSpace(restriction.RestrictionType) {
		case "ban":
			return fmt.Errorf("%w: user is banned", ErrForbidden)
		case "mute":
			return fmt.Errorf("%w: user is muted", ErrForbidden)
		}
	}
	settings := s.loadDiningBuddySettingsWithDB(ctx, db)
	categorySettings, ok := FindDiningBuddyCategory(settings, party.Category)
	if !ok || !categorySettings.Enabled {
		return fmt.Errorf("%w: category disabled", ErrForbidden)
	}
	if strings.EqualFold(strings.TrimSpace(party.Status), diningBuddyStatusClosed) {
		return fmt.Errorf("%w: party is closed", ErrForbidden)
	}
	return nil
}

func (s *DiningBuddyService) validateDiningBuddyContentAgainstSensitiveWords(ctx context.Context, content string) error {
	return s.validateDiningBuddyContentAgainstSensitiveWordsWithDB(ctx, nil, content)
}

func (s *DiningBuddyService) validateDiningBuddyContentAgainstSensitiveWordsWithDB(ctx context.Context, db *gorm.DB, content string) error {
	activeDB := s.diningBuddyDB(db)
	if activeDB == nil {
		return nil
	}
	var words []repository.DiningBuddySensitiveWord
	if err := activeDB.WithContext(ctx).
		Where("enabled = ?", true).
		Order("updated_at DESC").
		Find(&words).Error; err != nil {
		if isMissingTableError(err) {
			return nil
		}
		return err
	}
	lowerContent := strings.ToLower(strings.TrimSpace(content))
	for _, word := range words {
		candidate := strings.ToLower(strings.TrimSpace(word.Word))
		if candidate == "" {
			continue
		}
		if strings.Contains(lowerContent, candidate) {
			return fmt.Errorf("content contains sensitive word")
		}
	}
	return nil
}

func (s *DiningBuddyService) ensureDiningBuddyPublishLimit(ctx context.Context, userID uint, settings DiningBuddySettings) error {
	return s.ensureDiningBuddyPublishLimitWithDB(ctx, nil, userID, settings)
}

func (s *DiningBuddyService) ensureDiningBuddyPublishLimitWithDB(ctx context.Context, db *gorm.DB, userID uint, settings DiningBuddySettings) error {
	activeDB := s.diningBuddyDB(db)
	var count int64
	start := time.Now().Truncate(24 * time.Hour)
	if err := activeDB.WithContext(ctx).
		Model(&repository.DiningBuddyParty{}).
		Where("host_user_id = ?", userID).
		Where("created_at >= ?", start).
		Count(&count).Error; err != nil {
		return err
	}
	if int(count) >= settings.PublishLimitPerDay {
		return fmt.Errorf("%w: publish limit reached", ErrForbidden)
	}
	return nil
}

func (s *DiningBuddyService) ensureDiningBuddyMessageLimit(ctx context.Context, userID uint, settings DiningBuddySettings) error {
	return s.ensureDiningBuddyMessageLimitWithDB(ctx, nil, userID, settings)
}

func (s *DiningBuddyService) ensureDiningBuddyMessageLimitWithDB(ctx context.Context, db *gorm.DB, userID uint, settings DiningBuddySettings) error {
	activeDB := s.diningBuddyDB(db)
	var count int64
	start := time.Now().Add(-time.Minute)
	if err := activeDB.WithContext(ctx).
		Model(&repository.DiningBuddyMessage{}).
		Where("sender_user_id = ?", userID).
		Where("created_at >= ?", start).
		Count(&count).Error; err != nil {
		return err
	}
	if int(count) >= settings.MessageRateLimitPerMinute {
		return fmt.Errorf("%w: message limit reached", ErrForbidden)
	}
	return nil
}

func (s *DiningBuddyService) resolveDiningBuddyUser(ctx context.Context, db *gorm.DB, rawID string) (*repository.User, error) {
	idText := strings.TrimSpace(rawID)
	if idText == "" {
		return nil, fmt.Errorf("invalid user id")
	}
	var user repository.User
	switch {
	case strings.HasPrefix(strings.ToUpper(idText), "U"):
		if err := db.WithContext(ctx).Where("uid = ?", idText).First(&user).Error; err != nil {
			return nil, err
		}
	case strings.HasPrefix(strings.ToUpper(idText), "T"):
		if err := db.WithContext(ctx).Where("tsid = ?", idText).First(&user).Error; err != nil {
			return nil, err
		}
	default:
		parsed, err := strconv.ParseUint(idText, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid user id")
		}
		if err := db.WithContext(ctx).First(&user, uint(parsed)).Error; err != nil {
			return nil, err
		}
	}
	return &user, nil
}

func (s *DiningBuddyService) appendDiningBuddyAuditLogTx(
	ctx context.Context,
	tx *gorm.DB,
	action string,
	targetType string,
	targetID string,
	operatorID uint,
	operatorName string,
	summary string,
	detail interface{},
) error {
	if tx == nil {
		return nil
	}
	payload := ""
	if detail != nil {
		if encoded, err := json.Marshal(detail); err == nil {
			payload = string(encoded)
		}
	}
	logRecord := repository.DiningBuddyAuditLog{
		Action:       strings.TrimSpace(action),
		TargetType:   strings.TrimSpace(targetType),
		TargetID:     strings.TrimSpace(targetID),
		OperatorRole: "admin",
		OperatorID:   strconv.FormatUint(uint64(operatorID), 10),
		OperatorName: strings.TrimSpace(operatorName),
		Summary:      strings.TrimSpace(summary),
		DetailJSON:   payload,
		CreatedAt:    time.Now(),
	}
	return tx.WithContext(ctx).Create(&logRecord).Error
}

func (s *DiningBuddyService) CreateReport(ctx context.Context, viewerUserID uint, input DiningBuddyReportInput) (*repository.DiningBuddyReport, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}
	if viewerUserID == 0 {
		return nil, fmt.Errorf("%w: missing current user", ErrUnauthorized)
	}
	if err := s.ensureDiningBuddyFeatureEnabled(ctx); err != nil {
		return nil, err
	}
	targetType := strings.TrimSpace(strings.ToLower(input.TargetType))
	targetID := strings.TrimSpace(input.TargetID)
	reason := strings.TrimSpace(input.Reason)
	description := strings.TrimSpace(input.Description)
	if targetID == "" || reason == "" {
		return nil, fmt.Errorf("target_id and reason are required")
	}
	if utf8.RuneCountInString(reason) > 120 || utf8.RuneCountInString(description) > 500 {
		return nil, fmt.Errorf("report content too long")
	}

	reporter, err := s.loadDiningBuddyUserSummary(ctx, s.db, viewerUserID)
	if err != nil {
		return nil, err
	}

	report := &repository.DiningBuddyReport{
		TargetType:      targetType,
		TargetID:        targetID,
		ReporterUserID:  reporter.ID,
		ReporterUserUID: reporter.UID,
		ReporterName:    reporter.Name,
		Reason:          reason,
		Description:     description,
		Status:          "pending",
	}

	switch targetType {
	case "party":
		party, err := s.resolveDiningBuddyParty(ctx, s.db, targetID)
		if err != nil {
			return nil, err
		}
		report.PartyID = party.ID
		report.TargetID = publicDiningBuddyPartyID(party)
		report.TargetUserID = party.HostUserID
	case "message":
		message, err := s.resolveDiningBuddyMessage(ctx, s.db, targetID)
		if err != nil {
			return nil, err
		}
		report.MessageID = message.ID
		report.PartyID = message.PartyID
		report.TargetID = publicDiningBuddyMessageID(message)
		report.TargetUserID = message.SenderUserID
	case "user":
		user, err := s.resolveDiningBuddyUser(ctx, s.db, targetID)
		if err != nil {
			return nil, err
		}
		report.TargetUserID = user.ID
		report.TargetID = strings.TrimSpace(user.UID)
		if report.TargetID == "" {
			report.TargetID = strconv.FormatUint(uint64(user.ID), 10)
		}
	default:
		return nil, fmt.Errorf("target_type is invalid")
	}

	if err := s.db.WithContext(ctx).Create(report).Error; err != nil {
		return nil, err
	}
	return report, nil
}

func (s *DiningBuddyService) AdminListParties(ctx context.Context, query DiningBuddyAdminPartyQuery) ([]map[string]interface{}, error) {
	if err := s.ensureDiningBuddyFeatureEnabled(ctx); err != nil && !strings.Contains(err.Error(), "disabled") {
		return nil, err
	}
	settings := s.loadDiningBuddySettings(ctx)
	_ = s.syncExpiredParties(ctx, s.db, settings)

	limit := query.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 200 {
		limit = 200
	}

	dbQuery := s.db.WithContext(ctx).
		Preload("Members", func(tx *gorm.DB) *gorm.DB { return tx.Order("joined_at ASC") }).
		Model(&repository.DiningBuddyParty{})

	if category, ok := normalizeDiningBuddyCategory(query.Category); ok {
		dbQuery = dbQuery.Where("category = ?", category)
	}
	if status := strings.TrimSpace(query.Status); status != "" {
		dbQuery = dbQuery.Where("status = ?", status)
	}
	if keyword := strings.TrimSpace(query.Search); keyword != "" {
		like := "%" + keyword + "%"
		dbQuery = dbQuery.Where("title LIKE ? OR location LIKE ? OR host_name LIKE ?", like, like, like)
	}

	var parties []repository.DiningBuddyParty
	if err := dbQuery.Order("updated_at DESC, created_at DESC").Limit(limit).Find(&parties).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(parties))
	for _, party := range parties {
		view := buildDiningBuddyPartyView(&party, 0)
		result = append(result, map[string]interface{}{
			"id":          view.ID,
			"tsid":        view.TSID,
			"category":    view.Category,
			"title":       view.Title,
			"host":        view.Host,
			"hostUserId":  view.HostUserID,
			"location":    view.Location,
			"time":        view.Time,
			"current":     view.Current,
			"max":         view.Max,
			"status":      view.Status,
			"description": view.Description,
			"created_at":  party.CreatedAt,
			"updated_at":  party.UpdatedAt,
			"members":     buildDiningBuddyMembers(party.Members),
			"hostAvatar":  view.HostAvatar,
			"matchScore":  view.MatchScore,
			"matchReason": view.MatchReason,
			"joined":      view.Joined,
		})
	}
	return result, nil
}

func (s *DiningBuddyService) AdminGetParty(ctx context.Context, partyID string) (map[string]interface{}, error) {
	party, err := s.resolveDiningBuddyParty(ctx, s.db, partyID)
	if err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).
		Preload("Members", func(tx *gorm.DB) *gorm.DB { return tx.Order("joined_at ASC") }).
		First(party, party.ID).Error; err != nil {
		return nil, err
	}
	view := buildDiningBuddyPartyView(party, 0)
	return map[string]interface{}{
		"id":          view.ID,
		"tsid":        view.TSID,
		"category":    view.Category,
		"title":       view.Title,
		"host":        view.Host,
		"hostUserId":  view.HostUserID,
		"location":    view.Location,
		"time":        view.Time,
		"current":     view.Current,
		"max":         view.Max,
		"status":      view.Status,
		"description": view.Description,
		"created_at":  party.CreatedAt,
		"updated_at":  party.UpdatedAt,
		"members":     buildDiningBuddyMembers(party.Members),
	}, nil
}

func (s *DiningBuddyService) AdminCloseParty(ctx context.Context, partyID string, adminID uint, adminName string, reason string) error {
	return s.updatePartyStatusWithAudit(ctx, partyID, diningBuddyStatusClosed, adminID, adminName, "close_party", reason)
}

func (s *DiningBuddyService) AdminReopenParty(ctx context.Context, partyID string, adminID uint, adminName string, reason string) error {
	return s.updatePartyStatusWithAudit(ctx, partyID, diningBuddyStatusOpen, adminID, adminName, "reopen_party", reason)
}

func (s *DiningBuddyService) updatePartyStatusWithAudit(ctx context.Context, partyID string, status string, adminID uint, adminName string, action string, reason string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		party, err := s.resolveDiningBuddyParty(ctx, tx, partyID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Model(&repository.DiningBuddyParty{}).Where("id = ?", party.ID).Update("status", status).Error; err != nil {
			return err
		}
		return s.appendDiningBuddyAuditLogTx(ctx, tx, action, "party", publicDiningBuddyPartyID(party), adminID, adminName, reason, map[string]interface{}{"status": status})
	})
}

func (s *DiningBuddyService) AdminListMessages(ctx context.Context, partyID string) ([]map[string]interface{}, error) {
	party, err := s.resolveDiningBuddyParty(ctx, s.db, partyID)
	if err != nil {
		return nil, err
	}
	var messages []repository.DiningBuddyMessage
	if err := s.db.WithContext(ctx).
		Where("party_id = ?", party.ID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		return nil, err
	}
	result := make([]map[string]interface{}, 0, len(messages))
	for _, message := range messages {
		view := buildDiningBuddyMessageView(&message, 0)
		result = append(result, map[string]interface{}{
			"id":           view.ID,
			"tsid":         view.TSID,
			"sender":       view.Sender,
			"senderName":   view.SenderName,
			"senderUserId": view.SenderUserID,
			"text":         view.Text,
			"time":         view.Time,
			"created_at":   message.CreatedAt,
		})
	}
	return result, nil
}

func (s *DiningBuddyService) AdminDeleteMessage(ctx context.Context, messageID string, adminID uint, adminName string, reason string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		message, err := s.resolveDiningBuddyMessage(ctx, tx, messageID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Delete(&repository.DiningBuddyMessage{}, message.ID).Error; err != nil {
			return err
		}
		return s.appendDiningBuddyAuditLogTx(ctx, tx, "delete_message", "message", publicDiningBuddyMessageID(message), adminID, adminName, reason, map[string]interface{}{"party_id": message.PartyID})
	})
}

func (s *DiningBuddyService) AdminListReports(ctx context.Context, status string, limit int) ([]repository.DiningBuddyReport, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 200 {
		limit = 200
	}
	dbQuery := s.db.WithContext(ctx).Model(&repository.DiningBuddyReport{})
	if trimmed := strings.TrimSpace(status); trimmed != "" {
		dbQuery = dbQuery.Where("status = ?", trimmed)
	}
	var reports []repository.DiningBuddyReport
	if err := dbQuery.Order("created_at DESC").Limit(limit).Find(&reports).Error; err != nil {
		return nil, err
	}
	return reports, nil
}

func (s *DiningBuddyService) AdminResolveReport(ctx context.Context, reportID string, adminID uint, adminName string, note string, action string) error {
	return s.updateReportStatusWithAudit(ctx, reportID, "resolved", adminID, adminName, note, action)
}

func (s *DiningBuddyService) AdminRejectReport(ctx context.Context, reportID string, adminID uint, adminName string, note string) error {
	return s.updateReportStatusWithAudit(ctx, reportID, "rejected", adminID, adminName, note, "reject")
}

func (s *DiningBuddyService) updateReportStatusWithAudit(ctx context.Context, reportID string, status string, adminID uint, adminName string, note string, action string) error {
	parsedID, err := strconv.ParseUint(strings.TrimSpace(reportID), 10, 64)
	if err != nil {
		return fmt.Errorf("invalid report id")
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var report repository.DiningBuddyReport
		if err := tx.WithContext(ctx).First(&report, uint(parsedID)).Error; err != nil {
			return err
		}
		now := time.Now()
		if err := tx.WithContext(ctx).
			Model(&repository.DiningBuddyReport{}).
			Where("id = ?", report.ID).
			Updates(map[string]interface{}{
				"status":              status,
				"resolution_note":     strings.TrimSpace(note),
				"resolution_action":   strings.TrimSpace(action),
				"handled_by_admin_id": adminID,
				"handled_by_name":     strings.TrimSpace(adminName),
				"resolved_at":         &now,
			}).Error; err != nil {
			return err
		}
		return s.appendDiningBuddyAuditLogTx(ctx, tx, "update_report", "report", strconv.FormatUint(uint64(report.ID), 10), adminID, adminName, note, map[string]interface{}{"status": status, "action": action})
	})
}

func (s *DiningBuddyService) AdminListSensitiveWords(ctx context.Context) ([]repository.DiningBuddySensitiveWord, error) {
	var words []repository.DiningBuddySensitiveWord
	if err := s.db.WithContext(ctx).Order("updated_at DESC, id DESC").Find(&words).Error; err != nil {
		return nil, err
	}
	return words, nil
}

func (s *DiningBuddyService) AdminCreateSensitiveWord(ctx context.Context, word string, enabled bool, description string, adminID uint, adminName string) (*repository.DiningBuddySensitiveWord, error) {
	word = strings.TrimSpace(word)
	if word == "" {
		return nil, fmt.Errorf("word is required")
	}
	record := &repository.DiningBuddySensitiveWord{
		Word:        word,
		Enabled:     enabled,
		Description: strings.TrimSpace(description),
	}
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).Create(record).Error; err != nil {
			return err
		}
		return s.appendDiningBuddyAuditLogTx(ctx, tx, "create_sensitive_word", "sensitive_word", strconv.FormatUint(uint64(record.ID), 10), adminID, adminName, word, map[string]interface{}{"enabled": enabled})
	}); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *DiningBuddyService) AdminUpdateSensitiveWord(ctx context.Context, id string, word string, enabled bool, description string, adminID uint, adminName string) error {
	parsedID, err := strconv.ParseUint(strings.TrimSpace(id), 10, 64)
	if err != nil {
		return fmt.Errorf("invalid sensitive word id")
	}
	word = strings.TrimSpace(word)
	if word == "" {
		return fmt.Errorf("word is required")
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).
			Model(&repository.DiningBuddySensitiveWord{}).
			Where("id = ?", uint(parsedID)).
			Updates(map[string]interface{}{
				"word":        word,
				"enabled":     enabled,
				"description": strings.TrimSpace(description),
			}).Error; err != nil {
			return err
		}
		return s.appendDiningBuddyAuditLogTx(ctx, tx, "update_sensitive_word", "sensitive_word", id, adminID, adminName, word, map[string]interface{}{"enabled": enabled})
	})
}

func (s *DiningBuddyService) AdminDeleteSensitiveWord(ctx context.Context, id string, adminID uint, adminName string) error {
	parsedID, err := strconv.ParseUint(strings.TrimSpace(id), 10, 64)
	if err != nil {
		return fmt.Errorf("invalid sensitive word id")
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).Delete(&repository.DiningBuddySensitiveWord{}, uint(parsedID)).Error; err != nil {
			return err
		}
		return s.appendDiningBuddyAuditLogTx(ctx, tx, "delete_sensitive_word", "sensitive_word", id, adminID, adminName, "delete sensitive word", nil)
	})
}

func (s *DiningBuddyService) AdminListUserRestrictions(ctx context.Context) ([]repository.DiningBuddyUserRestriction, error) {
	var restrictions []repository.DiningBuddyUserRestriction
	if err := s.db.WithContext(ctx).Order("updated_at DESC, id DESC").Find(&restrictions).Error; err != nil {
		return nil, err
	}
	return restrictions, nil
}

func (s *DiningBuddyService) AdminUpsertUserRestriction(
	ctx context.Context,
	targetUserID string,
	restrictionType string,
	reason string,
	note string,
	expiresAt *time.Time,
	adminID uint,
	adminName string,
) (*repository.DiningBuddyUserRestriction, error) {
	user, err := s.resolveDiningBuddyUser(ctx, s.db, targetUserID)
	if err != nil {
		return nil, err
	}
	restrictionType = strings.TrimSpace(restrictionType)
	if restrictionType != "mute" && restrictionType != "ban" {
		return nil, fmt.Errorf("restriction_type is invalid")
	}
	record := &repository.DiningBuddyUserRestriction{
		UserID:           user.ID,
		UserUID:          strings.TrimSpace(user.UID),
		UserName:         firstNonEmpty(strings.TrimSpace(user.Name), strings.TrimSpace(user.WechatNickname)),
		RestrictionType:  restrictionType,
		Reason:           strings.TrimSpace(reason),
		Note:             strings.TrimSpace(note),
		ExpiresAt:        expiresAt,
		CreatedByAdminID: adminID,
		CreatedByName:    strings.TrimSpace(adminName),
	}
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).
			Where("user_id = ?", user.ID).
			Assign(record).
			FirstOrCreate(record).Error; err != nil {
			return err
		}
		return s.appendDiningBuddyAuditLogTx(ctx, tx, "upsert_user_restriction", "user_restriction", strconv.FormatUint(uint64(user.ID), 10), adminID, adminName, restrictionType, map[string]interface{}{"reason": reason, "expires_at": expiresAt})
	}); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *DiningBuddyService) AdminListAuditLogs(ctx context.Context, limit int) ([]repository.DiningBuddyAuditLog, error) {
	if limit <= 0 {
		limit = 200
	}
	if limit > 500 {
		limit = 500
	}
	var logs []repository.DiningBuddyAuditLog
	if err := s.db.WithContext(ctx).Order("created_at DESC, id DESC").Limit(limit).Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (s *DiningBuddyService) resolveDiningBuddyMessage(ctx context.Context, db *gorm.DB, rawID string) (*repository.DiningBuddyMessage, error) {
	idText := strings.TrimSpace(rawID)
	if idText == "" {
		return nil, fmt.Errorf("invalid id")
	}
	var message repository.DiningBuddyMessage
	switch {
	case strings.HasPrefix(strings.ToUpper(idText), "U"):
		if err := db.WithContext(ctx).Where("uid = ?", idText).First(&message).Error; err != nil {
			return nil, err
		}
	case strings.HasPrefix(strings.ToUpper(idText), "T"):
		if err := db.WithContext(ctx).Where("tsid = ?", idText).First(&message).Error; err != nil {
			return nil, err
		}
	default:
		parsed, err := strconv.ParseUint(idText, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid id")
		}
		if err := db.WithContext(ctx).First(&message, uint(parsed)).Error; err != nil {
			return nil, err
		}
	}
	return &message, nil
}

func buildDiningBuddyMembers(members []repository.DiningBuddyPartyMember) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(members))
	for _, member := range members {
		memberID := strings.TrimSpace(member.UserUID)
		if memberID == "" {
			memberID = strconv.FormatUint(uint64(member.UserID), 10)
		}
		result = append(result, map[string]interface{}{
			"userId":     memberID,
			"userName":   member.UserName,
			"userAvatar": member.UserAvatar,
			"isHost":     member.IsHost,
			"joinedAt":   member.JoinedAt,
		})
	}
	sort.SliceStable(result, func(i, j int) bool {
		return fmt.Sprint(result[i]["joinedAt"]) < fmt.Sprint(result[j]["joinedAt"])
	})
	return result
}
