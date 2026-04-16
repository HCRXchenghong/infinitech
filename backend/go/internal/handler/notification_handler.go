package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	service *service.NotificationService
}

func NewNotificationHandler(service *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{service: service}
}

func respondNotificationError(c *gin.Context, status int, message string, legacy gin.H) {
	respondEnvelope(c, status, couponResponseCodeForStatus(status), message, gin.H{}, legacy)
}

func respondNotificationInvalidRequest(c *gin.Context, message string) {
	respondNotificationError(c, http.StatusBadRequest, message, nil)
}

func respondNotificationMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func respondNotificationPaginated(c *gin.Context, message, listKey string, items interface{}, total int64, page, limit int) {
	respondPaginatedEnvelope(c, responseCodeOK, message, listKey, items, total, page, limit)
}

func writeNotificationServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrUnauthorized) {
		respondNotificationError(c, http.StatusUnauthorized, err.Error(), nil)
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(strings.ToLower(err.Error()), "not found") {
		respondNotificationError(c, http.StatusNotFound, err.Error(), nil)
		return
	}
	if strings.Contains(strings.ToLower(err.Error()), "invalid") {
		respondNotificationError(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	respondNotificationError(c, fallbackStatus, err.Error(), nil)
}

func (h *NotificationHandler) GetNotificationList(c *gin.Context) {
	page := parsePositiveInt(c.DefaultQuery("page", "1"), 1)
	pageSize := parsePositiveInt(c.DefaultQuery("pageSize", "20"), 20)

	list, total, err := h.service.GetNotificationList(c.Request.Context(), page, pageSize)
	if err != nil {
		writeNotificationServiceError(c, err, http.StatusInternalServerError)
		return
	}

	stats, err := h.service.GetNotificationStats(c.Request.Context())
	if err != nil {
		writeNotificationServiceError(c, err, http.StatusInternalServerError)
		return
	}

	payload := gin.H{
		"items":          list,
		"total":          total,
		"page":           page,
		"limit":          pageSize,
		"pageSize":       pageSize,
		"unreadCount":    stats.UnreadCount,
		"unread_count":   stats.UnreadCount,
		"latestAt":       stats.LatestAt,
		"latest_at":      stats.LatestAt,
		"latestTitle":    stats.LatestTitle,
		"latest_title":   stats.LatestTitle,
		"latestSummary":  stats.LatestSummary,
		"latest_summary": stats.LatestSummary,
	}

	respondSuccessEnvelope(c, "通知列表加载成功", payload, gin.H{
		"items":          list,
		"list":           list,
		"page":           page,
		"limit":          pageSize,
		"pageSize":       pageSize,
		"total":          total,
		"unreadCount":    stats.UnreadCount,
		"unread_count":   stats.UnreadCount,
		"latestAt":       stats.LatestAt,
		"latest_at":      stats.LatestAt,
		"latestTitle":    stats.LatestTitle,
		"latest_title":   stats.LatestTitle,
		"latestSummary":  stats.LatestSummary,
		"latest_summary": stats.LatestSummary,
	})
}

func (h *NotificationHandler) GetNotificationDetail(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		respondNotificationInvalidRequest(c, "无效的通知ID")
		return
	}

	detail, err := h.service.GetNotificationDetail(c.Request.Context(), idStr)
	if err != nil {
		writeNotificationServiceError(c, err, http.StatusNotFound)
		return
	}

	respondNotificationMirroredSuccess(c, "通知详情加载成功", detail)
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		respondNotificationInvalidRequest(c, "无效的通知ID")
		return
	}

	err := h.service.MarkNotificationRead(c.Request.Context(), idStr)
	if err != nil {
		writeNotificationServiceError(c, err, http.StatusNotFound)
		return
	}

	respondNotificationMirroredSuccess(c, "已标记为已读", gin.H{"id": idStr, "read": true})
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	if err := h.service.MarkAllRead(c.Request.Context()); err != nil {
		writeNotificationServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondNotificationMirroredSuccess(c, "已清空通知未读", gin.H{"readAll": true})
}

func (h *NotificationHandler) GetAllNotifications(c *gin.Context) {
	page := parsePositiveInt(c.DefaultQuery("page", "1"), 1)
	pageSize := parsePositiveInt(c.DefaultQuery("pageSize", "20"), 20)

	list, total, err := h.service.GetAllNotifications(c.Request.Context(), page, pageSize)
	if err != nil {
		writeNotificationServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondNotificationPaginated(c, "管理通知列表加载成功", "notifications", list, total, page, pageSize)
}

func (h *NotificationHandler) GetNotificationByIDAdmin(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		respondNotificationInvalidRequest(c, "无效的通知ID")
		return
	}

	detail, err := h.service.GetNotificationByIDAdmin(c.Request.Context(), idStr)
	if err != nil {
		writeNotificationServiceError(c, err, http.StatusNotFound)
		return
	}

	respondNotificationMirroredSuccess(c, "管理通知详情加载成功", detail)
}

func (h *NotificationHandler) CreateNotification(c *gin.Context) {
	var req struct {
		Title       string `json:"title" binding:"required"`
		Content     string `json:"content" binding:"required"`
		Cover       string `json:"cover"`
		Source      string `json:"source"`
		IsPublished bool   `json:"is_published"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondNotificationInvalidRequest(c, "参数错误: "+err.Error())
		return
	}

	notification, err := h.service.CreateNotification(c.Request.Context(), req.Title, req.Content, req.Cover, req.Source, req.IsPublished)
	if err != nil {
		writeNotificationServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondCreatedEnvelope(c, responseCodeOK, "通知创建成功", notification, gin.H{"id": notification.UID})
}

func (h *NotificationHandler) UpdateNotification(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		respondNotificationInvalidRequest(c, "无效的通知ID")
		return
	}

	var req struct {
		Title       string `json:"title"`
		Content     string `json:"content"`
		Cover       string `json:"cover"`
		Source      string `json:"source"`
		IsPublished *bool  `json:"is_published"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondNotificationInvalidRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := h.service.UpdateNotification(c.Request.Context(), idStr, req.Title, req.Content, req.Cover, req.Source, req.IsPublished); err != nil {
		writeNotificationServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondNotificationMirroredSuccess(c, "通知更新成功", gin.H{"id": idStr, "updated": true})
}

func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		respondNotificationInvalidRequest(c, "无效的通知ID")
		return
	}

	if err := h.service.DeleteNotification(c.Request.Context(), idStr); err != nil {
		writeNotificationServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondNotificationMirroredSuccess(c, "通知删除成功", gin.H{"id": idStr, "deleted": true})
}
