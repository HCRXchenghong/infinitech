package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

type WithdrawGatewayReconcileWorkerStatus struct {
	Enabled              bool   `json:"enabled"`
	Running              bool   `json:"running"`
	PollIntervalSeconds  int    `json:"pollIntervalSeconds"`
	BatchSize            int    `json:"batchSize"`
	LastCycleStatus      string `json:"lastCycleStatus"`
	LastProcessedCount   int    `json:"lastProcessedCount"`
	LastCycleAt          string `json:"lastCycleAt,omitempty"`
	LastSuccessAt        string `json:"lastSuccessAt,omitempty"`
	ConsecutiveFailures  int    `json:"consecutiveFailures"`
	LastError            string `json:"lastError,omitempty"`
	PendingTotal         int64  `json:"pendingTotal"`
	PendingTransferCount int64  `json:"pendingTransferCount"`
	TransferringCount    int64  `json:"transferringCount"`
	RetryPendingCount    int64  `json:"retryPendingCount"`
}

func (s *WalletService) setWithdrawGatewayReconcileRunning(running bool) {
	if s == nil {
		return
	}
	s.withdrawReconcileMu.Lock()
	s.withdrawReconcileRunning = running
	s.withdrawReconcileMu.Unlock()
}

func (s *WalletService) recordWithdrawGatewayReconcileCycle(status string, processed int, err error) {
	if s == nil {
		return
	}
	s.withdrawReconcileMu.Lock()
	defer s.withdrawReconcileMu.Unlock()

	now := time.Now()
	s.withdrawReconcileLastCycleAt = now
	s.withdrawReconcileLastCycleStatus = strings.TrimSpace(status)
	s.withdrawReconcileLastProcessed = processed
	if err != nil {
		s.withdrawReconcileFailureCount++
		s.withdrawReconcileLastError = strings.TrimSpace(err.Error())
		return
	}
	if strings.EqualFold(strings.TrimSpace(status), "ok") {
		s.withdrawReconcileLastSuccessAt = now
	}
	s.withdrawReconcileFailureCount = 0
	s.withdrawReconcileLastError = ""
}

func (s *WalletService) WithdrawGatewayReconcileStatusSnapshot(ctx context.Context) WithdrawGatewayReconcileWorkerStatus {
	if s == nil {
		return WithdrawGatewayReconcileWorkerStatus{
			Enabled:         false,
			Running:         false,
			LastCycleStatus: "unavailable",
		}
	}

	s.withdrawReconcileMu.RLock()
	running := s.withdrawReconcileRunning
	lastCycleAt := s.withdrawReconcileLastCycleAt
	lastSuccessAt := s.withdrawReconcileLastSuccessAt
	lastCycleStatus := strings.TrimSpace(s.withdrawReconcileLastCycleStatus)
	lastProcessed := s.withdrawReconcileLastProcessed
	failures := s.withdrawReconcileFailureCount
	lastError := strings.TrimSpace(s.withdrawReconcileLastError)
	s.withdrawReconcileMu.RUnlock()

	if lastCycleStatus == "" {
		if s.withdrawReconcileEnabled {
			lastCycleStatus = "not_started"
		} else {
			lastCycleStatus = "disabled"
		}
	}

	pendingTotal, pendingTransferCount, transferringCount, retryPendingCount := s.withdrawGatewayPendingCounts(ctx)
	snapshot := WithdrawGatewayReconcileWorkerStatus{
		Enabled:              s.withdrawReconcileEnabled,
		Running:              running,
		PollIntervalSeconds:  int(s.withdrawReconcileInterval / time.Second),
		BatchSize:            s.withdrawReconcileBatchSize,
		LastCycleStatus:      lastCycleStatus,
		LastProcessedCount:   lastProcessed,
		ConsecutiveFailures:  failures,
		LastError:            lastError,
		PendingTotal:         pendingTotal,
		PendingTransferCount: pendingTransferCount,
		TransferringCount:    transferringCount,
		RetryPendingCount:    retryPendingCount,
	}
	if !lastCycleAt.IsZero() {
		snapshot.LastCycleAt = lastCycleAt.Format(time.RFC3339)
	}
	if !lastSuccessAt.IsZero() {
		snapshot.LastSuccessAt = lastSuccessAt.Format(time.RFC3339)
	}
	return snapshot
}

