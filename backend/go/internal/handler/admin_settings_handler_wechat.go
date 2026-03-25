package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

func (h *AdminSettingsHandler) GetWechatLoginConfig(c *gin.Context) {
	raw := map[string]interface{}{}
	_ = h.admin.GetSetting(c.Request.Context(), "wechat_login_config", &raw)
	cfg := service.NormalizeWechatLoginConfigMap(raw)
	c.JSON(http.StatusOK, service.BuildWechatLoginConfigAdminView(cfg))
}

func (h *AdminSettingsHandler) UpdateWechatLoginConfig(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid request parameters",
		})
		return
	}

	existingRaw := map[string]interface{}{}
	_ = h.admin.GetSetting(c.Request.Context(), "wechat_login_config", &existingRaw)

	existing := service.NormalizeWechatLoginConfigMap(existingRaw)
	incoming := service.NormalizeWechatLoginConfigMap(data)
	merged := service.MergeWechatLoginConfig(incoming, existing)
	if err := service.ValidateWechatLoginConfig(merged); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := h.admin.SaveSetting(c.Request.Context(), "wechat_login_config", service.SerializeWechatLoginConfigForStorage(merged)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    service.BuildWechatLoginConfigAdminView(merged),
	})
}
