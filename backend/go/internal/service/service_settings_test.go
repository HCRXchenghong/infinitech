package service

import "testing"

func TestBuildPublicRuntimeSettingsDisablesBrokenWechatEntry(t *testing.T) {
	settings := ServiceSettings{
		ServicePhone:                "400-000-0000",
		SupportChatTitle:            "平台客服中心",
		SupportChatWelcomeMessage:   "您好，我是平台客服中心，请问有什么可以帮您？",
		MerchantChatWelcomeMessage:  "欢迎光临，这里是商家在线客服。",
		RiderChatWelcomeMessage:     "您好，骑手已接单，正在为您赶来。",
		InviteLandingURL:            "https://m.yuexiang.com/register",
		WechatLoginEnabled:          true,
		WechatLoginEntryURL:         "",
		MedicineSupportTitle:        "专属医务室",
		MedicineSupportSubtitle:     "紧急连线\n人工服务",
		MedicineDeliveryDescription: "24小时配送\n平均30分钟达",
		MedicineSeasonTip:           "近期流感高发，请注意防护。",
		RiderInsuranceStatusTitle:   "骑手意外保障已生效",
		RiderInsuranceStatusDesc:    "为您提供全方位安全保障",
		RiderInsurancePolicyNumber:  "PICC-2026-0001",
		RiderInsuranceProvider:      "中国人保财险",
		RiderInsuranceEffectiveDate: "2026-01-01",
		RiderInsuranceExpireDate:    "2026-12-31",
		RiderInsuranceClaimURL:      "https://m.yuexiang.com/rider/claim",
		RiderInsuranceDetailURL:     "https://m.yuexiang.com/rider/policy",
		RiderInsuranceClaimButton:   "我要理赔",
		RiderInsuranceDetailButton:  "查看保单详情",
		RiderInsuranceClaimSteps:    []string{"联系客服", "提交材料"},
		RiderInsuranceCoverages: []RiderInsuranceCoverageItem{
			{Icon: "🏥", Name: "意外医疗", Amount: "最高10万元"},
		},
		MapAPIKey: "secret",
	}

	public := BuildPublicRuntimeSettings(settings)

	if public.ServicePhone != "400-000-0000" {
		t.Fatalf("unexpected service phone: %q", public.ServicePhone)
	}
	if public.SupportChatTitle != "平台客服中心" {
		t.Fatalf("unexpected support chat title: %q", public.SupportChatTitle)
	}
	if public.SupportChatWelcomeMessage != "您好，我是平台客服中心，请问有什么可以帮您？" {
		t.Fatalf("unexpected support chat welcome message: %q", public.SupportChatWelcomeMessage)
	}
	if public.MerchantChatWelcomeMessage != "欢迎光临，这里是商家在线客服。" {
		t.Fatalf("unexpected merchant chat welcome message: %q", public.MerchantChatWelcomeMessage)
	}
	if public.RiderChatWelcomeMessage != "您好，骑手已接单，正在为您赶来。" {
		t.Fatalf("unexpected rider chat welcome message: %q", public.RiderChatWelcomeMessage)
	}
	if public.InviteLandingURL != "https://m.yuexiang.com/register" {
		t.Fatalf("unexpected invite landing url: %q", public.InviteLandingURL)
	}
	if public.WechatLoginEnabled {
		t.Fatalf("expected wechat login to be disabled when entry url is empty")
	}
	if public.WechatLoginEntryURL != "" {
		t.Fatalf("expected empty wechat login entry url, got %q", public.WechatLoginEntryURL)
	}
	if public.MedicineSupportPhone != "400-000-0000" {
		t.Fatalf("expected medicine support phone to fallback to service phone, got %q", public.MedicineSupportPhone)
	}
	if public.MedicineSupportTitle != "专属医务室" {
		t.Fatalf("unexpected medicine support title: %q", public.MedicineSupportTitle)
	}
	if public.MedicineDeliveryDescription != "24小时配送\n平均30分钟达" {
		t.Fatalf("unexpected medicine delivery description: %q", public.MedicineDeliveryDescription)
	}
	if public.MedicineSeasonTip != "近期流感高发，请注意防护。" {
		t.Fatalf("unexpected medicine season tip: %q", public.MedicineSeasonTip)
	}
	if len(public.RiderExceptionReportReasons) != len(defaultRiderExceptionReportReasons) {
		t.Fatalf("expected default rider report reasons, got %d", len(public.RiderExceptionReportReasons))
	}
	if public.RiderInsuranceStatusTitle != "骑手意外保障已生效" {
		t.Fatalf("unexpected rider insurance status title: %q", public.RiderInsuranceStatusTitle)
	}
	if public.RiderInsurancePolicyNumber != "PICC-2026-0001" {
		t.Fatalf("unexpected rider insurance policy number: %q", public.RiderInsurancePolicyNumber)
	}
	if public.RiderInsuranceClaimURL != "https://m.yuexiang.com/rider/claim" {
		t.Fatalf("unexpected rider insurance claim url: %q", public.RiderInsuranceClaimURL)
	}
	if len(public.RiderInsuranceCoverages) != 1 {
		t.Fatalf("expected rider insurance coverages to be preserved, got %d", len(public.RiderInsuranceCoverages))
	}
}

