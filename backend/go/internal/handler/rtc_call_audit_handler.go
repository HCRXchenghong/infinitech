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
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "RTC 通话审计服务不可用", nil)
		return
	}

	var req service.RTCCallAuditUpsertInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", gin.H{"detail": err.Error()})
		return
	}

	record, err := h.service.UpsertCall(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
		case errors.Is(err, service.ErrForbidden):
			respondErrorEnvelope(c, http.StatusForbidden, responseCodeForbidden, err.Error(), nil)
		default:
			respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		}
		return
	}

	respondSuccessEnvelope(c, "RTC 通话审计写入成功", record, nil)
}

func (h *RTCCallAuditHandler) UpdateCallStatus(c *gin.Context) {
	if h == nil || h.service == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "RTC 通话审计服务不可用", nil)
		return
	}

	var req service.RTCCallAuditUpsertInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", gin.H{"detail": err.Error()})
		return
	}
	req.CallID = resolveRTCCallID(c)

	record, err := h.service.UpsertCall(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
		case errors.Is(err, service.ErrForbidden):
			respondErrorEnvelope(c, http.StatusForbidden, responseCodeForbidden, err.Error(), nil)
		default:
			respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		}
		return
	}

	respondSuccessEnvelope(c, "RTC 通话状态更新成功", record, nil)
}

func (h *RTCCallAuditHandler) AdminList(c *gin.Context) {
	if h == nil || h.service == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "RTC 通话审计服务不可用", nil)
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
			respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
		case errors.Is(err, service.ErrForbidden):
			respondErrorEnvelope(c, http.StatusForbidden, responseCodeForbidden, err.Error(), nil)
		default:
			respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		}
		return
	}

	respondEnvelope(c, http.StatusOK, "RTC_CALL_AUDIT_LISTED", "RTC 通话审计加载成功", result, nil)
}

func (h *RTCCallAuditHandler) AdminReview(c *gin.Context) {
	if h == nil || h.service == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "RTC 通话审计服务不可用", nil)
		return
	}

	var req service.RTCCallAuditAdminReviewInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", gin.H{"detail": err.Error()})
		return
	}

	record, err := h.service.AdminReviewCall(c.Request.Context(), resolveRTCCallID(c), req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
		case errors.Is(err, service.ErrForbidden):
			respondErrorEnvelope(c, http.StatusForbidden, responseCodeForbidden, err.Error(), nil)
		default:
			respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		}
		return
	}

	respondSuccessEnvelope(c, "RTC 审计处理成功", record, nil)
}

func (h *RTCCallAuditHandler) AdminRunRetentionCleanup(c *gin.Context) {
	if h == nil || h.service == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "RTC 通话审计服务不可用", nil)
		return
	}

	limit := parsePositiveInt(c.Query("limit"), 0)
	before := h.service.RetentionCleanupStatusSnapshot()
	cleared, err := h.service.RunRetentionCleanupCycleNow(c.Request.Context(), limit)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "RTC 录音留存清理失败", gin.H{
			"detail": err.Error(),
			"before": before,
		})
		return
	}

	after := h.service.RetentionCleanupStatusSnapshot()
	respondSuccessEnvelope(c, "RTC 录音留存清理完成", gin.H{
		"before":  before,
		"after":   after,
		"cleared": cleared,
		"limit":   limit,
	}, nil)
}

func (h *RTCCallAuditHandler) GetCall(c *gin.Context) {
	if h == nil || h.service == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "RTC 通话审计服务不可用", nil)
		return
	}

	record, err := h.service.GetCall(c.Request.Context(), resolveRTCCallID(c))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
		case errors.Is(err, service.ErrForbidden):
			respondErrorEnvelope(c, http.StatusForbidden, responseCodeForbidden, err.Error(), nil)
		default:
			respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		}
		return
	}

	respondSuccessEnvelope(c, "RTC 通话详情加载成功", record, nil)
}

func (h *RTCCallAuditHandler) ListHistory(c *gin.Context) {
	if h == nil || h.service == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "RTC 通话审计服务不可用", nil)
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
			respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
		case errors.Is(err, service.ErrForbidden):
			respondErrorEnvelope(c, http.StatusForbidden, responseCodeForbidden, err.Error(), nil)
		default:
			respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		}
		return
	}

	respondEnvelope(c, http.StatusOK, "RTC_CALL_HISTORY_LISTED", "RTC 通话历史加载成功", result, nil)
}
