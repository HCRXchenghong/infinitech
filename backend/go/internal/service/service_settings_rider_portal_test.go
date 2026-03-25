package service

import "testing"

func TestNormalizeServiceSettingsAppliesRiderPortalDefaults(t *testing.T) {
	settings := NormalizeServiceSettings(ServiceSettings{})

	if settings.RiderPortalTitle == "" {
		t.Fatal("expected default rider portal title")
	}
	if settings.RiderPortalSubtitle == "" {
		t.Fatal("expected default rider portal subtitle")
	}
	if settings.RiderPortalLoginFooter == "" {
		t.Fatal("expected default rider portal login footer")
	}
}

func TestBuildPublicRuntimeSettingsIncludesRiderPortalCopy(t *testing.T) {
	public := BuildPublicRuntimeSettings(ServiceSettings{
		RiderPortalTitle:       "骑手工作台",
		RiderPortalSubtitle:    "测试骑手入口",
		RiderPortalLoginFooter: "由平台统一开通骑手账号",
	})

	if public.RiderPortalTitle != "骑手工作台" {
		t.Fatalf("unexpected rider portal title: %q", public.RiderPortalTitle)
	}
	if public.RiderPortalSubtitle != "测试骑手入口" {
		t.Fatalf("unexpected rider portal subtitle: %q", public.RiderPortalSubtitle)
	}
	if public.RiderPortalLoginFooter != "由平台统一开通骑手账号" {
		t.Fatalf("unexpected rider portal login footer: %q", public.RiderPortalLoginFooter)
	}
}
