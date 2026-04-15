package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

func (h *AdminSettingsHandler) GetWechatLoginConfig(c *gin.Context) {
	raw := map[string]interface{}{}
	_ = h.admin.GetSetting(c.Request.Context(), "wechat_login_config", &raw)
	cfg := service.NormalizeWechatLoginConfigMap(raw)
	respondAdminSettingsSuccess(c, "微信登录配置加载成功", service.BuildWechatLoginConfigAdminView(cfg))
}

func (h *AdminSettingsHandler) UpdateWechatLoginConfig(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "invalid request parameters")
		return
	}

	existingRaw := map[string]interface{}{}
	_ = h.admin.GetSetting(c.Request.Context(), "wechat_login_config", &existingRaw)

	existing := service.NormalizeWechatLoginConfigMap(existingRaw)
	incoming := service.NormalizeWechatLoginConfigMap(data)
	merged := service.MergeWechatLoginConfig(incoming, existing)
	if err := service.ValidateWechatLoginConfig(merged); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}

	if err := h.admin.SaveSetting(c.Request.Context(), "wechat_login_config", service.SerializeWechatLoginConfigForStorage(merged)); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}

	respondAdminSettingsSuccess(c, "微信登录配置保存成功", service.BuildWechatLoginConfigAdminView(merged))
}
