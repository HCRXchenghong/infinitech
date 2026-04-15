package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/wechatpay-apiv3/wechatpay-go/core"
	"github.com/wechatpay-apiv3/wechatpay-go/services/transferbatch"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func (s *WalletService) refreshWithdrawGatewayStatus(ctx context.Context, record *repository.WithdrawRequest, transaction *repository.WalletTransaction) error {
	if record == nil || transaction == nil {
		return nil
	}

	status := strings.ToLower(strings.TrimSpace(record.Status))
	if status != "pending_transfer" && status != "transferring" {
		return nil
	}
	if !canRefreshWithdrawGatewayStatus(record, transaction) {
		return nil
	}

	switch normalizeChannel(record.WithdrawMethod) {
	case "wechat":
		return s.refreshWechatWithdrawGatewayStatus(ctx, record, transaction)
	case "alipay":
		return s.refreshAlipayWithdrawGatewayStatus(ctx, record, transaction)
	case "bank_card":
		return s.refreshBankCardWithdrawGatewayStatus(ctx, record, transaction)
	default:
		return nil
	}
}

func (s *WalletService) refreshWechatWithdrawGatewayStatus(ctx context.Context, record *repository.WithdrawRequest, transaction *repository.WalletTransaction) error {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return err
	}
	runtime, err := loadWechatOfficialRuntime(ctx, cfg)
	if err != nil {
		return err
	}

	outBatchNo := strings.TrimSpace(record.RequestID)
	outDetailNo := firstTrimmed(strings.TrimSpace(transaction.TransactionID), strings.TrimSpace(record.TransactionID))
	if outBatchNo == "" || outDetailNo == "" {
		return nil
	}

	svc := transferbatch.TransferDetailApiService{Client: runtime.client}
	resp, _, err := svc.GetTransferDetailByOutNo(ctx, transferbatch.GetTransferDetailByOutNoRequest{
		OutBatchNo:  core.String(outBatchNo),
		OutDetailNo: core.String(outDetailNo),
	})
	if err != nil {
		return err
	}

	eventType := strings.ToLower(strings.TrimSpace(stringPtrValue(resp.DetailStatus)))
	thirdPartyOrderID := firstTrimmed(stringPtrValue(resp.DetailId), stringPtrValue(resp.BatchId), strings.TrimSpace(record.ThirdPartyOrderID))
	transferResult := firstTrimmed(stringPtrValue(resp.TransferRemark), eventType)

	switch {
	case isGatewaySuccessStatus(eventType):
		return s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
			return s.completeWithdrawByCallbackTx(ctx, tx, transaction, thirdPartyOrderID, transferResult, time.Now())
		})
	case isGatewayFailureStatus(eventType):
		return s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
			return s.failWithdrawByCallbackTx(ctx, tx, transaction, thirdPartyOrderID, transferResult, time.Now())
		})
	default:
		return s.updateWithdrawProgressMetadata(ctx, record, transaction, thirdPartyOrderID, transferResult, map[string]interface{}{
			"gateway":           "wechat",
			"gatewayStatus":     eventType,
			"outBatchNo":        outBatchNo,
			"outDetailNo":       outDetailNo,
			"lastQueryAt":       time.Now(),
			"integrationTarget": "official-go-sdk",
		})
	}
}

func (s *WalletService) refreshAlipayWithdrawGatewayStatus(ctx context.Context, record *repository.WithdrawRequest, transaction *repository.WalletTransaction) error {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return err
	}

	envelope, err := s.queryAlipaySidecarPayout(ctx, cfg, record)
	if err != nil {
		return err
	}

	eventType := strings.ToLower(strings.TrimSpace(firstTrimmed(envelope.EventType, envelope.Status)))
	thirdPartyOrderID := firstTrimmed(envelope.ThirdPartyOrderID, strings.TrimSpace(record.ThirdPartyOrderID))
	transferResult := firstTrimmed(envelope.TransferResult, envelope.Message, eventType)

	switch {
	case isGatewaySuccessStatus(eventType):
		return s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
			return s.completeWithdrawByCallbackTx(ctx, tx, transaction, thirdPartyOrderID, transferResult, time.Now())
		})
	case isGatewayFailureStatus(eventType):
		return s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
			return s.failWithdrawByCallbackTx(ctx, tx, transaction, thirdPartyOrderID, transferResult, time.Now())
		})
	default:
		return s.updateWithdrawProgressMetadata(ctx, record, transaction, thirdPartyOrderID, transferResult, map[string]interface{}{
			"gateway":           "alipay",
			"gatewayStatus":     eventType,
			"lastQueryAt":       time.Now(),
			"integrationTarget": "official-sidecar-sdk",
			"responseData":      envelope.ResponseData,
		})
	}
}

