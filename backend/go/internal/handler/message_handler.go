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

func (h *MessageHandler) GetConversations(c *gin.Context) {
	conversations, err := h.service.GetConversations(c.Request.Context())
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, conversations)
}

func (h *MessageHandler) GetMessageHistory(c *gin.Context) {
	roomID := c.Param("roomId")
	messages, err := h.service.GetMessageHistory(c.Request.Context(), roomID)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, messages)
}

func (h *MessageHandler) MarkConversationRead(c *gin.Context) {
	chatID := strings.TrimSpace(c.Param("chatId"))
	if chatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chatId 不能为空"})
		return
	}

	if err := h.service.MarkConversationRead(c.Request.Context(), chatID); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "chatId": chatID})
}

func (h *MessageHandler) MarkAllConversationsRead(c *gin.Context) {
	if err := h.service.MarkAllConversationsRead(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *MessageHandler) SearchTargets(c *gin.Context) {
	keyword := strings.TrimSpace(c.Query("q"))
	if keyword == "" {
		c.JSON(http.StatusOK, gin.H{"targets": []interface{}{}})
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
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"targets": targets})
}

func (h *MessageHandler) UpsertConversation(c *gin.Context) {
	var req service.UpsertConversationInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	conversation, err := h.service.UpsertConversation(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updatedAt := conversation.UpdatedAt
	if conversation.LastMessageAt != nil {
		updatedAt = *conversation.LastMessageAt
	}

	c.JSON(http.StatusOK, gin.H{
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	if strings.TrimSpace(req.ChatID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chatId 不能为空"})
		return
	}

	message, err := h.service.SyncMessage(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	responseID := strings.TrimSpace(message.ExternalMessageID)
	if responseID == "" {
		responseID = strconv.FormatUint(uint64(message.ID), 10)
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          responseID,
		"chatId":      message.ChatID,
		"senderId":    message.SenderID,
		"senderRole":  message.SenderRole,
		"sender":      message.SenderName,
		"content":     message.Content,
		"messageType": message.MessageType,
		"time":        message.CreatedAt.Format("15:04"),
		"avatar":      message.Avatar,
	})
}
