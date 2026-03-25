package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	diningBuddyStatusOpen   = "open"
	diningBuddyStatusFull   = "full"
	diningBuddyStatusClosed = "closed"
)

type DiningBuddyService struct {
	db *gorm.DB
}

type DiningBuddyCreatePartyInput struct {
	Category    string `json:"category"`
	Title       string `json:"title"`
	Location    string `json:"location"`
	Time        string `json:"time"`
	Description string `json:"description"`
	MaxPeople   int    `json:"maxPeople"`
}

type DiningBuddySendMessageInput struct {
	Content string `json:"content"`
}

type DiningBuddyPartyView struct {
	ID          string `json:"id"`
	TSID        string `json:"tsid,omitempty"`
	Category    string `json:"category"`
	Title       string `json:"title"`
	Host        string `json:"host"`
	HostAvatar  string `json:"hostAvatar,omitempty"`
	Location    string `json:"location"`
	Time        string `json:"time"`
	Current     int    `json:"current"`
	Max         int    `json:"max"`
	Status      string `json:"status"`
	Description string `json:"description,omitempty"`
	MatchScore  int    `json:"matchScore"`
	MatchReason string `json:"matchReason"`
	Joined      bool   `json:"joined"`
}

type DiningBuddyMessageView struct {
	ID         string `json:"id"`
	TSID       string `json:"tsid,omitempty"`
	Sender     string `json:"sender"`
	SenderName string `json:"senderName,omitempty"`
	Text       string `json:"text"`
	Time       string `json:"time"`
}

type diningBuddyUserSummary struct {
	ID     uint
	UID    string
	Name   string
	Avatar string
}

func NewDiningBuddyService(db *gorm.DB) *DiningBuddyService {
	return &DiningBuddyService{db: db}
}

func (s *DiningBuddyService) ListParties(ctx context.Context, viewerUserID uint, category string, limit int) ([]DiningBuddyPartyView, error) {
	if s.db == nil {
		return []DiningBuddyPartyView{}, nil
	}

	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	query := s.db.WithContext(ctx).
		Preload("Members", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("joined_at ASC")
		}).
		Where("status IN ?", []string{diningBuddyStatusOpen, diningBuddyStatusFull}).
		Order("updated_at DESC, created_at DESC").
		Limit(limit)

	if normalized, ok := normalizeDiningBuddyCategory(category); ok {
		query = query.Where("category = ?", normalized)
	}

	var parties []repository.DiningBuddyParty
	if err := query.Find(&parties).Error; err != nil {
		return nil, err
	}

	result := make([]DiningBuddyPartyView, 0, len(parties))
	for _, party := range parties {
		result = append(result, buildDiningBuddyPartyView(&party, viewerUserID))
	}
	return result, nil
}

func (s *DiningBuddyService) CreateParty(ctx context.Context, viewerUserID uint, input DiningBuddyCreatePartyInput) (*DiningBuddyPartyView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}
	if viewerUserID == 0 {
		return nil, fmt.Errorf("%w: missing current user", ErrUnauthorized)
	}

	actor, err := s.loadDiningBuddyUserSummary(ctx, s.db, viewerUserID)
	if err != nil {
		return nil, err
	}

	normalized, err := validateDiningBuddyCreateInput(input)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	var created repository.DiningBuddyParty
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		uid, tsid, idErr := idkit.NextIdentityForTable(ctx, tx, created.TableName(), now)
		if idErr != nil {
			return idErr
		}

		created = repository.DiningBuddyParty{
			UnifiedIdentity: repository.UnifiedIdentity{UID: uid, TSID: tsid},
			Category:        normalized.Category,
			Title:           normalized.Title,
			Location:        normalized.Location,
			ActivityTime:    normalized.Time,
			Description:     normalized.Description,
			MaxPeople:       normalized.MaxPeople,
			Status:          diningBuddyStatusOpen,
			HostUserID:      actor.ID,
			HostUserUID:     actor.UID,
			HostName:        actor.Name,
			HostAvatar:      actor.Avatar,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}

		member := repository.DiningBuddyPartyMember{
			PartyID:    created.ID,
			UserID:     actor.ID,
			UserUID:    actor.UID,
			UserName:   actor.Name,
			UserAvatar: actor.Avatar,
			IsHost:     true,
			JoinedAt:   now,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		if err := tx.Create(&member).Error; err != nil {
			return err
		}

		if err := s.createDiningBuddySystemMessageTx(ctx, tx, created.ID, now, "组局已创建，欢迎先自我介绍。"); err != nil {
			return err
		}

		created.Members = []repository.DiningBuddyPartyMember{member}
		return nil
	}); err != nil {
		return nil, err
	}

	view := buildDiningBuddyPartyView(&created, viewerUserID)
	return &view, nil
}

