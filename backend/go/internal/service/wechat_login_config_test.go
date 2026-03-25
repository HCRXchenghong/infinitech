package service

import "testing"

func TestNormalizeWechatLoginConfigMapSupportsLegacyKeys(t *testing.T) {
	cfg := NormalizeWechatLoginConfigMap(map[string]interface{}{
		"enabled":      "true",
		"appid":        "wx-app-id",
		"appsecret":    "secret-value",
		"callback_url": "https://m.example.com/api/auth/wechat/callback",
		"scope":        "SNSAPI_BASE",
	})

	if !cfg.Enabled {
		t.Fatalf("expected config to be enabled")
	}
	if cfg.AppID != "wx-app-id" {
		t.Fatalf("unexpected app id: %q", cfg.AppID)
	}
	if cfg.AppSecret != "secret-value" {
		t.Fatalf("unexpected app secret: %q", cfg.AppSecret)
	}
	if cfg.Scope != "snsapi_base" {
		t.Fatalf("unexpected scope: %q", cfg.Scope)
	}
}

func TestMergeWechatLoginConfigPreservesSecretWhenBlank(t *testing.T) {
	existing := WechatLoginConfig{
		Enabled:     true,
		AppID:       "wx-old",
		AppSecret:   "keep-me",
		CallbackURL: "https://old.example.com/callback",
		Scope:       "snsapi_userinfo",
	}
	incoming := WechatLoginConfig{
		Enabled:     true,
		AppID:       "wx-new",
		CallbackURL: "https://new.example.com/callback",
		Scope:       "snsapi_base",
	}

	merged := MergeWechatLoginConfig(incoming, existing)
	if merged.AppSecret != "keep-me" {
		t.Fatalf("expected existing secret to be preserved, got %q", merged.AppSecret)
	}
	if merged.AppID != "wx-new" {
		t.Fatalf("expected app id to update, got %q", merged.AppID)
	}
	if merged.CallbackURL != "https://new.example.com/callback" {
		t.Fatalf("expected callback url to update, got %q", merged.CallbackURL)
	}
	if merged.Scope != "snsapi_base" {
		t.Fatalf("expected scope to update, got %q", merged.Scope)
	}
}

func TestBuildWechatLoginConfigAdminViewMasksSecret(t *testing.T) {
	view := BuildWechatLoginConfigAdminView(WechatLoginConfig{
		Enabled:     true,
		AppID:       "wx-app-id",
		AppSecret:   "secret-value",
		CallbackURL: "https://m.example.com/api/auth/wechat/callback",
		Scope:       "snsapi_userinfo",
	})

	if got, _ := view["app_secret"].(string); got != "" {
		t.Fatalf("expected app_secret to be masked, got %q", got)
	}
	if got, _ := view["has_app_secret"].(bool); !got {
		t.Fatalf("expected has_app_secret to be true")
	}
}

func TestValidateWechatLoginConfigRequiresCompleteEnabledConfig(t *testing.T) {
	err := ValidateWechatLoginConfig(WechatLoginConfig{
		Enabled: true,
		AppID:   "wx-app-id",
	})
	if err == nil {
		t.Fatalf("expected validation error for incomplete enabled config")
	}
}
