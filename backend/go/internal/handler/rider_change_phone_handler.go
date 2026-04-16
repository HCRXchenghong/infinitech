package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	svc "github.com/yuexiang/go-api/internal/service"
)

func (h *RiderHandler) SecureChangePhone(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "无效骑手ID", nil)
		return
	}

	var req struct {
		OldPhone string `json:"oldPhone"`
		OldCode  string `json:"oldCode"`
		NewPhone string `json:"newPhone"`
		NewCode  string `json:"newCode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "参数错误", nil)
		return
	}

	req.OldPhone = strings.TrimSpace(req.OldPhone)
	req.OldCode = strings.TrimSpace(req.OldCode)
	req.NewPhone = strings.TrimSpace(req.NewPhone)
	req.NewCode = strings.TrimSpace(req.NewCode)

	if req.OldPhone == "" || req.OldCode == "" || req.NewPhone == "" || req.NewCode == "" {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请完整填写换绑信息", nil)
		return
	}
	if req.OldPhone == req.NewPhone {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "新手机号不能与原手机号相同", nil)
		return
	}

	var rider repository.Rider
	if err := h.db.Where("id = ?", riderID).First(&rider).Error; err != nil {
		respondErrorEnvelope(c, http.StatusNotFound, responseCodeNotFound, "骑手不存在", nil)
		return
	}
	if strings.TrimSpace(rider.Phone) != req.OldPhone {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "原手机号与当前账号不匹配", nil)
		return
	}

	ctx := c.Request.Context()
	oldOK, err := svc.VerifySMSCodeWithFallback(ctx, h.db, h.redis, "change_phone_verify", req.OldPhone, req.OldCode, true)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "验证码服务异常，请稍后重试", nil)
		return
	}
	if !oldOK {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "原手机号验证码错误或已过期", nil)
		return
	}

	newOK, err := svc.VerifySMSCodeWithFallback(ctx, h.db, h.redis, "change_phone_new", req.NewPhone, req.NewCode, true)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "验证码服务异常，请稍后重试", nil)
		return
	}
	if !newOK {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "新手机号验证码错误或已过期", nil)
		return
	}

	var count int64
	if err := h.db.Model(&repository.Rider{}).Where("phone = ? AND id <> ?", req.NewPhone, riderID).Count(&count).Error; err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "手机号校验失败", nil)
		return
	}
	if count > 0 {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "该手机号已被其他骑手使用", nil)
		return
	}

	if err := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Update("phone", req.NewPhone).Error; err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "修改手机号失败", nil)
		return
	}

	response := gin.H{
		"success": true,
		"message": "手机号修改成功",
		"user": gin.H{
			"id":       rider.UID,
			"phone":    req.NewPhone,
			"name":     rider.Name,
			"nickname": rider.Nickname,
		},
	}

	if h.auth != nil {
		token, tokenErr := h.auth.IssueAccessToken(req.NewPhone, int64(riderID))
		if tokenErr == nil && strings.TrimSpace(token) != "" {
			response["token"] = token
		}
	}

	respondMirroredSuccessEnvelope(c, "手机号修改成功", response)
}
