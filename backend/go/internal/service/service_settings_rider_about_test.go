package service

import "testing"

func TestNormalizeServiceSettingsAppliesRiderAboutDefault(t *testing.T) {
	settings := NormalizeServiceSettings(ServiceSettings{})

	if settings.RiderAboutSummary == "" {
		t.Fatal("expected default rider about summary")
	}
}

func TestBuildPublicRuntimeSettingsIncludesRiderAboutSummary(t *testing.T) {
	public := BuildPublicRuntimeSettings(ServiceSettings{
		RiderAboutSummary: "骑手端运营说明",
	})

	if public.RiderAboutSummary != "骑手端运营说明" {
		t.Fatalf("unexpected rider about summary: %q", public.RiderAboutSummary)
	}
}
