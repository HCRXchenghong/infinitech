package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestLoadPaymentGatewayRuntimeConfigDisablesBankStubInProduction(t *testing.T) {
	t.Setenv("ENV", "production")

	svc, db := newWalletServiceForSettlementTest(t)
	payload, err := json.Marshal(map[string]interface{}{
		"arrival_text": "24小时-48小时",
		"sidecar_url":  "http://bank-sidecar.local",
		"allow_stub":   true,
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
	if cfg.BankCard.AllowStub {
		t.Fatal("expected bank card stub to be disabled in production")
	}
	if !cfg.BankCard.AllowStubRequested {
		t.Fatal("expected bank card stub request to be retained for summary visibility")
	}

	summary := buildPaymentGatewaySummary(cfg)
	bankCard, ok := summary["bankCard"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected bankCard summary map, got %#v", summary["bankCard"])
	}
	if bankCard["allowStub"] != false {
		t.Fatalf("expected allowStub false in summary, got %#v", bankCard["allowStub"])
	}
	if bankCard["allowStubBlocked"] != true {
		t.Fatalf("expected allowStubBlocked true in summary, got %#v", bankCard["allowStubBlocked"])
	}
	if bankCard["ready"] != false {
		t.Fatalf("expected bank card sidecar to stay not ready without provider config, got %#v", bankCard["ready"])
	}
}

func TestLoadPaymentGatewayRuntimeConfigAllowsBankStubInDevelopmentWhenExplicitlyEnabled(t *testing.T) {
	t.Setenv("ENV", "development")

	svc, db := newWalletServiceForSettlementTest(t)
	payload, err := json.Marshal(map[string]interface{}{
		"arrival_text": "24小时-48小时",
		"sidecar_url":  "http://bank-sidecar.local",
		"allow_stub":   true,
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
	if !cfg.BankCard.AllowStub {
		t.Fatal("expected bank card stub to remain enabled in development when explicitly requested")
	}
	if !bankCardSidecarExecutionEnabled(cfg.BankCard) {
		t.Fatal("expected development bank card stub to enable sidecar execution")
	}
}

func TestLoadPaymentGatewayRuntimeConfigDisablesAlipayStubInProduction(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("ALIPAY_SIDECAR_ALLOW_STUB", "true")

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
