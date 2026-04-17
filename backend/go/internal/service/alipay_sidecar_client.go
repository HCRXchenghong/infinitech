package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

type alipaySidecarEnvelope struct {
	Success           bool                   `json:"success"`
	Status            string                 `json:"status"`
	Gateway           string                 `json:"gateway"`
	IntegrationTarget string                 `json:"integrationTarget"`
	ThirdPartyOrderID string                 `json:"thirdPartyOrderId"`
	TransactionID     string                 `json:"transactionId"`
	ClientPayload     map[string]interface{} `json:"clientPayload"`
	ResponseData      map[string]interface{} `json:"responseData"`
	TransferResult    string                 `json:"transferResult"`
	EventType         string                 `json:"eventType"`
	Verified          bool                   `json:"verified"`
	Message           string                 `json:"message"`
	Error             string                 `json:"error"`
}

func callAlipaySidecar(ctx context.Context, rawURL string, apiSecret string, payload map[string]interface{}) (*alipaySidecarEnvelope, error) {
	sidecarURL := strings.TrimSpace(rawURL)
	if sidecarURL == "" {
		return nil, fmt.Errorf("%w: alipay sidecar url is required", ErrInvalidArgument)
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, sidecarURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	if err := applySidecarSecretHeader(request, apiSecret, "alipay sidecar"); err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 8 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 2*1024*1024))
	if err != nil {
		return nil, err
	}

	var envelope alipaySidecarEnvelope
	if len(bytes.TrimSpace(responseBody)) > 0 {
		if err := json.Unmarshal(responseBody, &envelope); err != nil {
			return nil, fmt.Errorf("%w: alipay sidecar returned invalid JSON", ErrInvalidArgument)
		}
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		message := firstTrimmed(envelope.Error, envelope.Message, string(responseBody))
		if message == "" {
			message = response.Status
		}
		return nil, fmt.Errorf("%w: alipay sidecar request failed: %s", ErrInvalidArgument, message)
	}

	if !envelope.Success {
		message := firstTrimmed(envelope.Error, envelope.Message)
		if message == "" {
			message = "alipay sidecar returned unsuccessful response"
		}
		return nil, fmt.Errorf("%w: %s", ErrInvalidArgument, message)
	}

	return &envelope, nil
}

func (s *PaymentService) createAlipaySidecarIntent(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	scene string,
	internalTransactionID string,
	amount int64,
	description string,
) (*paymentIntentResult, error) {
	envelope, err := callAlipaySidecar(ctx, strings.TrimRight(cfg.Alipay.SidecarURL, "/")+"/v1/payments/create", cfg.Alipay.SidecarAPISecret, map[string]interface{}{
		"scene":             scene,
		"outTradeNo":        internalTransactionID,
		"amount":            amount,
		"description":       description,
		"notifyUrl":         cfg.Alipay.NotifyURL,
		"appId":             cfg.Alipay.AppID,
		"sandbox":           cfg.Alipay.Sandbox,
		"integrationTarget": "official-sidecar-sdk",
	})
	if err != nil {
		return nil, err
	}

	return &paymentIntentResult{
		Status:            firstTrimmed(envelope.Status, "awaiting_client_pay"),
		Gateway:           firstTrimmed(envelope.Gateway, "alipay"),
		IntegrationTarget: firstTrimmed(envelope.IntegrationTarget, "official-sidecar-sdk"),
		ThirdPartyOrderID: firstTrimmed(envelope.ThirdPartyOrderID, internalTransactionID),
		ClientPayload:     envelope.ClientPayload,
		ResponseData:      envelope.ResponseData,
	}, nil
}