func (s *WalletService) refreshBankCardWithdrawGatewayStatus(ctx context.Context, record *repository.WithdrawRequest, transaction *repository.WalletTransaction) error {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return err
	}
	if !bankCardSidecarExecutionEnabled(cfg.BankCard) {
		return nil
	}

	envelope, err := s.queryBankPayoutSidecar(ctx, cfg, record)
	if err != nil {
		return err
	}

	eventType := strings.ToLower(strings.TrimSpace(firstTrimmed(envelope.EventType, envelope.Status)))
	thirdPartyOrderID := firstTrimmed(envelope.ThirdPartyOrderID, strings.TrimSpace(record.ThirdPartyOrderID))
	transferResult := firstTrimmed(envelope.TransferResult, envelope.Message, eventType)

	switch {
	case isGatewaySuccessStatus(eventType):
		return s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
			return s.completeWithdrawByCallbackTx(ctx, tx, transaction, thirdPartyOrderID, transferResult, time.Now())
		})
	case isGatewayFailureStatus(eventType):
		return s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
			return s.failWithdrawByCallbackTx(ctx, tx, transaction, thirdPartyOrderID, transferResult, time.Now())
		})
	default:
		return s.updateWithdrawProgressMetadata(ctx, record, transaction, thirdPartyOrderID, transferResult, map[string]interface{}{
			"gateway":           "bank_card",
			"gatewayStatus":     eventType,
			"lastQueryAt":       time.Now(),
			"integrationTarget": "bank-payout-sidecar",
			"responseData":      envelope.ResponseData,
		})
	}
}

func (s *WalletService) updateWithdrawProgressMetadata(
	ctx context.Context,
	record *repository.WithdrawRequest,
	transaction *repository.WalletTransaction,
	thirdPartyOrderID string,
	transferResult string,
	responseData map[string]interface{},
) error {
	if record == nil || transaction == nil {
		return nil
	}

	updates := map[string]interface{}{}
	latestStatus := strings.TrimSpace(record.Status)
	if latestStatus == "pending_transfer" {
		latestStatus = "transferring"
		updates["status"] = latestStatus
	}
	if strings.TrimSpace(thirdPartyOrderID) != "" {
		updates["third_party_order_id"] = strings.TrimSpace(thirdPartyOrderID)
	}
	if strings.TrimSpace(transferResult) != "" {
		updates["transfer_result"] = strings.TrimSpace(transferResult)
	}
	if len(updates) > 0 {
		if err := s.walletRepo.DB().WithContext(ctx).
			Model(&repository.WithdrawRequest{}).
			Where("request_id = ? OR request_id_raw = ?", record.RequestID, record.RequestID).
			Updates(updates).Error; err != nil {
			return err
		}
	}
	if err := s.updateWalletTransactionThirdPartyOrderID(ctx, transaction.TransactionID, thirdPartyOrderID, false); err != nil {
		return err
	}

	payload := mergeWalletResponseData(walletTransactionResponseMap(transaction), responseData)
	if strings.TrimSpace(latestStatus) != "" {
		payload["status"] = strings.TrimSpace(latestStatus)
	}
	if strings.TrimSpace(thirdPartyOrderID) != "" {
		payload["thirdPartyOrderId"] = strings.TrimSpace(thirdPartyOrderID)
	}
	if strings.TrimSpace(transferResult) != "" {
		payload["transferResult"] = strings.TrimSpace(transferResult)
	}
	if len(payload) == 0 {
		return nil
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil
	}
	return s.walletRepo.DB().WithContext(ctx).
		Model(&repository.WalletTransaction{}).
		Where("transaction_id = ? OR transaction_id_raw = ?", transaction.TransactionID, transaction.TransactionID).
		Update("response_data", string(payloadJSON)).Error
}

func canRefreshWithdrawGatewayStatus(record *repository.WithdrawRequest, transaction *repository.WalletTransaction) bool {
	if record == nil || transaction == nil {
		return false
	}
	status := strings.ToLower(strings.TrimSpace(record.Status))
	if status == "transferring" {
		return true
	}
	if status != "pending_transfer" {
		return false
	}
	if strings.TrimSpace(record.ThirdPartyOrderID) != "" || strings.TrimSpace(transaction.ThirdPartyOrderID) != "" {
		return true
	}
	payload := walletTransactionResponseMap(transaction)
	return walletResponseHasText(payload,
		"gateway",
		"integrationTarget",
		"submittedAt",
		"sidecarUrl",
		"outBatchNo",
		"outDetailNo",
		"batchId",
		"processingMode",
		"notifyUrl",
	)
}

func walletResponseHasText(payload map[string]interface{}, keys ...string) bool {
	for _, key := range keys {
		value, ok := payload[key]
		if !ok || value == nil {
			continue
		}
		if strings.TrimSpace(fmt.Sprint(value)) != "" && !strings.EqualFold(strings.TrimSpace(fmt.Sprint(value)), "<nil>") {
			return true
		}
	}
	return false
}

func isGatewaySuccessStatus(eventType string) bool {
	status := strings.ToLower(strings.TrimSpace(eventType))
	return strings.Contains(status, "success") ||
		strings.Contains(status, "finish") ||
		strings.Contains(status, "complete")
}

func isGatewayPendingStatus(eventType string) bool {
	status := strings.ToLower(strings.TrimSpace(eventType))
	if status == "" {
		return false
	}
	return strings.Contains(status, "wait") ||
		strings.Contains(status, "pending") ||
		strings.Contains(status, "process") ||
		strings.Contains(status, "accept") ||
		strings.Contains(status, "init") ||
		strings.Contains(status, "review") ||
		strings.Contains(status, "dealing") ||
		strings.Contains(status, "paying") ||
		strings.Contains(status, "transferring")
}

func isGatewayFailureStatus(eventType string) bool {
	status := strings.ToLower(strings.TrimSpace(eventType))
	return strings.Contains(status, "fail") ||
		strings.Contains(status, "close") ||
		strings.Contains(status, "cancel") ||
		strings.Contains(status, "reject") ||
		strings.Contains(status, "error") ||
		strings.Contains(status, "deny") ||
		strings.Contains(status, "timeout")
}
