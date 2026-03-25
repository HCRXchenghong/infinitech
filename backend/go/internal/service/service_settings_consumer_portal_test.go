package service

import "testing"

func TestBuildPublicRuntimeSettingsIncludesConsumerPortalCopy(t *testing.T) {
	settings := ServiceSettings{
		ConsumerPortalTitle:       "欢迎登录平台",
		ConsumerPortalSubtitle:    "全城生活服务入口",
		ConsumerPortalLoginFooter: "登录后可同步订单、消息与优惠权益",
	}

	public := BuildPublicRuntimeSettings(settings)

	if public.ConsumerPortalTitle != settings.ConsumerPortalTitle {
		t.Fatalf("unexpected consumer portal title: %q", public.ConsumerPortalTitle)
	}
	if public.ConsumerPortalSubtitle != settings.ConsumerPortalSubtitle {
		t.Fatalf("unexpected consumer portal subtitle: %q", public.ConsumerPortalSubtitle)
	}
	if public.ConsumerPortalLoginFooter != settings.ConsumerPortalLoginFooter {
		t.Fatalf("unexpected consumer portal login footer: %q", public.ConsumerPortalLoginFooter)
	}
}

func TestNormalizeServiceSettingsAppliesConsumerPortalDefaults(t *testing.T) {
	settings := NormalizeServiceSettings(ServiceSettings{})

	if settings.ConsumerPortalTitle == "" {
		t.Fatal("expected default consumer portal title")
	}
	if settings.ConsumerPortalSubtitle == "" {
		t.Fatal("expected default consumer portal subtitle")
	}
	if settings.ConsumerPortalLoginFooter == "" {
		t.Fatal("expected default consumer portal login footer")
	}
}

func TestValidateServiceSettingsRejectsTooLongConsumerPortalTitle(t *testing.T) {
	settings := ServiceSettings{
		ConsumerPortalTitle: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdef",
	}

	if err := ValidateServiceSettings(settings); err == nil {
		t.Fatal("expected consumer portal title length validation error")
	}
}
