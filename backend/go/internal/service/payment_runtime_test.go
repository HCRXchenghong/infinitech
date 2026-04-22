package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestLoadPaymentGatewayRuntimeConfigDisablesBankStubInProduction(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("BANK_PAYOUT_SIDECAR_API_SECRET", "bank-sidecar-secret")

	svc, db := newWalletServiceForSettlementTest(t)
	payload, err := json.Marshal(map[string]interface{}{
		"arrival_text": "24小时-48小时",
		"sidecar_url":  "http://bank-sidecar.local",
	})
	if err != nil {
		t.Fatalf("marshal bank config failed: %v", err)
	}
	if err := db.Create(&repository.Setting{
		Key:   payCenterBankCardSettingKey,
		Value: string(payload),
	}).Error; err != nil {
		t.Fatalf("seed bank card config failed: %v", err)
	}

	cfg, err := loadPaymentGatewayRuntimeConfig(context.Background(), svc.walletRepo)
	if err != nil {
		t.Fatalf("load runtime config failed: %v", err)
	}
	if bankCardSidecarExecutionEnabled(cfg.BankCard) {
		t.Fatal("expected bank card sidecar to stay disabled without provider adapter config")
	}

	summary := buildPaymentGatewaySummary(cfg)
	bankCard, ok := summary["bankCard"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bankCard summary map, got %#v", summary["bankCard"])
	}
	if _, exists := bankCard["allowStub"]; exists {
		t.Fatalf("expected allowStub to disappear from summary, got %#v", bankCard["allowStub"])
	}
	if _, exists := bankCard["allowStubBlocked"]; exists {
		t.Fatalf("expected allowStubBlocked to disappear from summary, got %#v", bankCard["allowStubBlocked"])
	}
	if bankCard["ready"] != false {
		t.Fatalf("expected bank card sidecar to stay not ready without provider config, got %#v", bankCard["ready"])
	}
}

func TestLoadPaymentGatewayRuntimeConfigRequiresConfiguredBankProviderAdapter(t *testing.T) {
	t.Setenv("ENV", "development")
	t.Setenv("BANK_PAYOUT_SIDECAR_API_SECRET", "bank-sidecar-secret")

	svc, db := newWalletServiceForSettlementTest(t)
	payload, err := json.Marshal(map[string]interface{}{
		"arrival_text": "24小时-48小时",
		"sidecar_url":  "http://bank-sidecar.local",
		"provider_url": "https://bank.example.com/payouts",
		"merchant_id":  "merchant-1",
		"api_key":      "provider-api-key",
		"notify_url":   "https://example.com/payouts/notify",
	})
	if err != nil {
		t.Fatalf("marshal bank config failed: %v", err)
	}
	if err := db.Create(&repository.Setting{
		Key:   payCenterBankCardSettingKey,
		Value: string(payload),
	}).Error; err != nil {
		t.Fatalf("seed bank card config failed: %v", err)
	}

	cfg, err := loadPaymentGatewayRuntimeConfig(context.Background(), svc.walletRepo)
	if err != nil {
		t.Fatalf("load runtime config failed: %v", err)
	}
	if !bankCardSidecarExecutionEnabled(cfg.BankCard) {
		t.Fatal("expected configured bank provider adapter to enable sidecar execution")
	}
}

func TestLoadPaymentGatewayRuntimeConfigIgnoresPersistedBankStubToggle(t *testing.T) {
	t.Setenv("ENV", "development")
	t.Setenv("BANK_PAYOUT_SIDECAR_API_SECRET", "bank-sidecar-secret")

	svc, db := newWalletServiceForSettlementTest(t)
	payload, err := json.Marshal(map[string]interface{}{
		"arrival_text": "24小时-48小时",
		"sidecar_url":  "http://bank-sidecar.local",
		"allow_stub":   true,
		"allowStub":    true,
	})
	if err != nil {
		t.Fatalf("marshal bank config failed: %v", err)
	}
	if err := db.Create(&repository.Setting{
		Key:   payCenterBankCardSettingKey,
		Value: string(payload),
	}).Error; err != nil {
		t.Fatalf("seed bank card config failed: %v", err)
	}

	cfg, err := loadPaymentGatewayRuntimeConfig(context.Background(), svc.walletRepo)
	if err != nil {
		t.Fatalf("load runtime config failed: %v", err)
	}
	if bankCardSidecarExecutionEnabled(cfg.BankCard) {
		t.Fatal("expected persisted bank card stub toggle to stay ignored without provider config")
	}

	summary := buildPaymentGatewaySummary(cfg)
	bankCard, ok := summary["bankCard"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bankCard summary map, got %#v", summary["bankCard"])
	}
	if _, exists := bankCard["allowStub"]; exists {
		t.Fatalf("expected allowStub to stay invisible in runtime summary, got %#v", bankCard["allowStub"])
	}
}

func TestLoadPaymentGatewayRuntimeConfigDisablesAlipayStubInProduction(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("ALIPAY_SIDECAR_ALLOW_STUB", "true")
	t.Setenv("ALIPAY_SIDECAR_API_SECRET", "alipay-sidecar-secret")

	svc, _ := newWalletServiceForSettlementTest(t)
	cfg, err := loadPaymentGatewayRuntimeConfig(context.Background(), svc.walletRepo)
	if err != nil {
		t.Fatalf("load runtime config failed: %v", err)
	}
	if cfg.Alipay.AllowStub {
		t.Fatal("expected alipay stub to be disabled in production")
	}
	if !cfg.Alipay.StubRequested {
		t.Fatal("expected alipay stub request to remain visible in summary")
	}

	summary := buildPaymentGatewaySummary(cfg)
	alipay, ok := summary["alipay"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected alipay summary map, got %#v", summary["alipay"])
	}
	if alipay["allowStub"] != false {
		t.Fatalf("expected allowStub false in summary, got %#v", alipay["allowStub"])
	}
	if alipay["allowStubBlocked"] != true {
		t.Fatalf("expected allowStubBlocked true in summary, got %#v", alipay["allowStubBlocked"])
	}
}
