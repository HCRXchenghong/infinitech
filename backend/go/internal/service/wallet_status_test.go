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

func TestListWithdrawRecordsIncludesEnhancedAutoRetryAndGatewaySubmission(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	nextRetryAt := now.Add(10 * time.Minute).UTC().Format(time.RFC3339)
	records := []struct {
		tx     *repository.WalletTransaction
		record *repository.WithdrawRequest
	}{
		{
			tx: &repository.WalletTransaction{
				UnifiedIdentity:   testIdentity("WT", 223),
				TransactionID:     "WITHDRAW-TXN-223",
				IdempotencyKey:    "idem-withdraw-status-223",
				UserID:            "merchant-223",
				UserType:          "merchant",
				Type:              "withdraw",
				BusinessType:      "withdraw_request",
				BusinessID:        "WITHDRAW-REQ-223",
				Amount:            5000,
				BalanceBefore:     12000,
				BalanceAfter:      7000,
				PaymentMethod:     "alipay",
				PaymentChannel:    "alipay",
				ThirdPartyOrderID: "ALI-PAYOUT-223",
				Status:            "failed",
				ResponseData:      `{"status":"failed","autoRetryEligible":true,"retryCount":1,"maxRetryCount":3,"nextRetryAt":"` + nextRetryAt + `","lastFailureReason":"gateway timeout"}`,
				CreatedAt:         now.Add(2 * time.Minute),
				UpdatedAt:         now.Add(2 * time.Minute),
			},
			record: &repository.WithdrawRequest{
				UnifiedIdentity:   testIdentity("WR", 223),
				RequestID:         "WITHDRAW-REQ-223",
				TransactionID:     "WITHDRAW-TXN-223",
				UserID:            "merchant-223",
				UserType:          "merchant",
				Amount:            5000,
				Fee:               50,
				ActualAmount:      4950,
				WithdrawMethod:    "alipay",
				WithdrawAccount:   "merchant-223@example.com",
				Status:            "failed",
				ThirdPartyOrderID: "ALI-PAYOUT-223",
				TransferResult:    "gateway timeout",
				CreatedAt:         now.Add(2 * time.Minute),
				UpdatedAt:         now.Add(2 * time.Minute),
			},
		},
		{
			tx: &repository.WalletTransaction{
				UnifiedIdentity: testIdentity("WT", 224),
				TransactionID:   "WITHDRAW-TXN-224",
				IdempotencyKey:  "idem-withdraw-status-224",
				UserID:          "merchant-224",
				UserType:        "merchant",
				Type:            "withdraw",
				BusinessType:    "withdraw_request",
				BusinessID:      "WITHDRAW-REQ-224",
				Amount:          2600,
				BalanceBefore:   7600,
				BalanceAfter:    5000,
				PaymentMethod:   "alipay",
				PaymentChannel:  "alipay",
				Status:          "processing",
				ResponseData:    `{"status":"pending_transfer","gateway":"alipay","integrationTarget":"official-sidecar-sdk","submittedAt":"` + now.UTC().Format(time.RFC3339) + `"}`,
				CreatedAt:       now.Add(time.Minute),
				UpdatedAt:       now.Add(time.Minute),
			},
			record: &repository.WithdrawRequest{
				UnifiedIdentity: testIdentity("WR", 224),
				RequestID:       "WITHDRAW-REQ-224",
				TransactionID:   "WITHDRAW-TXN-224",
				UserID:          "merchant-224",
				UserType:        "merchant",
				Amount:          2600,
				Fee:             26,
				ActualAmount:    2574,
				WithdrawMethod:  "alipay",
				WithdrawAccount: "merchant-224@example.com",
				Status:          "pending_transfer",
				CreatedAt:       now.Add(time.Minute),
				UpdatedAt:       now.Add(time.Minute),
			},
		},
		{
			tx: &repository.WalletTransaction{
				UnifiedIdentity: testIdentity("WT", 225),
				TransactionID:   "WITHDRAW-TXN-225",
				IdempotencyKey:  "idem-withdraw-status-225",
				UserID:          "merchant-225",
				UserType:        "merchant",
				Type:            "withdraw",
				BusinessType:    "withdraw_request",
				BusinessID:      "WITHDRAW-REQ-225",
				Amount:          1800,
				BalanceBefore:   6800,
				BalanceAfter:    5000,
				PaymentMethod:   "alipay",
				PaymentChannel:  "alipay",
				Status:          "processing",
				ResponseData:    `{"status":"pending_transfer","reviewerId":"admin-225"}`,
				CreatedAt:       now,
				UpdatedAt:       now,
			},
			record: &repository.WithdrawRequest{
				UnifiedIdentity: testIdentity("WR", 225),
				RequestID:       "WITHDRAW-REQ-225",
				TransactionID:   "WITHDRAW-TXN-225",
				UserID:          "merchant-225",
				UserType:        "merchant",
				Amount:          1800,
				Fee:             18,
				ActualAmount:    1782,
				WithdrawMethod:  "alipay",
				WithdrawAccount: "merchant-225@example.com",
				Status:          "pending_transfer",
				CreatedAt:       now,
				UpdatedAt:       now,
			},
		},
		{
			tx: &repository.WalletTransaction{
				UnifiedIdentity:   testIdentity("WT", 226),
				TransactionID:     "WITHDRAW-TXN-226",
				IdempotencyKey:    "idem-withdraw-status-226",
				UserID:            "merchant-226",
				UserType:          "merchant",
				Type:              "withdraw",
				BusinessType:      "withdraw_request",
				BusinessID:        "WITHDRAW-REQ-226",
				Amount:            3200,
				BalanceBefore:     9000,
				BalanceAfter:      5800,
				PaymentMethod:     "alipay",
				PaymentChannel:    "alipay",
				ThirdPartyOrderID: "ALI-PAYOUT-226",
				Status:            "processing",
				ResponseData:      `{"status":"pending_transfer","gateway":"alipay","submittedAt":"` + now.Add(3*time.Minute).UTC().Format(time.RFC3339) + `"}`,
				CreatedAt:         now.Add(-time.Minute),
				UpdatedAt:         now.Add(-time.Minute),
			},
			record: &repository.WithdrawRequest{
				UnifiedIdentity: testIdentity("WR", 226),
				RequestID:       "WITHDRAW-REQ-226",
				UserID:          "merchant-226",
				UserType:        "merchant",
				Amount:          3200,
				Fee:             32,
				ActualAmount:    3168,
				WithdrawMethod:  "alipay",
				WithdrawAccount: "merchant-226@example.com",
				Status:          "pending_transfer",
				CreatedAt:       now.Add(-time.Minute),
				UpdatedAt:       now.Add(-time.Minute),
			},
		},
	}
	for _, item := range records {
		if err := db.Create(item.tx).Error; err != nil {
			t.Fatalf("create withdraw transaction failed: %v", err)
		}
		if err := db.Create(item.record).Error; err != nil {
			t.Fatalf("create withdraw request failed: %v", err)
		}
	}

	result, err := walletSvc.ListWithdrawRecords(context.Background(), "", "", "", 1, 20)
	if err != nil {
		t.Fatalf("list withdraw records failed: %v", err)
	}

	items, ok := result["records"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected withdraw record items slice, got %T", result["records"])
	}
	indexed := map[string]map[string]interface{}{}
	for _, item := range items {
		indexed[firstTrimmed(fmt.Sprint(item["request_id"]))] = item
	}

	failedItem := indexed["WITHDRAW-REQ-223"]
	if failedItem == nil {
		t.Fatal("expected failed withdraw record in list")
	}
	autoRetry, ok := failedItem["auto_retry"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected auto_retry payload map, got %T", failedItem["auto_retry"])
	}
	if !toBool(autoRetry["eligible"]) {
		t.Fatalf("expected auto retry metadata on withdraw list item, got %#v", autoRetry)
	}
	if got := firstTrimmed(fmt.Sprint(failedItem["transaction_status"])); got != "failed" {
		t.Fatalf("expected transaction_status failed, got %q", got)
	}

	submittedItem := indexed["WITHDRAW-REQ-224"]
	if submittedItem == nil {
		t.Fatal("expected submitted pending_transfer record in list")
	}
	if !toBool(submittedItem["gateway_submitted"]) {
		t.Fatalf("expected submitted pending_transfer to expose gateway_submitted=true, got %#v", submittedItem["gateway_submitted"])
	}
	if got := firstTrimmed(fmt.Sprint(submittedItem["arrival_text"])); got == "" {
		t.Fatalf("expected arrival_text to be exposed, got %q", got)
	}
	responseData, ok := submittedItem["response_data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected response_data payload map, got %T", submittedItem["response_data"])
	}
	if got := firstTrimmed(fmt.Sprint(responseData["submittedAt"])); got == "" {
		t.Fatalf("expected submittedAt in response_data, got %#v", responseData)
	}

	unsubmittedItem := indexed["WITHDRAW-REQ-225"]
	if unsubmittedItem == nil {
		t.Fatal("expected unsubmitted pending_transfer record in list")
	}
	if toBool(unsubmittedItem["gateway_submitted"]) {
		t.Fatalf("expected unsubmitted pending_transfer to expose gateway_submitted=false, got %#v", unsubmittedItem["gateway_submitted"])
	}

	historyItem := indexed["WITHDRAW-REQ-226"]
	if historyItem == nil {
		t.Fatal("expected historical withdraw record in list")
	}
	if got := firstTrimmed(fmt.Sprint(historyItem["transaction_status"])); got != "processing" {
		t.Fatalf("expected historical withdraw record to resolve transaction_status processing, got %q", got)
	}
	if got := firstTrimmed(fmt.Sprint(historyItem["third_party_order_id"])); got != "ALI-PAYOUT-226" {
		t.Fatalf("expected historical withdraw record to resolve third_party_order_id, got %q", got)
	}
	if !toBool(historyItem["gateway_submitted"]) {
		t.Fatalf("expected historical withdraw record to expose gateway_submitted=true, got %#v", historyItem["gateway_submitted"])
	}
	historyResponseData, ok := historyItem["response_data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected historical withdraw response_data payload map, got %T", historyItem["response_data"])
	}
	if got := firstTrimmed(fmt.Sprint(historyResponseData["submittedAt"])); got == "" {
		t.Fatalf("expected historical withdraw record to expose submittedAt, got %#v", historyResponseData)
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
	if latestTx.ThirdPartyOrderID != "ALI-EXEC-FAIL-23" {
		t.Fatalf("expected wallet transaction to persist third party order id after execute failure, got %q", latestTx.ThirdPartyOrderID)
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

func TestReviewWithdrawExecutePersistsGatewayReferenceOnTransaction(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	sidecar := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"status":"transferring","gateway":"alipay","integrationTarget":"official-sidecar-sdk","thirdPartyOrderId":"ALI-EXEC-REF-24","transferResult":"alipay payout submitted","responseData":{"status":"transferring","gateway":"alipay","integrationTarget":"official-sidecar-sdk","thirdPartyOrderId":"ALI-EXEC-REF-24"}}`))
	}))
	defer sidecar.Close()

	t.Setenv("ALIPAY_APP_ID", "app-test")
	t.Setenv("ALIPAY_PRIVATE_KEY", "private-key")
	t.Setenv("ALIPAY_PUBLIC_KEY", "public-key")
	t.Setenv("ALIPAY_NOTIFY_URL", "https://example.com/alipay/notify")
	t.Setenv("ALIPAY_PAYOUT_NOTIFY_URL", "https://example.com/alipay/payout-notify")
	t.Setenv("ALIPAY_SIDECAR_URL", sidecar.URL)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 24),
		UserID:          "merchant-24",
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
		UnifiedIdentity: testIdentity("WT", 24),
		TransactionID:   "WITHDRAW-TXN-24",
		IdempotencyKey:  "idem-withdraw-status-24",
		UserID:          "merchant-24",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-24",
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
		UnifiedIdentity: testIdentity("WR", 24),
		RequestID:       "WITHDRAW-REQ-24",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-24",
		UserType:        "merchant",
		Amount:          5000,
		Fee:             50,
		ActualAmount:    4950,
		WithdrawMethod:  "alipay",
		WithdrawAccount: "merchant-24@example.com",
		Status:          "pending_transfer",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:    "WITHDRAW-REQ-24",
		Action:       "execute",
		ReviewerID:   "admin-24",
		ReviewerName: "Admin",
		Remark:       "execute payout",
	}, AdminWalletActor{})
	if err != nil {
		t.Fatalf("execute withdraw payout failed: %v", err)
	}
	if got := result["status"]; got != "transferring" {
		t.Fatalf("expected transferring status after execute, got %v", got)
	}

	var latestRecord repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-24").First(&latestRecord).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRecord.ThirdPartyOrderID != "ALI-EXEC-REF-24" {
		t.Fatalf("expected withdraw request third party order id persisted, got %q", latestRecord.ThirdPartyOrderID)
	}

	var latestTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", "WITHDRAW-TXN-24").First(&latestTx).Error; err != nil {
		t.Fatalf("reload wallet transaction failed: %v", err)
	}
	if latestTx.Status != "processing" {
		t.Fatalf("expected wallet transaction to remain processing after execute, got %q", latestTx.Status)
	}
	if latestTx.ThirdPartyOrderID != "ALI-EXEC-REF-24" {
		t.Fatalf("expected wallet transaction third party order id persisted, got %q", latestTx.ThirdPartyOrderID)
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

func TestRunWithdrawGatewayReconcileCycleSkipsPendingTransferBeforeGatewaySubmission(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	sidecarHits := 0
	sidecar := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sidecarHits++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"status":"transferring","gateway":"alipay","integrationTarget":"official-sidecar-sdk","thirdPartyOrderId":"ALI-SHOULD-NOT-HIT"}`))
	}))
	defer sidecar.Close()

	t.Setenv("ALIPAY_APP_ID", "app-test")
	t.Setenv("ALIPAY_PRIVATE_KEY", "private-key")
	t.Setenv("ALIPAY_PUBLIC_KEY", "public-key")
	t.Setenv("ALIPAY_NOTIFY_URL", "https://example.com/alipay/notify")
	t.Setenv("ALIPAY_PAYOUT_NOTIFY_URL", "https://example.com/alipay/payout-notify")
	t.Setenv("ALIPAY_SIDECAR_URL", sidecar.URL)

	now := time.Now()
	tx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 811),
		TransactionID:   "WITHDRAW-TXN-811",
		IdempotencyKey:  "idem-withdraw-status-811",
		UserID:          "merchant-811",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-811",
		Amount:          2000,
		BalanceBefore:   9000,
		BalanceAfter:    7000,
		PaymentMethod:   "alipay",
		PaymentChannel:  "alipay",
		Status:          "processing",
		ResponseData:    `{"status":"pending_transfer","reviewerId":"admin-811","reviewerName":"Admin"}`,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 811),
		RequestID:       "WITHDRAW-REQ-811",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-811",
		UserType:        "merchant",
		Amount:          2000,
		Fee:             20,
		ActualAmount:    1980,
		WithdrawMethod:  "alipay",
		WithdrawAccount: "merchant-811@example.com",
		Status:          "pending_transfer",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	processed, err := walletSvc.RunWithdrawGatewayReconcileCycle(context.Background(), 20)
	if err != nil {
		t.Fatalf("run withdraw reconcile cycle failed: %v", err)
	}
	if processed != 0 {
		t.Fatalf("expected reconcile cycle to skip unsubmitted withdraw, got %d processed", processed)
	}
	if sidecarHits != 0 {
		t.Fatalf("expected no sidecar query before payout submission, got %d hits", sidecarHits)
	}
}

