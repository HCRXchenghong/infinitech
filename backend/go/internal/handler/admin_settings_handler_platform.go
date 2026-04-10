package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

func (h *AdminSettingsHandler) loadPlatformRuntimeBundle(c *gin.Context) service.PlatformRuntimeBundle {
	homeEntry := service.DefaultHomeEntrySettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyHomeEntrySettings, &homeEntry)

	errand := service.DefaultErrandSettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyErrandSettings, &errand)

	taxonomy := service.DefaultMerchantTaxonomySettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyMerchantTaxonomySettings, &taxonomy)

	ranks := service.DefaultRiderRankSettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyRiderRankSettings, &ranks)

	diningBuddy := service.DefaultDiningBuddySettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyDiningBuddySettings, &diningBuddy)

	return service.PlatformRuntimeBundle{
		HomeEntrySettings:        service.NormalizeHomeEntrySettings(homeEntry),
		ErrandSettings:           service.NormalizeErrandSettings(errand),
		MerchantTaxonomySettings: service.NormalizeMerchantTaxonomySettings(taxonomy),
		RiderRankSettings:        service.NormalizeRiderRankSettings(ranks),
		DiningBuddySettings:      service.NormalizeDiningBuddySettings(diningBuddy),
	}
}

func (h *AdminSettingsHandler) GetHomeEntrySettings(c *gin.Context) {
	data := service.DefaultHomeEntrySettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyHomeEntrySettings, &data)
	data = service.NormalizeHomeEntrySettings(data)
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) UpdateHomeEntrySettings(c *gin.Context) {
	data := service.DefaultHomeEntrySettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	data = service.NormalizeHomeEntrySettings(data)
	if err := service.ValidateHomeEntrySettings(data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyHomeEntrySettings, data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *AdminSettingsHandler) GetErrandSettings(c *gin.Context) {
	data := service.DefaultErrandSettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyErrandSettings, &data)
	data = service.NormalizeErrandSettings(data)
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) UpdateErrandSettings(c *gin.Context) {
	data := service.DefaultErrandSettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	data = service.NormalizeErrandSettings(data)
	if err := service.ValidateErrandSettings(data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyErrandSettings, data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *AdminSettingsHandler) GetMerchantTaxonomySettings(c *gin.Context) {
	data := service.DefaultMerchantTaxonomySettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyMerchantTaxonomySettings, &data)
	data = service.NormalizeMerchantTaxonomySettings(data)
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) UpdateMerchantTaxonomySettings(c *gin.Context) {
	data := service.DefaultMerchantTaxonomySettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	data = service.NormalizeMerchantTaxonomySettings(data)
	if err := service.ValidateMerchantTaxonomySettings(data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyMerchantTaxonomySettings, data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *AdminSettingsHandler) GetRiderRankSettings(c *gin.Context) {
	data := service.DefaultRiderRankSettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyRiderRankSettings, &data)
	data = service.NormalizeRiderRankSettings(data)
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) UpdateRiderRankSettings(c *gin.Context) {
	data := service.DefaultRiderRankSettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	data = service.NormalizeRiderRankSettings(data)
	if err := service.ValidateRiderRankSettings(data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyRiderRankSettings, data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *AdminSettingsHandler) GetDiningBuddySettings(c *gin.Context) {
	data := service.DefaultDiningBuddySettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyDiningBuddySettings, &data)
	data = service.NormalizeDiningBuddySettings(data)
	c.JSON(http.StatusOK, data)
}

func (h *AdminSettingsHandler) UpdateDiningBuddySettings(c *gin.Context) {
	data := service.DefaultDiningBuddySettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	data = service.NormalizeDiningBuddySettings(data)
	if err := service.ValidateDiningBuddySettings(data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyDiningBuddySettings, data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}
