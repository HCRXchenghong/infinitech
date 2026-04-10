package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *AdminSettingsHandler) ExportSystemSettings(c *gin.Context) {
	data, err := h.admin.ExportSystemSettingsBundle(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) ExportContentConfig(c *gin.Context) {
	data, err := h.admin.ExportContentConfigBundle(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) ExportAPIConfig(c *gin.Context) {
	data, err := h.admin.ExportAPIConfigBundle(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) ExportPaymentConfig(c *gin.Context) {
	data, err := h.admin.ExportPaymentConfigBundle(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) ImportSystemSettings(c *gin.Context) {
	h.importBundle(c, h.admin.ImportSystemSettingsBundle)
}

func (h *AdminSettingsHandler) ImportContentConfig(c *gin.Context) {
	h.importBundle(c, h.admin.ImportContentConfigBundle)
}

func (h *AdminSettingsHandler) ImportAPIConfig(c *gin.Context) {
	h.importBundle(c, h.admin.ImportAPIConfigBundle)
}

func (h *AdminSettingsHandler) ImportPaymentConfig(c *gin.Context) {
	h.importBundle(c, h.admin.ImportPaymentConfigBundle)
}

func (h *AdminSettingsHandler) importBundle(
	c *gin.Context,
	importer func(c context.Context, payload map[string]interface{}) (map[string]interface{}, error),
) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}

	data, err := importer(c.Request.Context(), payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  data,
	})
}
