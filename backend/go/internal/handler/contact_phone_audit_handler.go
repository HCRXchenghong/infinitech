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
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "电话联系审计服务不可用", nil)
		return
	}

	var req service.PhoneContactAuditInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", gin.H{"detail": err.Error()})
		return
	}

	record, err := h.service.RecordPhoneClick(c.Request.Context(), req)
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

	respondSuccessEnvelope(c, "电话联系审计记录成功", record, nil)
}

func (h *PhoneContactAuditHandler) AdminList(c *gin.Context) {
	if h == nil || h.service == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "电话联系审计服务不可用", nil)
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
			respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
		case errors.Is(err, service.ErrForbidden):
			respondErrorEnvelope(c, http.StatusForbidden, responseCodeForbidden, err.Error(), nil)
		default:
			respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		}
		return
	}

	respondEnvelope(c, http.StatusOK, "CONTACT_PHONE_AUDIT_LISTED", "电话联系审计加载成功", result, nil)
}
