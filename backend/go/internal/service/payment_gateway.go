package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
)

type paymentIntentResult struct {
	Status            string                 `json:"status"`
	Gateway           string                 `json:"gateway"`
	IntegrationTarget string                 `json:"integrationTarget"`
	ThirdPartyOrderID string                 `json:"thirdPartyOrderId"`
	ClientPayload     map[string]interface{} `json:"clientPayload"`
	ResponseData      map[string]interface{} `json:"responseData"`
}

type paymentRefundResult struct {
	Status            string                 `json:"status"`
	Gateway           string                 `json:"gateway"`
	IntegrationTarget string                 `json:"integrationTarget"`
	ThirdPartyOrderID string                 `json:"thirdPartyOrderId"`
	ResponseData      map[string]interface{} `json:"responseData"`
}

func (s *PaymentService) createThirdPartyIntent(
	ctx context.Context,
	method string,
	scene string,
	internalTransactionID string,
	amount int64,
	description string,
	userID string,
	userType string,
	platform string,
) (*paymentIntentResult, error) {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return nil, err
	}

	switch normalizeChannel(method) {
	case "wechat":
		summary := buildPaymentGatewaySummary(cfg)["wechat"].(map[string]interface{})
		if ready, _ := summary["ready"].(bool); !ready {
			return nil, fmt.Errorf("%w: wechat payment gateway is not fully configured", ErrInvalidArgument)
		}
		return s.createWechatOfficialIntent(ctx, cfg, scene, internalTransactionID, amount, description, userID, userType, platform)
	case "alipay":
		summary := buildPaymentGatewaySummary(cfg)["alipay"].(map[string]interface{})
		if ready, _ := summary["ready"].(bool); !ready {
			return nil, fmt.Errorf("%w: alipay payment gateway is not fully configured", ErrInvalidArgument)
		}
		return s.createAlipaySidecarIntent(ctx, cfg, scene, internalTransactionID, amount, description)
	default:
		return nil, fmt.Errorf("%w: unsupported third-party payment method %s", ErrInvalidArgument, method)
	}
}

func (s *PaymentService) createThirdPartyRefund(
	ctx context.Context,
	method string,
	internalRefundID string,
	originalTransaction *repository.WalletTransaction,
	amount int64,
	reason string,
) (*paymentRefundResult, error) {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return nil, err
	}

	switch normalizeChannel(method) {
	case "wechat":
		summary := buildPaymentGatewaySummary(cfg)["wechat"].(map[string]interface{})
		if ready, _ := summary["ready"].(bool); !ready || strings.TrimSpace(cfg.Wechat.RefundNotifyURL) == "" {
			return nil, fmt.Errorf("%w: wechat refund gateway is not fully configured", ErrInvalidArgument)
		}
		return s.createWechatOfficialRefund(ctx, cfg, internalRefundID, originalTransaction, amount, reason)
	case "alipay":
		summary := buildPaymentGatewaySummary(cfg)["alipay"].(map[string]interface{})
		if ready, _ := summary["ready"].(bool); !ready {
			return nil, fmt.Errorf("%w: alipay refund gateway is not fully configured", ErrInvalidArgument)
		}
		return s.createAlipaySidecarRefund(ctx, cfg, internalRefundID, originalTransaction, amount, reason)
	default:
		return nil, fmt.Errorf("%w: unsupported third-party refund method %s", ErrInvalidArgument, method)
	}
}
