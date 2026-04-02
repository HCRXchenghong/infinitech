package service

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestGetRechargeStatusPrefersClientPayState(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	if err := db.AutoMigrate(&repository.RechargeOrder{}); err != nil {
		t.Fatalf("auto migrate recharge order failed: %v", err)
	}

	tx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("RS", 1),
		TransactionID:     "RECHARGE-TXN-1",
		IdempotencyKey:    "idem-recharge-status-1",
		UserID:            "user-1",
		UserType:          "customer",
		Type:              "recharge",
		BusinessType:      "wallet_recharge",
		BusinessID:        "RECHARGE-ORDER-1",
		Amount:            1200,
		BalanceBefore:     3000,
		BalanceAfter:      3000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-RECHARGE-1",
		Status:            "awaiting_client_pay",
		ResponseData:      `{"status":"awaiting_client_pay","gateway":"alipay"}`,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create recharge transaction failed: %v", err)
	}

	order := &repository.RechargeOrder{
		UnifiedIdentity:   testIdentity("RO", 1),
		OrderID:           "RECHARGE-ORDER-1",
		TransactionID:     tx.TransactionID,
		UserID:            "user-1",
		UserType:          "customer",
		Amount:            1200,
		ActualAmount:      1200,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-RECHARGE-1",
		Status:            "pending",
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("create recharge order failed: %v", err)
	}

	result, err := walletSvc.GetRechargeStatus(context.Background(), "user-1", "customer", "RECHARGE-ORDER-1", "")
	if err != nil {
		t.Fatalf("get recharge status failed: %v", err)
	}

	if got := result["status"]; got != "awaiting_client_pay" {
		t.Fatalf("expected awaiting_client_pay status, got %v", got)
	}
	if got := result["transactionStatus"]; got != "awaiting_client_pay" {
		t.Fatalf("expected awaiting_client_pay transaction status, got %v", got)
	}
	recharge, ok := result["recharge"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected recharge payload map, got %T", result["recharge"])
	}
	if recharge["orderId"] != "RECHARGE-ORDER-1" {
		t.Fatalf("expected recharge order id, got %v", recharge["orderId"])
	}
}

func TestGetWithdrawStatusIncludesBankCardArrivalText(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	tx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WS", 2),
		TransactionID:     "WITHDRAW-TXN-2",
		IdempotencyKey:    "idem-withdraw-status-2",
		UserID:            "merchant-2",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-2",
		Amount:            5000,
		BalanceBefore:     12000,
		BalanceAfter:      7000,
		PaymentMethod:     "bank_card",
		PaymentChannel:    "bank_card",
		ThirdPartyOrderID: "BANKOUT-WITHDRAW-REQ-2",
		Status:            "processing",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 2),
		RequestID:         "WITHDRAW-REQ-2",
		TransactionID:     tx.TransactionID,
		UserID:            "merchant-2",
		UserType:          "merchant",
		Amount:            5000,
		Fee:               50,
		ActualAmount:      4950,
		WithdrawMethod:    "bank_card",
		WithdrawAccount:   "6222000000000000",
		WithdrawName:      "商户测试",
		BankName:          "测试银行",
		BankBranch:        "测试支行",
		Status:            "transferring",
		ThirdPartyOrderID: "BANKOUT-WITHDRAW-REQ-2",
		TransferResult:    "已进入银行卡异步出款队列",
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := walletSvc.GetWithdrawStatus(context.Background(), "merchant-2", "merchant", "WITHDRAW-REQ-2", "")
	if err != nil {
		t.Fatalf("get withdraw status failed: %v", err)
	}

	if got := result["status"]; got != "transferring" {
		t.Fatalf("expected transferring status, got %v", got)
	}
	withdraw, ok := result["withdraw"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected withdraw payload map, got %T", result["withdraw"])
	}
	if withdraw["arrivalText"] != "24小时-48小时" {
		t.Fatalf("expected bank card arrival text, got %v", withdraw["arrivalText"])
	}
}

