package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type PhoneContactAuditHandler struct {
	service *service.PhoneContactAuditService
}

func NewPhoneContactAuditHandler(svc *service.PhoneContactAuditService) *PhoneContactAuditHandler {
	return &PhoneContactAuditHandler{service: svc}
}

func (h *PhoneContactAuditHandler) RecordPhoneClick(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "contact audit service unavailable"})
		return
	}

	var req service.PhoneContactAuditInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "message": err.Error()})
		return
	}

	record, err := h.service.RecordPhoneClick(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    record,
	})
}

func (h *PhoneContactAuditHandler) AdminList(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "contact audit service unavailable"})
		return
	}

	result, err := h.service.ListForAdmin(c.Request.Context(), service.PhoneContactAuditAdminQuery{
		ActorRole:      strings.TrimSpace(c.Query("actorRole")),
		TargetRole:     strings.TrimSpace(c.Query("targetRole")),
		ContactChannel: strings.TrimSpace(c.Query("contactChannel")),
		EntryPoint:     strings.TrimSpace(c.Query("entryPoint")),
		Scene:          strings.TrimSpace(c.Query("scene")),
		ClientPlatform: strings.TrimSpace(c.Query("clientPlatform")),
		ClientResult:   strings.TrimSpace(c.Query("clientResult")),
		Keyword:        strings.TrimSpace(c.Query("keyword")),
		Page:           parsePositiveInt(c.Query("page"), 1),
		Limit:          parsePositiveInt(c.Query("limit"), 20),
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}