func TestReviewWithdrawSyncGatewayStatusPromotesPendingTransferAndMergesGatewayMetadata(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	sidecar := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"status":"transferring","gateway":"alipay","integrationTarget":"official-sidecar-sdk","thirdPartyOrderId":"ALI-SYNC-812","transferResult":"gateway accepted","responseData":{"queryTradeNo":"ALIQUERY812","detailStatus":"TRANSFERRING"}}`))
	}))
	defer sidecar.Close()

	t.Setenv("ALIPAY_APP_ID", "app-test")
	t.Setenv("ALIPAY_PRIVATE_KEY", "private-key")
	t.Setenv("ALIPAY_PUBLIC_KEY", "public-key")
	t.Setenv("ALIPAY_NOTIFY_URL", "https://example.com/alipay/notify")
	t.Setenv("ALIPAY_PAYOUT_NOTIFY_URL", "https://example.com/alipay/payout-notify")
	t.Setenv("ALIPAY_SIDECAR_URL", sidecar.URL)

	now := time.Now()
	submittedAt := now.Add(-3 * time.Minute).Format(time.RFC3339)
	tx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 812),
		TransactionID:   "WITHDRAW-TXN-812",
		IdempotencyKey:  "idem-withdraw-status-812",
		UserID:          "merchant-812",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-812",
		Amount:          2200,
		BalanceBefore:   9200,
		BalanceAfter:    7000,
		PaymentMethod:   "alipay",
		PaymentChannel:  "alipay",
		Status:          "processing",
		ResponseData:    `{"status":"pending_transfer","gateway":"alipay","integrationTarget":"official-sidecar-sdk","submittedAt":"` + submittedAt + `","autoRetryEligible":true,"retryCount":1}`,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(tx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 812),
		RequestID:       "WITHDRAW-REQ-812",
		TransactionID:   tx.TransactionID,
		UserID:          "merchant-812",
		UserType:        "merchant",
		Amount:          2200,
		Fee:             22,
		ActualAmount:    2178,
		WithdrawMethod:  "alipay",
		WithdrawAccount: "merchant-812@example.com",
		Status:          "pending_transfer",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:    "WITHDRAW-REQ-812",
		Action:       "sync_gateway_status",
		ReviewerID:   "admin-812",
		ReviewerName: "Admin",
	}, AdminWalletActor{
		AdminID:   "admin-812",
		AdminName: "Admin",
	})
	if err != nil {
		t.Fatalf("sync gateway status failed: %v", err)
	}
	if got := result["status"]; got != "transferring" {
		t.Fatalf("expected transferring status after sync, got %v", got)
	}

	var latestRecord repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-812").First(&latestRecord).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRecord.Status != "transferring" {
		t.Fatalf("expected withdraw request transferring after sync, got %s", latestRecord.Status)
	}
	if latestRecord.ThirdPartyOrderID != "ALI-SYNC-812" {
		t.Fatalf("expected synced third party order id, got %q", latestRecord.ThirdPartyOrderID)
	}
	if latestRecord.TransferResult != "gateway accepted" {
		t.Fatalf("expected synced transfer result, got %q", latestRecord.TransferResult)
	}

	var latestTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", "WITHDRAW-TXN-812").First(&latestTx).Error; err != nil {
		t.Fatalf("reload wallet transaction failed: %v", err)
	}
	payload, ok := parseWalletResponsePayload(latestTx.ResponseData).(map[string]interface{})
	if !ok {
		t.Fatalf("expected response data payload map, got %T", parseWalletResponsePayload(latestTx.ResponseData))
	}
	if got := firstTrimmed(fmt.Sprint(payload["status"])); got != "transferring" {
		t.Fatalf("expected merged response status transferring, got %q", got)
	}
	if got := firstTrimmed(fmt.Sprint(payload["thirdPartyOrderId"])); got != "ALI-SYNC-812" {
		t.Fatalf("expected merged thirdPartyOrderId, got %q", got)
	}
	if got := firstTrimmed(fmt.Sprint(payload["transferResult"])); got != "gateway accepted" {
		t.Fatalf("expected merged transferResult, got %q", got)
	}
	if got := firstTrimmed(fmt.Sprint(payload["submittedAt"])); got != submittedAt {
		t.Fatalf("expected submittedAt to be preserved, got %q", got)
	}
	if !toBool(payload["autoRetryEligible"]) {
		t.Fatalf("expected auto retry metadata to be preserved, got %#v", payload)
	}
	if got := toInt(payload["retryCount"]); got != 1 {
		t.Fatalf("expected retryCount 1 to be preserved, got %d", got)
	}
	if got := firstTrimmed(fmt.Sprint(payload["integrationTarget"])); got != "official-sidecar-sdk" {
		t.Fatalf("expected integrationTarget to be preserved, got %q", got)
	}
	if got := firstTrimmed(fmt.Sprint(payload["gatewayStatus"])); got != "transferring" {
		t.Fatalf("expected gatewayStatus transferring, got %q", got)
	}
	responseData, ok := payload["responseData"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected nested responseData map, got %T", payload["responseData"])
	}
	if got := firstTrimmed(fmt.Sprint(responseData["queryTradeNo"])); got != "ALIQUERY812" {
		t.Fatalf("expected query response data to be preserved, got %q", got)
	}
}