func TestGetWithdrawStatusIncludesAutoRetryMetadata(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	nextRetryAt := time.Now().Add(5 * time.Minute).UTC().Format(time.RFC3339)
	tx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WS", 22),
		TransactionID:     "WITHDRAW-TXN-22",
		IdempotencyKey:    "idem-withdraw-status-22",
		UserID:            "merchant-22",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-22",
		Amount:            5000,
		BalanceBefore:     12000,
		BalanceAfter:      7000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-PAYOUT-22",
		Status:            "failed",
		ResponseData:      `{"status":"failed","autoRetryEligible":true,"retryCount":1,"maxRetryCount":3,"nextRetryAt":"` + nextRetryAt + `","lastFailureReason":"gateway timeout"}`,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 22),
		RequestID:         "WITHDRAW-REQ-22",
		TransactionID:     tx.TransactionID,
		UserID:            "merchant-22",
		UserType:          "merchant",
		Amount:            5000,
		Fee:               50,
		ActualAmount:      4950,
		WithdrawMethod:    "alipay",
		WithdrawAccount:   "merchant-22@example.com",
		Status:            "failed",
		ThirdPartyOrderID: "ALI-PAYOUT-22",
		TransferResult:    "gateway timeout",
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := walletSvc.GetWithdrawStatus(context.Background(), "merchant-22", "merchant", "WITHDRAW-REQ-22", "")
	if err != nil {
		t.Fatalf("get withdraw status failed: %v", err)
	}

	withdraw, ok := result["withdraw"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected withdraw payload map, got %T", result["withdraw"])
	}
	autoRetry, ok := withdraw["autoRetry"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected autoRetry payload map, got %T", withdraw["autoRetry"])
	}
	if !toBool(autoRetry["eligible"]) {
		t.Fatalf("expected auto retry eligible, got %#v", autoRetry["eligible"])
	}
	if got := toInt(autoRetry["retryCount"]); got != 1 {
		t.Fatalf("expected retryCount 1, got %d", got)
	}
	if got := firstTrimmed(fmt.Sprint(autoRetry["nextRetryAt"])); got == "" {
		t.Fatalf("expected nextRetryAt to be exposed, got %#v", autoRetry)
	}
}

func TestGetTransactionStatusReturnsLinkedWithdrawSummary(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	tx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WT", 3),
		TransactionID:     "WITHDRAW-TXN-3",
		IdempotencyKey:    "idem-withdraw-status-3",
		UserID:            "rider-3",
		UserType:          "rider",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-3",
		Amount:            2600,
		BalanceBefore:     8600,
		BalanceAfter:      6000,
		PaymentMethod:     "wechat",
		PaymentChannel:    "wechat",
		ThirdPartyOrderID: "WX-PAYOUT-3",
		Status:            "processing",
		ResponseData:      `{"status":"transferring","transferResult":"queued"}`,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 3),
		RequestID:         "WITHDRAW-REQ-3",
		TransactionID:     tx.TransactionID,
		UserID:            "rider-3",
		UserType:          "rider",
		Amount:            2600,
		Fee:               20,
		ActualAmount:      2580,
		WithdrawMethod:    "wechat",
		WithdrawAccount:   "openid-rider-3",
		Status:            "transferring",
		ThirdPartyOrderID: "WX-PAYOUT-3",
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := walletSvc.GetTransactionStatus(context.Background(), "rider-3", "rider", "WITHDRAW-TXN-3")
	if err != nil {
		t.Fatalf("get transaction status failed: %v", err)
	}

	if got := result["status"]; got != "transferring" {
		t.Fatalf("expected linked status transferring, got %v", got)
	}
	if got := result["withdrawRequestId"]; got != "WITHDRAW-REQ-3" {
		t.Fatalf("expected withdraw request id, got %v", got)
	}
	withdraw, ok := result["withdraw"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected withdraw payload map, got %T", result["withdraw"])
	}
	if withdraw["transferResult"] != "queued" {
		t.Fatalf("expected queued transfer result, got %v", withdraw["transferResult"])
	}
}

