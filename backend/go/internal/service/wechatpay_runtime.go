package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/wechatpay-apiv3/wechatpay-go/core"
	"github.com/wechatpay-apiv3/wechatpay-go/core/auth/verifiers"
	"github.com/wechatpay-apiv3/wechatpay-go/core/downloader"
	wnotify "github.com/wechatpay-apiv3/wechatpay-go/core/notify"
	"github.com/wechatpay-apiv3/wechatpay-go/core/option"
	apppay "github.com/wechatpay-apiv3/wechatpay-go/services/payments/app"
	jsapi "github.com/wechatpay-apiv3/wechatpay-go/services/payments/jsapi"
	"github.com/wechatpay-apiv3/wechatpay-go/services/refunddomestic"
	"github.com/wechatpay-apiv3/wechatpay-go/services/transferbatch"
	"github.com/wechatpay-apiv3/wechatpay-go/utils"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type wechatOfficialRuntime struct {
	client        *core.Client
	notifyHandler *wnotify.Handler
}

func loadWechatOfficialRuntime(ctx context.Context, cfg paymentGatewayRuntimeConfig) (*wechatOfficialRuntime, error) {
	privateKey, err := utils.LoadPrivateKey(strings.TrimSpace(cfg.Wechat.PrivateKey))
	if err != nil {
		return nil, fmt.Errorf("%w: invalid wechat private key: %v", ErrInvalidArgument, err)
	}

	client, err := core.NewClient(ctx,
		option.WithWechatPayAutoAuthCipher(
			strings.TrimSpace(cfg.Wechat.MchID),
			strings.TrimSpace(cfg.Wechat.SerialNo),
			privateKey,
			strings.TrimSpace(cfg.Wechat.APIV3Key),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("%w: init wechat pay client failed: %v", ErrInvalidArgument, err)
	}

	mgr := downloader.MgrInstance()
	if !mgr.HasDownloader(ctx, strings.TrimSpace(cfg.Wechat.MchID)) {
		if err := mgr.RegisterDownloaderWithPrivateKey(
			ctx,
			privateKey,
			strings.TrimSpace(cfg.Wechat.SerialNo),
			strings.TrimSpace(cfg.Wechat.MchID),
			strings.TrimSpace(cfg.Wechat.APIV3Key),
		); err != nil {
			return nil, fmt.Errorf("%w: init wechat pay certificate downloader failed: %v", ErrInvalidArgument, err)
		}
	}

	notifyHandler, err := wnotify.NewRSANotifyHandler(
		strings.TrimSpace(cfg.Wechat.APIV3Key),
		verifiers.NewSHA256WithRSAVerifier(mgr.GetCertificateVisitor(strings.TrimSpace(cfg.Wechat.MchID))),
	)
	if err != nil {
		return nil, fmt.Errorf("%w: init wechat notify handler failed: %v", ErrInvalidArgument, err)
	}

	return &wechatOfficialRuntime{
		client:        client,
		notifyHandler: notifyHandler,
	}, nil
}

func (s *PaymentService) createWechatOfficialIntent(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	scene string,
	internalTransactionID string,
	amount int64,
	description string,
	userID string,
	userType string,
	platform string,
) (*paymentIntentResult, error) {
	runtime, err := loadWechatOfficialRuntime(ctx, cfg)
	if err != nil {
		return nil, err
	}

	normalizedPlatform := normalizeClientPlatform(platform)
	normalizedUserType, err := normalizeUserType(userType)
	if err != nil {
		return nil, err
	}
	desc := firstTrimmed(description, defaultPaymentDescription(scene))
	notifyURL := strings.TrimSpace(cfg.Wechat.NotifyURL)
	appID := strings.TrimSpace(cfg.Wechat.AppID)
	mchID := strings.TrimSpace(cfg.Wechat.MchID)

	if normalizedPlatform == "mini_program" {
		if normalizedUserType != "customer" {
			return nil, fmt.Errorf("%w: mini program wechat pay is only supported for customer", ErrInvalidArgument)
		}
		openID, err := s.lookupCustomerWechatOpenID(ctx, userID)
		if err != nil {
			return nil, err
		}
		svc := jsapi.JsapiApiService{Client: runtime.client}
		resp, _, err := svc.PrepayWithRequestPayment(ctx, jsapi.PrepayRequest{
			Appid:       core.String(appID),
			Mchid:       core.String(mchID),
			Description: core.String(desc),
			OutTradeNo:  core.String(internalTransactionID),
			Attach:      core.String(scene),
			NotifyUrl:   core.String(notifyURL),
			Amount: &jsapi.Amount{
				Total: core.Int64(amount),
			},
			Payer: &jsapi.Payer{
				Openid: core.String(openID),
			},
		})
		if err != nil {
			return nil, fmt.Errorf("%w: create wechat jsapi payment failed: %v", ErrInvalidArgument, err)
		}

		clientPayload := map[string]interface{}{
			"gateway":         "wechat",
			"platform":        normalizedPlatform,
			"scene":           scene,
			"outTradeNo":      internalTransactionID,
			"prepayId":        stringPtrValue(resp.PrepayId),
			"appId":           stringPtrValue(resp.Appid),
			"timeStamp":       stringPtrValue(resp.TimeStamp),
			"nonceStr":        stringPtrValue(resp.NonceStr),
			"package":         stringPtrValue(resp.Package),
			"signType":        stringPtrValue(resp.SignType),
			"paySign":         stringPtrValue(resp.PaySign),
			"integrationMode": "official-go-sdk",
		}
		return &paymentIntentResult{
			Status:            "awaiting_client_pay",
			Gateway:           "wechat",
			IntegrationTarget: "official-go-sdk",
			ThirdPartyOrderID: internalTransactionID,
			ClientPayload:     clientPayload,
			ResponseData: map[string]interface{}{
				"status":            "awaiting_client_pay",
				"gateway":           "wechat",
				"integrationTarget": "official-go-sdk",
				"platform":          normalizedPlatform,
				"scene":             scene,
				"outTradeNo":        internalTransactionID,
				"prepayId":          stringPtrValue(resp.PrepayId),
				"clientPayload":     clientPayload,
			},
		}, nil
	}

	svc := apppay.AppApiService{Client: runtime.client}
	resp, _, err := svc.PrepayWithRequestPayment(ctx, apppay.PrepayRequest{
		Appid:       core.String(appID),
		Mchid:       core.String(mchID),
		Description: core.String(desc),
		OutTradeNo:  core.String(internalTransactionID),
		Attach:      core.String(scene),
		NotifyUrl:   core.String(notifyURL),
		Amount: &apppay.Amount{
			Total: core.Int64(amount),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("%w: create wechat app payment failed: %v", ErrInvalidArgument, err)
	}

	clientPayload := map[string]interface{}{
		"gateway":         "wechat",
		"platform":        normalizedPlatform,
		"scene":           scene,
		"outTradeNo":      internalTransactionID,
		"prepayId":        stringPtrValue(resp.PrepayId),
		"partnerId":       stringPtrValue(resp.PartnerId),
		"timeStamp":       stringPtrValue(resp.TimeStamp),
		"nonceStr":        stringPtrValue(resp.NonceStr),
		"package":         stringPtrValue(resp.Package),
		"sign":            stringPtrValue(resp.Sign),
		"integrationMode": "official-go-sdk",
	}
	return &paymentIntentResult{
		Status:            "awaiting_client_pay",
		Gateway:           "wechat",
		IntegrationTarget: "official-go-sdk",
		ThirdPartyOrderID: internalTransactionID,
		ClientPayload:     clientPayload,
		ResponseData: map[string]interface{}{
			"status":            "awaiting_client_pay",
			"gateway":           "wechat",
			"integrationTarget": "official-go-sdk",
			"platform":          normalizedPlatform,
			"scene":             scene,
			"outTradeNo":        internalTransactionID,
			"prepayId":          stringPtrValue(resp.PrepayId),
			"clientPayload":     clientPayload,
		},
	}, nil
}

func (s *PaymentService) verifyAndNormalizeCallback(ctx context.Context, req PaymentCallbackRequest) (PaymentCallbackRequest, error) {
	switch normalizeChannel(req.Channel) {
	case "wechat":
		return s.verifyWechatCallback(ctx, req)
	case "alipay":
		return s.verifyAlipayCallback(ctx, req)
	default:
		return req, fmt.Errorf("%w: unsupported callback channel", ErrInvalidArgument)
	}
}

func (s *PaymentService) createWechatOfficialRefund(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	internalRefundID string,
	originalTransaction *repository.WalletTransaction,
	amount int64,
	reason string,
) (*paymentRefundResult, error) {
	runtime, err := loadWechatOfficialRuntime(ctx, cfg)
	if err != nil {
		return nil, err
	}

	outTradeNo := internalRefundID
	totalAmount := amount
	if originalTransaction != nil {
		outTradeNo = firstTrimmed(originalTransaction.ThirdPartyOrderID, originalTransaction.TransactionID, originalTransaction.TransactionIDRaw, internalRefundID)
		if originalTransaction.Amount > 0 {
			totalAmount = originalTransaction.Amount
		}
	}

	svc := refunddomestic.RefundsApiService{Client: runtime.client}
	resp, _, err := svc.Create(ctx, refunddomestic.CreateRequest{
		OutTradeNo:  core.String(outTradeNo),
		OutRefundNo: core.String(internalRefundID),
		Reason:      core.String(firstTrimmed(reason, "订单退款")),
		NotifyUrl:   core.String(strings.TrimSpace(cfg.Wechat.RefundNotifyURL)),
		Amount: &refunddomestic.AmountReq{
			Refund:   core.Int64(amount),
			Total:    core.Int64(totalAmount),
			Currency: core.String("CNY"),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("%w: create wechat refund failed: %v", ErrInvalidArgument, err)
	}

	responseData := map[string]interface{}{
		"status":            "refund_pending",
		"gateway":           "wechat",
		"integrationTarget": "official-go-sdk",
		"outRefundNo":       internalRefundID,
		"outTradeNo":        outTradeNo,
	}
	if resp != nil {
		if refundID := stringPtrValue(resp.RefundId); refundID != "" {
			responseData["refundId"] = refundID
		}
		if resp.Status != nil {
			status := strings.TrimSpace(fmt.Sprint(*resp.Status))
			if status != "" {
				responseData["gatewayStatus"] = status
			}
		}
	}

	return &paymentRefundResult{
		Status:            "refund_pending",
		Gateway:           "wechat",
		IntegrationTarget: "official-go-sdk",
		ThirdPartyOrderID: internalRefundID,
		ResponseData:      responseData,
	}, nil
}

func (s *PaymentService) verifyWechatCallback(ctx context.Context, req PaymentCallbackRequest) (PaymentCallbackRequest, error) {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return req, err
	}
	runtime, err := loadWechatOfficialRuntime(ctx, cfg)
	if err != nil {
		return req, err
	}

	httpReq, err := buildCallbackHTTPRequest(req)
	if err != nil {
		return req, err
	}

	content := make(map[string]interface{})
	notifyReq, err := runtime.notifyHandler.ParseNotifyRequest(ctx, httpReq, content)
	if err != nil {
		return req, fmt.Errorf("%w: verify wechat callback failed: %v", ErrInvalidArgument, err)
	}
	if notifyReq != nil && notifyReq.Resource != nil && strings.TrimSpace(notifyReq.Resource.Plaintext) != "" {
		_ = json.Unmarshal([]byte(notifyReq.Resource.Plaintext), &content)
	}

	internalRef := firstTrimmed(
		notifyString(content, "out_trade_no"),
		notifyString(content, "out_refund_no"),
		notifyString(content, "out_batch_no"),
		notifyString(content, "out_detail_no"),
	)
	externalRef := firstTrimmed(
		notifyString(content, "transaction_id"),
		notifyString(content, "refund_id"),
		notifyString(content, "batch_id"),
		notifyString(content, "detail_id"),
	)

	req.Verified = true
	req.EventType = firstTrimmed(
		strings.TrimSpace(notifyReq.EventType),
		notifyString(content, "trade_state"),
		notifyString(content, "refund_status"),
		notifyString(content, "detail_status"),
		notifyString(content, "batch_status"),
		notifyString(content, "status"),
		notifyString(content, "state"),
		req.EventType,
	)
	req.TransactionID = firstTrimmed(internalRef, req.TransactionID)
	req.ThirdPartyOrderID = firstTrimmed(externalRef, req.ThirdPartyOrderID, internalRef)
	if req.Headers == nil {
		req.Headers = map[string]string{}
	}
	if externalRef != "" {
		req.Headers["X-Gateway-Transaction-Id"] = externalRef
	}
	return req, nil
}

func (s *WalletService) createWechatOfficialPayout(
	ctx context.Context,
	cfg paymentGatewayRuntimeConfig,
	request *repository.WithdrawRequest,
) (*withdrawPayoutExecutionResult, error) {
	runtime, err := loadWechatOfficialRuntime(ctx, cfg)
	if err != nil {
		return nil, err
	}

	openID := strings.TrimSpace(request.WithdrawAccount)
	if openID == "" {
		return nil, fmt.Errorf("%w: wechat payout requires withdraw_account to be the recipient openid", ErrInvalidArgument)
	}

	outBatchNo := firstTrimmed(strings.TrimSpace(request.RequestID), strings.TrimSpace(request.TransactionID))
	outDetailNo := firstTrimmed(strings.TrimSpace(request.TransactionID), strings.TrimSpace(request.RequestID))
	notifyURL := firstTrimmed(strings.TrimSpace(cfg.Wechat.PayoutNotifyURL), strings.TrimSpace(cfg.Wechat.NotifyURL))
	batchName := buildWechatPayoutBatchName(request)
	batchRemark := buildWechatPayoutRemark(request)

	detail := transferbatch.TransferDetailInput{
		OutDetailNo:    core.String(outDetailNo),
		TransferAmount: core.Int64(request.ActualAmount),
		TransferRemark: core.String(batchRemark),
		Openid:         core.String(openID),
	}
	if name := strings.TrimSpace(request.WithdrawName); name != "" {
		detail.UserName = core.String(name)
	}

	payload := transferbatch.InitiateBatchTransferRequest{
		Appid:              core.String(strings.TrimSpace(cfg.Wechat.AppID)),
		OutBatchNo:         core.String(outBatchNo),
		BatchName:          core.String(batchName),
		BatchRemark:        core.String(batchRemark),
		TotalAmount:        core.Int64(request.ActualAmount),
		TotalNum:           core.Int64(1),
		TransferDetailList: []transferbatch.TransferDetailInput{detail},
		NotifyUrl:          core.String(notifyURL),
	}
	if sceneID := strings.TrimSpace(cfg.Wechat.PayoutSceneID); sceneID != "" {
		payload.TransferSceneId = core.String(sceneID)
	}

	svc := transferbatch.TransferBatchApiService{Client: runtime.client}
	resp, _, err := svc.InitiateBatchTransfer(ctx, payload)
	if err != nil {
		return nil, fmt.Errorf("%w: create wechat payout failed: %v", ErrInvalidArgument, err)
	}

	batchID := stringPtrValue(resp.BatchId)
	batchStatus := strings.ToLower(strings.TrimSpace(stringPtrValue(resp.BatchStatus)))
	resultStatus := "transferring"
	if strings.Contains(batchStatus, "close") || strings.Contains(batchStatus, "fail") {
		resultStatus = "failed"
	}

	transferResult := "微信提现已提交，等待异步结果回写"
	if batchStatus != "" {
		transferResult = fmt.Sprintf("微信提现批次已提交，当前状态：%s", batchStatus)
	}

	return &withdrawPayoutExecutionResult{
		Status:            resultStatus,
		Gateway:           "wechat",
		IntegrationTarget: "official-go-sdk",
		ThirdPartyOrderID: firstTrimmed(batchID, outBatchNo),
		TransferResult:    transferResult,
		ResponseData: map[string]interface{}{
			"status":            resultStatus,
			"gateway":           "wechat",
			"integrationTarget": "official-go-sdk",
			"requestId":         request.RequestID,
			"transactionId":     request.TransactionID,
			"outBatchNo":        outBatchNo,
			"outDetailNo":       outDetailNo,
			"batchId":           batchID,
			"batchStatus":       batchStatus,
			"notifyUrl":         notifyURL,
			"transferAmount":    request.ActualAmount,
			"transferResult":    transferResult,
		},
	}, nil
}

func (s *PaymentService) verifyAlipayCallback(ctx context.Context, req PaymentCallbackRequest) (PaymentCallbackRequest, error) {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return req, err
	}
	envelope, err := verifyAlipaySidecarCallback(ctx, cfg, req)
	if err != nil {
		return req, err
	}

	req.Verified = envelope.Verified
	if !req.Verified {
		return req, fmt.Errorf("%w: alipay callback verification failed", ErrInvalidArgument)
	}
	req.EventType = firstTrimmed(envelope.EventType, req.EventType)
	req.TransactionID = firstTrimmed(envelope.TransactionID, envelope.ThirdPartyOrderID, req.TransactionID)
	req.ThirdPartyOrderID = firstTrimmed(envelope.ThirdPartyOrderID, envelope.TransactionID, req.ThirdPartyOrderID)
	return req, nil
}

func (s *PaymentService) lookupCustomerWechatOpenID(ctx context.Context, userID string) (string, error) {
	normalizedID := strings.TrimSpace(userID)
	if normalizedID == "" {
		return "", fmt.Errorf("%w: userId is required for wechat mini program payment", ErrInvalidArgument)
	}

	var user repository.User
	err := s.walletRepo.DB().WithContext(ctx).
		Model(&repository.User{}).
		Where("id = ? OR uid = ? OR tsid = ? OR phone = ?", normalizedID, normalizedID, normalizedID, normalizedID).
		First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", fmt.Errorf("%w: customer not found for wechat mini program payment", ErrInvalidArgument)
		}
		return "", err
	}
	openID := strings.TrimSpace(user.WechatOpenID)
	if openID == "" {
		return "", fmt.Errorf("%w: wechat mini program payment requires a bound wechat openid", ErrInvalidArgument)
	}
	return openID, nil
}

func buildCallbackHTTPRequest(req PaymentCallbackRequest) (*http.Request, error) {
	httpReq, err := http.NewRequest(http.MethodPost, "https://callback.local", bytes.NewBufferString(req.RawBody))
	if err != nil {
		return nil, err
	}
	for key, value := range req.Headers {
		if strings.TrimSpace(key) == "" {
			continue
		}
		httpReq.Header.Set(key, value)
	}
	return httpReq, nil
}

func notifyString(payload map[string]interface{}, key string) string {
	if payload == nil {
		return ""
	}
	value, ok := payload[key]
	if !ok || value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return strings.TrimSpace(fmt.Sprint(typed))
	}
}

func stringPtrValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func defaultPaymentDescription(scene string) string {
	switch strings.ToLower(strings.TrimSpace(scene)) {
	case "wallet_recharge":
		return "IF-Pay钱包充值"
	case "rider_deposit":
		return "骑手保证金缴纳"
	default:
		return "平台订单支付"
	}
}

func buildWechatPayoutBatchName(request *repository.WithdrawRequest) string {
	switch normalizeUserTypeForDisplay(request.UserType) {
	case "骑手":
		return "骑手提现"
	case "商户":
		return "商户提现"
	case "用户":
		return "用户提现"
	default:
		return "平台钱包提现"
	}
}

func buildWechatPayoutRemark(request *repository.WithdrawRequest) string {
	if note := strings.TrimSpace(request.ReviewRemark); note != "" {
		return note
	}
	if note := strings.TrimSpace(request.TransferResult); note != "" {
		return note
	}
	return fmt.Sprintf("%s %s", buildWechatPayoutBatchName(request), strings.TrimSpace(request.RequestID))
}

func normalizeUserTypeForDisplay(userType string) string {
	switch strings.ToLower(strings.TrimSpace(userType)) {
	case "customer", "user":
		return "用户"
	case "rider":
		return "骑手"
	case "merchant":
		return "商户"
	default:
		return strings.TrimSpace(userType)
	}
}

func marshalNotifyPayload(raw string) map[string]string {
	payload := map[string]string{}
	if strings.TrimSpace(raw) == "" {
		return payload
	}
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return payload
	}
	for key, value := range parsed {
		payload[key] = strings.TrimSpace(fmt.Sprint(value))
	}
	return payload
}