func (s *WalletService) StartWithdrawGatewayReconcileWorker(ctx context.Context) {
	if s == nil || s.walletRepo == nil || s.walletRepo.DB() == nil {
		return
	}
	if !s.withdrawReconcileEnabled {
		s.setWithdrawGatewayReconcileRunning(false)
		s.recordWithdrawGatewayReconcileCycle("disabled", 0, nil)
		log.Println("[withdraw-reconcile] worker disabled")
		return
	}

	s.setWithdrawGatewayReconcileRunning(true)
	processed, err := s.RunWithdrawGatewayReconcileCycle(ctx, s.withdrawReconcileBatchSize)
	s.recordWithdrawGatewayReconcileCycle(statusForWithdrawReconcileErr(err), processed, err)
	if err != nil {
		log.Printf("[withdraw-reconcile] initial cycle failed: %v", err)
	}

	ticker := time.NewTicker(s.withdrawReconcileInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.setWithdrawGatewayReconcileRunning(false)
			s.recordWithdrawGatewayReconcileCycle("stopped", 0, nil)
			log.Println("[withdraw-reconcile] worker stopped")
			return
		case <-ticker.C:
			processed, err := s.RunWithdrawGatewayReconcileCycle(ctx, s.withdrawReconcileBatchSize)
			s.recordWithdrawGatewayReconcileCycle(statusForWithdrawReconcileErr(err), processed, err)
			if err != nil {
				log.Printf("[withdraw-reconcile] cycle failed: %v", err)
			}
		}
	}
}

func (s *WalletService) RunWithdrawGatewayReconcileCycle(ctx context.Context, limit int) (int, error) {
	if s == nil || s.walletRepo == nil || s.walletRepo.DB() == nil || !s.withdrawReconcileEnabled {
		return 0, nil
	}
	if limit <= 0 {
		limit = s.withdrawReconcileBatchSize
	}
	if limit <= 0 {
		limit = 50
	}

	records, err := s.listPendingGatewayWithdrawRequests(ctx, limit)
	if err != nil {
		return 0, err
	}

	processed := 0
	errorCount := 0
	var lastErr error

	for i := range records {
		if ctx.Err() != nil {
			return processed, ctx.Err()
		}
		record := records[i]
		transaction, err := s.walletRepo.GetWalletTransactionByID(ctx, record.TransactionID)
		if err != nil {
			errorCount++
			lastErr = fmt.Errorf("load transaction for withdraw %s failed: %w", strings.TrimSpace(record.RequestID), err)
			continue
		}
		if err := s.refreshWithdrawGatewayStatus(ctx, &record, transaction); err != nil {
			errorCount++
			lastErr = fmt.Errorf("refresh withdraw %s failed: %w", strings.TrimSpace(record.RequestID), err)
			continue
		}
		processed++
	}

	retryCandidates, err := s.listFailedGatewayWithdrawRequests(ctx, limit)
	if err != nil {
		return processed, err
	}
	now := time.Now()
	for i := range retryCandidates {
		if ctx.Err() != nil {
			return processed, ctx.Err()
		}
		record := retryCandidates[i]
		transaction, err := s.walletRepo.GetWalletTransactionByID(ctx, record.TransactionID)
		if err != nil {
			errorCount++
			lastErr = fmt.Errorf("load retry transaction for withdraw %s failed: %w", strings.TrimSpace(record.RequestID), err)
			continue
		}
		if !shouldAutoRetryWithdraw(&record, transaction, now) {
			continue
		}
		if !s.isWithdrawPayoutGatewayReady(ctx, record.WithdrawMethod) {
			continue
		}
		if _, err := s.retryWithdrawPayout(ctx, &record, transaction, "system-withdraw-retry-worker", "Withdraw Retry Worker", "自动重试打款"); err != nil {
			errorCount++
			lastErr = fmt.Errorf("auto retry withdraw %s failed: %w", strings.TrimSpace(record.RequestID), err)
			continue
		}
		processed++
	}

	if errorCount > 0 {
		if lastErr == nil {
			lastErr = errors.New("withdraw reconcile cycle failed")
		}
		return processed, fmt.Errorf("%d withdraw reconcile items failed, last error: %w", errorCount, lastErr)
	}
	return processed, nil
}

