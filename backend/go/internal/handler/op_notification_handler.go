package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type OpNotificationHandler struct {
	service *service.OpNotificationService
}

func NewOpNotificationHandler(service *service.OpNotificationService) *OpNotificationHandler {
	return &OpNotificationHandler{service: service}
}

func respondOpNotificationError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondOpNotificationMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func writeOpNotificationServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrUnauthorized) {
		respondOpNotificationError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondOpNotificationError(c, http.StatusForbidden, err.Error())
		return
	}
	if strings.Contains(strings.ToLower(err.Error()), "invalid") {
		respondOpNotificationError(c, http.StatusBadRequest, err.Error())
		return
	}
	respondOpNotificationError(c, fallbackStatus, err.Error())
}

func (h *OpNotificationHandler) List(c *gin.Context) {
	page := parsePositiveInt(c.DefaultQuery("page", "1"), 1)
	limit := parsePositiveInt(c.DefaultQuery("limit", "20"), 20)
	unread := c.DefaultQuery("unread", "false")
	unreadOnly := unread == "1" || unread == "true" || unread == "yes"

	result, err := h.service.List(c.Request.Context(), page, limit, unreadOnly)
	if err != nil {
		writeOpNotificationServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondSuccessEnvelope(c, "运营通知列表加载成功", gin.H{
		"items": result["list"],
		"total": result["total"],
		"page":  result["page"],
		"limit": result["limit"],
	}, gin.H{
		"list":  result["list"],
		"total": result["total"],
		"page":  result["page"],
		"limit": result["limit"],
	})
}

func (h *OpNotificationHandler) MarkRead(c *gin.Context) {
	idRaw := strings.TrimSpace(c.Param("id"))
	if idRaw == "" {
		respondOpNotificationError(c, http.StatusBadRequest, "invalid notification id")
		return
	}

	if err := h.service.MarkRead(c.Request.Context(), idRaw); err != nil {
		writeOpNotificationServiceError(c, err, http.StatusBadRequest)
		return
	}
	respondOpNotificationMirroredSuccess(c, "运营通知已标记为已读", gin.H{"id": idRaw, "read": true})
}
