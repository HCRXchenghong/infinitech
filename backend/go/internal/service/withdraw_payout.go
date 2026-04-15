package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

type withdrawPayoutExecutionResult struct {
	Status            string                 `json:"status"`
	Gateway           string                 `json:"gateway"`
	IntegrationTarget string                 `json:"integrationTarget"`
	ThirdPartyOrderID string                 `json:"thirdPartyOrderId"`
	TransferResult    string                 `json:"transferResult"`
	ResponseData      map[string]interface{} `json:"responseData"`
}

func (s *WalletService) executeWithdrawPayout(ctx context.Context, request *repository.WithdrawRequest) (*withdrawPayoutExecutionResult, error) {
	if request == nil {
		return nil, fmt.Errorf("%w: withdraw request is nil", ErrInvalidArgument)
	}

	now := time.Now().Format(time.RFC3339)
	method := normalizeChannel(request.WithdrawMethod)
	runtimeConfig, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return nil, err
	}
	if method == "bank_card" && bankCardSidecarExecutionEnabled(runtimeConfig.BankCard) {
		result, err := s.createBankPayoutSidecar(ctx, runtimeConfig, request)
		if err != nil {
			return nil, err
		}
		if result.ResponseData == nil {
			result.ResponseData = map[string]interface{}{}
		}
		result.ResponseData["submittedAt"] = now
		result.ResponseData["sidecarUrl"] = runtimeConfig.BankCard.SidecarURL
		return result, nil
	}

	switch method {
	case "wechat":
		summary := buildPaymentGatewaySummary(runtimeConfig)["wechat"].(map[string]interface{})
		if ready, _ := summary["ready"].(bool); !ready || firstTrimmed(runtimeConfig.Wechat.PayoutNotifyURL, runtimeConfig.Wechat.NotifyURL) == "" {
			return nil, fmt.Errorf("%w: wechat payout gateway is not fully configured", ErrInvalidArgument)
		}

		result, err := s.createWechatOfficialPayout(ctx, runtimeConfig, request)
		if err != nil {
			return nil, err
		}
		if result.ResponseData == nil {
			result.ResponseData = map[string]interface{}{}
		}
		result.ResponseData["submittedAt"] = now
		return result, nil

	case "alipay":
		summary := buildPaymentGatewaySummary(runtimeConfig)["alipay"].(map[string]interface{})
		if ready, _ := summary["ready"].(bool); !ready {
			return nil, fmt.Errorf("%w: alipay payout gateway is not fully configured", ErrInvalidArgument)
		}

		result, err := s.createAlipaySidecarPayout(ctx, runtimeConfig, request)
		if err != nil {
			return nil, err
		}
		if result.ResponseData == nil {
			result.ResponseData = map[string]interface{}{}
		}
		result.ResponseData["submittedAt"] = now
		result.ResponseData["sidecarUrl"] = runtimeConfig.Alipay.SidecarURL
		return result, nil

	case "bank_card":
		bankCardCfg, err := s.loadBankCardConfig(ctx)
		if err != nil {
			return nil, err
		}

		arrivalText := firstTrimmed(bankCardCfg.ArrivalText, "24小时-48小时")
		thirdPartyOrderID := firstTrimmed(strings.TrimSpace(request.ThirdPartyOrderID), fmt.Sprintf("BANKOUT-%s", request.RequestID))
		transferResult := fmt.Sprintf("已进入银行卡异步出款队列，预计 %s 到账", arrivalText)
		return &withdrawPayoutExecutionResult{
			Status:            "transferring",
			Gateway:           "bank_card",
			IntegrationTarget: "manual-bank-batch",
			ThirdPartyOrderID: thirdPartyOrderID,
			TransferResult:    transferResult,
			ResponseData: map[string]interface{}{
				"status":            "transferring",
				"gateway":           "bank_card",
				"integrationTarget": "manual-bank-batch",
				"requestId":         request.RequestID,
				"thirdPartyOrderId": thirdPartyOrderID,
				"arrivalText":       arrivalText,
				"processingMode":    "async_batch",
				"submittedAt":       now,
				"transferResult":    transferResult,
			},
		}, nil

	default:
		return nil, fmt.Errorf("%w: unsupported withdraw method %s", ErrInvalidArgument, method)
	}
}
