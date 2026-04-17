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

type bankPayoutSidecarEnvelope struct {
	Success           bool                   `json:"success"`
	Status            string                 `json:"status"`
	Gateway           string                 `json:"gateway"`
	IntegrationTarget string                 `json:"integrationTarget"`
	ThirdPartyOrderID string                 `json:"thirdPartyOrderId"`
	TransactionID     string                 `json:"transactionId"`
	ResponseData      map[string]interface{} `json:"responseData"`
	TransferResult    string                 `json:"transferResult"`
	EventType         string                 `json:"eventType"`
	Verified          bool                   `json:"verified"`
	Message           string                 `json:"message"`
	Error             string                 `json:"error"`
}

func callBankPayoutSidecar(ctx context.Context, rawURL string, apiSecret string, payload map[string]interface{}) (*bankPayoutSidecarEnvelope, error) {
	sidecarURL := strings.TrimSpace(rawURL)
	if sidecarURL == "" {
		return nil, fmt.Errorf("%w: bank payout sidecar url is required", ErrInvalidArgument)
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
	if err := applySidecarSecretHeader(request, apiSecret, "bank payout sidecar"); err != nil {
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

	var envelope bankPayoutSidecarEnvelope
	if len(bytes.TrimSpace(responseBody)) > 0 {
		if err := json.Unmarshal(responseBody, &envelope); err != nil {
			return nil, fmt.Errorf("%w: bank payout sidecar returned invalid JSON", ErrInvalidArgument)
		}
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		message := firstTrimmed(envelope.Error, envelope.Message, string(responseBody))
		if message == "" {
			message = response.Status
		}
		return nil, fmt.Errorf("%w: bank payout sidecar request failed: %s", ErrInvalidArgument, message)
	}

	if !envelope.Success {
		message := firstTrimmed(envelope.Error, envelope.Message)
		if message == "" {
			message = "bank payout sidecar returned unsuccessful response"
		}
		return nil, fmt.Errorf("%w: %s", ErrInvalidArgument, message)
	}

	return &envelope, nil
}

func (s *WalletService) createBankPayoutSidecar(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	request *repository.WithdrawRequest,
) (*withdrawPayoutExecutionResult, error) {
	envelope, err := callBankPayoutSidecar(ctx, strings.TrimRight(cfg.BankCard.SidecarURL, "/")+"/v1/payouts/create", cfg.BankCard.SidecarAPISecret, map[string]interface{}{
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
		"bankName":          strings.TrimSpace(request.BankName),
		"bankBranch":        strings.TrimSpace(request.BankBranch),
		"notifyUrl":         cfg.BankCard.NotifyURL,
		"providerUrl":       cfg.BankCard.ProviderURL,
		"merchantId":        cfg.BankCard.MerchantID,
		"apiKey":            cfg.BankCard.APIKey,
		"arrivalText":       cfg.BankCard.ArrivalText,
		"integrationTarget": "bank-payout-sidecar",
	})
	if err != nil {
		return nil, err
	}

	return &withdrawPayoutExecutionResult{
		Status:            firstTrimmed(envelope.Status, "transferring"),
		Gateway:           firstTrimmed(envelope.Gateway, "bank_card"),
		IntegrationTarget: firstTrimmed(envelope.IntegrationTarget, "bank-payout-sidecar"),
		ThirdPartyOrderID: firstTrimmed(envelope.ThirdPartyOrderID, request.RequestID),
		TransferResult:    envelope.TransferResult,
		ResponseData:      envelope.ResponseData,
	}, nil
}

func (s *WalletService) queryBankPayoutSidecar(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	request *repository.WithdrawRequest,
) (*bankPayoutSidecarEnvelope, error) {
	return callBankPayoutSidecar(ctx, strings.TrimRight(cfg.BankCard.SidecarURL, "/")+"/v1/payouts/query", cfg.BankCard.SidecarAPISecret, map[string]interface{}{
		"requestId":         strings.TrimSpace(request.RequestID),
		"transactionId":     strings.TrimSpace(request.TransactionID),
		"thirdPartyOrderId": strings.TrimSpace(request.ThirdPartyOrderID),
		"providerUrl":       cfg.BankCard.ProviderURL,
		"merchantId":        cfg.BankCard.MerchantID,
		"apiKey":            cfg.BankCard.APIKey,
		"notifyUrl":         cfg.BankCard.NotifyURL,
		"arrivalText":       cfg.BankCard.ArrivalText,
		"integrationTarget": "bank-payout-sidecar",
	})
}

func verifyBankPayoutSidecarCallback(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	req PaymentCallbackRequest,
) (*bankPayoutSidecarEnvelope, error) {
	payload := map[string]interface{}{
		"params":            req.Params,
		"rawBody":           req.RawBody,
		"providerUrl":       cfg.BankCard.ProviderURL,
		"merchantId":        cfg.BankCard.MerchantID,
		"apiKey":            cfg.BankCard.APIKey,
		"notifyUrl":         cfg.BankCard.NotifyURL,
		"arrivalText":       cfg.BankCard.ArrivalText,
		"integrationTarget": "bank-payout-sidecar",
	}
	if len(req.Headers) > 0 {
		payload["headers"] = req.Headers
	}
	return callBankPayoutSidecar(ctx, strings.TrimRight(cfg.BankCard.SidecarURL, "/")+"/v1/notify/verify", cfg.BankCard.SidecarAPISecret, payload)
}