func TestReviewWithdrawRetryPayoutRequeuesFailedRequest(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 4),
		UserID:          "merchant-4",
		UserType:        "merchant",
		Balance:         10000,
		FrozenBalance:   0,
		TotalBalance:    10000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create wallet account failed: %v", err)
	}

	now := time.Now()
	tx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WT", 4),
		TransactionID:     "WITHDRAW-TXN-4",
		IdempotencyKey:    "idem-withdraw-status-4",
		UserID:            "merchant-4",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-4",
		Amount:            5000,
		BalanceBefore:     10000,
		BalanceAfter:      5000,
		PaymentMethod:     "bank_card",
		PaymentChannel:    "bank_card",
		ThirdPartyOrderID: "BANKOUT-OLD-4",
		Status:            "failed",
		CompletedAt:       &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create failed withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 4),
		RequestID:         "WITHDRAW-REQ-4",
		TransactionID:     tx.TransactionID,
		UserID:            "merchant-4",
		UserType:          "merchant",
		Amount:            5000,
		Fee:               50,
		ActualAmount:      4950,
		WithdrawMethod:    "bank_card",
		WithdrawAccount:   "6222000000000004",
		WithdrawName:      "merchant-4",
		BankName:          "test-bank",
		BankBranch:        "test-branch",
		Status:            "failed",
		ThirdPartyOrderID: "BANKOUT-OLD-4",
		TransferResult:    "old failed",
		CompletedAt:       &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create failed withdraw request failed: %v", err)
	}

	result, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:    "WITHDRAW-REQ-4",
		Action:       "retry_payout",
		ReviewerID:   "admin-1",
		ReviewerName: "Admin",
		Remark:       "retry payout",
	}, AdminWalletActor{})
	if err != nil {
		t.Fatalf("retry payout failed: %v", err)
	}
	if got := result["status"]; got != "transferring" {
		t.Fatalf("expected transferring status after retry, got %v", got)
	}

	var latestAccount repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "merchant-4", "merchant").First(&latestAccount).Error; err != nil {
		t.Fatalf("reload wallet account failed: %v", err)
	}
	if latestAccount.Balance != 5000 || latestAccount.FrozenBalance != 5000 {
		t.Fatalf("expected balance/frozen to be re-frozen, got balance=%d frozen=%d", latestAccount.Balance, latestAccount.FrozenBalance)
	}

	var latestRecord repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-4").First(&latestRecord).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRecord.Status != "transferring" {
		t.Fatalf("expected withdraw request status transferring, got %s", latestRecord.Status)
	}
	if latestRecord.ThirdPartyOrderID == "" {
		t.Fatal("expected retry payout to submit a new third party order id")
	}

	var latestTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", "WITHDRAW-TXN-4").First(&latestTx).Error; err != nil {
		t.Fatalf("reload withdraw transaction failed: %v", err)
	}
	if latestTx.Status != "processing" {
		t.Fatalf("expected wallet transaction processing after retry, got %s", latestTx.Status)
	}
	if latestTx.ResponseData == "" {
		t.Fatal("expected wallet transaction response data to be updated")
	}
}