func (s *WalletService) listPendingGatewayWithdrawRequests(ctx context.Context, limit int) ([]repository.WithdrawRequest, error) {
	records := make([]repository.WithdrawRequest, 0, limit)
	err := s.walletRepo.DB().WithContext(ctx).
		Model(&repository.WithdrawRequest{}).
		Where("status IN ?", []string{"pending_transfer", "transferring"}).
		Where("LOWER(withdraw_method) IN ?", []string{"wechat", "alipay", "bank_card"}).
		Order("updated_at ASC, id ASC").
		Limit(limit).
		Find(&records).Error
	return records, err
}

func (s *WalletService) listFailedGatewayWithdrawRequests(ctx context.Context, limit int) ([]repository.WithdrawRequest, error) {
	records := make([]repository.WithdrawRequest, 0, limit)
	err := s.walletRepo.DB().WithContext(ctx).
		Model(&repository.WithdrawRequest{}).
		Where("status = ?", "failed").
		Where("LOWER(withdraw_method) IN ?", []string{"wechat", "alipay"}).
		Order("updated_at ASC, id ASC").
		Limit(limit).
		Find(&records).Error
	return records, err
}

func (s *WalletService) isWithdrawPayoutGatewayReady(ctx context.Context, withdrawMethod string) bool {
	cfg, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return false
	}
	summary := buildPaymentGatewaySummary(cfg)
	switch normalizeChannel(withdrawMethod) {
	case "wechat":
		wechat, _ := summary["wechat"].(map[string]interface{})
		return toBool(wechat["ready"]) && firstTrimmed(cfg.Wechat.PayoutNotifyURL, cfg.Wechat.NotifyURL) != ""
	case "alipay":
		alipay, _ := summary["alipay"].(map[string]interface{})
		return toBool(alipay["ready"])
	default:
		return false
	}
}

func (s *WalletService) withdrawGatewayPendingCounts(ctx context.Context) (int64, int64, int64, int64) {
	if s == nil || s.walletRepo == nil || s.walletRepo.DB() == nil {
		return 0, 0, 0, 0
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var pendingTransferCount int64
	_ = s.walletRepo.DB().WithContext(ctx).
		Model(&repository.WithdrawRequest{}).
		Where("LOWER(withdraw_method) IN ?", []string{"wechat", "alipay", "bank_card"}).
		Where("status = ?", "pending_transfer").
		Count(&pendingTransferCount).Error

	var transferringCount int64
	_ = s.walletRepo.DB().WithContext(ctx).
		Model(&repository.WithdrawRequest{}).
		Where("LOWER(withdraw_method) IN ?", []string{"wechat", "alipay", "bank_card"}).
		Where("status = ?", "transferring").
		Count(&transferringCount).Error

	var failedRecords []repository.WithdrawRequest
	_ = s.walletRepo.DB().WithContext(ctx).
		Model(&repository.WithdrawRequest{}).
		Where("LOWER(withdraw_method) IN ?", []string{"wechat", "alipay"}).
		Where("status = ?", "failed").
		Find(&failedRecords).Error

	retryPendingCount := int64(0)
	now := time.Now()
	for i := range failedRecords {
		transaction, err := s.walletRepo.GetWalletTransactionByID(ctx, failedRecords[i].TransactionID)
		if err != nil {
			continue
		}
		if shouldAutoRetryWithdraw(&failedRecords[i], transaction, now) {
			retryPendingCount++
		}
	}

	return pendingTransferCount + transferringCount, pendingTransferCount, transferringCount, retryPendingCount
}

func statusForWithdrawReconcileErr(err error) string {
	if err != nil {
		return "error"
	}
	return "ok"
}
