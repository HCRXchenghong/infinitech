package service

import (
	"context"
	"encoding/json"
	"os"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
)

type payModeConfig struct {
	IsProd bool `json:"isProd"`
}

type wechatPayRuntimeConfig struct {
	AppID           string `json:"appId"`
	MchID           string `json:"mchId"`
	APIKey          string `json:"apiKey"`
	APIV3Key        string `json:"apiV3Key"`
	SerialNo        string `json:"serialNo"`
	PrivateKey      string `json:"privateKey"`
	NotifyURL       string `json:"notifyUrl"`
	RefundNotifyURL string `json:"refundNotifyUrl"`
	PayoutNotifyURL string `json:"payoutNotifyUrl"`
	PayoutSceneID   string `json:"payoutSceneId"`
}

type alipayRuntimeConfig struct {
	AppID           string `json:"appId"`
	PrivateKey      string `json:"privateKey"`
	AlipayPublicKey string `json:"alipayPublicKey"`
	NotifyURL       string `json:"notifyUrl"`
	PayoutNotifyURL string `json:"payoutNotifyUrl"`
	Sandbox         bool   `json:"sandbox"`
	SidecarURL      string `json:"sidecarUrl"`
}

type bankCardPayoutRuntimeConfig struct {
	ArrivalText string `json:"arrivalText"`
	SidecarURL  string `json:"sidecarUrl"`
	ProviderURL string `json:"providerUrl"`
	MerchantID  string `json:"merchantId"`
	APIKey      string `json:"apiKey"`
	NotifyURL   string `json:"notifyUrl"`
	AllowStub   bool   `json:"allowStub"`
}

type paymentGatewayRuntimeConfig struct {
	Mode     payModeConfig              `json:"pay_mode"`
	Wechat   wechatPayRuntimeConfig     `json:"wechat"`
	Alipay   alipayRuntimeConfig        `json:"alipay"`
	BankCard bankCardPayoutRuntimeConfig `json:"bankCard"`
}

func loadJSONWalletSetting(ctx context.Context, repo repository.WalletRepository, key string, dest interface{}) error {
	var settings []repository.Setting
	if err := repo.DB().WithContext(ctx).Where("key = ?", key).Limit(1).Find(&settings).Error; err != nil {
		return err
	}
	if len(settings) == 0 || strings.TrimSpace(settings[0].Value) == "" {
		return nil
	}
	return json.Unmarshal([]byte(settings[0].Value), dest)
}

