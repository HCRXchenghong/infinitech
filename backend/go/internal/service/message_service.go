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
	ChatID        string `json:"chatId"`
	TargetType    string `json:"targetType"`
	TargetID      string `json:"targetId"`
	TargetPhone   string `json:"targetPhone"`
	TargetName    string `json:"targetName"`
	TargetAvatar  string `json:"targetAvatar"`
	TargetOrderID string `json:"targetOrderId"`
	CreatedBy     string `json:"createdBy"`
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

type conversationScope struct {
	role   string
	ids    []string
	phones []string
}

type conversationParty struct {
	Role     string
	ChatID   string
	ID       string
	UID      string
	LegacyID uint
	Phone    string
	Name     string
	Avatar   string
}

type conversationUpdate struct {
	Preview        string
	MessageType    string
	LastSenderRole string
	MessageAt      time.Time
	UnreadDelta    int64
	MarkRead       bool
}

func NewMessageService(db *gorm.DB) *MessageService {
	return &MessageService{db: db}
}

func (s *MessageService) GetConversations(ctx context.Context) ([]map[string]interface{}, error) {
	if s.db == nil {
		return []map[string]interface{}{}, nil
	}

	scope, err := messageConversationScopeFromContext(ctx)
	if err != nil {
		return nil, err
	}

	query := applyConversationScope(
		s.db.WithContext(ctx).Model(&repository.MessageConversation{}),
		scope,
	)

	var rows []repository.MessageConversation
	if err := query.
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
			"roomId":      row.ChatID,
			"name":        firstNonEmpty(row.PeerName, defaultNameByRole(row.PeerRole)),
			"phone":       strings.TrimSpace(row.PeerPhone),
			"role":        normalizeConversationListRole(row.PeerRole),
			"avatar":      strings.TrimSpace(row.PeerAvatar),
			"avatarUrl":   strings.TrimSpace(row.PeerAvatar),
			"lastMessage": lastMessage,
			"msg":         lastMessage,
			"time":        formatClock(updatedAt),
			"unread":      maxInt64(row.UnreadCount, 0),
			"updatedAt":   updatedAt.UnixMilli(),
			"targetId":    strings.TrimSpace(row.PeerID),
		})
	}

	return list, nil
}

func (s *MessageService) GetMessageHistory(ctx context.Context, roomID string) ([]map[string]interface{}, error) {
	if s.db == nil {
		return []map[string]interface{}{}, nil
	}

	chatID := strings.TrimSpace(roomID)
	if chatID == "" {
		return []map[string]interface{}{}, nil
	}

	if err := s.ensureConversationAccess(ctx, chatID); err != nil {
		return nil, err
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
			"id":          idValue,
			"chatId":      row.ChatID,
			"senderId":    strings.TrimSpace(row.SenderID),
			"senderRole":  strings.TrimSpace(row.SenderRole),
			"sender":      firstNonEmpty(row.SenderName, defaultNameByRole(row.SenderRole)),
			"content":     row.Content,
			"messageType": firstNonEmpty(strings.TrimSpace(row.MessageType), "text"),
			"coupon":      parseJSONText(row.CouponData),
			"order":       parseJSONText(row.OrderData),
			"imageUrl":    strings.TrimSpace(row.ImageURL),
			"avatar":      strings.TrimSpace(row.Avatar),
			"timestamp":   row.CreatedAt.UnixMilli(),
			"createdAt":   row.CreatedAt.UnixMilli(),
			"time":        formatClock(row.CreatedAt),
			"status":      "sent",
		})
	}

	return list, nil
}