func (s *DiningBuddyService) JoinParty(ctx context.Context, viewerUserID uint, partyID string) (*DiningBuddyPartyView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}
	if viewerUserID == 0 {
		return nil, fmt.Errorf("%w: missing current user", ErrUnauthorized)
	}

	actor, err := s.loadDiningBuddyUserSummary(ctx, s.db, viewerUserID)
	if err != nil {
		return nil, err
	}

	var party repository.DiningBuddyParty
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		loadedParty, loadErr := s.resolveDiningBuddyParty(ctx, tx, partyID)
		if loadErr != nil {
			return loadErr
		}
		if strings.EqualFold(strings.TrimSpace(loadedParty.Status), diningBuddyStatusClosed) {
			return fmt.Errorf("%w: party is closed", ErrForbidden)
		}

		var existing repository.DiningBuddyPartyMember
		err := tx.WithContext(ctx).
			Where("party_id = ? AND user_id = ?", loadedParty.ID, actor.ID).
			First(&existing).Error
		if err == nil {
			party = *loadedParty
			return tx.WithContext(ctx).
				Preload("Members", func(inner *gorm.DB) *gorm.DB {
					return inner.Order("joined_at ASC")
				}).
				First(&party, loadedParty.ID).Error
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			return err
		}

		var memberCount int64
		if err := tx.WithContext(ctx).
			Model(&repository.DiningBuddyPartyMember{}).
			Where("party_id = ?", loadedParty.ID).
			Count(&memberCount).Error; err != nil {
			return err
		}
		if int(memberCount) >= loadedParty.MaxPeople {
			return fmt.Errorf("%w: party is full", ErrForbidden)
		}

		now := time.Now()
		member := repository.DiningBuddyPartyMember{
			PartyID:    loadedParty.ID,
			UserID:     actor.ID,
			UserUID:    actor.UID,
			UserName:   actor.Name,
			UserAvatar: actor.Avatar,
			JoinedAt:   now,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		if err := tx.Create(&member).Error; err != nil {
			return err
		}

		nextStatus := diningBuddyStatusOpen
		if int(memberCount)+1 >= loadedParty.MaxPeople {
			nextStatus = diningBuddyStatusFull
		}
		if err := tx.WithContext(ctx).
			Model(&repository.DiningBuddyParty{}).
			Where("id = ?", loadedParty.ID).
			Updates(map[string]interface{}{
				"status":     nextStatus,
				"updated_at": now,
			}).Error; err != nil {
			return err
		}

		if err := s.createDiningBuddySystemMessageTx(ctx, tx, loadedParty.ID, now, actor.Name+" 加入了组局。"); err != nil {
			return err
		}

		return tx.WithContext(ctx).
			Preload("Members", func(inner *gorm.DB) *gorm.DB {
				return inner.Order("joined_at ASC")
			}).
			First(&party, loadedParty.ID).Error
	}); err != nil {
		return nil, err
	}

	view := buildDiningBuddyPartyView(&party, viewerUserID)
	return &view, nil
}

func (s *DiningBuddyService) ListMessages(ctx context.Context, viewerUserID uint, partyID string) ([]DiningBuddyMessageView, error) {
	if s.db == nil {
		return []DiningBuddyMessageView{}, nil
	}
	if viewerUserID == 0 {
		return nil, fmt.Errorf("%w: missing current user", ErrUnauthorized)
	}

	party, err := s.resolveDiningBuddyParty(ctx, s.db, partyID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureDiningBuddyMember(ctx, s.db, party.ID, viewerUserID); err != nil {
		return nil, err
	}

	var messages []repository.DiningBuddyMessage
	if err := s.db.WithContext(ctx).
		Where("party_id = ?", party.ID).
		Order("created_at ASC").
		Limit(500).
		Find(&messages).Error; err != nil {
		return nil, err
	}

	result := make([]DiningBuddyMessageView, 0, len(messages))
	for _, message := range messages {
		result = append(result, buildDiningBuddyMessageView(&message, viewerUserID))
	}
	return result, nil
}

func (s *DiningBuddyService) SendMessage(ctx context.Context, viewerUserID uint, partyID string, input DiningBuddySendMessageInput) (*DiningBuddyMessageView, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database unavailable")
	}
	if viewerUserID == 0 {
		return nil, fmt.Errorf("%w: missing current user", ErrUnauthorized)
	}

	content := strings.TrimSpace(input.Content)
	if content == "" {
		return nil, fmt.Errorf("content is required")
	}
	if utf8.RuneCountInString(content) > 200 {
		return nil, fmt.Errorf("content too long")
	}

	actor, err := s.loadDiningBuddyUserSummary(ctx, s.db, viewerUserID)
	if err != nil {
		return nil, err
	}

	var created repository.DiningBuddyMessage
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		party, partyErr := s.resolveDiningBuddyParty(ctx, tx, partyID)
		if partyErr != nil {
			return partyErr
		}
		if err := s.ensureDiningBuddyMember(ctx, tx, party.ID, actor.ID); err != nil {
			return err
		}

		now := time.Now()
		uid, tsid, idErr := idkit.NextIdentityForTable(ctx, tx, created.TableName(), now)
		if idErr != nil {
			return idErr
		}

		created = repository.DiningBuddyMessage{
			UnifiedIdentity: repository.UnifiedIdentity{UID: uid, TSID: tsid},
			PartyID:         party.ID,
			SenderType:      "user",
			SenderUserID:    actor.ID,
			SenderUserUID:   actor.UID,
			SenderName:      actor.Name,
			SenderAvatar:    actor.Avatar,
			MessageType:     "text",
			Content:         content,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}

		return tx.WithContext(ctx).
			Model(&repository.DiningBuddyParty{}).
			Where("id = ?", party.ID).
			Update("updated_at", now).Error
	}); err != nil {
		return nil, err
	}

	view := buildDiningBuddyMessageView(&created, viewerUserID)
	return &view, nil
}