func firstTrimmed(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func loadPaymentGatewayRuntimeConfig(ctx context.Context, repo repository.WalletRepository) (paymentGatewayRuntimeConfig, error) {
	cfg := paymentGatewayRuntimeConfig{
		Mode: payModeConfig{IsProd: false},
		Wechat: wechatPayRuntimeConfig{
			AppID:           "",
			MchID:           "",
			APIKey:          "",
			APIV3Key:        "",
			SerialNo:        "",
			PrivateKey:      "",
			NotifyURL:       "",
			RefundNotifyURL: "",
			PayoutNotifyURL: "",
			PayoutSceneID:   "",
		},
		Alipay: alipayRuntimeConfig{
			AppID:           "",
			PrivateKey:      "",
			AlipayPublicKey: "",
			NotifyURL:       "",
			PayoutNotifyURL: "",
			Sandbox:         true,
			SidecarURL:      "",
		},
		BankCard: bankCardPayoutRuntimeConfig{
			ArrivalText: defaultBankCardConfig().ArrivalText,
			SidecarURL:  "",
			ProviderURL: "",
			MerchantID:  "",
			APIKey:      "",
			NotifyURL:   "",
			AllowStub:   true,
		},
	}

	var payMode map[string]interface{}
	if err := loadJSONWalletSetting(ctx, repo, "pay_mode", &payMode); err != nil {
		return cfg, err
	}
	if raw, ok := payMode["isProd"].(bool); ok {
		cfg.Mode.IsProd = raw
	}

	var wxpay map[string]interface{}
	if err := loadJSONWalletSetting(ctx, repo, "wxpay_config", &wxpay); err != nil {
		return cfg, err
	}
	cfg.Wechat.AppID = firstTrimmed(stringConfigValue(wxpay["appId"]), os.Getenv("WXPAY_APP_ID"))
	cfg.Wechat.MchID = firstTrimmed(stringConfigValue(wxpay["mchId"]), os.Getenv("WXPAY_MCH_ID"))
	cfg.Wechat.APIKey = firstTrimmed(stringConfigValue(wxpay["apiKey"]), os.Getenv("WXPAY_API_KEY"))
	cfg.Wechat.APIV3Key = firstTrimmed(stringConfigValue(wxpay["apiV3Key"]), os.Getenv("WXPAY_API_V3_KEY"))
	cfg.Wechat.SerialNo = firstTrimmed(stringConfigValue(wxpay["serialNo"]), os.Getenv("WXPAY_SERIAL_NO"))
	cfg.Wechat.PrivateKey = firstTrimmed(stringConfigValue(wxpay["privateKey"]), strings.ReplaceAll(os.Getenv("WXPAY_PRIVATE_KEY"), `\n`, "\n"))
	cfg.Wechat.NotifyURL = firstTrimmed(stringConfigValue(wxpay["notifyUrl"]), os.Getenv("WXPAY_NOTIFY_URL"))
	cfg.Wechat.RefundNotifyURL = firstTrimmed(stringConfigValue(wxpay["refundNotifyUrl"]), os.Getenv("WXPAY_REFUND_NOTIFY_URL"))
	cfg.Wechat.PayoutNotifyURL = firstTrimmed(stringConfigValue(wxpay["payoutNotifyUrl"]), os.Getenv("WXPAY_PAYOUT_NOTIFY_URL"))
	cfg.Wechat.PayoutSceneID = firstTrimmed(stringConfigValue(wxpay["payoutSceneId"]), os.Getenv("WXPAY_PAYOUT_SCENE_ID"))

	var alipay map[string]interface{}
	if err := loadJSONWalletSetting(ctx, repo, "alipay_config", &alipay); err != nil {
		return cfg, err
	}
	cfg.Alipay.AppID = firstTrimmed(stringConfigValue(alipay["appId"]), os.Getenv("ALIPAY_APP_ID"))
	cfg.Alipay.PrivateKey = firstTrimmed(stringConfigValue(alipay["privateKey"]), strings.ReplaceAll(os.Getenv("ALIPAY_PRIVATE_KEY"), `\n`, "\n"))
	cfg.Alipay.AlipayPublicKey = firstTrimmed(stringConfigValue(alipay["alipayPublicKey"]), strings.ReplaceAll(os.Getenv("ALIPAY_PUBLIC_KEY"), `\n`, "\n"))
	cfg.Alipay.NotifyURL = firstTrimmed(stringConfigValue(alipay["notifyUrl"]), os.Getenv("ALIPAY_NOTIFY_URL"))
	cfg.Alipay.PayoutNotifyURL = firstTrimmed(stringConfigValue(alipay["payoutNotifyUrl"]), os.Getenv("ALIPAY_PAYOUT_NOTIFY_URL"))
	cfg.Alipay.SidecarURL = firstTrimmed(stringConfigValue(alipay["sidecarUrl"]), os.Getenv("ALIPAY_SIDECAR_URL"))
	if raw, ok := alipay["sandbox"].(bool); ok {
		cfg.Alipay.Sandbox = raw
	} else if strings.EqualFold(strings.TrimSpace(os.Getenv("ALIPAY_SANDBOX")), "false") {
		cfg.Alipay.Sandbox = false
	}

	var bankCard map[string]interface{}
	if err := loadJSONWalletSetting(ctx, repo, payCenterBankCardSettingKey, &bankCard); err != nil {
		return cfg, err
	}
	cfg.BankCard.ArrivalText = firstTrimmed(stringConfigValue(bankCard["arrival_text"]), stringConfigValue(bankCard["arrivalText"]), os.Getenv("BANK_PAYOUT_ARRIVAL_TEXT"), defaultBankCardConfig().ArrivalText)
	cfg.BankCard.SidecarURL = firstTrimmed(stringConfigValue(bankCard["sidecar_url"]), stringConfigValue(bankCard["sidecarUrl"]), os.Getenv("BANK_PAYOUT_SIDECAR_URL"))
	cfg.BankCard.ProviderURL = firstTrimmed(stringConfigValue(bankCard["provider_url"]), stringConfigValue(bankCard["providerUrl"]), os.Getenv("BANK_PAYOUT_PROVIDER_URL"))
	cfg.BankCard.MerchantID = firstTrimmed(stringConfigValue(bankCard["merchant_id"]), stringConfigValue(bankCard["merchantId"]), os.Getenv("BANK_PAYOUT_MERCHANT_ID"))
	cfg.BankCard.APIKey = firstTrimmed(stringConfigValue(bankCard["api_key"]), stringConfigValue(bankCard["apiKey"]), os.Getenv("BANK_PAYOUT_API_KEY"))
	cfg.BankCard.NotifyURL = firstTrimmed(stringConfigValue(bankCard["notify_url"]), stringConfigValue(bankCard["notifyUrl"]), os.Getenv("BANK_PAYOUT_NOTIFY_URL"))
	if raw, ok := boolConfigValue(bankCard["allow_stub"]); ok {
		cfg.BankCard.AllowStub = raw
	} else if raw, ok := boolConfigValue(bankCard["allowStub"]); ok {
		cfg.BankCard.AllowStub = raw
	} else if envValue, ok := boolStringValue(os.Getenv("BANK_PAYOUT_ALLOW_STUB")); ok {
		cfg.BankCard.AllowStub = envValue
	}

	return cfg, nil
}

func stringConfigValue(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case json.Number:
		return v.String()
	default:
		return ""
	}
}

