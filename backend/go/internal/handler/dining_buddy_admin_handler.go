package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

func respondDiningBuddyInvalidRequest(c *gin.Context, message string) {
	respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, message, nil)
}

func respondDiningBuddySuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func (h *DiningBuddyHandler) CreateReport(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
		return
	}

	var req service.DiningBuddyReportInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondDiningBuddyInvalidRequest(c, "invalid request payload")
		return
	}

	report, err := h.service.CreateReport(c.Request.Context(), currentUserID, req)
	if err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友举报创建成功", gin.H{"report": report})
}

func (h *DiningBuddyHandler) AdminListParties(c *gin.Context) {
	limit, _ := strconv.Atoi(strings.TrimSpace(c.Query("limit")))
	items, err := h.service.AdminListParties(c.Request.Context(), service.DiningBuddyAdminPartyQuery{
		Category: c.Query("category"),
		Status:   c.Query("status"),
		Search:   c.Query("search"),
		Limit:    limit,
	})
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
		return
	}
	respondDiningBuddySuccess(c, "同频饭友组局列表加载成功", gin.H{"parties": items})
}

func (h *DiningBuddyHandler) AdminGetParty(c *gin.Context) {
	item, err := h.service.AdminGetParty(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友组局详情加载成功", item)
}

func (h *DiningBuddyHandler) AdminCloseParty(c *gin.Context) {
	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	if err := h.service.AdminCloseParty(c.Request.Context(), c.Param("id"), adminID, adminName, req.Reason); err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友组局已关闭", gin.H{})
}

func (h *DiningBuddyHandler) AdminReopenParty(c *gin.Context) {
	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	if err := h.service.AdminReopenParty(c.Request.Context(), c.Param("id"), adminID, adminName, req.Reason); err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友组局已重开", gin.H{})
}

func (h *DiningBuddyHandler) AdminListMessages(c *gin.Context) {
	items, err := h.service.AdminListMessages(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友消息列表加载成功", gin.H{"messages": items})
}

func (h *DiningBuddyHandler) AdminDeleteMessage(c *gin.Context) {
	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	if err := h.service.AdminDeleteMessage(c.Request.Context(), c.Param("id"), adminID, adminName, req.Reason); err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友消息已删除", gin.H{})
}

func (h *DiningBuddyHandler) AdminListReports(c *gin.Context) {
	limit, _ := strconv.Atoi(strings.TrimSpace(c.Query("limit")))
	items, err := h.service.AdminListReports(c.Request.Context(), c.Query("status"), limit)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
		return
	}
	respondDiningBuddySuccess(c, "同频饭友举报列表加载成功", gin.H{"reports": items})
}

func (h *DiningBuddyHandler) AdminResolveReport(c *gin.Context) {
	var req struct {
		ResolutionNote   string `json:"resolution_note"`
		ResolutionAction string `json:"resolution_action"`
	}
	_ = c.ShouldBindJSON(&req)
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	if err := h.service.AdminResolveReport(c.Request.Context(), c.Param("id"), adminID, adminName, req.ResolutionNote, req.ResolutionAction); err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友举报已受理", gin.H{})
}

func (h *DiningBuddyHandler) AdminRejectReport(c *gin.Context) {
	var req struct {
		ResolutionNote string `json:"resolution_note"`
	}
	_ = c.ShouldBindJSON(&req)
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	if err := h.service.AdminRejectReport(c.Request.Context(), c.Param("id"), adminID, adminName, req.ResolutionNote); err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友举报已驳回", gin.H{})
}

func (h *DiningBuddyHandler) AdminListSensitiveWords(c *gin.Context) {
	items, err := h.service.AdminListSensitiveWords(c.Request.Context())
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
		return
	}
	respondDiningBuddySuccess(c, "同频饭友敏感词加载成功", gin.H{"items": items})
}

func (h *DiningBuddyHandler) AdminCreateSensitiveWord(c *gin.Context) {
	var req struct {
		Word        string `json:"word"`
		Enabled     bool   `json:"enabled"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondDiningBuddyInvalidRequest(c, "invalid request payload")
		return
	}
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	item, err := h.service.AdminCreateSensitiveWord(c.Request.Context(), req.Word, req.Enabled, req.Description, adminID, adminName)
	if err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友敏感词创建成功", gin.H{"item": item})
}

func (h *DiningBuddyHandler) AdminUpdateSensitiveWord(c *gin.Context) {
	var req struct {
		Word        string `json:"word"`
		Enabled     bool   `json:"enabled"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondDiningBuddyInvalidRequest(c, "invalid request payload")
		return
	}
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	if err := h.service.AdminUpdateSensitiveWord(c.Request.Context(), c.Param("id"), req.Word, req.Enabled, req.Description, adminID, adminName); err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友敏感词更新成功", gin.H{})
}

func (h *DiningBuddyHandler) AdminDeleteSensitiveWord(c *gin.Context) {
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	if err := h.service.AdminDeleteSensitiveWord(c.Request.Context(), c.Param("id"), adminID, adminName); err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友敏感词删除成功", gin.H{})
}

func (h *DiningBuddyHandler) AdminListUserRestrictions(c *gin.Context) {
	items, err := h.service.AdminListUserRestrictions(c.Request.Context())
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
		return
	}
	respondDiningBuddySuccess(c, "同频饭友用户限制加载成功", gin.H{"items": items})
}

func (h *DiningBuddyHandler) AdminUpsertUserRestriction(c *gin.Context) {
	var req struct {
		TargetUserID    string `json:"target_user_id"`
		RestrictionType string `json:"restriction_type"`
		Reason          string `json:"reason"`
		Note            string `json:"note"`
		ExpiresAt       string `json:"expires_at"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondDiningBuddyInvalidRequest(c, "invalid request payload")
		return
	}
	var expiresAt *time.Time
	if strings.TrimSpace(req.ExpiresAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(req.ExpiresAt))
		if err != nil {
			respondDiningBuddyInvalidRequest(c, "expires_at is invalid")
			return
		}
		expiresAt = &parsed
	}
	adminID := parseContextUint(c.Get("admin_id"))
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	item, err := h.service.AdminUpsertUserRestriction(c.Request.Context(), req.TargetUserID, req.RestrictionType, req.Reason, req.Note, expiresAt, adminID, adminName)
	if err != nil {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddySuccess(c, "同频饭友用户限制保存成功", gin.H{"item": item})
}

func (h *DiningBuddyHandler) AdminListAuditLogs(c *gin.Context) {
	limit, _ := strconv.Atoi(strings.TrimSpace(c.Query("limit")))
	items, err := h.service.AdminListAuditLogs(c.Request.Context(), limit)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
		return
	}
	respondDiningBuddySuccess(c, "同频饭友审计日志加载成功", gin.H{"items": items})
}
