package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type NotificationHandler struct {
	service *service.NotificationService
}

func NewNotificationHandler(service *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{service: service}
}

func (h *NotificationHandler) GetNotificationList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	list, err := h.service.GetNotificationList(c.Request.Context(), page, pageSize)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "登录已失效，请重新登录"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	stats, err := h.service.GetNotificationStats(c.Request.Context())
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "登录已失效，请重新登录"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"data":           list,
		"page":           page,
		"pageSize":       pageSize,
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
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "无效的通知ID"})
		return
	}

	detail, err := h.service.GetNotificationDetail(c.Request.Context(), idStr)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "登录已失效，请重新登录"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "通知不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    detail,
	})
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "无效的通知ID"})
		return
	}

	err := h.service.MarkNotificationRead(c.Request.Context(), idStr)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "登录已失效，请重新登录"})
		default:
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "通知不存在"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已标记为已读",
	})
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	if err := h.service.MarkAllRead(c.Request.Context()); err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "登录已失效，请重新登录"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已清空通知未读",
	})
}

func (h *NotificationHandler) GetAllNotifications(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	list, err := h.service.GetAllNotifications(c.Request.Context(), page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

func (h *NotificationHandler) GetNotificationByIDAdmin(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的通知ID"})
		return
	}

	detail, err := h.service.GetNotificationByIDAdmin(c.Request.Context(), idStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "通知不存在"})
		return
	}

	c.JSON(http.StatusOK, detail)
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
		return
	}

	notification, err := h.service.CreateNotification(c.Request.Context(), req.Title, req.Content, req.Cover, req.Source, req.IsPublished)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    notification,
		"id":      notification.UID,
	})
}

func (h *NotificationHandler) UpdateNotification(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的通知ID"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
		return
	}

	if err := h.service.UpdateNotification(c.Request.Context(), idStr, req.Title, req.Content, req.Cover, req.Source, req.IsPublished); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "更新成功",
	})
}

func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的通知ID"})
		return
	}

	if err := h.service.DeleteNotification(c.Request.Context(), idStr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "删除成功",
	})
}
