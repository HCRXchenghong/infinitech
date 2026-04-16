package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type MessageHandler struct {
	service *service.MessageService
}

func NewMessageHandler(service *service.MessageService) *MessageHandler {
	return &MessageHandler{service: service}
}

func respondMessageError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondMessageInvalidRequest(c *gin.Context, message string) {
	respondMessageError(c, http.StatusBadRequest, message)
}

func respondMessageMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func writeMessageServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrUnauthorized) || strings.Contains(strings.ToLower(err.Error()), "unauthorized") {
		respondMessageError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondMessageError(c, http.StatusForbidden, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(strings.ToLower(err.Error()), "not found") {
		respondMessageError(c, http.StatusNotFound, err.Error())
		return
	}
	respondMessageError(c, fallbackStatus, err.Error())
}

func (h *MessageHandler) GetConversations(c *gin.Context) {
	conversations, err := h.service.GetConversations(c.Request.Context())
	if err != nil {
		writeMessageServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondPaginatedEnvelope(c, responseCodeOK, "会话列表加载成功", "conversations", conversations, int64(len(conversations)), 1, len(conversations))
}

func (h *MessageHandler) GetMessageHistory(c *gin.Context) {
	roomID := c.Param("roomId")
	messages, err := h.service.GetMessageHistory(c.Request.Context(), roomID)
	if err != nil {
		writeMessageServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondPaginatedEnvelope(c, responseCodeOK, "消息历史加载成功", "messages", messages, int64(len(messages)), 1, len(messages))
}

func (h *MessageHandler) MarkConversationRead(c *gin.Context) {
	chatID := strings.TrimSpace(c.Param("chatId"))
	if chatID == "" {
		respondMessageInvalidRequest(c, "chatId 不能为空")
		return
	}

	if err := h.service.MarkConversationRead(c.Request.Context(), chatID); err != nil {
		writeMessageServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondMessageMirroredSuccess(c, "会话已标记为已读", gin.H{"chatId": chatID, "read": true})
}

func (h *MessageHandler) MarkAllConversationsRead(c *gin.Context) {
	if err := h.service.MarkAllConversationsRead(c.Request.Context()); err != nil {
		writeMessageServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondMessageMirroredSuccess(c, "全部会话已标记为已读", gin.H{"readAll": true})
}

func (h *MessageHandler) SearchTargets(c *gin.Context) {
	keyword := strings.TrimSpace(c.Query("q"))
	if keyword == "" {
		respondMessageMirroredSuccess(c, "聊天目标搜索完成", gin.H{"targets": []interface{}{}})
		return
	}

	limit := 20
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil {
			limit = parsed
		}
	}

	targets, err := h.service.SearchChatTargets(c.Request.Context(), keyword, limit)
	if err != nil {
		writeMessageServiceError(c, err, http.StatusForbidden)
		return
	}
	respondMessageMirroredSuccess(c, "聊天目标搜索完成", gin.H{"targets": targets})
}

func (h *MessageHandler) UpsertConversation(c *gin.Context) {
	var req service.UpsertConversationInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondMessageInvalidRequest(c, "请求参数错误")
		return
	}

	conversation, err := h.service.UpsertConversation(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondMessageError(c, http.StatusNotFound, "目标用户不存在")
			return
		}
		writeMessageServiceError(c, err, http.StatusBadRequest)
		return
	}

	updatedAt := conversation.UpdatedAt
	if conversation.LastMessageAt != nil {
		updatedAt = *conversation.LastMessageAt
	}

	respondMessageMirroredSuccess(c, "会话同步成功", gin.H{
		"id":          conversation.ChatID,
		"chatId":      conversation.ChatID,
		"roomId":      conversation.ChatID,
		"role":        conversation.PeerRole,
		"name":        conversation.PeerName,
		"phone":       conversation.PeerPhone,
		"avatar":      conversation.PeerAvatar,
		"avatarUrl":   conversation.PeerAvatar,
		"lastMessage": conversation.LastMessage,
		"time":        updatedAt.Format("15:04"),
		"updatedAt":   updatedAt.UnixMilli(),
		"unread":      conversation.UnreadCount,
		"targetId":    conversation.PeerID,
	})
}

func (h *MessageHandler) SyncMessage(c *gin.Context) {
	var req service.SyncMessageInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondMessageInvalidRequest(c, "请求参数错误")
		return
	}

	if strings.TrimSpace(req.ChatID) == "" {
		respondMessageInvalidRequest(c, "chatId 不能为空")
		return
	}

	message, err := h.service.SyncMessage(c.Request.Context(), req)
	if err != nil {
		writeMessageServiceError(c, err, http.StatusBadRequest)
		return
	}

	responseID := strings.TrimSpace(message.ExternalMessageID)
	if responseID == "" {
		responseID = strconv.FormatUint(uint64(message.ID), 10)
	}

	respondMessageMirroredSuccess(c, "消息同步成功", gin.H{
		"id":                responseID,
		"legacyId":          message.ID,
		"externalMessageId": strings.TrimSpace(message.ExternalMessageID),
		"chatId":            message.ChatID,
		"senderId":          message.SenderID,
		"senderRole":        message.SenderRole,
		"sender":            message.SenderName,
		"content":           message.Content,
		"messageType":       message.MessageType,
		"time":              message.CreatedAt.Format("15:04"),
		"timestamp":         message.CreatedAt.UnixMilli(),
		"createdAt":         message.CreatedAt.UnixMilli(),
		"updatedAt":         message.UpdatedAt.UnixMilli(),
		"avatar":            message.Avatar,
		"status":            "sent",
	})
}
