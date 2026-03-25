package service

import "testing"

func TestBuildPublicRuntimeSettingsIncludesMerchantPortalCopy(t *testing.T) {
	settings := ServiceSettings{
		MerchantPortalTitle:       "商户工作台",
		MerchantPortalSubtitle:    "悦享e食 · Merchant Console",
		MerchantPortalLoginFooter: "账号由平台管理员分配，登录后可直接管理订单和商品",
		MerchantPrivacyPolicy:     "我们会在必要范围内处理商户信息，用于订单履约、结算和风控。",
		MerchantServiceAgreement:  "使用商户端即表示你同意平台商户服务协议。",
	}

	public := BuildPublicRuntimeSettings(settings)

	if public.MerchantPortalTitle != settings.MerchantPortalTitle {
		t.Fatalf("unexpected merchant portal title: %q", public.MerchantPortalTitle)
	}
	if public.MerchantPortalSubtitle != settings.MerchantPortalSubtitle {
		t.Fatalf("unexpected merchant portal subtitle: %q", public.MerchantPortalSubtitle)
	}
	if public.MerchantPortalLoginFooter != settings.MerchantPortalLoginFooter {
		t.Fatalf("unexpected merchant portal login footer: %q", public.MerchantPortalLoginFooter)
	}
	if public.MerchantPrivacyPolicy != settings.MerchantPrivacyPolicy {
		t.Fatalf("unexpected merchant privacy policy: %q", public.MerchantPrivacyPolicy)
	}
	if public.MerchantServiceAgreement != settings.MerchantServiceAgreement {
		t.Fatalf("unexpected merchant service agreement: %q", public.MerchantServiceAgreement)
	}
}

func TestNormalizeServiceSettingsAppliesMerchantPortalDefaults(t *testing.T) {
	settings := NormalizeServiceSettings(ServiceSettings{})

	if settings.MerchantPortalTitle == "" {
		t.Fatal("expected default merchant portal title")
	}
	if settings.MerchantPortalSubtitle == "" {
		t.Fatal("expected default merchant portal subtitle")
	}
	if settings.MerchantPortalLoginFooter == "" {
		t.Fatal("expected default merchant portal login footer")
	}
	if settings.MerchantPrivacyPolicy == "" {
		t.Fatal("expected default merchant privacy policy")
	}
	if settings.MerchantServiceAgreement == "" {
		t.Fatal("expected default merchant service agreement")
	}
}

func TestValidateServiceSettingsRejectsTooLongMerchantPortalTitle(t *testing.T) {
	settings := ServiceSettings{
		MerchantPortalTitle: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdef",
	}

	if err := ValidateServiceSettings(settings); err == nil {
		t.Fatal("expected merchant portal title length validation error")
	}
}
