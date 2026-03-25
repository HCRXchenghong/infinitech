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
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "无效骑手ID"})
		return
	}

	var req struct {
		OldPhone string `json:"oldPhone"`
		OldCode  string `json:"oldCode"`
		NewPhone string `json:"newPhone"`
		NewCode  string `json:"newCode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "参数错误"})
		return
	}

	req.OldPhone = strings.TrimSpace(req.OldPhone)
	req.OldCode = strings.TrimSpace(req.OldCode)
	req.NewPhone = strings.TrimSpace(req.NewPhone)
	req.NewCode = strings.TrimSpace(req.NewCode)

	if req.OldPhone == "" || req.OldCode == "" || req.NewPhone == "" || req.NewCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请完整填写换绑信息"})
		return
	}
	if req.OldPhone == req.NewPhone {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "新手机号不能与原手机号相同"})
		return
	}

	var rider repository.Rider
	if err := h.db.Where("id = ?", riderID).First(&rider).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "骑手不存在"})
		return
	}
	if strings.TrimSpace(rider.Phone) != req.OldPhone {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "原手机号与当前账号不匹配"})
		return
	}

	ctx := c.Request.Context()
	oldOK, err := svc.VerifySMSCodeWithFallback(ctx, h.db, h.redis, "change_phone_verify", req.OldPhone, req.OldCode, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "验证码服务异常，请稍后重试"})
		return
	}
	if !oldOK {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "原手机号验证码错误或已过期"})
		return
	}

	newOK, err := svc.VerifySMSCodeWithFallback(ctx, h.db, h.redis, "change_phone_new", req.NewPhone, req.NewCode, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "验证码服务异常，请稍后重试"})
		return
	}
	if !newOK {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "新手机号验证码错误或已过期"})
		return
	}

	var count int64
	if err := h.db.Model(&repository.Rider{}).Where("phone = ? AND id <> ?", req.NewPhone, riderID).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "手机号校验失败"})
		return
	}
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "该手机号已被其他骑手使用"})
		return
	}

	if err := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Update("phone", req.NewPhone).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "修改手机号失败"})
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

	c.JSON(http.StatusOK, response)
}