func boolConfigValue(value interface{}) (bool, bool) {
	switch v := value.(type) {
	case bool:
		return v, true
	case string:
		return boolStringValue(v)
	default:
		return false, false
	}
}

func boolStringValue(value string) (bool, bool) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "y", "on":
		return true, true
	case "0", "false", "no", "n", "off":
		return false, true
	default:
		return false, false
	}
}

func buildPaymentGatewaySummary(cfg paymentGatewayRuntimeConfig) map[string]interface{} {
	wechatReady := cfg.Wechat.AppID != "" &&
		cfg.Wechat.MchID != "" &&
		cfg.Wechat.APIV3Key != "" &&
		cfg.Wechat.SerialNo != "" &&
		cfg.Wechat.PrivateKey != "" &&
		cfg.Wechat.NotifyURL != ""

	alipayReady := cfg.Alipay.AppID != "" &&
		cfg.Alipay.PrivateKey != "" &&
		cfg.Alipay.AlipayPublicKey != "" &&
		cfg.Alipay.NotifyURL != "" &&
		cfg.Alipay.SidecarURL != ""

	bankCardReady := cfg.BankCard.SidecarURL != "" && ((cfg.BankCard.ProviderURL != "" &&
		cfg.BankCard.MerchantID != "" &&
		cfg.BankCard.APIKey != "" &&
		cfg.BankCard.NotifyURL != "") || cfg.BankCard.AllowStub)

	return map[string]interface{}{
		"mode": map[string]interface{}{
			"isProd": cfg.Mode.IsProd,
		},
		"wechat": map[string]interface{}{
			"ready":                   wechatReady,
			"appIdConfigured":         cfg.Wechat.AppID != "",
			"mchIdConfigured":         cfg.Wechat.MchID != "",
			"apiKeyConfigured":        cfg.Wechat.APIKey != "",
			"apiV3KeyConfigured":      cfg.Wechat.APIV3Key != "",
			"serialNoConfigured":      cfg.Wechat.SerialNo != "",
			"privateKeyConfigured":    cfg.Wechat.PrivateKey != "",
			"notifyUrlConfigured":     cfg.Wechat.NotifyURL != "",
			"refundNotifyConfigured":  cfg.Wechat.RefundNotifyURL != "",
			"payoutNotifyConfigured":  cfg.Wechat.PayoutNotifyURL != "",
			"payoutSceneIdConfigured": cfg.Wechat.PayoutSceneID != "",
			"integrationTarget":       "official-go-sdk",
		},
		"alipay": map[string]interface{}{
			"ready":                  alipayReady,
			"appIdConfigured":        cfg.Alipay.AppID != "",
			"privateKeyConfigured":   cfg.Alipay.PrivateKey != "",
			"publicKeyConfigured":    cfg.Alipay.AlipayPublicKey != "",
			"notifyUrlConfigured":    cfg.Alipay.NotifyURL != "",
			"payoutNotifyConfigured": cfg.Alipay.PayoutNotifyURL != "",
			"sidecarUrlConfigured":   cfg.Alipay.SidecarURL != "",
			"sandbox":                cfg.Alipay.Sandbox,
			"integrationTarget":      "official-sidecar-sdk",
		},
		"bankCard": map[string]interface{}{
			"ready":                 bankCardReady,
			"arrivalText":           cfg.BankCard.ArrivalText,
			"sidecarUrlConfigured":  cfg.BankCard.SidecarURL != "",
			"providerUrlConfigured": cfg.BankCard.ProviderURL != "",
			"merchantIdConfigured":  cfg.BankCard.MerchantID != "",
			"apiKeyConfigured":      cfg.BankCard.APIKey != "",
			"notifyUrlConfigured":   cfg.BankCard.NotifyURL != "",
			"allowStub":             cfg.BankCard.AllowStub,
			"integrationTarget":     "bank-payout-sidecar",
		},
	}
}
