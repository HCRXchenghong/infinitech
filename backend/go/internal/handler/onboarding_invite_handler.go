package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

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
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
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
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "items": items, "total": total, "page": page, "limit": limit})
}

func (h *OnboardingInviteHandler) AdminRevokeInvite(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "无效邀请ID"})
		return
	}
	if err := h.service.RevokeInviteLink(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "items": items, "total": total, "page": page, "limit": limit})
}

func (h *OnboardingInviteHandler) PublicGetInvite(c *gin.Context) {
	token := c.Param("token")
	link, err := h.service.GetInviteByToken(c.Request.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrOnboardingInviteNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "邀请链接不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询邀请链接失败"})
		return
	}

	if link.Status != "pending" {
		c.JSON(http.StatusGone, gin.H{"error": "邀请链接已失效", "status": link.Status})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "邀请类型不支持"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"invite": gin.H{
			"id":              link.UID,
			"invite_type":     link.InviteType,
			"status":          link.Status,
			"token_prefix":    link.TokenPrefix,
			"expires_at":      link.ExpiresAt,
			"max_uses":        link.MaxUses,
			"used_count":      link.UsedCount,
			"remaining_uses":  maxInt(0, link.MaxUses-link.UsedCount),
			"required_fields": requiredFields,
		},
	})
}

func (h *OnboardingInviteHandler) PublicSubmitInvite(c *gin.Context) {
	token := c.Param("token")
	var req service.OnboardingInviteSubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	submission, err := h.service.SubmitByInviteToken(c.Request.Context(), token, req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		msg := err.Error()
		switch {
		case strings.Contains(msg, "失效"), strings.Contains(msg, "过期"):
			c.JSON(http.StatusGone, gin.H{"error": msg})
		case errors.Is(err, service.ErrOnboardingInviteNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "邀请链接不存在"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"submission_id": submission.ID,
			"invite_type":   submission.InviteType,
			"entity_type":   submission.EntityType,
			"entity_id":     submission.EntityID,
		},
	})
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
