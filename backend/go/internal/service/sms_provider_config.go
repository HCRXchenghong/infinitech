package service

import (
	"fmt"
	"net/url"
	"strings"
)

const (
	defaultSMSProvider     = "aliyun"
	defaultAliyunSMSRegion = "cn-hangzhou"
)

type SMSProviderConfig struct {
	Provider        string `json:"provider"`
	AccessKeyID     string `json:"access_key_id"`
	AccessKeySecret string `json:"access_key_secret"`
	SignName        string `json:"sign_name"`
	TemplateCode    string `json:"template_code"`
	RegionID        string `json:"region_id"`
	Endpoint        string `json:"endpoint"`
	ConsumerEnabled bool   `json:"consumer_enabled"`
	MerchantEnabled bool   `json:"merchant_enabled"`
	RiderEnabled    bool   `json:"rider_enabled"`
	AdminEnabled    bool   `json:"admin_enabled"`
}

func DefaultSMSProviderConfig() SMSProviderConfig {
	return SMSProviderConfig{
		Provider:        defaultSMSProvider,
		AccessKeyID:     "",
		AccessKeySecret: "",
		SignName:        "",
		TemplateCode:    "",
		RegionID:        defaultAliyunSMSRegion,
		Endpoint:        "",
		ConsumerEnabled: true,
		MerchantEnabled: true,
		RiderEnabled:    true,
		AdminEnabled:    true,
	}
}

func NormalizeSMSProviderConfig(input SMSProviderConfig) SMSProviderConfig {
	cfg := DefaultSMSProviderConfig()
	cfg.Provider = normalizeSMSProvider(input.Provider)
	cfg.AccessKeyID = strings.TrimSpace(input.AccessKeyID)
	cfg.AccessKeySecret = strings.TrimSpace(input.AccessKeySecret)
	cfg.SignName = strings.TrimSpace(input.SignName)
	cfg.TemplateCode = strings.TrimSpace(input.TemplateCode)
	cfg.RegionID = normalizeAliyunSMSRegion(input.RegionID)
	cfg.Endpoint = normalizeAliyunSMSEndpoint(input.Endpoint)
	cfg.ConsumerEnabled = input.ConsumerEnabled
	cfg.MerchantEnabled = input.MerchantEnabled
	cfg.RiderEnabled = input.RiderEnabled
	cfg.AdminEnabled = input.AdminEnabled
	return cfg
}

func NormalizeSMSProviderConfigMap(raw map[string]interface{}) SMSProviderConfig {
	if raw == nil {
		return DefaultSMSProviderConfig()
	}

	cfg := SMSProviderConfig{
		Provider:        readSMSConfigString(raw, "provider"),
		AccessKeyID:     firstNonEmptyString(readSMSConfigString(raw, "access_key_id"), readSMSConfigString(raw, "access_key")),
		AccessKeySecret: firstNonEmptyString(readSMSConfigString(raw, "access_key_secret"), readSMSConfigString(raw, "secret")),
		SignName:        firstNonEmptyString(readSMSConfigString(raw, "sign_name"), readSMSConfigString(raw, "sign")),
		TemplateCode:    firstNonEmptyString(readSMSConfigString(raw, "template_code"), readSMSConfigString(raw, "template_id")),
		RegionID:        firstNonEmptyString(readSMSConfigString(raw, "region_id"), readSMSConfigString(raw, "region")),
		Endpoint:        readSMSConfigString(raw, "endpoint"),
		ConsumerEnabled: readSMSConfigBoolWithAliases(raw, true, "consumer_enabled", "user_enabled"),
		MerchantEnabled: readSMSConfigBoolWithAliases(raw, true, "merchant_enabled"),
		RiderEnabled:    readSMSConfigBoolWithAliases(raw, true, "rider_enabled"),
		AdminEnabled:    readSMSConfigBoolWithAliases(raw, true, "admin_enabled"),
	}
	return NormalizeSMSProviderConfig(cfg)
}

func MergeSMSProviderConfig(incoming, existing SMSProviderConfig, raw map[string]interface{}) SMSProviderConfig {
	merged := NormalizeSMSProviderConfig(incoming)
	current := NormalizeSMSProviderConfig(existing)
	if merged.AccessKeySecret == "" && current.AccessKeySecret != "" {
		merged.AccessKeySecret = current.AccessKeySecret
	}
	if !hasSMSConfigKey(raw, "consumer_enabled", "user_enabled") {
		merged.ConsumerEnabled = current.ConsumerEnabled
	}
	if !hasSMSConfigKey(raw, "merchant_enabled") {
		merged.MerchantEnabled = current.MerchantEnabled
	}
	if !hasSMSConfigKey(raw, "rider_enabled") {
		merged.RiderEnabled = current.RiderEnabled
	}
	if !hasSMSConfigKey(raw, "admin_enabled") {
		merged.AdminEnabled = current.AdminEnabled
	}
	return merged
}

