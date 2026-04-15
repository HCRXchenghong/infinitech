package handler

import (
	"errors"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type OnboardingInviteHandler struct {
	service *service.OnboardingInviteService
}

func NewOnboardingInviteHandler(svc *service.OnboardingInviteService) *OnboardingInviteHandler {
	return &OnboardingInviteHandler{service: svc}
}

func (h *OnboardingInviteHandler) AdminCreateInvite(c *gin.Context) {
	var req service.OnboardingInviteCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", nil)
		return
	}

	adminID := uint(0)
	if v, ok := c.Get("admin_id"); ok {
		switch t := v.(type) {
		case uint:
			adminID = t
		case int:
			if t > 0 {
				adminID = uint(t)
			}
		}
	}
	adminName := ""
	if v, ok := c.Get("admin_name"); ok {
		if name, ok2 := v.(string); ok2 {
			adminName = name
		}
	}

	result, err := h.service.CreateInviteLink(c.Request.Context(), req, adminID, adminName)
	if err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		return
	}
	respondEnvelope(c, http.StatusOK, "ONBOARDING_INVITE_CREATED", "邀请链接创建成功", result, nil)
}

func (h *OnboardingInviteHandler) AdminListInvites(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit

	inviteType := strings.TrimSpace(c.Query("invite_type"))
	status := strings.TrimSpace(c.Query("status"))
	items, total, err := h.service.ListInviteLinks(c.Request.Context(), inviteType, status, limit, offset)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
		return
	}
	respondEnvelope(c, http.StatusOK, "ONBOARDING_INVITE_LISTED", "邀请链接列表加载成功", gin.H{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	}, gin.H{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *OnboardingInviteHandler) AdminRevokeInvite(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "无效邀请ID", nil)
		return
	}
	if err := h.service.RevokeInviteLink(c.Request.Context(), id); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		return
	}
	respondEnvelope(c, http.StatusOK, "ONBOARDING_INVITE_REVOKED", "邀请链接已撤销", nil, nil)
}

func (h *OnboardingInviteHandler) AdminListSubmissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit

	inviteType := strings.TrimSpace(c.Query("invite_type"))
	items, total, err := h.service.ListSubmissions(c.Request.Context(), inviteType, limit, offset)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
		return
	}
	respondEnvelope(c, http.StatusOK, "ONBOARDING_SUBMISSION_LISTED", "入驻提交记录加载成功", gin.H{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	}, gin.H{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *OnboardingInviteHandler) PublicGetInvite(c *gin.Context) {
	token := c.Param("token")
	link, err := h.service.GetInviteByToken(c.Request.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrOnboardingInviteNotFound) {
			respondErrorEnvelope(c, http.StatusNotFound, responseCodeNotFound, "邀请链接不存在", nil)
			return
		}
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "查询邀请链接失败", nil)
		return
	}

	if link.Status != "pending" {
		respondErrorEnvelope(c, http.StatusGone, responseCodeGone, "邀请链接已失效", gin.H{
			"status": link.Status,
		})
		return
	}

	requiredFields := []string{}
	switch link.InviteType {
	case "merchant":
		requiredFields = []string{"merchant_name", "owner_name", "phone", "business_license_image", "password"}
	case "rider":
		requiredFields = []string{"name", "phone", "id_card_image", "emergency_contact_name", "emergency_contact_phone", "password"}
	case "old_user":
		requiredFields = []string{"name", "phone", "password"}
	default:
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "邀请类型不支持", nil)
		return
	}

	invite := gin.H{
		"id":              link.UID,
		"invite_type":     link.InviteType,
		"status":          link.Status,
		"token_prefix":    link.TokenPrefix,
		"expires_at":      link.ExpiresAt,
		"max_uses":        link.MaxUses,
		"used_count":      link.UsedCount,
		"remaining_uses":  maxInt(0, link.MaxUses-link.UsedCount),
		"required_fields": requiredFields,
	}
	respondEnvelope(c, http.StatusOK, "ONBOARDING_INVITE_LOADED", "邀请链接加载成功", gin.H{
		"invite": invite,
	}, gin.H{
		"invite": invite,
	})
}

func (h *OnboardingInviteHandler) PublicSubmitInvite(c *gin.Context) {
	token := c.Param("token")
	var req service.OnboardingInviteSubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", nil)
		return
	}

	submission, err := h.service.SubmitByInviteToken(c.Request.Context(), token, req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		msg := err.Error()
		switch {
		case strings.Contains(msg, "失效"), strings.Contains(msg, "过期"):
			respondErrorEnvelope(c, http.StatusGone, responseCodeGone, msg, nil)
		case errors.Is(err, service.ErrOnboardingInviteNotFound):
			respondErrorEnvelope(c, http.StatusNotFound, responseCodeNotFound, "邀请链接不存在", nil)
		default:
			respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, msg, nil)
		}
		return
	}

	respondEnvelope(c, http.StatusOK, "ONBOARDING_SUBMISSION_CREATED", "入驻信息提交成功", gin.H{
		"submission_id": submission.ID,
		"invite_type":   submission.InviteType,
		"entity_type":   submission.EntityType,
		"entity_id":     submission.EntityID,
	}, nil)
}

func (h *OnboardingInviteHandler) PublicUploadAsset(c *gin.Context) {
	token := strings.TrimSpace(c.Param("token"))
	link, err := h.service.GetInviteByToken(c.Request.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrOnboardingInviteNotFound) {
			respondErrorEnvelope(c, http.StatusNotFound, responseCodeNotFound, "邀请链接不存在", nil)
			return
		}
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "校验邀请链接失败", nil)
		return
	}
	if link.Status != "pending" {
		respondErrorEnvelope(c, http.StatusGone, responseCodeGone, "邀请链接已失效", gin.H{
			"status": link.Status,
		})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "没有找到上传文件", nil)
		return
	}

	tokenPrefix := strings.Trim(strings.TrimSpace(link.TokenPrefix), "/.")
	if tokenPrefix == "" {
		tokenPrefix = "invite"
	}
	dateDir := time.Now().Format("2006-01-02")
	finalFilename, url, err := saveUploadFile(c, file, 5*1024*1024, publicImageUploadAllowedExts, "onboarding-invite", tokenPrefix, filepath.Clean(dateDir))
	if err != nil {
		status := http.StatusBadRequest
		if isUploadInternalError(err) {
			status = http.StatusInternalServerError
		}
		code := responseCodeInvalidArgument
		if status >= http.StatusInternalServerError {
			code = responseCodeInternalError
		}
		respondErrorEnvelope(c, status, code, err.Error(), nil)
		return
	}

	respondEnvelope(c, http.StatusOK, "ONBOARDING_ASSET_UPLOADED", "邀请资料上传成功", gin.H{
		"url":          url,
		"filename":     finalFilename,
		"invite_type":  link.InviteType,
		"token_prefix": link.TokenPrefix,
	}, nil)
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
