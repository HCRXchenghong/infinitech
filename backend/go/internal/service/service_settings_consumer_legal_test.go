package service

import "testing"

func TestBuildPublicRuntimeSettingsIncludesConsumerLegalCopy(t *testing.T) {
	settings := ServiceSettings{
		ConsumerAboutSummary:  "平台关于说明",
		ConsumerPrivacyPolicy: "平台隐私政策说明",
		ConsumerUserAgreement: "平台用户协议说明",
	}

	public := BuildPublicRuntimeSettings(settings)

	if public.ConsumerAboutSummary != settings.ConsumerAboutSummary {
		t.Fatalf("unexpected consumer about summary: %q", public.ConsumerAboutSummary)
	}
	if public.ConsumerPrivacyPolicy != settings.ConsumerPrivacyPolicy {
		t.Fatalf("unexpected consumer privacy policy: %q", public.ConsumerPrivacyPolicy)
	}
	if public.ConsumerUserAgreement != settings.ConsumerUserAgreement {
		t.Fatalf("unexpected consumer user agreement: %q", public.ConsumerUserAgreement)
	}
}

func TestNormalizeServiceSettingsAppliesConsumerLegalDefaults(t *testing.T) {
	settings := NormalizeServiceSettings(ServiceSettings{})

	if settings.ConsumerAboutSummary == "" {
		t.Fatal("expected default consumer about summary")
	}
	if settings.ConsumerPrivacyPolicy == "" {
		t.Fatal("expected default consumer privacy policy")
	}
	if settings.ConsumerUserAgreement == "" {
		t.Fatal("expected default consumer user agreement")
	}
}