func ValidateSMSProviderConfig(input SMSProviderConfig) error {
	cfg := NormalizeSMSProviderConfig(input)

	if cfg.Provider != defaultSMSProvider {
		return fmt.Errorf("provider is invalid")
	}
	if !cfg.HasAnyCredentialInput() {
		return nil
	}
	if cfg.AccessKeyID == "" {
		return fmt.Errorf("access_key_id is required")
	}
	if cfg.AccessKeySecret == "" {
		return fmt.Errorf("access_key_secret is required")
	}
	if cfg.SignName == "" {
		return fmt.Errorf("sign_name is required")
	}
	if cfg.TemplateCode == "" {
		return fmt.Errorf("template_code is required")
	}
	if cfg.RegionID == "" {
		return fmt.Errorf("region_id is required")
	}
	if len(cfg.AccessKeyID) > 256 || len(cfg.AccessKeySecret) > 256 {
		return fmt.Errorf("access key is too long")
	}
	if len(cfg.SignName) > 128 {
		return fmt.Errorf("sign_name is too long")
	}
	if len(cfg.TemplateCode) > 128 {
		return fmt.Errorf("template_code is too long")
	}
	if len(cfg.RegionID) > 64 {
		return fmt.Errorf("region_id is too long")
	}
	if len(cfg.Endpoint) > 255 {
		return fmt.Errorf("endpoint is too long")
	}
	if cfg.Endpoint != "" && strings.Contains(cfg.Endpoint, "/") {
		return fmt.Errorf("endpoint must be a host name")
	}
	return nil
}

func (c SMSProviderConfig) IsConfigured() bool {
	cfg := NormalizeSMSProviderConfig(c)
	return cfg.AccessKeyID != "" &&
		cfg.AccessKeySecret != "" &&
		cfg.SignName != "" &&
		cfg.TemplateCode != ""
}

func (c SMSProviderConfig) HasAnyCredentialInput() bool {
	cfg := NormalizeSMSProviderConfig(c)
	return cfg.AccessKeyID != "" ||
		cfg.AccessKeySecret != "" ||
		cfg.SignName != "" ||
		cfg.TemplateCode != "" ||
		cfg.Endpoint != ""
}

func SerializeSMSProviderConfigForStorage(input SMSProviderConfig) map[string]interface{} {
	cfg := NormalizeSMSProviderConfig(input)
	return map[string]interface{}{
		"provider":          cfg.Provider,
		"access_key_id":     cfg.AccessKeyID,
		"access_key_secret": cfg.AccessKeySecret,
		"sign_name":         cfg.SignName,
		"template_code":     cfg.TemplateCode,
		"region_id":         cfg.RegionID,
		"endpoint":          cfg.Endpoint,
		"consumer_enabled":  cfg.ConsumerEnabled,
		"merchant_enabled":  cfg.MerchantEnabled,
		"rider_enabled":     cfg.RiderEnabled,
		"admin_enabled":     cfg.AdminEnabled,
	}
}

func BuildSMSProviderConfigAdminView(input SMSProviderConfig) map[string]interface{} {
	cfg := NormalizeSMSProviderConfig(input)
	return map[string]interface{}{
		"provider":              cfg.Provider,
		"access_key_id":         cfg.AccessKeyID,
		"access_key_secret":     "",
		"has_access_key_secret": cfg.AccessKeySecret != "",
		"sign_name":             cfg.SignName,
		"template_code":         cfg.TemplateCode,
		"region_id":             cfg.RegionID,
		"endpoint":              cfg.Endpoint,
		"consumer_enabled":      cfg.ConsumerEnabled,
		"merchant_enabled":      cfg.MerchantEnabled,
		"rider_enabled":         cfg.RiderEnabled,
		"admin_enabled":         cfg.AdminEnabled,
	}
}

func (c SMSProviderConfig) IsTargetEnabled(target string) bool {
	cfg := NormalizeSMSProviderConfig(c)
	switch strings.ToLower(strings.TrimSpace(target)) {
	case "consumer", "user":
		return cfg.ConsumerEnabled
	case "merchant":
		return cfg.MerchantEnabled
	case "rider":
		return cfg.RiderEnabled
	case "admin":
		return cfg.AdminEnabled
	default:
		return true
	}
}

func normalizeSMSProvider(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "" {
		return defaultSMSProvider
	}
	return value
}

func normalizeAliyunSMSRegion(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return defaultAliyunSMSRegion
	}
	return value
}

func normalizeAliyunSMSEndpoint(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if strings.Contains(value, "://") {
		parsed, err := url.Parse(value)
		if err == nil && strings.TrimSpace(parsed.Host) != "" {
			return strings.TrimSpace(parsed.Host)
		}
	}
	value = strings.TrimPrefix(value, "https://")
	value = strings.TrimPrefix(value, "http://")
	value = strings.TrimSuffix(value, "/")
	if index := strings.Index(value, "/"); index >= 0 {
		value = value[:index]
	}
	return strings.TrimSpace(value)
}

func readSMSConfigString(raw map[string]interface{}, key string) string {
	value, ok := raw[key]
	if !ok || value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", typed))
	}
}

func readSMSConfigBoolWithAliases(raw map[string]interface{}, fallback bool, keys ...string) bool {
	for _, key := range keys {
		if value, ok := raw[key]; ok {
			return readSMSConfigBool(value, fallback)
		}
	}
	return fallback
}

func readSMSConfigBool(value interface{}, fallback bool) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case float64:
		return typed != 0
	case float32:
		return typed != 0
	case int:
		return typed != 0
	case int64:
		return typed != 0
	case int32:
		return typed != 0
	case uint:
		return typed != 0
	case uint64:
		return typed != 0
	case string:
		text := strings.ToLower(strings.TrimSpace(typed))
		switch text {
		case "1", "true", "yes", "on":
			return true
		case "0", "false", "no", "off":
			return false
		default:
			return fallback
		}
	default:
		return fallback
	}
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func hasSMSConfigKey(raw map[string]interface{}, keys ...string) bool {
	if raw == nil {
		return false
	}
	for _, key := range keys {
		if _, ok := raw[key]; ok {
			return true
		}
	}
	return false
}