func (s *MessageService) MarkConversationRead(ctx context.Context, chatID string) error {
	if s.db == nil {
		return nil
	}

	normalizedChatID := strings.TrimSpace(chatID)
	if normalizedChatID == "" {
		return fmt.Errorf("chatId is required")
	}

	scope, err := messageConversationScopeFromContext(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	query := applyConversationScope(
		s.db.WithContext(ctx).Model(&repository.MessageConversation{}).
			Where("chat_id = ?", normalizedChatID),
		scope,
	)
	result := query.Updates(map[string]interface{}{
		"unread_count": 0,
		"last_read_at": now,
		"updated_at":   now,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *MessageService) MarkAllConversationsRead(ctx context.Context) error {
	if s.db == nil {
		return nil
	}

	scope, err := messageConversationScopeFromContext(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	query := applyConversationScope(
		s.db.WithContext(ctx).Model(&repository.MessageConversation{}),
		scope,
	)
	return query.Updates(map[string]interface{}{
		"unread_count": 0,
		"last_read_at": now,
		"updated_at":   now,
	}).Error
}

func (s *MessageService) SearchChatTargets(ctx context.Context, keyword string, limit int) ([]ChatTarget, error) {
	if s.db == nil {
		return []ChatTarget{}, nil
	}

	if authContextRole(ctx) != "admin" {
		return nil, fmt.Errorf("only admin can search chat targets")
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

func (s *MessageService) UpsertConversation(ctx context.Context, input UpsertConversationInput) (*repository.MessageConversation, error) {
	if s.db == nil {
		return nil, fmt.Errorf("db not initialized")
	}

	owner, err := s.resolveCurrentOwner(ctx)
	if err != nil {
		return nil, err
	}

	peer, err := s.resolveConversationPeer(
		ctx,
		input.TargetType,
		input.TargetID,
		input.TargetPhone,
		input.TargetName,
		input.TargetAvatar,
		input.ChatID,
		owner,
	)
	if err != nil {
		return nil, err
	}

	chatID := resolveConversationChatID(input.ChatID, peer.ChatID, defaultChatIDForOwner(owner))
	if chatID == "" {
		return nil, fmt.Errorf("chatId is required")
	}

	return s.upsertConversationRow(ctx, owner, peer, chatID, conversationUpdate{})
}

func (s *MessageService) SyncMessage(ctx context.Context, input SyncMessageInput) (*repository.SupportMessage, error) {
	if s.db == nil {
		return nil, fmt.Errorf("db not initialized")
	}

	chatID := strings.TrimSpace(input.ChatID)
	if chatID == "" {
		return nil, fmt.Errorf("chatId is required")
	}

	sender, err := s.resolveCurrentSender(ctx, input)
	if err != nil {
		return nil, err
	}

	target, err := s.resolveConversationPeer(
		ctx,
		input.TargetType,
		input.TargetID,
		input.TargetPhone,
		input.TargetName,
		input.TargetAvatar,
		input.ChatID,
		sender,
	)
	if err != nil {
		return nil, err
	}

	messageType := strings.TrimSpace(input.MessageType)
	if messageType == "" {
		messageType = "text"
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
	message := repository.SupportMessage{
		ChatID:            chatID,
		ExternalMessageID: externalID,
		SenderID:          strings.TrimSpace(sender.ID),
		SenderRole:        strings.TrimSpace(sender.Role),
		SenderName:        firstNonEmpty(strings.TrimSpace(sender.Name), defaultNameByRole(sender.Role)),
		Content:           stringifyMessageContent(input.Content),
		MessageType:       messageType,
		CouponData:        marshalJSONText(input.Coupon),
		OrderData:         marshalJSONText(input.Order),
		ImageURL:          strings.TrimSpace(input.ImageURL),
		Avatar:            firstNonEmpty(strings.TrimSpace(input.Avatar), strings.TrimSpace(sender.Avatar)),
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := s.db.WithContext(ctx).Create(&message).Error; err != nil {
		return nil, err
	}

	preview := buildMessagePreview(messageType, message.Content)
	if _, err := s.upsertConversationRow(ctx, sender, target, chatID, conversationUpdate{
		Preview:        preview,
		MessageType:    messageType,
		LastSenderRole: sender.Role,
		MessageAt:      now,
		MarkRead:       true,
	}); err != nil {
		return nil, err
	}

	if target.Role != "" && !sameConversationParty(sender, target) {
		if _, err := s.upsertConversationRow(ctx, target, sender, chatID, conversationUpdate{
			Preview:        preview,
			MessageType:    messageType,
			LastSenderRole: sender.Role,
			MessageAt:      now,
			UnreadDelta:    1,
		}); err != nil {
			return nil, err
		}
	}

	_ = s.syncLegacySupportConversation(ctx, chatID, sender, target, preview, messageType, now)
	return &message, nil
}

func (s *MessageService) resolveCurrentOwner(ctx context.Context) (conversationParty, error) {
	role := authContextRole(ctx)
	switch role {
	case "user":
		return s.resolveActorParty(ctx, "user", authContextString(ctx, "user_id"), authContextString(ctx, "user_phone"), "", "")
	case "merchant":
		return s.resolveActorParty(ctx, "merchant", authContextString(ctx, "merchant_id"), authContextString(ctx, "merchant_phone"), "", "")
	case "rider":
		return s.resolveActorParty(ctx, "rider", authContextString(ctx, "rider_id"), authContextString(ctx, "rider_phone"), "", "")
	case "admin":
		return conversationParty{
			Role:   "admin",
			ID:     firstNonEmpty(authContextString(ctx, "admin_id"), "support"),
			Name:   firstNonEmpty(authContextString(ctx, "admin_name"), "平台客服"),
			Avatar: "",
			ChatID: firstNonEmpty(authContextString(ctx, "admin_id"), "support"),
		}, nil
	default:
		return conversationParty{}, fmt.Errorf("unauthorized conversation access")
	}
}

func (s *MessageService) resolveCurrentSender(ctx context.Context, input SyncMessageInput) (conversationParty, error) {
	role := authContextRole(ctx)
	switch role {
	case "admin":
		return conversationParty{
			Role:   "admin",
			ID:     firstNonEmpty(authContextString(ctx, "admin_id"), strings.TrimSpace(input.SenderID), "support"),
			Name:   firstNonEmpty(authContextString(ctx, "admin_name"), strings.TrimSpace(input.SenderName), "平台客服"),
			Avatar: strings.TrimSpace(input.Avatar),
			ChatID: firstNonEmpty(strings.TrimSpace(input.ChatID), authContextString(ctx, "admin_id"), "support"),
		}, nil
	case "user":
		return s.resolveActorParty(ctx, "user", authContextString(ctx, "user_id"), authContextString(ctx, "user_phone"), input.SenderName, input.Avatar)
	case "merchant":
		return s.resolveActorParty(ctx, "merchant", authContextString(ctx, "merchant_id"), authContextString(ctx, "merchant_phone"), input.SenderName, input.Avatar)
	case "rider":
		return s.resolveActorParty(ctx, "rider", authContextString(ctx, "rider_id"), authContextString(ctx, "rider_phone"), input.SenderName, input.Avatar)
	default:
		fallbackRole := normalizeConversationRole(input.SenderRole)
		if fallbackRole == "" {
			return conversationParty{}, fmt.Errorf("sender role is required")
		}
		return s.resolveActorParty(ctx, fallbackRole, input.SenderID, "", input.SenderName, input.Avatar)
	}
}

func (s *MessageService) resolveActorParty(ctx context.Context, role, rawID, rawPhone, rawName, rawAvatar string) (conversationParty, error) {
	normalizedRole := normalizeConversationRole(role)
	if normalizedRole == "admin" {
		return conversationParty{
			Role:   "admin",
			ID:     firstNonEmpty(strings.TrimSpace(rawID), "support"),
			Phone:  strings.TrimSpace(rawPhone),
			Name:   firstNonEmpty(strings.TrimSpace(rawName), "平台客服"),
			Avatar: strings.TrimSpace(rawAvatar),
			ChatID: firstNonEmpty(strings.TrimSpace(rawID), strings.TrimSpace(rawPhone), "support"),
		}, nil
	}

	target, err := s.resolveTarget(ctx, normalizedRole, rawID, rawPhone)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return conversationParty{
				Role:   normalizedRole,
				ID:     strings.TrimSpace(rawID),
				Phone:  strings.TrimSpace(rawPhone),
				Name:   firstNonEmpty(strings.TrimSpace(rawName), defaultNameByRole(normalizedRole)),
				Avatar: strings.TrimSpace(rawAvatar),
				ChatID: resolveConversationChatID(rawID, rawPhone),
			}, nil
		}
		return conversationParty{}, err
	}

	target.Name = firstNonEmpty(strings.TrimSpace(rawName), target.Name, defaultNameByRole(normalizedRole))
	target.Avatar = firstNonEmpty(strings.TrimSpace(rawAvatar), target.Avatar)
	return conversationParty{
		Role:     normalizedRole,
		ChatID:   resolveConversationChatID(target.ChatID, rawID, rawPhone),
		ID:       firstNonEmpty(target.ID, strings.TrimSpace(rawID)),
		UID:      target.UID,
		LegacyID: target.LegacyID,
		Phone:    firstNonEmpty(target.Phone, strings.TrimSpace(rawPhone)),
		Name:     target.Name,
		Avatar:   target.Avatar,
	}, nil
}

func (s *MessageService) resolveConversationPeer(ctx context.Context, rawRole, rawID, rawPhone, rawName, rawAvatar, rawChatID string, owner conversationParty) (conversationParty, error) {
	role := normalizeConversationRole(rawRole)
	if role == "" {
		if owner.Role == "admin" {
			role = "user"
		} else {
			role = "admin"
		}
	}

	peer, err := s.resolveActorParty(ctx, role, rawID, rawPhone, rawName, rawAvatar)
	if err != nil {
		return conversationParty{}, err
	}
	peer.Role = role
	peer.Name = firstNonEmpty(strings.TrimSpace(rawName), peer.Name, defaultNameByRole(role))
	peer.Avatar = firstNonEmpty(strings.TrimSpace(rawAvatar), peer.Avatar)
	peer.ChatID = resolveConversationChatID(rawChatID, peer.ChatID, defaultChatIDForOwner(owner))
	if role == "admin" && peer.ID == "" {
		peer.ID = "support"
	}
	return peer, nil
}

func (s *MessageService) ensureConversationAccess(ctx context.Context, chatID string) error {
	if authContextRole(ctx) == "admin" {
		return nil
	}

	scope, err := messageConversationScopeFromContext(ctx)
	if err != nil {
		return err
	}

	query := applyConversationScope(
		s.db.WithContext(ctx).Model(&repository.MessageConversation{}).
			Where("chat_id = ?", strings.TrimSpace(chatID)),
		scope,
	)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return err
	}
	if total == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *MessageService) upsertConversationRow(ctx context.Context, owner, peer conversationParty, chatID string, update conversationUpdate) (*repository.MessageConversation, error) {
	if strings.TrimSpace(owner.Role) == "" || strings.TrimSpace(owner.ID) == "" || strings.TrimSpace(chatID) == "" {
		return nil, fmt.Errorf("conversation owner and chatId are required")
	}

	var row repository.MessageConversation
	err := s.db.WithContext(ctx).
		Where("owner_role = ? AND owner_id = ? AND chat_id = ?", owner.Role, owner.ID, chatID).
		First(&row).Error

	preview := strings.TrimSpace(update.Preview)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		record := repository.MessageConversation{
			OwnerRole:       owner.Role,
			OwnerID:         owner.ID,
			OwnerPhone:      strings.TrimSpace(owner.Phone),
			ChatID:          chatID,
			PeerRole:        normalizeConversationListRole(peer.Role),
			PeerID:          strings.TrimSpace(peer.ID),
			PeerPhone:       strings.TrimSpace(peer.Phone),
			PeerName:        firstNonEmpty(peer.Name, defaultNameByRole(peer.Role)),
			PeerAvatar:      strings.TrimSpace(peer.Avatar),
			LastMessage:     preview,
			LastMessageType: strings.TrimSpace(update.MessageType),
			LastSenderRole:  strings.TrimSpace(update.LastSenderRole),
			UnreadCount:     maxInt64(update.UnreadDelta, 0),
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
		if !update.MessageAt.IsZero() {
			record.LastMessageAt = ptrTime(update.MessageAt)
		}
		if update.MarkRead {
			record.LastReadAt = ptrTime(update.MessageAtOrNow())
			record.UnreadCount = 0
		}
		if err := s.db.WithContext(ctx).Create(&record).Error; err != nil {
			return nil, err
		}
		return &record, nil
	}
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"owner_phone": strings.TrimSpace(owner.Phone),
		"peer_role":   normalizeConversationListRole(peer.Role),
		"peer_id":     strings.TrimSpace(peer.ID),
		"peer_phone":  strings.TrimSpace(peer.Phone),
		"peer_name":   firstNonEmpty(peer.Name, defaultNameByRole(peer.Role)),
		"peer_avatar": strings.TrimSpace(peer.Avatar),
		"updated_at":  time.Now(),
	}

	if preview != "" {
		updates["last_message"] = preview
		updates["last_message_type"] = strings.TrimSpace(update.MessageType)
		updates["last_sender_role"] = strings.TrimSpace(update.LastSenderRole)
		if !update.MessageAt.IsZero() {
			updates["last_message_at"] = update.MessageAt
		}
	}

	if update.MarkRead {
		updates["unread_count"] = 0
		updates["last_read_at"] = update.MessageAtOrNow()
	} else if update.UnreadDelta > 0 {
		updates["unread_count"] = row.UnreadCount + update.UnreadDelta
	}

	if err := s.db.WithContext(ctx).
		Model(&row).
		Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Where("id = ?", row.ID).First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *MessageService) syncLegacySupportConversation(ctx context.Context, chatID string, sender, target conversationParty, preview, messageType string, messageAt time.Time) error {
	legacyTarget := conversationParty{}
	switch {
	case sender.Role == "admin" && isBusinessActor(target.Role):
		legacyTarget = target
	case target.Role == "admin" && isBusinessActor(sender.Role):
		legacyTarget = sender
	default:
		return nil
	}

	var row repository.SupportConversation
	err := s.db.WithContext(ctx).
		Where("chat_id = ?", chatID).
		First(&row).Error

	now := messageAt
	if now.IsZero() {
		now = time.Now()
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		record := repository.SupportConversation{
			ChatID:          chatID,
			TargetType:      legacyTarget.Role,
			TargetUID:       legacyTarget.UID,
			TargetLegacyID:  legacyTarget.LegacyID,
			TargetPhone:     legacyTarget.Phone,
			TargetName:      firstNonEmpty(legacyTarget.Name, defaultNameByRole(legacyTarget.Role)),
			TargetAvatar:    legacyTarget.Avatar,
			LastMessage:     preview,
			LastMessageType: messageType,
			LastSenderRole:  sender.Role,
			LastMessageAt:   ptrTime(now),
			CreatedBy:       firstNonEmpty(sender.ID, sender.Phone),
			UpdatedAt:       now,
		}
		return s.db.WithContext(ctx).Create(&record).Error
	}
	if err != nil {
		return err
	}

	return s.db.WithContext(ctx).Model(&row).Updates(map[string]interface{}{
		"target_type":       legacyTarget.Role,
		"target_uid":        legacyTarget.UID,
		"target_legacy_id":  legacyTarget.LegacyID,
		"target_phone":      legacyTarget.Phone,
		"target_name":       firstNonEmpty(legacyTarget.Name, defaultNameByRole(legacyTarget.Role)),
		"target_avatar":     legacyTarget.Avatar,
		"last_message":      preview,
		"last_message_type": messageType,
		"last_sender_role":  sender.Role,
		"last_message_at":   now,
		"updated_at":        now,
	}).Error
}

func (u conversationUpdate) MessageAtOrNow() time.Time {
	if !u.MessageAt.IsZero() {
		return u.MessageAt
	}
	return time.Now()
}

func messageConversationScopeFromContext(ctx context.Context) (conversationScope, error) {
	role := authContextRole(ctx)
	switch role {
	case "admin":
		return conversationScope{
			role: "admin",
			ids:  uniqueStrings(authContextString(ctx, "admin_id"), "support"),
		}, nil
	case "user":
		return conversationScope{
			role:   "user",
			ids:    uniqueStrings(authContextString(ctx, "user_id"), authContextString(ctx, "user_phone")),
			phones: uniqueStrings(authContextString(ctx, "user_phone")),
		}, nil
	case "merchant":
		return conversationScope{
			role:   "merchant",
			ids:    uniqueStrings(authContextString(ctx, "merchant_id"), authContextString(ctx, "merchant_phone")),
			phones: uniqueStrings(authContextString(ctx, "merchant_phone")),
		}, nil
	case "rider":
		return conversationScope{
			role:   "rider",
			ids:    uniqueStrings(authContextString(ctx, "rider_id"), authContextString(ctx, "rider_phone")),
			phones: uniqueStrings(authContextString(ctx, "rider_phone")),
		}, nil
	default:
		return conversationScope{}, fmt.Errorf("unauthorized conversation access")
	}
}

func applyConversationScope(query *gorm.DB, scope conversationScope) *gorm.DB {
	query = query.Where("owner_role = ?", scope.role)
	switch {
	case len(scope.ids) > 0 && len(scope.phones) > 0:
		return query.Where("(owner_id IN ? OR owner_phone IN ?)", scope.ids, scope.phones)
	case len(scope.ids) > 0:
		return query.Where("owner_id IN ?", scope.ids)
	case len(scope.phones) > 0:
		return query.Where("owner_phone IN ?", scope.phones)
	default:
		return query.Where("1 = 0")
	}
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
			list = append(list, ChatTarget{
				Role:     "user",
				ChatID:   chooseChatID(item.UID, item.ID, item.Phone),
				ID:       firstNonEmpty(item.UID, strconv.FormatUint(uint64(item.ID), 10)),
				UID:      strings.TrimSpace(item.UID),
				LegacyID: item.ID,
				Phone:    strings.TrimSpace(item.Phone),
				Name:     firstNonEmpty(strings.TrimSpace(item.Name), strings.TrimSpace(item.Phone), "用户"),
			})
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
			list = append(list, ChatTarget{
				Role:     "rider",
				ChatID:   chooseChatID(item.UID, item.ID, item.Phone),
				ID:       firstNonEmpty(item.UID, strconv.FormatUint(uint64(item.ID), 10)),
				UID:      strings.TrimSpace(item.UID),
				LegacyID: item.ID,
				Phone:    strings.TrimSpace(item.Phone),
				Name:     firstNonEmpty(strings.TrimSpace(item.Name), strings.TrimSpace(item.Phone), "骑手"),
				Avatar:   strings.TrimSpace(item.Avatar),
			})
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
			list = append(list, ChatTarget{
				Role:     "merchant",
				ChatID:   chooseChatID(item.UID, item.ID, item.Phone),
				ID:       firstNonEmpty(item.UID, strconv.FormatUint(uint64(item.ID), 10)),
				UID:      strings.TrimSpace(item.UID),
				LegacyID: item.ID,
				Phone:    strings.TrimSpace(item.Phone),
				Name:     firstNonEmpty(strings.TrimSpace(item.Name), strings.TrimSpace(item.Phone), "商家"),
			})
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

func normalizeConversationRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "user", "customer":
		return "user"
	case "rider":
		return "rider"
	case "merchant", "shop":
		return "merchant"
	case "admin", "support", "cs":
		return "admin"
	default:
		return ""
	}
}

func normalizeConversationListRole(role string) string {
	switch normalizeConversationRole(role) {
	case "merchant":
		return "merchant"
	case "rider":
		return "rider"
	case "user":
		return "user"
	default:
		return "cs"
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

func stringifyMessageContent(value interface{}) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(v)
	default:
		buf, err := json.Marshal(v)
		if err != nil {
			return fmt.Sprintf("%v", v)
		}
		return string(buf)
	}
}

func buildMessagePreview(messageType, content string) string {
	switch strings.ToLower(strings.TrimSpace(messageType)) {
	case "image":
		return "[图片]"
	case "coupon":
		return "[优惠券]"
	case "order":
		return "[订单]"
	case "audio":
		return "[语音]"
	case "location":
		return "[位置]"
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
	switch normalizeConversationRole(role) {
	case "rider":
		return "骑手"
	case "merchant":
		return "商家"
	case "admin":
		return "平台客服"
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

func uniqueStrings(values ...string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		normalized := strings.TrimSpace(value)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}

func resolveConversationChatID(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func defaultChatIDForOwner(owner conversationParty) string {
	return resolveConversationChatID(owner.ChatID, owner.ID, owner.Phone)
}

func ptrTime(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	copied := value
	return &copied
}

func sameConversationParty(left, right conversationParty) bool {
	return normalizeConversationRole(left.Role) == normalizeConversationRole(right.Role) &&
		firstNonEmpty(left.ID, left.Phone) != "" &&
		firstNonEmpty(left.ID, left.Phone) == firstNonEmpty(right.ID, right.Phone)
}

func isBusinessActor(role string) bool {
	switch normalizeConversationRole(role) {
	case "user", "merchant", "rider":
		return true
	default:
		return false
	}
}

func maxInt64(value, fallback int64) int64 {
	if value < fallback {
		return fallback
	}
	return value
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
