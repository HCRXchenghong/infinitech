package service

import (
	"testing"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestNormalizeAndValidateChannelMatrixRejectsCustomerBankCard(t *testing.T) {
	_, err := normalizeAndValidateChannelMatrix([]PaymentChannelMatrixItem{
		{
			UserType: "customer",
			Platform: "app",
			Scene:    "wallet_withdraw",
			Channel:  "bank_card",
			Enabled:  true,
		},
	})
	if err == nil {
		t.Fatal("expected customer bank card channel matrix row to be rejected")
	}
}

func TestNormalizeAndValidateWithdrawFeeRulesRequiresRuleForEnabledChannel(t *testing.T) {
	matrix := []PaymentChannelMatrixItem{
		{
			UserType: "merchant",
			Platform: "app",
			Scene:    "wallet_withdraw",
			Channel:  "bank_card",
			Enabled:  true,
		},
	}

	_, err := normalizeAndValidateWithdrawFeeRules([]repository.WithdrawFeeRule{
		{
			UserType:        "merchant",
			WithdrawMethod:  "wechat",
			MinAmount:       0,
			MaxAmount:       0,
			RateBasisPoints: 20,
			MinFee:          10,
			MaxFee:          500,
			Enabled:         true,
		},
	}, matrix)
	if err == nil {
		t.Fatal("expected missing bank card fee rule to be rejected")
	}
}

func TestNormalizeAndValidateSettlementRuleSetsRejectsOverlappingTiers(t *testing.T) {
	subjects := []repository.SettlementSubject{
		{UnifiedIdentity: repository.UnifiedIdentity{UID: "rider"}, Name: "骑手", SubjectType: "rider"},
	}

	_, err := normalizeAndValidateSettlementRuleSets([]SettlementRuleSetInput{
		{
			Name:      "默认分账规则",
			ScopeType: "global",
			IsDefault: true,
			Enabled:   true,
			Steps: []SettlementRuleStepInput{
				{
					SettlementSubjectUID: "rider",
					CalcType:             "tiered_by_order_amount",
					Enabled:              true,
					Tiers: []SettlementTier{
						{MinAmount: 0, MaxAmount: 1000, Amount: 100},
						{MinAmount: 800, MaxAmount: 1500, Amount: 120},
					},
				},
			},
		},
	}, subjects)
	if err == nil {
		t.Fatal("expected overlapping settlement tiers to be rejected")
	}
}

func TestNormalizeAndValidateRiderDepositPolicyDeduplicatesMethods(t *testing.T) {
	policy, err := normalizeAndValidateRiderDepositPolicy(RiderDepositPolicy{
		Amount:         5000,
		UnlockDays:     7,
		AllowedMethods: []string{"wechat", "wechat", "alipay"},
	})
	if err != nil {
		t.Fatalf("expected rider deposit policy to be valid: %v", err)
	}
	if len(policy.AllowedMethods) != 2 {
		t.Fatalf("expected duplicate methods to be removed, got %v", policy.AllowedMethods)
	}
}

func TestNormalizeAndValidateBankCardConfigRejectsPartialAdapterConfig(t *testing.T) {
	t.Setenv("ENV", "development")

	_, err := normalizeAndValidateBankCardConfig(BankCardConfig{
		ArrivalText: "24小时-48小时",
		SidecarURL:  "http://bank-sidecar.local",
		ProviderURL: "https://provider.example.com",
	})
	if err == nil {
		t.Fatal("expected partial bank card adapter config to be rejected")
	}
}

func TestNormalizeAndValidateBankCardConfigAllowsManualFallbackOnly(t *testing.T) {
	t.Setenv("ENV", "development")

	cfg, err := normalizeAndValidateBankCardConfig(BankCardConfig{
		ArrivalText: "24小时-48小时",
	})
	if err != nil {
		t.Fatalf("expected manual-only bank card config to be valid, got %v", err)
	}
	if cfg.SidecarURL != "" || cfg.ProviderURL != "" || cfg.MerchantID != "" || cfg.APIKey != "" || cfg.NotifyURL != "" {
		t.Fatalf("expected manual-only bank card config to stay empty for adapter fields, got %#v", cfg)
	}
}