func validateDiningBuddyCreateInput(input DiningBuddyCreatePartyInput) (DiningBuddyCreatePartyInput, error) {
	normalized := DiningBuddyCreatePartyInput{
		Category:    "food",
		Title:       strings.TrimSpace(input.Title),
		Location:    strings.TrimSpace(input.Location),
		Time:        strings.TrimSpace(input.Time),
		Description: strings.TrimSpace(input.Description),
		MaxPeople:   input.MaxPeople,
	}
	if category, ok := normalizeDiningBuddyCategory(input.Category); ok {
		normalized.Category = category
	}
	if normalized.Title == "" {
		return normalized, fmt.Errorf("title is required")
	}
	if utf8.RuneCountInString(normalized.Title) > 40 {
		return normalized, fmt.Errorf("title too long")
	}
	if normalized.Location == "" {
		return normalized, fmt.Errorf("location is required")
	}
	if utf8.RuneCountInString(normalized.Location) > 80 {
		return normalized, fmt.Errorf("location too long")
	}
	if utf8.RuneCountInString(normalized.Time) > 40 {
		return normalized, fmt.Errorf("time too long")
	}
	if utf8.RuneCountInString(normalized.Description) > 100 {
		return normalized, fmt.Errorf("description too long")
	}
	if normalized.MaxPeople < 2 {
		normalized.MaxPeople = 2
	}
	if normalized.MaxPeople > 6 {
		normalized.MaxPeople = 6
	}
	return normalized, nil
}

func normalizeDiningBuddyCategory(raw string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "chat":
		return "chat", true
	case "study":
		return "study", true
	case "food":
		return "food", true
	default:
		return "", false
	}
}

func (s *DiningBuddyService) loadDiningBuddyUserSummary(ctx context.Context, db *gorm.DB, viewerUserID uint) (*diningBuddyUserSummary, error) {
	var user repository.User
	if err := db.WithContext(ctx).First(&user, viewerUserID).Error; err != nil {
		return nil, err
	}

	name := strings.TrimSpace(user.Name)
	if name == "" {
		name = strings.TrimSpace(user.WechatNickname)
	}
	if name == "" {
		name = "用户" + suffixDigits(user.Phone, 4)
	}
	avatar := strings.TrimSpace(user.AvatarURL)
	if avatar == "" {
		avatar = strings.TrimSpace(user.WechatAvatar)
	}

	return &diningBuddyUserSummary{
		ID:     user.ID,
		UID:    strings.TrimSpace(user.UID),
		Name:   name,
		Avatar: avatar,
	}, nil
}

func (s *DiningBuddyService) resolveDiningBuddyParty(ctx context.Context, db *gorm.DB, rawID string) (*repository.DiningBuddyParty, error) {
	idText := strings.TrimSpace(rawID)
	if idText == "" {
		return nil, fmt.Errorf("invalid id")
	}
	var party repository.DiningBuddyParty
	switch {
	case idkit.UIDPattern.MatchString(idText):
		if err := db.WithContext(ctx).Where("uid = ?", idText).First(&party).Error; err != nil {
			return nil, err
		}
		return &party, nil
	case idkit.TSIDPattern.MatchString(idText):
		if err := db.WithContext(ctx).Where("tsid = ?", idText).First(&party).Error; err != nil {
			return nil, err
		}
		return &party, nil
	default:
		resolvedID, err := strconv.ParseUint(idText, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid id")
		}
		if err := db.WithContext(ctx).First(&party, uint(resolvedID)).Error; err != nil {
			return nil, err
		}
		return &party, nil
	}
}

