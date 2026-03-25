package service

import (
	"fmt"
	"net/url"
	"strings"
)

const (
	DefaultWechatLoginScope = "snsapi_userinfo"
)

type WechatLoginConfig struct {
	Enabled     bool   `json:"enabled"`
	AppID       string `json:"app_id"`
	AppSecret   string `json:"app_secret"`
	CallbackURL string `json:"callback_url"`
	Scope       string `json:"scope"`
}

func DefaultWechatLoginConfig() WechatLoginConfig {
	return WechatLoginConfig{
		Enabled:     false,
		AppID:       "",
		AppSecret:   "",
		CallbackURL: "",
		Scope:       DefaultWechatLoginScope,
	}
}

func NormalizeWechatLoginConfig(input WechatLoginConfig) WechatLoginConfig {
	cfg := DefaultWechatLoginConfig()
	cfg.Enabled = input.Enabled
	cfg.AppID = strings.TrimSpace(input.AppID)
	cfg.AppSecret = strings.TrimSpace(input.AppSecret)
	cfg.CallbackURL = strings.TrimSpace(input.CallbackURL)
	scope := strings.TrimSpace(input.Scope)
	if scope == "" {
		scope = DefaultWechatLoginScope
	}
	cfg.Scope = strings.ToLower(scope)
	return cfg
}

func NormalizeWechatLoginConfigMap(raw map[string]interface{}) WechatLoginConfig {
	cfg := DefaultWechatLoginConfig()
	if raw == nil {
		return cfg
	}

	if value, ok := raw["enabled"]; ok {
		cfg.Enabled = wechatConfigBool(value)
	}
	if value, ok := raw["app_id"]; ok {
		cfg.AppID = strings.TrimSpace(wechatConfigString(value))
	}
	if cfg.AppID == "" {
		cfg.AppID = strings.TrimSpace(wechatConfigString(raw["appid"]))
	}
	if value, ok := raw["app_secret"]; ok {
		cfg.AppSecret = strings.TrimSpace(wechatConfigString(value))
	}
	if cfg.AppSecret == "" {
		cfg.AppSecret = strings.TrimSpace(wechatConfigString(raw["appsecret"]))
	}
	if value, ok := raw["callback_url"]; ok {
		cfg.CallbackURL = strings.TrimSpace(wechatConfigString(value))
	}
	if value, ok := raw["scope"]; ok {
		cfg.Scope = strings.ToLower(strings.TrimSpace(wechatConfigString(value)))
	}
	return NormalizeWechatLoginConfig(cfg)
}

func MergeWechatLoginConfig(incoming, existing WechatLoginConfig) WechatLoginConfig {
	merged := NormalizeWechatLoginConfig(existing)
	next := NormalizeWechatLoginConfig(incoming)

	merged.Enabled = next.Enabled
	if next.AppID != "" {
		merged.AppID = next.AppID
	}
	if next.AppSecret != "" {
		merged.AppSecret = next.AppSecret
	}
	if next.CallbackURL != "" {
		merged.CallbackURL = next.CallbackURL
	}
	if next.Scope != "" {
		merged.Scope = next.Scope
	}
	return NormalizeWechatLoginConfig(merged)
}

func ValidateWechatLoginConfig(input WechatLoginConfig) error {
	cfg := NormalizeWechatLoginConfig(input)
	if !cfg.Enabled && cfg.AppID == "" && cfg.AppSecret == "" && cfg.CallbackURL == "" {
		return nil
	}

	if cfg.AppID == "" {
		return fmt.Errorf("wechat app_id is required")
	}
	if len(cfg.AppID) > 128 {
		return fmt.Errorf("wechat app_id is too long")
	}
	if cfg.AppSecret == "" {
		return fmt.Errorf("wechat app_secret is required")
	}
	if len(cfg.AppSecret) > 256 {
		return fmt.Errorf("wechat app_secret is too long")
	}
	if cfg.CallbackURL == "" {
		return fmt.Errorf("wechat callback_url is required")
	}
	if err := validateWechatAbsoluteURL(cfg.CallbackURL, "wechat callback_url"); err != nil {
		return err
	}
	if cfg.Scope != "snsapi_base" && cfg.Scope != "snsapi_userinfo" {
		return fmt.Errorf("wechat scope must be snsapi_base or snsapi_userinfo")
	}
	return nil
}

func SerializeWechatLoginConfigForStorage(input WechatLoginConfig) map[string]interface{} {
	cfg := NormalizeWechatLoginConfig(input)
	return map[string]interface{}{
		"enabled":      cfg.Enabled,
		"app_id":       cfg.AppID,
		"app_secret":   cfg.AppSecret,
		"callback_url": cfg.CallbackURL,
		"scope":        cfg.Scope,
	}
}

func BuildWechatLoginConfigAdminView(input WechatLoginConfig) map[string]interface{} {
	cfg := NormalizeWechatLoginConfig(input)
	return map[string]interface{}{
		"enabled":        cfg.Enabled,
		"app_id":         cfg.AppID,
		"app_secret":     "",
		"has_app_secret": cfg.AppSecret != "",
		"callback_url":   cfg.CallbackURL,
		"scope":          cfg.Scope,
	}
}

func validateWechatAbsoluteURL(raw, fieldName string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(raw))
	if err != nil {
		return fmt.Errorf("%s is invalid", fieldName)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("%s must use http or https", fieldName)
	}
	if strings.TrimSpace(parsed.Host) == "" {
		return fmt.Errorf("%s host is required", fieldName)
	}
	return nil
}

func wechatConfigString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case []byte:
		return string(v)
	default:
		return fmt.Sprintf("%v", value)
	}
}

func wechatConfigBool(value interface{}) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		normalized := strings.ToLower(strings.TrimSpace(v))
		return normalized == "1" || normalized == "true" || normalized == "yes" || normalized == "on"
	case int:
		return v != 0
	case int64:
		return v != 0
	case float64:
		return v != 0
	default:
		return false
	}
}
