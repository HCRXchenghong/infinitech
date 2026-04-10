package service

import (
	"context"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

const (
	exportWeatherAPIBaseURL = "https://uapis.cn/api/v1/misc/weather"
	exportWeatherLang       = "zh"
	exportWeatherTimeoutMS  = 8000
	exportWeatherRefreshMin = 10
)

func (s *AdminService) ExportSystemSettingsBundle(ctx context.Context) (map[string]interface{}, error) {
	debugMode := map[string]interface{}{
		"enabled":    false,
		"delivery":   false,
		"phone_film": false,
		"massage":    false,
		"coffee":     false,
	}
	_ = s.GetSetting(ctx, "debug_mode", &debugMode)

	serviceSettings := DefaultServiceSettings()
	_ = s.GetSetting(ctx, "service_settings", &serviceSettings)
	serviceSettings = NormalizeServiceSettings(serviceSettings)

	charitySettings := DefaultCharitySettings()
	_ = s.GetSetting(ctx, "charity_settings", &charitySettings)
	charitySettings = NormalizeCharitySettings(charitySettings)

	vipSettings := DefaultVIPSettings()
	_ = s.GetSetting(ctx, "vip_settings", &vipSettings)
	vipSettings = NormalizeVIPSettings(vipSettings)

	coinRatio := map[string]interface{}{"ratio": 1}
	_ = s.GetSetting(ctx, "coin_ratio", &coinRatio)

	appDownloadConfig := map[string]interface{}{
		"ios_url":         "",
		"android_url":     "",
		"ios_version":     "",
		"android_version": "",
		"latest_version":  "",
		"updated_at":      "",
	}
	_ = s.GetSetting(ctx, "app_download_config", &appDownloadConfig)
	if parseString(appDownloadConfig["updated_at"]) == "" {
		appDownloadConfig["updated_at"] = time.Now().Format("2006-01-02")
	}

	return map[string]interface{}{
		"scope":                   "system_settings",
		"version":                 "2.0",
		"exported_at":             time.Now().Format(time.RFC3339),
		"contains_sensitive_data": false,
		"debug_mode":              debugMode,
		"service_settings":        serviceSettings,
		"charity_settings":        charitySettings,
		"vip_settings":            vipSettings,
		"coin_ratio":              coinRatio,
		"app_download_config":     appDownloadConfig,
		"summary": map[string]interface{}{
			"setting_keys": 6,
		},
	}, nil
}

func (s *AdminService) ExportContentConfigBundle(ctx context.Context) (map[string]interface{}, error) {
	carouselSettings := map[string]interface{}{"auto_play_seconds": 5}
	_ = s.GetSetting(ctx, "carousel_settings", &carouselSettings)

	var carousels []repository.Carousel
	if err := s.db.WithContext(ctx).
		Order("sort_order ASC, created_at DESC").
		Find(&carousels).Error; err != nil {
		return nil, err
	}

	carouselItems := make([]map[string]interface{}, 0, len(carousels))
	for _, item := range carousels {
		carouselItems = append(carouselItems, map[string]interface{}{
			"id":         item.UID,
			"tsid":       item.TSID,
			"legacy_id":  item.ID,
			"title":      item.Title,
			"image_url":  item.ImageURL,
			"link_url":   item.LinkURL,
			"link_type":  item.LinkType,
			"sort_order": item.SortOrder,
			"is_active":  item.IsActive,
			"created_at": formatTime(item.CreatedAt),
			"updated_at": formatTime(item.UpdatedAt),
		})
	}

	var pushMessages []repository.PushMessage
	if err := s.db.WithContext(ctx).
		Order("created_at DESC").
		Find(&pushMessages).Error; err != nil {
		return nil, err
	}

	pushItems := make([]map[string]interface{}, 0, len(pushMessages))
	for _, item := range pushMessages {
		pushItems = append(pushItems, map[string]interface{}{
			"id":                   item.UID,
			"tsid":                 item.TSID,
			"legacy_id":            item.ID,
			"title":                item.Title,
			"content":              item.Content,
			"image_url":            item.ImageURL,
			"compress_image":       item.CompressImage,
			"is_active":            item.IsActive,
			"scheduled_start_time": item.ScheduledStartTime,
			"scheduled_end_time":   item.ScheduledEndTime,
			"created_at":           formatTime(item.CreatedAt),
			"updated_at":           formatTime(item.UpdatedAt),
		})
	}

	var campaigns []repository.HomePromotionCampaign
	if err := s.db.WithContext(ctx).
		Order("slot_position ASC, start_at DESC, created_at DESC").
		Find(&campaigns).Error; err != nil {
		return nil, err
	}

	campaignItems := make([]map[string]interface{}, 0, len(campaigns))
	lockedCount := 0
	for _, item := range campaigns {
		if item.IsPositionLocked {
			lockedCount++
		}
		campaignItems = append(campaignItems, homePromotionCampaignToMap(item))
	}

	return map[string]interface{}{
		"scope":                   "content_config",
		"version":                 "2.0",
		"exported_at":             time.Now().Format(time.RFC3339),
		"contains_sensitive_data": false,
		"carousel_settings":       carouselSettings,
		"carousels":               carouselItems,
		"push_messages":           pushItems,
		"home_campaigns":          campaignItems,
		"summary": map[string]interface{}{
			"carousel_count":         len(carouselItems),
			"push_message_count":     len(pushItems),
			"home_campaign_count":    len(campaignItems),
			"locked_home_slot_count": lockedCount,
		},
	}, nil
}

func (s *AdminService) ExportAPIConfigBundle(ctx context.Context) (map[string]interface{}, error) {
	rawSMSConfig := map[string]interface{}{}
	_ = s.GetSetting(ctx, "sms_config", &rawSMSConfig)
	smsConfig := SerializeSMSProviderConfigForStorage(NormalizeSMSProviderConfigMap(rawSMSConfig))

	rawWeatherConfig := map[string]interface{}{}
	_ = s.GetSetting(ctx, "weather_config", &rawWeatherConfig)
	weatherConfig := normalizeWeatherExportConfig(rawWeatherConfig)

	rawWechatLoginConfig := map[string]interface{}{}
	_ = s.GetSetting(ctx, "wechat_login_config", &rawWechatLoginConfig)
	wechatLoginConfig := SerializeWechatLoginConfigForStorage(NormalizeWechatLoginConfigMap(rawWechatLoginConfig))

	publicAPIs, err := s.ListPublicAPIs(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"scope":                   "api_config",
		"version":                 "2.0",
		"exported_at":             time.Now().Format(time.RFC3339),
		"contains_sensitive_data": true,
		"sms_config":              smsConfig,
		"weather_config":          weatherConfig,
		"wechat_login_config":     wechatLoginConfig,
		"public_apis":             publicAPIs,
		"summary": map[string]interface{}{
			"public_api_count": len(publicAPIs),
			"provider_count":   4,
		},
	}, nil
}

func (s *AdminService) ExportPaymentConfigBundle(ctx context.Context) (map[string]interface{}, error) {
	payMode := map[string]interface{}{"isProd": false}
	_ = s.GetSetting(ctx, "pay_mode", &payMode)

	wxpayConfig := map[string]interface{}{
		"appId":     "",
		"mchId":     "",
		"apiKey":    "",
		"apiV3Key":  "",
		"serialNo":  "",
		"notifyUrl": "",
	}
	_ = s.GetSetting(ctx, "wxpay_config", &wxpayConfig)

	alipayConfig := map[string]interface{}{
		"appId":           "",
		"privateKey":      "",
		"alipayPublicKey": "",
		"notifyUrl":       "",
		"sandbox":         true,
	}
	_ = s.GetSetting(ctx, "alipay_config", &alipayConfig)

	paymentNotices := map[string]interface{}{
		"delivery":   "",
		"phone_film": "",
		"massage":    "",
		"coffee":     "",
	}
	_ = s.GetSetting(ctx, "payment_notices", &paymentNotices)

	return map[string]interface{}{
		"scope":                   "payment_config",
		"version":                 "2.0",
		"exported_at":             time.Now().Format(time.RFC3339),
		"contains_sensitive_data": true,
		"pay_mode":                payMode,
		"wxpay_config":            wxpayConfig,
		"alipay_config":           alipayConfig,
		"payment_notices":         paymentNotices,
		"summary": map[string]interface{}{
			"config_groups": 4,
		},
	}, nil
}

func normalizeWeatherExportConfig(raw map[string]interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"api_base_url":             exportWeatherAPIBaseURL,
		"api_key":                  "",
		"city":                     "",
		"adcode":                   "",
		"lang":                     exportWeatherLang,
		"extended":                 true,
		"forecast":                 true,
		"hourly":                   true,
		"minutely":                 true,
		"indices":                  true,
		"timeout_ms":               exportWeatherTimeoutMS,
		"refresh_interval_minutes": exportWeatherRefreshMin,
		"location":                 "",
	}

	for key, value := range raw {
		result[key] = value
	}

	city := parseString(result["city"])
	if city == "" {
		city = parseString(result["location"])
		result["city"] = city
	}
	if parseString(result["location"]) == "" {
		result["location"] = city
	}
	if parseString(result["api_base_url"]) == "" {
		result["api_base_url"] = exportWeatherAPIBaseURL
	}
	if parseString(result["lang"]) == "" {
		result["lang"] = exportWeatherLang
	}
	if parseInt64(result["timeout_ms"]) <= 0 {
		result["timeout_ms"] = exportWeatherTimeoutMS
	}
	if parseInt64(result["refresh_interval_minutes"]) <= 0 {
		result["refresh_interval_minutes"] = exportWeatherRefreshMin
	}

	return result
}