func TestReviewWithdrawExecuteFailedPayoutRestoresBalanceAndSchedulesRetry(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	sidecar := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"status":"failed","gateway":"alipay","integrationTarget":"official-sidecar-sdk","thirdPartyOrderId":"ALI-EXEC-FAIL-23","transferResult":"gateway rejected","responseData":{"status":"failed","gateway":"alipay","transferResult":"gateway rejected"}}`))
	}))
	defer sidecar.Close()

	t.Setenv("ALIPAY_APP_ID", "app-test")
	t.Setenv("ALIPAY_PRIVATE_KEY", "private-key")
	t.Setenv("ALIPAY_PUBLIC_KEY", "public-key")
	t.Setenv("ALIPAY_NOTIFY_URL", "https://example.com/alipay/notify")
	t.Setenv("ALIPAY_PAYOUT_NOTIFY_URL", "https://example.com/alipay/payout-notify")
	t.Setenv("ALIPAY_SIDECAR_URL", sidecar.URL)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 23),
		UserID:          "merchant-23",
		UserType:        "merchant",
		Balance:         7000,
		FrozenBalance:   5000,
		TotalBalance:    12000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create wallet account failed: %v", err)
	}

	now := time.Now()
	tx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 23),
		TransactionID:   "WITHDRAW-TXN-23",
		IdempotencyKey:  "idem-withdraw-status-23",
		UserID:          "merchant-23",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-23",
		Amount:          5000,
		BalanceBefore:   12000,
		BalanceAfter:    7000,
		PaymentMethod:   "alipay",
		PaymentChannel:  "alipay",
		Status:          "processing",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 23),
		RequestID:       "WITHDRAW-REQ-23",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-23",
		UserType:        "merchant",
		Amount:          5000,
		Fee:             50,
		ActualAmount:    4950,
		WithdrawMethod:  "alipay",
		WithdrawAccount: "merchant-23@example.com",
		Status:          "pending_transfer",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:    "WITHDRAW-REQ-23",
		Action:       "execute",
		ReviewerID:   "admin-1",
		ReviewerName: "Admin",
		Remark:       "execute payout",
	}, AdminWalletActor{})
	if err != nil {
		t.Fatalf("execute withdraw payout failed: %v", err)
	}
	if got := result["status"]; got != "failed" {
		t.Fatalf("expected failed status after gateway rejection, got %v", got)
	}

	var latestAccount repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "merchant-23", "merchant").First(&latestAccount).Error; err != nil {
		t.Fatalf("reload wallet account failed: %v", err)
	}
	if latestAccount.Balance != 12000 || latestAccount.FrozenBalance != 0 {
		t.Fatalf("expected failed execute to restore frozen balance, got balance=%d frozen=%d", latestAccount.Balance, latestAccount.FrozenBalance)
	}

	var latestRecord repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-23").First(&latestRecord).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRecord.Status != "failed" {
		t.Fatalf("expected withdraw request failed, got %s", latestRecord.Status)
	}
	if latestRecord.ThirdPartyOrderID != "ALI-EXEC-FAIL-23" {
		t.Fatalf("expected failed execute to persist third party order id, got %q", latestRecord.ThirdPartyOrderID)
	}

	var latestTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", "WITHDRAW-TXN-23").First(&latestTx).Error; err != nil {
		t.Fatalf("reload wallet transaction failed: %v", err)
	}
	if latestTx.Status != "failed" {
		t.Fatalf("expected wallet transaction failed, got %s", latestTx.Status)
	}
	payload, ok := parseWalletResponsePayload(latestTx.ResponseData).(map[string]interface{})
	if !ok {
		t.Fatalf("expected response data payload map, got %T", parseWalletResponsePayload(latestTx.ResponseData))
	}
	if !toBool(payload["autoRetryEligible"]) {
		t.Fatalf("expected auto retry metadata on failed execute, got %#v", payload)
	}
	if nextRetryAt := firstTrimmed(fmt.Sprint(payload["nextRetryAt"])); nextRetryAt == "" {
		t.Fatalf("expected nextRetryAt to be scheduled after failed execute, got %#v", payload)
	}
}

func TestReviewWithdrawSupplementSuccessCompletesBankCardWithdraw(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 14),
		UserID:          "merchant-14",
		UserType:        "merchant",
		Balance:         7000,
		FrozenBalance:   5000,
		TotalBalance:    12000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create wallet account failed: %v", err)
	}

	now := time.Now()
	tx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 14),
		TransactionID:   "WITHDRAW-TXN-14",
		IdempotencyKey:  "idem-withdraw-status-14",
		UserID:          "merchant-14",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-14",
		Amount:          5000,
		BalanceBefore:   12000,
		BalanceAfter:    7000,
		PaymentMethod:   "bank_card",
		PaymentChannel:  "bank_card",
		Status:          "processing",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 14),
		RequestID:       "WITHDRAW-REQ-14",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-14",
		UserType:        "merchant",
		Amount:          5000,
		Fee:             50,
		ActualAmount:    4950,
		WithdrawMethod:  "bank_card",
		WithdrawAccount: "6222000000000014",
		WithdrawName:    "merchant-14",
		BankName:        "test-bank",
		BankBranch:      "test-branch",
		Status:          "pending_transfer",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:         "WITHDRAW-REQ-14",
		Action:            "supplement_success",
		ReviewerID:        "admin-1",
		ReviewerName:      "Admin",
		Remark:            "manual supplement success",
		ThirdPartyOrderID: "BANKOUT-SUPPLEMENT-14",
		TransferResult:    "manual supplement success",
	}, AdminWalletActor{})
	if err != nil {
		t.Fatalf("supplement success failed: %v", err)
	}
	if got := result["status"]; got != "success" {
		t.Fatalf("expected success status after supplement, got %v", got)
	}
	if got := result["transactionStatus"]; got != "success" {
		t.Fatalf("expected transaction success after supplement, got %v", got)
	}

	var latestAccount repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "merchant-14", "merchant").First(&latestAccount).Error; err != nil {
		t.Fatalf("reload wallet account failed: %v", err)
	}
	if latestAccount.Balance != 7000 || latestAccount.FrozenBalance != 0 {
		t.Fatalf("expected frozen balance cleared after supplement, got balance=%d frozen=%d", latestAccount.Balance, latestAccount.FrozenBalance)
	}

	var latestRecord repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-14").First(&latestRecord).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRecord.Status != "success" {
		t.Fatalf("expected withdraw request success, got %s", latestRecord.Status)
	}
	if latestRecord.ThirdPartyOrderID != "BANKOUT-SUPPLEMENT-14" {
		t.Fatalf("expected supplemented third party order id, got %s", latestRecord.ThirdPartyOrderID)
	}

	var latestTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", "WITHDRAW-TXN-14").First(&latestTx).Error; err != nil {
		t.Fatalf("reload withdraw transaction failed: %v", err)
	}
	if latestTx.Status != "success" {
		t.Fatalf("expected wallet transaction success, got %s", latestTx.Status)
	}

	var callbackCount int64
	if err := db.Model(&repository.PaymentCallback{}).
		Where("channel = ? AND (transaction_id = ? OR transaction_id_raw = ?)", "bank_card", "WITHDRAW-TXN-14", "WITHDRAW-TXN-14").
		Count(&callbackCount).Error; err != nil {
		t.Fatalf("count payment callbacks failed: %v", err)
	}
	if callbackCount != 1 {
		t.Fatalf("expected one supplement callback record, got %d", callbackCount)
	}
}

func TestReviewWithdrawCompleteBankCardRequiresManualPayoutDetails(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 15),
		UserID:          "merchant-15",
		UserType:        "merchant",
		Balance:         7000,
		FrozenBalance:   5000,
		TotalBalance:    12000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create wallet account failed: %v", err)
	}

	now := time.Now()
	tx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 15),
		TransactionID:   "WITHDRAW-TXN-15",
		IdempotencyKey:  "idem-withdraw-status-15",
		UserID:          "merchant-15",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-15",
		Amount:          5000,
		BalanceBefore:   12000,
		BalanceAfter:    7000,
		PaymentMethod:   "bank_card",
		PaymentChannel:  "bank_card",
		Status:          "processing",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 15),
		RequestID:       "WITHDRAW-REQ-15",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-15",
		UserType:        "merchant",
		Amount:          5000,
		Fee:             50,
		ActualAmount:    4950,
		WithdrawMethod:  "bank_card",
		WithdrawAccount: "6222000000000015",
		WithdrawName:    "merchant-15",
		BankName:        "test-bank",
		BankBranch:      "test-branch",
		Status:          "pending_transfer",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	_, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:    "WITHDRAW-REQ-15",
		Action:       "complete",
		ReviewerID:   "admin-1",
		ReviewerName: "Admin",
		Remark:       "manual payout complete",
	}, AdminWalletActor{})
	if err == nil {
		t.Fatal("expected missing bank-card payout details to be rejected")
	}
	if got := err.Error(); got == "" || !strings.Contains(got, "payoutVoucherUrl") {
		t.Fatalf("expected payoutVoucherUrl validation error, got %v", err)
	}
}

func TestReviewWithdrawRejectRestoresFrozenAmountAndStoresRejectReason(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 16),
		UserID:          "merchant-16",
		UserType:        "merchant",
		Balance:         7000,
		FrozenBalance:   5000,
		TotalBalance:    12000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create wallet account failed: %v", err)
	}

	now := time.Now()
	tx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 16),
		TransactionID:   "WITHDRAW-TXN-16",
		IdempotencyKey:  "idem-withdraw-status-16",
		UserID:          "merchant-16",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-16",
		Amount:          5000,
		BalanceBefore:   12000,
		BalanceAfter:    7000,
		PaymentMethod:   "bank_card",
		PaymentChannel:  "bank_card",
		Status:          "pending_review",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 16),
		RequestID:       "WITHDRAW-REQ-16",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-16",
		UserType:        "merchant",
		Amount:          5000,
		Fee:             50,
		ActualAmount:    4950,
		WithdrawMethod:  "bank_card",
		WithdrawAccount: "6222000000000016",
		WithdrawName:    "merchant-16",
		BankName:        "test-bank",
		BankBranch:      "test-branch",
		Status:          "pending_review",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	_, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:    "WITHDRAW-REQ-16",
		Action:       "reject",
		ReviewerID:   "admin-1",
		ReviewerName: "Admin",
		RejectReason: "bank info mismatch",
		Remark:       "bank info mismatch",
	}, AdminWalletActor{})
	if err != nil {
		t.Fatalf("reject withdraw failed: %v", err)
	}

	var latestAccount repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "merchant-16", "merchant").First(&latestAccount).Error; err != nil {
		t.Fatalf("reload wallet account failed: %v", err)
	}
	if latestAccount.Balance != 12000 || latestAccount.FrozenBalance != 0 {
		t.Fatalf("expected rejected withdraw to restore frozen amount, got balance=%d frozen=%d", latestAccount.Balance, latestAccount.FrozenBalance)
	}

	var latestRecord repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-16").First(&latestRecord).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRecord.Status != "rejected" {
		t.Fatalf("expected withdraw request rejected, got %s", latestRecord.Status)
	}
	if latestRecord.RejectReason != "bank info mismatch" {
		t.Fatalf("expected reject reason to be saved, got %q", latestRecord.RejectReason)
	}
}

func TestReviewWithdrawCompleteBankCardStoresManualPayoutDetails(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 17),
		UserID:          "merchant-17",
		UserType:        "merchant",
		Balance:         7000,
		FrozenBalance:   5000,
		TotalBalance:    12000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create wallet account failed: %v", err)
	}

	now := time.Now()
	tx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 17),
		TransactionID:   "WITHDRAW-TXN-17",
		IdempotencyKey:  "idem-withdraw-status-17",
		UserID:          "merchant-17",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-17",
		Amount:          5000,
		BalanceBefore:   12000,
		BalanceAfter:    7000,
		PaymentMethod:   "bank_card",
		PaymentChannel:  "bank_card",
		Status:          "processing",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 17),
		RequestID:       "WITHDRAW-REQ-17",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-17",
		UserType:        "merchant",
		Amount:          5000,
		Fee:             50,
		ActualAmount:    4950,
		WithdrawMethod:  "bank_card",
		WithdrawAccount: "6222000000000017",
		WithdrawName:    "merchant-17",
		BankName:        "test-bank",
		BankBranch:      "test-branch",
		Status:          "pending_transfer",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	_, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:               "WITHDRAW-REQ-17",
		Action:                  "complete",
		ReviewerID:              "admin-1",
		ReviewerName:            "Admin",
		Remark:                  "manual bank payout complete",
		TransferResult:          "manual bank payout complete",
		ThirdPartyOrderID:       "BANK-MANUAL-17",
		PayoutVoucherURL:        "https://example.com/voucher-17.png",
		PayoutReferenceNo:       "BANKREF-17",
		PayoutSourceBankName:    "中国工商银行",
		PayoutSourceBankBranch:  "上海市黄浦支行",
		PayoutSourceCardNo:      "6222000000000017",
		PayoutSourceAccountName: "平台财务账户",
	}, AdminWalletActor{})
	if err != nil {
		t.Fatalf("complete withdraw failed: %v", err)
	}

	var latestAccount repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "merchant-17", "merchant").First(&latestAccount).Error; err != nil {
		t.Fatalf("reload wallet account failed: %v", err)
	}
	if latestAccount.Balance != 7000 || latestAccount.FrozenBalance != 0 {
		t.Fatalf("expected manual complete to clear frozen balance, got balance=%d frozen=%d", latestAccount.Balance, latestAccount.FrozenBalance)
	}

	var latestRecord repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-17").First(&latestRecord).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRecord.Status != "success" {
		t.Fatalf("expected withdraw request success, got %s", latestRecord.Status)
	}
	if latestRecord.PayoutVoucherURL != "https://example.com/voucher-17.png" {
		t.Fatalf("expected payout voucher url to be saved, got %q", latestRecord.PayoutVoucherURL)
	}
	if latestRecord.PayoutReferenceNo != "BANKREF-17" {
		t.Fatalf("expected payout reference no to be saved, got %q", latestRecord.PayoutReferenceNo)
	}
	if latestRecord.PayoutSourceBankName != "中国工商银行" {
		t.Fatalf("expected payout source bank name to be saved, got %q", latestRecord.PayoutSourceBankName)
	}
	if latestRecord.PayoutSourceBankBranch != "上海市黄浦支行" {
		t.Fatalf("expected payout source bank branch to be saved, got %q", latestRecord.PayoutSourceBankBranch)
	}
	if latestRecord.PayoutSourceCardNo != "6222000000000017" {
		t.Fatalf("expected payout source card no to be saved, got %q", latestRecord.PayoutSourceCardNo)
	}
	if latestRecord.PayoutSourceAccountName != "平台财务账户" {
		t.Fatalf("expected payout source account name to be saved, got %q", latestRecord.PayoutSourceAccountName)
	}
}

func TestRunWithdrawGatewayReconcileCycleNoPendingRequests(t *testing.T) {
	_, walletSvc, _ := newPaymentAndWalletServicesForTest(t)

	processed, err := walletSvc.RunWithdrawGatewayReconcileCycle(context.Background(), 20)
	if err != nil {
		t.Fatalf("run withdraw reconcile cycle failed: %v", err)
	}
	if processed != 0 {
		t.Fatalf("expected zero processed records, got %d", processed)
	}
}

func TestWithdrawGatewayReconcileStatusSnapshotCountsGatewayRequestsOnly(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	records := []repository.WithdrawRequest{
		{
			UnifiedIdentity: testIdentity("WR", 11),
			RequestID:       "WITHDRAW-REQ-WX-11",
			UserID:          "rider-11",
			UserType:        "rider",
			Amount:          1200,
			ActualAmount:    1180,
			WithdrawMethod:  "wechat",
			WithdrawAccount: "openid-rider-11",
			Status:          "pending_transfer",
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			UnifiedIdentity: testIdentity("WR", 12),
			RequestID:       "WITHDRAW-REQ-ALI-12",
			UserID:          "merchant-12",
			UserType:        "merchant",
			Amount:          2200,
			ActualAmount:    2160,
			WithdrawMethod:  "alipay",
			WithdrawAccount: "merchant-12@alipay",
			Status:          "transferring",
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		{
			UnifiedIdentity: testIdentity("WR", 13),
			RequestID:       "WITHDRAW-REQ-BANK-13",
			UserID:          "merchant-13",
			UserType:        "merchant",
			Amount:          3200,
			ActualAmount:    3150,
			WithdrawMethod:  "bank_card",
			WithdrawAccount: "6222000000000013",
			Status:          "transferring",
			CreatedAt:       now,
			UpdatedAt:       now,
		},
	}
	for _, record := range records {
		recordCopy := record
		if err := db.Create(&recordCopy).Error; err != nil {
			t.Fatalf("create withdraw request failed: %v", err)
		}
	}

	snapshot := walletSvc.WithdrawGatewayReconcileStatusSnapshot(context.Background())
	if !snapshot.Enabled {
		t.Fatal("expected reconcile worker to be enabled")
	}
	if snapshot.PendingTotal != 3 {
		t.Fatalf("expected 3 gateway pending requests, got %d", snapshot.PendingTotal)
	}
	if snapshot.PendingTransferCount != 1 {
		t.Fatalf("expected 1 gateway pending_transfer request, got %d", snapshot.PendingTransferCount)
	}
	if snapshot.TransferringCount != 2 {
		t.Fatalf("expected 2 gateway transferring requests, got %d", snapshot.TransferringCount)
	}
	if snapshot.RetryPendingCount != 0 {
		t.Fatalf("expected retry pending count 0, got %d", snapshot.RetryPendingCount)
	}
	if snapshot.LastCycleStatus != "not_started" {
		t.Fatalf("expected not_started cycle status, got %q", snapshot.LastCycleStatus)
	}
}

func TestWithdrawGatewayReconcileStatusSnapshotCountsRetryPendingFailedRequests(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	nextRetryAt := now.Add(-2 * time.Minute).Format(time.RFC3339)
	tx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 802),
		TransactionID:   "WITHDRAW-TXN-802",
		IdempotencyKey:  "idem-withdraw-status-802",
		UserID:          "merchant-802",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-802",
		Amount:          1600,
		BalanceBefore:   6600,
		BalanceAfter:    5000,
		PaymentMethod:   "alipay",
		PaymentChannel:  "alipay",
		Status:          "failed",
		ResponseData:    `{"status":"failed","autoRetryEligible":true,"retryCount":1,"maxRetryCount":3,"nextRetryAt":"` + nextRetryAt + `","lastFailureReason":"gateway busy"}`,
		CreatedAt:       now,
		UpdatedAt:       now,
		CompletedAt:     &now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create failed withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 802),
		RequestID:       "WITHDRAW-REQ-802",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-802",
		UserType:        "merchant",
		Amount:          1600,
		Fee:             16,
		ActualAmount:    1584,
		WithdrawMethod:  "alipay",
		WithdrawAccount: "merchant-802@example.com",
		Status:          "failed",
		TransferResult:  "gateway busy",
		CreatedAt:       now,
		UpdatedAt:       now,
		CompletedAt:     &now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create failed withdraw request failed: %v", err)
	}

	snapshot := walletSvc.WithdrawGatewayReconcileStatusSnapshot(context.Background())
	if snapshot.RetryPendingCount != 1 {
		t.Fatalf("expected retry pending count 1, got %d", snapshot.RetryPendingCount)
	}
}

func TestRunWithdrawGatewayReconcileCycleAutoRetriesDueFailedAlipayWithdraw(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	sidecar := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"status":"transferring","gateway":"alipay","integrationTarget":"official-sidecar-sdk","thirdPartyOrderId":"ALI-RETRY-801","transferResult":"alipay payout retry submitted","responseData":{"status":"transferring","gateway":"alipay","integrationTarget":"official-sidecar-sdk"}}`))
	}))
	defer sidecar.Close()

	t.Setenv("ALIPAY_APP_ID", "app-test")
	t.Setenv("ALIPAY_PRIVATE_KEY", "private-key")
	t.Setenv("ALIPAY_PUBLIC_KEY", "public-key")
	t.Setenv("ALIPAY_NOTIFY_URL", "https://example.com/alipay/notify")
	t.Setenv("ALIPAY_PAYOUT_NOTIFY_URL", "https://example.com/alipay/payout-notify")
	t.Setenv("ALIPAY_SIDECAR_URL", sidecar.URL)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 801),
		UserID:          "merchant-801",
		UserType:        "merchant",
		Balance:         5000,
		FrozenBalance:   0,
		TotalBalance:    5000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create wallet account failed: %v", err)
	}

	now := time.Now()
	nextRetryAt := now.Add(-time.Minute).Format(time.RFC3339)
	tx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WT", 801),
		TransactionID:     "WITHDRAW-TXN-801",
		IdempotencyKey:    "idem-withdraw-status-801",
		UserID:            "merchant-801",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-801",
		Amount:            2000,
		BalanceBefore:     7000,
		BalanceAfter:      5000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-PAYOUT-FAILED-801",
		Status:            "failed",
		ResponseData:      `{"status":"failed","autoRetryEligible":true,"retryCount":0,"maxRetryCount":3,"nextRetryAt":"` + nextRetryAt + `","lastFailureReason":"first fail"}`,
		CreatedAt:         now,
		UpdatedAt:         now,
		CompletedAt:       &now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create failed withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 801),
		RequestID:         "WITHDRAW-REQ-801",
		TransactionID:     tx.TransactionID,
		UserID:            "merchant-801",
		UserType:          "merchant",
		Amount:            2000,
		Fee:               20,
		ActualAmount:      1980,
		WithdrawMethod:    "alipay",
		WithdrawAccount:   "merchant-801@example.com",
		Status:            "failed",
		ThirdPartyOrderID: "ALI-PAYOUT-FAILED-801",
		TransferResult:    "first fail",
		CreatedAt:         now,
		UpdatedAt:         now,
		CompletedAt:       &now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create failed withdraw request failed: %v", err)
	}

	snapshot := walletSvc.WithdrawGatewayReconcileStatusSnapshot(context.Background())
	if snapshot.RetryPendingCount != 1 {
		t.Fatalf("expected retry pending count 1 before auto retry cycle, got %d", snapshot.RetryPendingCount)
	}
	if !walletSvc.isWithdrawPayoutGatewayReady(context.Background(), "alipay") {
		t.Fatal("expected alipay payout gateway to be ready for auto retry")
	}

	processed, err := walletSvc.RunWithdrawGatewayReconcileCycle(context.Background(), 20)
	if err != nil {
		t.Fatalf("run withdraw reconcile cycle failed: %v", err)
	}
	if processed != 1 {
		t.Fatalf("expected 1 auto-retried withdraw, got %d", processed)
	}

	var latestAccount repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "merchant-801", "merchant").First(&latestAccount).Error; err != nil {
		t.Fatalf("reload wallet account failed: %v", err)
	}
	if latestAccount.Balance != 3000 || latestAccount.FrozenBalance != 2000 {
		t.Fatalf("expected auto retry to re-freeze balance, got balance=%d frozen=%d", latestAccount.Balance, latestAccount.FrozenBalance)
	}

	var latestRecord repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-801").First(&latestRecord).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRecord.Status != "transferring" {
		t.Fatalf("expected withdraw request transferring after auto retry, got %s", latestRecord.Status)
	}
	if latestRecord.ThirdPartyOrderID != "ALI-RETRY-801" {
		t.Fatalf("expected refreshed third party order id, got %q", latestRecord.ThirdPartyOrderID)
	}

	var latestTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", "WITHDRAW-TXN-801").First(&latestTx).Error; err != nil {
		t.Fatalf("reload wallet transaction failed: %v", err)
	}
	if latestTx.Status != "processing" {
		t.Fatalf("expected wallet transaction processing after auto retry, got %s", latestTx.Status)
	}
	payload, ok := parseWalletResponsePayload(latestTx.ResponseData).(map[string]interface{})
	if !ok {
		t.Fatalf("expected response data payload map, got %T", parseWalletResponsePayload(latestTx.ResponseData))
	}
	if got := toInt(payload["retryCount"]); got != 1 {
		t.Fatalf("expected retryCount 1 after auto retry, got %d", got)
	}
	if next := firstTrimmed(fmt.Sprint(payload["nextRetryAt"])); next != "" {
		t.Fatalf("expected nextRetryAt cleared after retry submission, got %q", next)
	}
}
