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

// GetConversations 获取会话列表
// @Summary 获取会话列表
// @Tags 消息
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Router /messages/conversations [get]
func (h *MessageHandler) GetConversations(c *gin.Context) {
	conversations, err := h.service.GetConversations(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, conversations)
}

// GetMessageHistory 获取消息历史
// @Summary 获取消息历史
// @Tags 消息
// @Produce json
// @Param roomId path string true "房间ID"
// @Success 200 {array} map[string]interface{}
// @Router /messages/{roomId} [get]
func (h *MessageHandler) GetMessageHistory(c *gin.Context) {
	roomID := c.Param("roomId")
	messages, err := h.service.GetMessageHistory(c.Request.Context(), roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, messages)
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	if req.CreatedBy == "" {
		if adminName, ok := c.Get("admin_name"); ok {
			req.CreatedBy = strings.TrimSpace(messageValueToString(adminName))
		} else if adminID, ok := c.Get("admin_id"); ok {
			req.CreatedBy = strings.TrimSpace(messageValueToString(adminID))
		}
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
		"chatId":      conversation.ChatID,
		"role":        conversation.TargetType,
		"name":        conversation.TargetName,
		"phone":       conversation.TargetPhone,
		"avatar":      conversation.TargetAvatar,
		"lastMessage": conversation.LastMessage,
		"time":        updatedAt.Format("15:04"),
		"updatedAt":   updatedAt.UnixMilli(),
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
	if strings.TrimSpace(req.SenderRole) == "" {
		req.SenderRole = "admin"
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

func messageValueToString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case uint:
		return strconv.FormatUint(uint64(v), 10)
	case uint64:
		return strconv.FormatUint(v, 10)
	case float64:
		return strconv.FormatInt(int64(v), 10)
	default:
		return ""
	}
}