func TestValidateServiceSettingsAcceptsInviteAndWechatURLs(t *testing.T) {
	settings := ServiceSettings{
		SupportChatTitle:            "客服中心",
		SupportChatWelcomeMessage:   "您好，这里是客服中心。",
		InviteLandingURL:            "https://m.yuexiang.com/register",
		WechatLoginEnabled:          true,
		WechatLoginEntryURL:         "https://auth.yuexiang.com/wechat/login",
		MedicineSupportPhone:        "400-000-0000",
		MedicineSupportTitle:        "医药热线",
		MedicineSupportSubtitle:     "紧急连线\n人工服务",
		MedicineDeliveryDescription: "24小时配送\n平均30分钟达",
		MedicineSeasonTip:           "近期流感高发，请按需备药。",
		RiderExceptionReportReasons: []string{"商家出餐慢", "联系不上顾客"},
		MapProvider:                 "proxy",
		MapTileTemplate:             DefaultMapTileTemplate,
		MapTimeoutSec:               DefaultMapTimeoutSec,
	}

	if err := ValidateServiceSettings(settings); err != nil {
		t.Fatalf("expected settings to be valid, got %v", err)
	}
}

func TestNormalizeServiceSettingsAppliesDefaults(t *testing.T) {
	settings := NormalizeServiceSettings(ServiceSettings{})

	if settings.MedicineSupportTitle == "" {
		t.Fatal("expected default medicine support title")
	}
	if settings.SupportChatTitle == "" {
		t.Fatal("expected default support chat title")
	}
	if settings.SupportChatWelcomeMessage == "" {
		t.Fatal("expected default support chat welcome message")
	}
	if settings.MerchantChatWelcomeMessage == "" {
		t.Fatal("expected default merchant chat welcome message")
	}
	if settings.RiderChatWelcomeMessage == "" {
		t.Fatal("expected default rider chat welcome message")
	}
	if settings.MedicineDeliveryDescription == "" {
		t.Fatal("expected default medicine delivery description")
	}
	if settings.MedicineSeasonTip == "" {
		t.Fatal("expected default medicine season tip")
	}
	if len(settings.RiderExceptionReportReasons) == 0 {
		t.Fatal("expected default rider exception report reasons")
	}
	if settings.RiderInsuranceStatusTitle == "" {
		t.Fatal("expected default rider insurance status title")
	}
	if len(settings.RiderInsuranceClaimSteps) == 0 {
		t.Fatal("expected default rider insurance claim steps")
	}
}

func TestNormalizeServiceSettingsDeduplicatesRiderExceptionReasons(t *testing.T) {
	settings := NormalizeServiceSettings(ServiceSettings{
		RiderExceptionReportReasons: []string{" 商家出餐慢 ", "", "商家出餐慢", "车辆故障"},
	})

	if len(settings.RiderExceptionReportReasons) != 2 {
		t.Fatalf("expected deduplicated reason list, got %d", len(settings.RiderExceptionReportReasons))
	}
	if settings.RiderExceptionReportReasons[0] != "商家出餐慢" {
		t.Fatalf("unexpected first reason: %q", settings.RiderExceptionReportReasons[0])
	}
}
