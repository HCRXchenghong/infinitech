package handler

import (
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
	respondAdminSettingsSuccess(c, "首页入口配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateHomeEntrySettings(c *gin.Context) {
	data := service.DefaultHomeEntrySettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	data = service.NormalizeHomeEntrySettings(data)
	if err := service.ValidateHomeEntrySettings(data); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyHomeEntrySettings, data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "首页入口配置保存成功", data)
}

func (h *AdminSettingsHandler) GetErrandSettings(c *gin.Context) {
	data := service.DefaultErrandSettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyErrandSettings, &data)
	data = service.NormalizeErrandSettings(data)
	respondAdminSettingsSuccess(c, "跑腿配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateErrandSettings(c *gin.Context) {
	data := service.DefaultErrandSettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	data = service.NormalizeErrandSettings(data)
	if err := service.ValidateErrandSettings(data); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyErrandSettings, data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "跑腿配置保存成功", data)
}

func (h *AdminSettingsHandler) GetMerchantTaxonomySettings(c *gin.Context) {
	data := service.DefaultMerchantTaxonomySettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyMerchantTaxonomySettings, &data)
	data = service.NormalizeMerchantTaxonomySettings(data)
	respondAdminSettingsSuccess(c, "商户业务字典加载成功", data)
}

func (h *AdminSettingsHandler) UpdateMerchantTaxonomySettings(c *gin.Context) {
	data := service.DefaultMerchantTaxonomySettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	data = service.NormalizeMerchantTaxonomySettings(data)
	if err := service.ValidateMerchantTaxonomySettings(data); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyMerchantTaxonomySettings, data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "商户业务字典保存成功", data)
}

func (h *AdminSettingsHandler) GetRiderRankSettings(c *gin.Context) {
	data := service.DefaultRiderRankSettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyRiderRankSettings, &data)
	data = service.NormalizeRiderRankSettings(data)
	respondAdminSettingsSuccess(c, "骑手等级配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateRiderRankSettings(c *gin.Context) {
	data := service.DefaultRiderRankSettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	data = service.NormalizeRiderRankSettings(data)
	if err := service.ValidateRiderRankSettings(data); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyRiderRankSettings, data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "骑手等级配置保存成功", data)
}

func (h *AdminSettingsHandler) GetDiningBuddySettings(c *gin.Context) {
	data := service.DefaultDiningBuddySettings()
	_ = h.admin.GetSetting(c.Request.Context(), service.SettingKeyDiningBuddySettings, &data)
	data = service.NormalizeDiningBuddySettings(data)
	respondAdminSettingsSuccess(c, "同频饭友配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateDiningBuddySettings(c *gin.Context) {
	data := service.DefaultDiningBuddySettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	data = service.NormalizeDiningBuddySettings(data)
	if err := service.ValidateDiningBuddySettings(data); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), service.SettingKeyDiningBuddySettings, data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "同频饭友配置保存成功", data)
}
