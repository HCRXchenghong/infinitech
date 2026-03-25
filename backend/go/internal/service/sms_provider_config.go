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
	}
	return NormalizeSMSProviderConfig(cfg)
}

func MergeSMSProviderConfig(incoming, existing SMSProviderConfig) SMSProviderConfig {
	merged := NormalizeSMSProviderConfig(incoming)
	current := NormalizeSMSProviderConfig(existing)
	if merged.AccessKeySecret == "" && current.AccessKeySecret != "" {
		merged.AccessKeySecret = current.AccessKeySecret
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

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
