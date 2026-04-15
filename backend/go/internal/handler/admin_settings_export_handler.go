package handler

import (
	"context"

	"github.com/gin-gonic/gin"
)

func (h *AdminSettingsHandler) ExportSystemSettings(c *gin.Context) {
	data, err := h.admin.ExportSystemSettingsBundle(c.Request.Context())
	if err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "系统配置导出成功", data)
}

func (h *AdminSettingsHandler) ExportContentConfig(c *gin.Context) {
	data, err := h.admin.ExportContentConfigBundle(c.Request.Context())
	if err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "内容配置导出成功", data)
}

func (h *AdminSettingsHandler) ExportAPIConfig(c *gin.Context) {
	data, err := h.admin.ExportAPIConfigBundle(c.Request.Context())
	if err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "API 配置导出成功", data)
}

func (h *AdminSettingsHandler) ExportPaymentConfig(c *gin.Context) {
	data, err := h.admin.ExportPaymentConfigBundle(c.Request.Context())
	if err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "支付配置导出成功", data)
}

func (h *AdminSettingsHandler) ImportSystemSettings(c *gin.Context) {
	h.importBundle(c, h.admin.ImportSystemSettingsBundle, "系统配置导入成功")
}

func (h *AdminSettingsHandler) ImportContentConfig(c *gin.Context) {
	h.importBundle(c, h.admin.ImportContentConfigBundle, "内容配置导入成功")
}

func (h *AdminSettingsHandler) ImportAPIConfig(c *gin.Context) {
	h.importBundle(c, h.admin.ImportAPIConfigBundle, "API 配置导入成功")
}

func (h *AdminSettingsHandler) ImportPaymentConfig(c *gin.Context) {
	h.importBundle(c, h.admin.ImportPaymentConfigBundle, "支付配置导入成功")
}

func (h *AdminSettingsHandler) importBundle(
	c *gin.Context,
	importer func(c context.Context, payload map[string]interface{}) (map[string]interface{}, error),
	successMessage string,
) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}

	data, err := importer(c.Request.Context(), payload)
	if err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}

	respondAdminSettingsSuccess(c, successMessage, data)
}
