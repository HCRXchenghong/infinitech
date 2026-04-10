package service

import "testing"

func TestNormalizeSMSProviderConfigMapSupportsLegacyKeys(t *testing.T) {
	cfg := NormalizeSMSProviderConfigMap(map[string]interface{}{
		"access_key":  "legacy-ak",
		"sign":        "legacy-sign",
		"template_id": "SMS_123456",
		"endpoint":    "https://dysmsapi.aliyuncs.com/",
	})

	if cfg.Provider != defaultSMSProvider {
		t.Fatalf("expected provider %q, got %q", defaultSMSProvider, cfg.Provider)
	}
	if cfg.AccessKeyID != "legacy-ak" {
		t.Fatalf("expected access key id from legacy field, got %q", cfg.AccessKeyID)
	}
	if cfg.SignName != "legacy-sign" {
		t.Fatalf("expected sign name from legacy field, got %q", cfg.SignName)
	}
	if cfg.TemplateCode != "SMS_123456" {
		t.Fatalf("expected template code from legacy field, got %q", cfg.TemplateCode)
	}
	if cfg.RegionID != defaultAliyunSMSRegion {
		t.Fatalf("expected default region %q, got %q", defaultAliyunSMSRegion, cfg.RegionID)
	}
	if cfg.Endpoint != "dysmsapi.aliyuncs.com" {
		t.Fatalf("expected normalized endpoint host, got %q", cfg.Endpoint)
	}
}

func TestBuildSMSProviderConfigAdminViewMasksSecret(t *testing.T) {
	cfg := DefaultSMSProviderConfig()
	cfg.AccessKeyID = "ak"
	cfg.AccessKeySecret = "secret"
	cfg.SignName = "test-sign"
	cfg.TemplateCode = "SMS_123"

	view := BuildSMSProviderConfigAdminView(cfg)

	if got, _ := view["access_key_secret"].(string); got != "" {
		t.Fatalf("expected masked secret in admin view, got %q", got)
	}
	if got, _ := view["has_access_key_secret"].(bool); !got {
		t.Fatalf("expected has_access_key_secret to be true")
	}
	if got, _ := view["consumer_enabled"].(bool); !got {
		t.Fatalf("expected consumer_enabled to default to true")
	}
	if got, _ := view["admin_enabled"].(bool); !got {
		t.Fatalf("expected admin_enabled to default to true")
	}
}

func TestValidateSMSProviderConfigAllowsEmptyButRequiresCompleteAliyunConfig(t *testing.T) {
	if err := ValidateSMSProviderConfig(DefaultSMSProviderConfig()); err != nil {
		t.Fatalf("expected empty config to be allowed, got %v", err)
	}

	err := ValidateSMSProviderConfig(SMSProviderConfig{
		Provider:     defaultSMSProvider,
		AccessKeyID:  "ak",
		SignName:     "sign",
		TemplateCode: "SMS_123",
	})
	if err == nil {
		t.Fatalf("expected incomplete config to fail validation")
	}

	err = ValidateSMSProviderConfig(SMSProviderConfig{
		Provider:        defaultSMSProvider,
		AccessKeyID:     "ak",
		AccessKeySecret: "secret",
		SignName:        "sign",
		TemplateCode:    "SMS_123",
		RegionID:        defaultAliyunSMSRegion,
	})
	if err != nil {
		t.Fatalf("expected complete config to pass validation, got %v", err)
	}
}

func TestMergeSMSProviderConfigPreservesExistingTargetTogglesWhenRawKeysMissing(t *testing.T) {
	existing := SMSProviderConfig{
		Provider:        defaultSMSProvider,
		AccessKeyID:     "ak",
		AccessKeySecret: "secret",
		SignName:        "sign",
		TemplateCode:    "SMS_123",
		RegionID:        defaultAliyunSMSRegion,
		ConsumerEnabled: false,
		MerchantEnabled: false,
		RiderEnabled:    true,
		AdminEnabled:    false,
	}
	incoming := NormalizeSMSProviderConfigMap(map[string]interface{}{
		"access_key_id": "ak-new",
	})

	merged := MergeSMSProviderConfig(incoming, existing, map[string]interface{}{
		"access_key_id": "ak-new",
	})

	if merged.ConsumerEnabled {
		t.Fatalf("expected consumer_enabled to preserve existing false")
	}
	if merged.MerchantEnabled {
		t.Fatalf("expected merchant_enabled to preserve existing false")
	}
	if !merged.RiderEnabled {
		t.Fatalf("expected rider_enabled to preserve existing true")
	}
	if merged.AdminEnabled {
		t.Fatalf("expected admin_enabled to preserve existing false")
	}
}

func TestSMSProviderConfigIsTargetEnabled(t *testing.T) {
	cfg := DefaultSMSProviderConfig()
	cfg.ConsumerEnabled = false
	cfg.MerchantEnabled = true
	cfg.RiderEnabled = false
	cfg.AdminEnabled = true

	if cfg.IsTargetEnabled("consumer") {
		t.Fatalf("expected consumer target to be disabled")
	}
	if !cfg.IsTargetEnabled("merchant") {
		t.Fatalf("expected merchant target to be enabled")
	}
	if cfg.IsTargetEnabled("rider") {
		t.Fatalf("expected rider target to be disabled")
	}
	if !cfg.IsTargetEnabled("admin") {
		t.Fatalf("expected admin target to be enabled")
	}
}
