package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type MessageService struct {
	db *gorm.DB
}

type ChatTarget struct {
	Role     string `json:"role"`
	ChatID   string `json:"chatId"`
	ID       string `json:"id"`
	UID      string `json:"uid"`
	LegacyID uint   `json:"legacyId"`
	Phone    string `json:"phone"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
}

type UpsertConversationInput struct {
	TargetType   string `json:"targetType"`
	TargetID     string `json:"targetId"`
	TargetPhone  string `json:"targetPhone"`
	TargetName   string `json:"targetName"`
	TargetAvatar string `json:"targetAvatar"`
	CreatedBy    string `json:"createdBy"`
}

type SyncMessageInput struct {
	ChatID            string      `json:"chatId"`
	ExternalMessageID string      `json:"externalMessageId"`
	SenderID          string      `json:"senderId"`
	SenderRole        string      `json:"senderRole"`
	SenderName        string      `json:"senderName"`
	Content           string      `json:"content"`
	MessageType       string      `json:"messageType"`
	Coupon            interface{} `json:"coupon"`
	Order             interface{} `json:"order"`
	ImageURL          string      `json:"imageUrl"`
	Avatar            string      `json:"avatar"`
	TargetType        string      `json:"targetType"`
	TargetID          string      `json:"targetId"`
	TargetPhone       string      `json:"targetPhone"`
	TargetName        string      `json:"targetName"`
	TargetAvatar      string      `json:"targetAvatar"`
}

func NewMessageService(db *gorm.DB) *MessageService {
	return &MessageService{db: db}
}

// GetConversations 获取会话列表
func (s *MessageService) GetConversations(ctx context.Context) ([]map[string]interface{}, error) {
	if s.db == nil {
		return []map[string]interface{}{}, nil
	}

	var rows []repository.SupportConversation
	if err := s.db.WithContext(ctx).
		Order("COALESCE(last_message_at, updated_at) DESC").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	list := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		lastMessage := strings.TrimSpace(row.LastMessage)
		if lastMessage == "" {
			lastMessage = "[暂无消息]"
		}
		updatedAt := row.UpdatedAt
		if row.LastMessageAt != nil {
			updatedAt = *row.LastMessageAt
		}
		list = append(list, map[string]interface{}{
			"id":          row.ChatID,
			"chatId":      row.ChatID,
			"name":        firstNonEmpty(row.TargetName, defaultNameByRole(row.TargetType)),
			"phone":       strings.TrimSpace(row.TargetPhone),
			"role":        normalizeTargetRole(row.TargetType),
			"avatar":      strings.TrimSpace(row.TargetAvatar),
			"lastMessage": lastMessage,
			"msg":         lastMessage,
			"time":        formatClock(updatedAt),
			"unread":      0,
			"updatedAt":   updatedAt.UnixMilli(),
		})
	}
	return list, nil
}

// GetMessageHistory 获取消息历史
func (s *MessageService) GetMessageHistory(ctx context.Context, roomID string) ([]map[string]interface{}, error) {
	if s.db == nil {
		return []map[string]interface{}{}, nil
	}

	chatID := strings.TrimSpace(roomID)
	if chatID == "" {
		return []map[string]interface{}{}, nil
	}

	var rows []repository.SupportMessage
	if err := s.db.WithContext(ctx).
		Where("chat_id = ?", chatID).
		Order("id ASC").
		Limit(500).
		Find(&rows).Error; err != nil {
		return nil, err
	}

	list := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		idValue := strings.TrimSpace(row.ExternalMessageID)
		if idValue == "" {
			idValue = strconv.FormatUint(uint64(row.ID), 10)
		}
		list = append(list, map[string]interface{}{
			"id":         idValue,
			"chatId":     row.ChatID,
			"senderId":   strings.TrimSpace(row.SenderID),
			"senderRole": strings.TrimSpace(row.SenderRole),
			"sender":     firstNonEmpty(row.SenderName, defaultNameByRole(row.SenderRole)),
			"content":    row.Content,
			"messageType": firstNonEmpty(
				strings.TrimSpace(row.MessageType),
				"text",
			),
			"coupon":   parseJSONText(row.CouponData),
			"order":    parseJSONText(row.OrderData),
			"imageUrl": strings.TrimSpace(row.ImageURL),
			"avatar":   strings.TrimSpace(row.Avatar),
			"time":     formatClock(row.CreatedAt),
			"status":   "sent",
		})
	}

	return list, nil
}

func (s *MessageService) SearchChatTargets(ctx context.Context, keyword string, limit int) ([]ChatTarget, error) {
	if s.db == nil {
		return []ChatTarget{}, nil
	}

	kw := strings.TrimSpace(keyword)
	if kw == "" {
		return []ChatTarget{}, nil
	}

	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	perRoleLimit := limit
	if perRoleLimit < 10 {
		perRoleLimit = 10
	}

	list := make([]ChatTarget, 0, perRoleLimit*3)
	seen := map[string]struct{}{}
	appendUnique := func(targets []ChatTarget) {
		for _, item := range targets {
			key := item.Role + ":" + item.ChatID
			if key == ":" || item.ChatID == "" {
				continue
			}
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			list = append(list, item)
		}
	}

	users, err := s.searchRoleTargets(ctx, "user", kw, perRoleLimit)
	if err != nil {
		return nil, err
	}
	appendUnique(users)

	riders, err := s.searchRoleTargets(ctx, "rider", kw, perRoleLimit)
	if err != nil {
		return nil, err
	}
	appendUnique(riders)

	merchants, err := s.searchRoleTargets(ctx, "merchant", kw, perRoleLimit)
	if err != nil {
		return nil, err
	}
	appendUnique(merchants)

	sort.SliceStable(list, func(i, j int) bool {
		iScore := targetMatchScore(kw, list[i])
		jScore := targetMatchScore(kw, list[j])
		if iScore != jScore {
			return iScore < jScore
		}
		if list[i].LegacyID != list[j].LegacyID {
			return list[i].LegacyID > list[j].LegacyID
		}
		return list[i].Role < list[j].Role
	})

	if len(list) > limit {
		list = list[:limit]
	}
	return list, nil
}

func (s *MessageService) UpsertConversation(ctx context.Context, input UpsertConversationInput) (*repository.SupportConversation, error) {
	if s.db == nil {
		return nil, fmt.Errorf("db not initialized")
	}

	role := normalizeTargetRole(input.TargetType)
	if role == "" {
		return nil, fmt.Errorf("targetType is required")
	}

	target, err := s.resolveTarget(ctx, role, input.TargetID, input.TargetPhone)
	if err != nil {
		return nil, err
	}

	name := firstNonEmpty(strings.TrimSpace(input.TargetName), target.Name, defaultNameByRole(role))
	avatar := firstNonEmpty(strings.TrimSpace(input.TargetAvatar), target.Avatar)
	chatID := target.ChatID
	if chatID == "" {
		return nil, fmt.Errorf("target chat id is empty")
	}

	now := time.Now()
	var conversation repository.SupportConversation
	err = s.db.WithContext(ctx).Where("chat_id = ?", chatID).First(&conversation).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		conversation = repository.SupportConversation{
			ChatID:         chatID,
			TargetType:     role,
			TargetUID:      target.UID,
			TargetLegacyID: target.LegacyID,
			TargetPhone:    target.Phone,
			TargetName:     name,
			TargetAvatar:   avatar,
			CreatedBy:      strings.TrimSpace(input.CreatedBy),
			LastMessage:    "",
			UpdatedAt:      now,
		}
		if err := s.db.WithContext(ctx).Create(&conversation).Error; err != nil {
			return nil, err
		}
		return &conversation, nil
	}
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"target_type":      role,
		"target_uid":       target.UID,
		"target_legacy_id": target.LegacyID,
		"target_phone":     target.Phone,
		"target_name":      name,
		"target_avatar":    avatar,
		"updated_at":       now,
	}
	if strings.TrimSpace(input.CreatedBy) != "" {
		updates["created_by"] = strings.TrimSpace(input.CreatedBy)
	}
	if err := s.db.WithContext(ctx).Model(&conversation).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Where("id = ?", conversation.ID).First(&conversation).Error; err != nil {
		return nil, err
	}
	return &conversation, nil
}

func (s *MessageService) SyncMessage(ctx context.Context, input SyncMessageInput) (*repository.SupportMessage, error) {
	if s.db == nil {
		return nil, fmt.Errorf("db not initialized")
	}

	chatID := strings.TrimSpace(input.ChatID)
	if chatID == "" {
		return nil, fmt.Errorf("chatId is required")
	}

	messageType := strings.TrimSpace(input.MessageType)
	if messageType == "" {
		messageType = "text"
	}

	senderRole := strings.TrimSpace(input.SenderRole)
	if senderRole == "" {
		senderRole = "user"
	}

	externalID := strings.TrimSpace(input.ExternalMessageID)
	if externalID != "" {
		var existing repository.SupportMessage
		err := s.db.WithContext(ctx).
			Where("chat_id = ? AND external_message_id = ?", chatID, externalID).
			First(&existing).Error
		if err == nil {
			return &existing, nil
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	now := time.Now()
	if _, err := s.UpsertConversation(ctx, UpsertConversationInput{
		TargetType:   firstNonEmpty(input.TargetType, "user"),
		TargetID:     firstNonEmpty(input.TargetID, chatID),
		TargetPhone:  input.TargetPhone,
		TargetName:   input.TargetName,
		TargetAvatar: input.TargetAvatar,
		CreatedBy:    input.SenderID,
	}); err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		minimalConversation := repository.SupportConversation{
			ChatID:         chatID,
			TargetType:     normalizeTargetRole(firstNonEmpty(input.TargetType, senderRole, "user")),
			TargetPhone:    strings.TrimSpace(input.TargetPhone),
			TargetName:     firstNonEmpty(strings.TrimSpace(input.TargetName), defaultNameByRole(input.TargetType)),
			TargetAvatar:   strings.TrimSpace(input.TargetAvatar),
			CreatedBy:      strings.TrimSpace(input.SenderID),
			LastMessage:    "",
			LastMessageAt:  nil,
			LastSenderRole: "",
		}
		if minimalConversation.TargetType == "" {
			minimalConversation.TargetType = "user"
		}
		_ = s.db.WithContext(ctx).Where("chat_id = ?", chatID).FirstOrCreate(&minimalConversation).Error
	}

	message := repository.SupportMessage{
		ChatID:            chatID,
		ExternalMessageID: externalID,
		SenderID:          strings.TrimSpace(input.SenderID),
		SenderRole:        senderRole,
		SenderName:        firstNonEmpty(strings.TrimSpace(input.SenderName), defaultNameByRole(senderRole)),
		Content:           strings.TrimSpace(input.Content),
		MessageType:       messageType,
		CouponData:        marshalJSONText(input.Coupon),
		OrderData:         marshalJSONText(input.Order),
		ImageURL:          strings.TrimSpace(input.ImageURL),
		Avatar:            strings.TrimSpace(input.Avatar),
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := s.db.WithContext(ctx).Create(&message).Error; err != nil {
		return nil, err
	}

	preview := buildMessagePreview(messageType, message.Content)
	updates := map[string]interface{}{
		"last_message":      preview,
		"last_message_type": messageType,
		"last_sender_role":  senderRole,
		"last_message_at":   now,
		"updated_at":        now,
	}
	if senderRole != "admin" {
		if strings.TrimSpace(message.SenderName) != "" {
			updates["target_name"] = strings.TrimSpace(message.SenderName)
		}
		if strings.TrimSpace(message.SenderID) != "" {
			updates["target_phone"] = strings.TrimSpace(message.SenderID)
		}
		if strings.TrimSpace(message.Avatar) != "" {
			updates["target_avatar"] = strings.TrimSpace(message.Avatar)
		}
	}

	_ = s.db.WithContext(ctx).
		Model(&repository.SupportConversation{}).
		Where("chat_id = ?", chatID).
		Updates(updates).Error

	return &message, nil
}

func (s *MessageService) searchRoleTargets(ctx context.Context, role, keyword string, limit int) ([]ChatTarget, error) {
	kw := strings.TrimSpace(keyword)
	if kw == "" {
		return []ChatTarget{}, nil
	}
	like := "%" + kw + "%"

	switch normalizeTargetRole(role) {
	case "user":
		type row struct {
			ID    uint   `gorm:"column:id"`
			UID   string `gorm:"column:uid"`
			Phone string `gorm:"column:phone"`
			Name  string `gorm:"column:name"`
		}
		var rows []row
		if err := s.db.WithContext(ctx).
			Table("users").
			Select("id, uid, phone, name").
			Where("(CAST(id AS TEXT) LIKE ? OR uid LIKE ? OR phone LIKE ? OR name LIKE ?)", like, like, like, like).
			Order("id DESC").
			Limit(limit).
			Scan(&rows).Error; err != nil {
			return nil, err
		}
		list := make([]ChatTarget, 0, len(rows))
		for _, item := range rows {
			target := ChatTarget{
				Role:     "user",
				ChatID:   chooseChatID(item.UID, item.ID, item.Phone),
				ID:       firstNonEmpty(item.UID, strconv.FormatUint(uint64(item.ID), 10)),
				UID:      strings.TrimSpace(item.UID),
				LegacyID: item.ID,
				Phone:    strings.TrimSpace(item.Phone),
				Name:     firstNonEmpty(strings.TrimSpace(item.Name), strings.TrimSpace(item.Phone), "用户"),
			}
			list = append(list, target)
		}
		return list, nil
	case "rider":
		type row struct {
			ID     uint   `gorm:"column:id"`
			UID    string `gorm:"column:uid"`
			Phone  string `gorm:"column:phone"`
			Name   string `gorm:"column:name"`
			Avatar string `gorm:"column:avatar"`
		}
		var rows []row
		if err := s.db.WithContext(ctx).
			Table("riders").
			Select("id, uid, phone, name, avatar").
			Where("(CAST(id AS TEXT) LIKE ? OR uid LIKE ? OR phone LIKE ? OR name LIKE ?)", like, like, like, like).
			Order("id DESC").
			Limit(limit).
			Scan(&rows).Error; err != nil {
			return nil, err
		}
		list := make([]ChatTarget, 0, len(rows))
		for _, item := range rows {
			target := ChatTarget{
				Role:     "rider",
				ChatID:   chooseChatID(item.UID, item.ID, item.Phone),
				ID:       firstNonEmpty(item.UID, strconv.FormatUint(uint64(item.ID), 10)),
				UID:      strings.TrimSpace(item.UID),
				LegacyID: item.ID,
				Phone:    strings.TrimSpace(item.Phone),
				Name:     firstNonEmpty(strings.TrimSpace(item.Name), strings.TrimSpace(item.Phone), "骑手"),
				Avatar:   strings.TrimSpace(item.Avatar),
			}
			list = append(list, target)
		}
		return list, nil
	case "merchant":
		type row struct {
			ID    uint   `gorm:"column:id"`
			UID   string `gorm:"column:uid"`
			Phone string `gorm:"column:phone"`
			Name  string `gorm:"column:name"`
		}
		var rows []row
		if err := s.db.WithContext(ctx).
			Table("merchants").
			Select("id, uid, phone, name").
			Where("(CAST(id AS TEXT) LIKE ? OR uid LIKE ? OR phone LIKE ? OR name LIKE ?)", like, like, like, like).
			Order("id DESC").
			Limit(limit).
			Scan(&rows).Error; err != nil {
			return nil, err
		}
		list := make([]ChatTarget, 0, len(rows))
		for _, item := range rows {
			target := ChatTarget{
				Role:     "merchant",
				ChatID:   chooseChatID(item.UID, item.ID, item.Phone),
				ID:       firstNonEmpty(item.UID, strconv.FormatUint(uint64(item.ID), 10)),
				UID:      strings.TrimSpace(item.UID),
				LegacyID: item.ID,
				Phone:    strings.TrimSpace(item.Phone),
				Name:     firstNonEmpty(strings.TrimSpace(item.Name), strings.TrimSpace(item.Phone), "商家"),
			}
			list = append(list, target)
		}
		return list, nil
	default:
		return []ChatTarget{}, nil
	}
}

func (s *MessageService) resolveTarget(ctx context.Context, role, rawID, rawPhone string) (*ChatTarget, error) {
	targetRole := normalizeTargetRole(role)
	if targetRole == "" {
		return nil, fmt.Errorf("invalid target role: %s", role)
	}

	idText := strings.TrimSpace(rawID)
	if idText != "" {
		target, err := s.getTargetByIdentifier(ctx, targetRole, idText)
		if err == nil {
			return target, nil
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	phone := strings.TrimSpace(rawPhone)
	if phone != "" {
		target, err := s.getTargetByPhone(ctx, targetRole, phone)
		if err == nil {
			return target, nil
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	return nil, gorm.ErrRecordNotFound
}

func (s *MessageService) getTargetByIdentifier(ctx context.Context, role, identifier string) (*ChatTarget, error) {
	role = normalizeTargetRole(role)
	idText := strings.TrimSpace(identifier)
	if idText == "" {
		return nil, gorm.ErrRecordNotFound
	}

	switch role {
	case "user":
		var row repository.User
		query := s.db.WithContext(ctx).Model(&repository.User{})
		query = applyIdentifierFilter(query, idText)
		if err := query.First(&row).Error; err != nil {
			return nil, err
		}
		return &ChatTarget{
			Role:     role,
			ChatID:   chooseChatID(row.UID, row.ID, row.Phone),
			ID:       firstNonEmpty(row.UID, strconv.FormatUint(uint64(row.ID), 10)),
			UID:      strings.TrimSpace(row.UID),
			LegacyID: row.ID,
			Phone:    strings.TrimSpace(row.Phone),
			Name:     firstNonEmpty(strings.TrimSpace(row.Name), strings.TrimSpace(row.Phone), "用户"),
		}, nil
	case "rider":
		var row repository.Rider
		query := s.db.WithContext(ctx).Model(&repository.Rider{})
		query = applyIdentifierFilter(query, idText)
		if err := query.First(&row).Error; err != nil {
			return nil, err
		}
		return &ChatTarget{
			Role:     role,
			ChatID:   chooseChatID(row.UID, row.ID, row.Phone),
			ID:       firstNonEmpty(row.UID, strconv.FormatUint(uint64(row.ID), 10)),
			UID:      strings.TrimSpace(row.UID),
			LegacyID: row.ID,
			Phone:    strings.TrimSpace(row.Phone),
			Name:     firstNonEmpty(strings.TrimSpace(row.Name), strings.TrimSpace(row.Phone), "骑手"),
			Avatar:   strings.TrimSpace(row.Avatar),
		}, nil
	case "merchant":
		var row repository.Merchant
		query := s.db.WithContext(ctx).Model(&repository.Merchant{})
		query = applyIdentifierFilter(query, idText)
		if err := query.First(&row).Error; err != nil {
			return nil, err
		}
		return &ChatTarget{
			Role:     role,
			ChatID:   chooseChatID(row.UID, row.ID, row.Phone),
			ID:       firstNonEmpty(row.UID, strconv.FormatUint(uint64(row.ID), 10)),
			UID:      strings.TrimSpace(row.UID),
			LegacyID: row.ID,
			Phone:    strings.TrimSpace(row.Phone),
			Name:     firstNonEmpty(strings.TrimSpace(row.Name), strings.TrimSpace(row.Phone), "商家"),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported role: %s", role)
	}
}

func (s *MessageService) getTargetByPhone(ctx context.Context, role, phone string) (*ChatTarget, error) {
	role = normalizeTargetRole(role)
	phoneText := strings.TrimSpace(phone)
	if phoneText == "" {
		return nil, gorm.ErrRecordNotFound
	}

	switch role {
	case "user":
		var row repository.User
		if err := s.db.WithContext(ctx).Where("phone = ?", phoneText).First(&row).Error; err != nil {
			return nil, err
		}
		return &ChatTarget{
			Role:     role,
			ChatID:   chooseChatID(row.UID, row.ID, row.Phone),
			ID:       firstNonEmpty(row.UID, strconv.FormatUint(uint64(row.ID), 10)),
			UID:      strings.TrimSpace(row.UID),
			LegacyID: row.ID,
			Phone:    strings.TrimSpace(row.Phone),
			Name:     firstNonEmpty(strings.TrimSpace(row.Name), strings.TrimSpace(row.Phone), "用户"),
		}, nil
	case "rider":
		var row repository.Rider
		if err := s.db.WithContext(ctx).Where("phone = ?", phoneText).First(&row).Error; err != nil {
			return nil, err
		}
		return &ChatTarget{
			Role:     role,
			ChatID:   chooseChatID(row.UID, row.ID, row.Phone),
			ID:       firstNonEmpty(row.UID, strconv.FormatUint(uint64(row.ID), 10)),
			UID:      strings.TrimSpace(row.UID),
			LegacyID: row.ID,
			Phone:    strings.TrimSpace(row.Phone),
			Name:     firstNonEmpty(strings.TrimSpace(row.Name), strings.TrimSpace(row.Phone), "骑手"),
			Avatar:   strings.TrimSpace(row.Avatar),
		}, nil
	case "merchant":
		var row repository.Merchant
		if err := s.db.WithContext(ctx).Where("phone = ?", phoneText).First(&row).Error; err != nil {
			return nil, err
		}
		return &ChatTarget{
			Role:     role,
			ChatID:   chooseChatID(row.UID, row.ID, row.Phone),
			ID:       firstNonEmpty(row.UID, strconv.FormatUint(uint64(row.ID), 10)),
			UID:      strings.TrimSpace(row.UID),
			LegacyID: row.ID,
			Phone:    strings.TrimSpace(row.Phone),
			Name:     firstNonEmpty(strings.TrimSpace(row.Name), strings.TrimSpace(row.Phone), "商家"),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported role: %s", role)
	}
}

func chooseChatID(uid string, legacyID uint, phone string) string {
	if strings.TrimSpace(uid) != "" {
		return strings.TrimSpace(uid)
	}
	if strings.TrimSpace(phone) != "" {
		return strings.TrimSpace(phone)
	}
	if legacyID > 0 {
		return strconv.FormatUint(uint64(legacyID), 10)
	}
	return ""
}

func normalizeTargetRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "user", "customer":
		return "user"
	case "rider":
		return "rider"
	case "merchant", "shop":
		return "merchant"
	default:
		return ""
	}
}

func applyIdentifierFilter(query *gorm.DB, raw string) *gorm.DB {
	idText := strings.TrimSpace(raw)
	switch {
	case idText == "":
		return query.Where("1 = 0")
	case idkit.UIDPattern.MatchString(idText):
		return query.Where("uid = ?", idText)
	case idkit.TSIDPattern.MatchString(idText):
		return query.Where("tsid = ?", idText)
	default:
		if n, err := strconv.ParseUint(idText, 10, 64); err == nil && n > 0 {
			return query.Where("id = ?", n)
		}
		return query.Where("phone = ?", idText)
	}
}

func parseJSONText(raw string) interface{} {
	text := strings.TrimSpace(raw)
	if text == "" {
		return nil
	}
	var payload interface{}
	if err := json.Unmarshal([]byte(text), &payload); err != nil {
		return nil
	}
	return payload
}

func marshalJSONText(value interface{}) string {
	if value == nil {
		return ""
	}
	buf, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(buf)
}

func buildMessagePreview(messageType, content string) string {
	switch strings.ToLower(strings.TrimSpace(messageType)) {
	case "image":
		return "[图片]"
	case "coupon":
		return "[优惠券]"
	case "order":
		return "[订单]"
	default:
		text := strings.TrimSpace(content)
		if text == "" {
			return "[暂无消息]"
		}
		return text
	}
}

func formatClock(t time.Time) string {
	if t.IsZero() {
		return "--:--"
	}
	return t.Format("15:04")
}

func defaultNameByRole(role string) string {
	switch normalizeTargetRole(role) {
	case "rider":
		return "骑手"
	case "merchant":
		return "商家"
	default:
		return "用户"
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func targetMatchScore(keyword string, target ChatTarget) int {
	kw := strings.ToLower(strings.TrimSpace(keyword))
	if kw == "" {
		return 99
	}
	candidates := []string{
		strings.ToLower(strings.TrimSpace(target.UID)),
		strings.ToLower(strings.TrimSpace(target.Phone)),
		strings.ToLower(strings.TrimSpace(target.ID)),
		strings.ToLower(strconv.FormatUint(uint64(target.LegacyID), 10)),
		strings.ToLower(strings.TrimSpace(target.Name)),
	}

	for _, item := range candidates {
		if item != "" && item == kw {
			return 0
		}
	}
	for _, item := range candidates {
		if item != "" && strings.HasPrefix(item, kw) {
			return 1
		}
	}
	for _, item := range candidates {
		if item != "" && strings.Contains(item, kw) {
			return 2
		}
	}
	return 3
}
