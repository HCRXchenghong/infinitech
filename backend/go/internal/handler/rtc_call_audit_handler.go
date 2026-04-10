package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type RTCCallAuditHandler struct {
	service *service.RTCCallAuditService
}

func NewRTCCallAuditHandler(svc *service.RTCCallAuditService) *RTCCallAuditHandler {
	return &RTCCallAuditHandler{service: svc}
}

func resolveRTCCallID(c *gin.Context) string {
	if c == nil {
		return ""
	}
	if raw, exists := c.Get("entity_uid"); exists {
		if text, ok := raw.(string); ok && strings.TrimSpace(text) != "" {
			return strings.TrimSpace(text)
		}
	}
	if raw, exists := c.Get("entity_tsid"); exists {
		if text, ok := raw.(string); ok && strings.TrimSpace(text) != "" {
			return strings.TrimSpace(text)
		}
	}
	return strings.TrimSpace(c.Param("callId"))
}

func (h *RTCCallAuditHandler) UpsertCall(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rtc call audit service unavailable"})
		return
	}

	var req service.RTCCallAuditUpsertInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "message": err.Error()})
		return
	}

	record, err := h.service.UpsertCall(c.Request.Context(), req)
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

func (h *RTCCallAuditHandler) UpdateCallStatus(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rtc call audit service unavailable"})
		return
	}

	var req service.RTCCallAuditUpsertInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "message": err.Error()})
		return
	}
	req.CallID = resolveRTCCallID(c)

	record, err := h.service.UpsertCall(c.Request.Context(), req)
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

func (h *RTCCallAuditHandler) AdminList(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rtc call audit service unavailable"})
		return
	}

	result, err := h.service.ListForAdmin(c.Request.Context(), service.RTCCallAuditAdminQuery{
		CallerRole:      strings.TrimSpace(c.Query("callerRole")),
		CalleeRole:      strings.TrimSpace(c.Query("calleeRole")),
		Status:          strings.TrimSpace(c.Query("status")),
		CallType:        strings.TrimSpace(c.Query("callType")),
		ClientPlatform:  strings.TrimSpace(c.Query("clientPlatform")),
		ClientKind:      strings.TrimSpace(c.Query("clientKind")),
		ComplaintStatus: strings.TrimSpace(c.Query("complaintStatus")),
		Keyword:         strings.TrimSpace(c.Query("keyword")),
		Page:            parsePositiveInt(c.Query("page"), 1),
		Limit:           parsePositiveInt(c.Query("limit"), 20),
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

func (h *RTCCallAuditHandler) AdminReview(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rtc call audit service unavailable"})
		return
	}

	var req service.RTCCallAuditAdminReviewInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "message": err.Error()})
		return
	}

	record, err := h.service.AdminReviewCall(c.Request.Context(), resolveRTCCallID(c), req)
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

func (h *RTCCallAuditHandler) AdminRunRetentionCleanup(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rtc call audit service unavailable"})
		return
	}

	limit := parsePositiveInt(c.Query("limit"), 0)
	before := h.service.RetentionCleanupStatusSnapshot()
	cleared, err := h.service.RunRetentionCleanupCycleNow(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "rtc retention cleanup failed",
			"detail": err.Error(),
			"data": gin.H{
				"before": before,
			},
		})
		return
	}

	after := h.service.RetentionCleanupStatusSnapshot()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"before":  before,
			"after":   after,
			"cleared": cleared,
			"limit":   limit,
		},
	})
}

func (h *RTCCallAuditHandler) GetCall(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rtc call audit service unavailable"})
		return
	}

	record, err := h.service.GetCall(c.Request.Context(), resolveRTCCallID(c))
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

func (h *RTCCallAuditHandler) ListHistory(c *gin.Context) {
	if h == nil || h.service == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rtc call audit service unavailable"})
		return
	}

	result, err := h.service.ListHistory(c.Request.Context(), service.RTCCallAuditHistoryQuery{
		Status:   strings.TrimSpace(c.Query("status")),
		CallType: strings.TrimSpace(c.Query("callType")),
		Page:     parsePositiveInt(c.Query("page"), 1),
		Limit:    parsePositiveInt(c.Query("limit"), 20),
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
