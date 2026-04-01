package service

import (
	"context"
	"encoding/json"
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
			"gateway":        "wechat",
			"gatewayStatus":  eventType,
			"outBatchNo":     outBatchNo,
			"outDetailNo":    outDetailNo,
			"lastQueryAt":    time.Now(),
			"integrationTag": "official-go-sdk",
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
			"gateway":        "alipay",
			"gatewayStatus":  eventType,
			"lastQueryAt":    time.Now(),
			"integrationTag": "official-sidecar-sdk",
			"responseData":   envelope.ResponseData,
		})
	}
}

func (s *WalletService) refreshBankCardWithdrawGatewayStatus(ctx context.Context, record *repository.WithdrawRequest, transaction *repository.WalletTransaction) error {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return err
	}
	if strings.TrimSpace(cfg.BankCard.SidecarURL) == "" {
		return nil
	}
	if !(cfg.BankCard.AllowStub || (cfg.BankCard.ProviderURL != "" && cfg.BankCard.MerchantID != "" && cfg.BankCard.APIKey != "" && cfg.BankCard.NotifyURL != "")) {
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
			"gateway":        "bank_card",
			"gatewayStatus":  eventType,
			"lastQueryAt":    time.Now(),
			"integrationTag": "bank-payout-sidecar",
			"responseData":   envelope.ResponseData,
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

	if len(responseData) == 0 {
		return nil
	}
	payload, err := json.Marshal(responseData)
	if err != nil {
		return nil
	}
	return s.walletRepo.DB().WithContext(ctx).
		Model(&repository.WalletTransaction{}).
		Where("transaction_id = ? OR transaction_id_raw = ?", transaction.TransactionID, transaction.TransactionID).
		Update("response_data", string(payload)).Error
}

func isGatewaySuccessStatus(eventType string) bool {
	status := strings.ToLower(strings.TrimSpace(eventType))
	return strings.Contains(status, "success") || strings.Contains(status, "finish")
}

func isGatewayFailureStatus(eventType string) bool {
	status := strings.ToLower(strings.TrimSpace(eventType))
	return strings.Contains(status, "fail") ||
		strings.Contains(status, "close") ||
		strings.Contains(status, "cancel") ||
		strings.Contains(status, "reject")
}