func (s *DiningBuddyService) ensureDiningBuddyMember(ctx context.Context, db *gorm.DB, partyID, userID uint) error {
	var count int64
	if err := db.WithContext(ctx).
		Model(&repository.DiningBuddyPartyMember{}).
		Where("party_id = ? AND user_id = ?", partyID, userID).
		Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("%w: party membership required", ErrForbidden)
	}
	return nil
}

func (s *DiningBuddyService) createDiningBuddySystemMessageTx(ctx context.Context, tx *gorm.DB, partyID uint, now time.Time, content string) error {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil
	}

	uid, tsid, err := idkit.NextIdentityForTable(ctx, tx, (&repository.DiningBuddyMessage{}).TableName(), now)
	if err != nil {
		return err
	}

	message := repository.DiningBuddyMessage{
		UnifiedIdentity: repository.UnifiedIdentity{UID: uid, TSID: tsid},
		PartyID:         partyID,
		SenderType:      "system",
		SenderName:      "系统",
		MessageType:     "text",
		Content:         content,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := tx.Create(&message).Error; err != nil {
		return err
	}

	return tx.WithContext(ctx).
		Model(&repository.DiningBuddyParty{}).
		Where("id = ?", partyID).
		Update("updated_at", now).Error
}

func buildDiningBuddyPartyView(party *repository.DiningBuddyParty, viewerUserID uint) DiningBuddyPartyView {
	current := len(party.Members)
	joined := false
	for _, member := range party.Members {
		if member.UserID == viewerUserID {
			joined = true
			break
		}
	}

	status := strings.TrimSpace(party.Status)
	if current >= party.MaxPeople {
		status = diningBuddyStatusFull
	}
	if status == "" {
		status = diningBuddyStatusOpen
	}

	matchReason := diningBuddyCategoryReason(party.Category)
	matchScore := 92
	switch {
	case viewerUserID != 0 && party.HostUserID == viewerUserID:
		matchReason = "你发起的局，等人来聊。"
		matchScore = 100
	case joined:
		matchReason = "你已加入，去群里确认细节。"
		matchScore = 100
	case status == diningBuddyStatusFull:
		matchReason = "这场组局人数已满。"
		matchScore = 86
	}

	return DiningBuddyPartyView{
		ID:          publicDiningBuddyPartyID(party),
		TSID:        strings.TrimSpace(party.TSID),
		Category:    party.Category,
		Title:       party.Title,
		Host:        firstNonEmpty(strings.TrimSpace(party.HostName), "匿名用户"),
		HostAvatar:  strings.TrimSpace(party.HostAvatar),
		Location:    party.Location,
		Time:        displayDiningBuddyPartyTime(party),
		Current:     current,
		Max:         party.MaxPeople,
		Status:      status,
		Description: strings.TrimSpace(party.Description),
		MatchScore:  matchScore,
		MatchReason: matchReason,
		Joined:      joined,
	}
}

func buildDiningBuddyMessageView(message *repository.DiningBuddyMessage, viewerUserID uint) DiningBuddyMessageView {
	sender := "other"
	if strings.EqualFold(strings.TrimSpace(message.SenderType), "system") {
		sender = "system"
	} else if viewerUserID != 0 && message.SenderUserID == viewerUserID {
		sender = "me"
	}

	return DiningBuddyMessageView{
		ID:         publicDiningBuddyMessageID(message),
		TSID:       strings.TrimSpace(message.TSID),
		Sender:     sender,
		SenderName: strings.TrimSpace(message.SenderName),
		Text:       strings.TrimSpace(message.Content),
		Time:       formatClock(message.CreatedAt),
	}
}

func publicDiningBuddyPartyID(party *repository.DiningBuddyParty) string {
	if party == nil {
		return ""
	}
	if uid := strings.TrimSpace(party.UID); uid != "" {
		return uid
	}
	return fmt.Sprintf("%d", party.ID)
}

func publicDiningBuddyMessageID(message *repository.DiningBuddyMessage) string {
	if message == nil {
		return ""
	}
	if uid := strings.TrimSpace(message.UID); uid != "" {
		return uid
	}
	return fmt.Sprintf("%d", message.ID)
}

func displayDiningBuddyPartyTime(party *repository.DiningBuddyParty) string {
	if party == nil {
		return ""
	}
	if value := strings.TrimSpace(party.ActivityTime); value != "" {
		return value
	}
	if time.Since(party.CreatedAt) < time.Minute {
		return "刚刚发布"
	}
	return party.CreatedAt.Format("01-02 15:04")
}

func diningBuddyCategoryReason(category string) string {
	switch strings.TrimSpace(category) {
	case "chat":
		return "先轻松聊聊，适合快速破冰。"
	case "study":
		return "目标明确，适合互相监督。"
	default:
		return "约饭门槛低，最适合第一次见面。"
	}
}

func suffixDigits(value string, size int) string {
	text := strings.TrimSpace(value)
	if len(text) <= size || size <= 0 {
		return text
	}
	return text[len(text)-size:]
}