func (s *PaymentService) createAlipaySidecarRefund(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	internalRefundID string,
	originalTransaction *repository.WalletTransaction,
	amount int64,
	reason string,
) (*paymentRefundResult, error) {
	outTradeNo := internalRefundID
	sourceTransactionID := internalRefundID
	if originalTransaction != nil {
		outTradeNo = firstTrimmed(originalTransaction.ThirdPartyOrderID, originalTransaction.TransactionID, originalTransaction.TransactionIDRaw, internalRefundID)
		sourceTransactionID = firstTrimmed(originalTransaction.TransactionID, originalTransaction.TransactionIDRaw, internalRefundID)
	}

	envelope, err := callAlipaySidecar(ctx, strings.TrimRight(cfg.Alipay.SidecarURL, "/")+"/v1/refunds/create", cfg.Alipay.SidecarAPISecret, map[string]interface{}{
		"outTradeNo":        outTradeNo,
		"refundNo":          internalRefundID,
		"amount":            amount,
		"reason":            reason,
		"notifyUrl":         cfg.Alipay.NotifyURL,
		"appId":             cfg.Alipay.AppID,
		"sandbox":           cfg.Alipay.Sandbox,
		"transactionId":     sourceTransactionID,
		"integrationTarget": "official-sidecar-sdk",
	})
	if err != nil {
		return nil, err
	}

	return &paymentRefundResult{
		Status:            firstTrimmed(envelope.Status, "refund_pending"),
		Gateway:           firstTrimmed(envelope.Gateway, "alipay"),
		IntegrationTarget: firstTrimmed(envelope.IntegrationTarget, "official-sidecar-sdk"),
		ThirdPartyOrderID: firstTrimmed(envelope.ThirdPartyOrderID, internalRefundID),
		ResponseData:      envelope.ResponseData,
	}, nil
}

func (s *WalletService) createAlipaySidecarPayout(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	request *repository.WithdrawRequest,
) (*withdrawPayoutExecutionResult, error) {
	envelope, err := callAlipaySidecar(ctx, strings.TrimRight(cfg.Alipay.SidecarURL, "/")+"/v1/payouts/create", cfg.Alipay.SidecarAPISecret, map[string]interface{}{
		"requestId":         strings.TrimSpace(request.RequestID),
		"transactionId":     strings.TrimSpace(request.TransactionID),
		"userId":            strings.TrimSpace(request.UserID),
		"userType":          strings.TrimSpace(request.UserType),
		"amount":            request.Amount,
		"actualAmount":      request.ActualAmount,
		"fee":               request.Fee,
		"withdrawMethod":    normalizeChannel(request.WithdrawMethod),
		"withdrawAccount":   strings.TrimSpace(request.WithdrawAccount),
		"withdrawName":      strings.TrimSpace(request.WithdrawName),
		"notifyUrl":         firstTrimmed(cfg.Alipay.PayoutNotifyURL, cfg.Alipay.NotifyURL),
		"appId":             cfg.Alipay.AppID,
		"sandbox":           cfg.Alipay.Sandbox,
		"integrationTarget": "official-sidecar-sdk",
	})
	if err != nil {
		return nil, err
	}

	return &withdrawPayoutExecutionResult{
		Status:            firstTrimmed(envelope.Status, "transferring"),
		Gateway:           firstTrimmed(envelope.Gateway, "alipay"),
		IntegrationTarget: firstTrimmed(envelope.IntegrationTarget, "official-sidecar-sdk"),
		ThirdPartyOrderID: firstTrimmed(envelope.ThirdPartyOrderID, request.RequestID),
		TransferResult:    envelope.TransferResult,
		ResponseData:      envelope.ResponseData,
	}, nil
}

func (s *WalletService) queryAlipaySidecarPayout(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	request *repository.WithdrawRequest,
) (*alipaySidecarEnvelope, error) {
	return callAlipaySidecar(ctx, strings.TrimRight(cfg.Alipay.SidecarURL, "/")+"/v1/payouts/query", cfg.Alipay.SidecarAPISecret, map[string]interface{}{
		"requestId":         strings.TrimSpace(request.RequestID),
		"transactionId":     strings.TrimSpace(request.TransactionID),
		"thirdPartyOrderId": strings.TrimSpace(request.ThirdPartyOrderID),
		"notifyUrl":         firstTrimmed(cfg.Alipay.PayoutNotifyURL, cfg.Alipay.NotifyURL),
		"appId":             cfg.Alipay.AppID,
		"sandbox":           cfg.Alipay.Sandbox,
		"integrationTarget": "official-sidecar-sdk",
	})
}

func verifyAlipaySidecarCallback(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	req PaymentCallbackRequest,
) (*alipaySidecarEnvelope, error) {
	payload := map[string]interface{}{
		"params":  req.Params,
		"rawBody": req.RawBody,
	}
	if len(req.Headers) > 0 {
		payload["headers"] = req.Headers
	}
	return callAlipaySidecar(ctx, strings.TrimRight(cfg.Alipay.SidecarURL, "/")+"/v1/notify/verify", cfg.Alipay.SidecarAPISecret, payload)
}
