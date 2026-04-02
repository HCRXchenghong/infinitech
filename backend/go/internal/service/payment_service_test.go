package service

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newPaymentServiceForTest(t *testing.T) (*PaymentService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "payment_service_test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("resolve sql db failed: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	if err := db.AutoMigrate(
		&repository.IDCodebook{},
		&repository.IDSequence{},
		&repository.Setting{},
		&repository.Order{},
		&repository.WalletAccount{},
		&repository.WalletTransaction{},
		&repository.PaymentCallback{},
		&repository.AfterSalesRequest{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	walletRepo := repository.NewWalletRepository(db)
	riskSvc := NewRiskControlService(walletRepo)
	return NewPaymentService(walletRepo, riskSvc, "test-sign"), db
}

func newPaymentAndWalletServicesForTest(t *testing.T) (*PaymentService, *WalletService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "payment_wallet_callback_test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("resolve sql db failed: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	if err := db.AutoMigrate(
		&repository.IDCodebook{},
		&repository.IDSequence{},
		&repository.Setting{},
		&repository.Order{},
		&repository.WalletAccount{},
		&repository.WalletTransaction{},
		&repository.PaymentCallback{},
		&repository.AfterSalesRequest{},
		&repository.WithdrawRequest{},
		&repository.RiderDepositRecord{},
		&repository.SettlementSubject{},
		&repository.SettlementRuleSet{},
		&repository.SettlementRuleStep{},
		&repository.OrderSettlementSnapshot{},
		&repository.SettlementLedgerEntry{},
		&repository.WithdrawFeeRule{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	walletRepo := repository.NewWalletRepository(db)
	riskSvc := NewRiskControlService(walletRepo)
	paymentSvc := NewPaymentService(walletRepo, riskSvc, "test-sign")
	walletSvc := NewWalletService(walletRepo, paymentSvc, riskSvc, "test-sign")
	paymentSvc.SetSettlementWallet(walletSvc)
	return paymentSvc, walletSvc, db
}

func testIdentity(prefix string, index int) repository.UnifiedIdentity {
	return repository.UnifiedIdentity{
		UID:  fmt.Sprintf("%s%012d", prefix, index),
		TSID: fmt.Sprintf("%s%022d", prefix, index),
	}
}

func seedPaidOrderForRefundTest(t *testing.T, db *gorm.DB, method, thirdPartyOrderID string) (*repository.Order, *repository.WalletTransaction) {
	t.Helper()

	order := &repository.Order{
		UnifiedIdentity:      testIdentity("OR", 1),
		UserID:               "user-1",
		MerchantID:           "merchant-1",
		Status:               "completed",
		PaymentStatus:        "paid",
		PaymentMethod:        method,
		TotalPrice:           20,
		PaymentTransactionID: "PAY-TXN-1",
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("create order failed: %v", err)
	}

	transaction := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("PT", 1),
		TransactionID:     "PAY-TXN-1",
		IdempotencyKey:    "idem-pay-1",
		UserID:            "user-1",
		UserType:          "customer",
		Type:              "payment",
		BusinessType:      "order_payment",
		BusinessID:        strconv.FormatUint(uint64(order.ID), 10),
		Amount:            2000,
		BalanceBefore:     5000,
		BalanceAfter:      5000,
		PaymentMethod:     method,
		PaymentChannel:    method,
		ThirdPartyOrderID: thirdPartyOrderID,
		Status:            "success",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(transaction).Error; err != nil {
		t.Fatalf("create payment transaction failed: %v", err)
	}

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 1),
		UserID:          "user-1",
		UserType:        "customer",
		Balance:         5000,
		FrozenBalance:   0,
		TotalBalance:    5000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create wallet account failed: %v", err)
	}

	return order, transaction
}

func TestRefundOrderThirdPartyCreatesPendingRefundTransaction(t *testing.T) {
	paymentSvc, db := newPaymentServiceForTest(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"status":"refund_pending","gateway":"alipay","integrationTarget":"official-sidecar-sdk","thirdPartyOrderId":"ALI-REFUND-100","responseData":{"status":"refund_pending"}}`))
	}))
	defer server.Close()

	t.Setenv("ALIPAY_APP_ID", "app-test")
	t.Setenv("ALIPAY_PRIVATE_KEY", "private-key")
	t.Setenv("ALIPAY_PUBLIC_KEY", "public-key")
	t.Setenv("ALIPAY_NOTIFY_URL", "https://example.com/alipay/notify")
	t.Setenv("ALIPAY_SIDECAR_URL", server.URL)

	order, _ := seedPaidOrderForRefundTest(t, db, "alipay", "ALI-ORDER-100")

	result, err := paymentSvc.RefundOrder(context.Background(), RefundOrderRequest{
		UserID:         "user-1",
		UserType:       "customer",
		OrderID:        strconv.FormatUint(uint64(order.ID), 10),
		Amount:         2000,
		Reason:         "test refund",
		IdempotencyKey: "idem-refund-1",
	})
	if err != nil {
		t.Fatalf("refund order failed: %v", err)
	}

	if got := result["status"]; got != "refund_pending" {
		t.Fatalf("expected refund_pending status, got %v", got)
	}
	if got := result["gateway"]; got != "alipay" {
		t.Fatalf("expected alipay gateway, got %v", got)
	}

	var reloadedOrder repository.Order
	if err := db.First(&reloadedOrder, order.ID).Error; err != nil {
		t.Fatalf("reload order failed: %v", err)
	}
	if reloadedOrder.PaymentStatus != "refunding" {
		t.Fatalf("expected order payment_status refunding, got %q", reloadedOrder.PaymentStatus)
	}
	if reloadedOrder.RefundTransactionID == "" {
		t.Fatal("expected refund transaction id to be persisted on order")
	}

	var refundTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", reloadedOrder.RefundTransactionID).First(&refundTx).Error; err != nil {
		t.Fatalf("reload refund transaction failed: %v", err)
	}
	if refundTx.Status != "refund_pending" {
		t.Fatalf("expected refund transaction status refund_pending, got %q", refundTx.Status)
	}
	if refundTx.ThirdPartyOrderID != "ALI-REFUND-100" {
		t.Fatalf("expected refund third-party id ALI-REFUND-100, got %q", refundTx.ThirdPartyOrderID)
	}

	var account repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "user-1", "customer").First(&account).Error; err != nil {
		t.Fatalf("reload account failed: %v", err)
	}
	if account.Balance != 5000 {
		t.Fatalf("expected wallet balance unchanged for third-party refund, got %d", account.Balance)
	}
}

func TestRecordCallbackCompletesThirdPartyRefund(t *testing.T) {
	paymentSvc, db := newPaymentServiceForTest(t)
	order, _ := seedPaidOrderForRefundTest(t, db, "alipay", "ALI-ORDER-200")

	if err := db.Model(&repository.Order{}).
		Where("id = ?", order.ID).
		Updates(map[string]interface{}{
			"payment_status": "refunding",
		}).Error; err != nil {
		t.Fatalf("update order to refunding failed: %v", err)
	}

	refundTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("RF", 200),
		TransactionID:     "REFUND-TXN-200",
		IdempotencyKey:    "idem-refund-200",
		UserID:            "user-1",
		UserType:          "customer",
		Type:              "refund",
		BusinessType:      "order_refund",
		BusinessID:        strconv.FormatUint(uint64(order.ID), 10),
		Amount:            2000,
		BalanceBefore:     5000,
		BalanceAfter:      5000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-REFUND-200",
		Status:            "refund_pending",
		Description:       "test refund",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(refundTx).Error; err != nil {
		t.Fatalf("create refund transaction failed: %v", err)
	}
	if err := db.Model(&repository.Order{}).
		Where("id = ?", order.ID).
		Updates(map[string]interface{}{
			"refund_transaction_id": refundTx.TransactionID,
			"refund_amount":         int64(2000),
		}).Error; err != nil {
		t.Fatalf("attach refund transaction to order failed: %v", err)
	}

	afterSales := &repository.AfterSalesRequest{
		UnifiedIdentity:       testIdentity("AS", 200),
		RequestNo:             "AS-200",
		OrderID:               order.ID,
		OrderNo:               strconv.FormatUint(uint64(order.ID), 10),
		UserID:                "user-1",
		Type:                  "refund",
		Status:                "approved",
		ProblemDesc:           "test after sales",
		ShouldRefund:          true,
		RefundAmount:          2000,
		RefundTransactionID:   refundTx.TransactionID,
		RequestedRefundAmount: 2000,
	}
	if err := db.Create(afterSales).Error; err != nil {
		t.Fatalf("create after sales request failed: %v", err)
	}

	result, err := paymentSvc.RecordCallback(context.Background(), PaymentCallbackRequest{
		Channel:           "alipay",
		EventType:         "refund.success",
		ThirdPartyOrderID: "ALI-REFUND-200",
		Verified:          true,
		RawBody:           `{"trade_status":"REFUND_SUCCESS"}`,
		Response:          "ok",
	})
	if err != nil {
		t.Fatalf("record callback failed: %v", err)
	}
	if got := result["status"]; got != "success" {
		t.Fatalf("expected callback status success, got %v", got)
	}

	var reloadedOrder repository.Order
	if err := db.First(&reloadedOrder, order.ID).Error; err != nil {
		t.Fatalf("reload order failed: %v", err)
	}
	if reloadedOrder.PaymentStatus != "refunded" {
		t.Fatalf("expected refunded order status, got %q", reloadedOrder.PaymentStatus)
	}
	if reloadedOrder.RefundTime == nil {
		t.Fatal("expected refund time to be set")
	}

	var reloadedTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", refundTx.TransactionID).First(&reloadedTx).Error; err != nil {
		t.Fatalf("reload refund tx failed: %v", err)
	}
	if reloadedTx.Status != "success" {
		t.Fatalf("expected refund tx status success, got %q", reloadedTx.Status)
	}

	var reloadedAfterSales repository.AfterSalesRequest
	if err := db.First(&reloadedAfterSales, afterSales.ID).Error; err != nil {
		t.Fatalf("reload after-sales request failed: %v", err)
	}
	if reloadedAfterSales.RefundedAt == nil {
		t.Fatal("expected after-sales refundedAt to be populated")
	}
}

func TestRecordCallbackMarksThirdPartyRefundFailedAndResetsRetryState(t *testing.T) {
	paymentSvc, db := newPaymentServiceForTest(t)
	order, _ := seedPaidOrderForRefundTest(t, db, "alipay", "ALI-ORDER-300")

	refundTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("RF", 300),
		TransactionID:     "REFUND-TXN-300",
		IdempotencyKey:    "idem-refund-300",
		UserID:            "user-1",
		UserType:          "customer",
		Type:              "refund",
		BusinessType:      "order_refund",
		BusinessID:        strconv.FormatUint(uint64(order.ID), 10),
		Amount:            2000,
		BalanceBefore:     5000,
		BalanceAfter:      5000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-REFUND-300",
		Status:            "refund_pending",
		Description:       "test refund",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(refundTx).Error; err != nil {
		t.Fatalf("create refund transaction failed: %v", err)
	}
	if err := db.Model(&repository.Order{}).
		Where("id = ?", order.ID).
		Updates(map[string]interface{}{
			"payment_status":        "refunding",
			"refund_transaction_id": refundTx.TransactionID,
			"refund_amount":         int64(2000),
		}).Error; err != nil {
		t.Fatalf("set order refunding failed: %v", err)
	}

	afterSales := &repository.AfterSalesRequest{
		UnifiedIdentity:       testIdentity("AS", 300),
		RequestNo:             "AS-300",
		OrderID:               order.ID,
		OrderNo:               strconv.FormatUint(uint64(order.ID), 10),
		UserID:                "user-1",
		Type:                  "refund",
		Status:                "approved",
		ProblemDesc:           "test after sales",
		ShouldRefund:          true,
		RefundAmount:          2000,
		RefundTransactionID:   refundTx.TransactionID,
		RequestedRefundAmount: 2000,
	}
	if err := db.Create(afterSales).Error; err != nil {
		t.Fatalf("create after sales request failed: %v", err)
	}

	result, err := paymentSvc.RecordCallback(context.Background(), PaymentCallbackRequest{
		Channel:           "alipay",
		EventType:         "refund.fail",
		ThirdPartyOrderID: "ALI-REFUND-300",
		Verified:          true,
		RawBody:           `{"trade_status":"REFUND_FAILED"}`,
		Response:          "ok",
	})
	if err != nil {
		t.Fatalf("record callback failed: %v", err)
	}
	if got := result["status"]; got != "success" {
		t.Fatalf("expected callback result status success, got %v", got)
	}

	var reloadedOrder repository.Order
	if err := db.First(&reloadedOrder, order.ID).Error; err != nil {
		t.Fatalf("reload order failed: %v", err)
	}
	if reloadedOrder.PaymentStatus != "paid" {
		t.Fatalf("expected order payment_status to reset to paid, got %q", reloadedOrder.PaymentStatus)
	}
	if reloadedOrder.RefundTransactionID != "" {
		t.Fatalf("expected order refund transaction to be cleared, got %q", reloadedOrder.RefundTransactionID)
	}

	var reloadedTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", refundTx.TransactionID).First(&reloadedTx).Error; err != nil {
		t.Fatalf("reload refund tx failed: %v", err)
	}
	if reloadedTx.Status != "failed" {
		t.Fatalf("expected refund tx status failed, got %q", reloadedTx.Status)
	}

	var reloadedAfterSales repository.AfterSalesRequest
	if err := db.First(&reloadedAfterSales, afterSales.ID).Error; err != nil {
		t.Fatalf("reload after-sales request failed: %v", err)
	}
	if reloadedAfterSales.RefundTransactionID != "" {
		t.Fatalf("expected after-sales refund transaction to be cleared, got %q", reloadedAfterSales.RefundTransactionID)
	}
}

func TestRecordCallbackCompletesWithdrawTransfer(t *testing.T) {
	paymentSvc, _, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 500),
		UserID:          "merchant-1",
		UserType:        "merchant",
		Balance:         3000,
		FrozenBalance:   2000,
		TotalBalance:    5000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create account failed: %v", err)
	}

	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 500),
		TransactionID:     "WITHDRAW-TXN-500",
		IdempotencyKey:    "idem-withdraw-500",
		UserID:            "merchant-1",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-500",
		Amount:            2000,
		BalanceBefore:     5000,
		BalanceAfter:      3000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-PAYOUT-500",
		Status:            "processing",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 500),
		RequestID:         "WITHDRAW-REQ-500",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "merchant-1",
		UserType:          "merchant",
		Amount:            2000,
		Fee:               20,
		ActualAmount:      1980,
		WithdrawMethod:    "alipay",
		WithdrawAccount:   "merchant@example.com",
		Status:            "transferring",
		ThirdPartyOrderID: "ALI-PAYOUT-500",
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := paymentSvc.RecordCallback(context.Background(), PaymentCallbackRequest{
		Channel:           "alipay",
		EventType:         "payout.success",
		ThirdPartyOrderID: "ALI-PAYOUT-500",
		Verified:          true,
		RawBody:           `{"status":"SUCCESS"}`,
		Response:          "ok",
	})
	if err != nil {
		t.Fatalf("record callback failed: %v", err)
	}
	if got := result["status"]; got != "success" {
		t.Fatalf("expected callback status success, got %v", got)
	}

	var reloadedAccount repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "merchant-1", "merchant").First(&reloadedAccount).Error; err != nil {
		t.Fatalf("reload account failed: %v", err)
	}
	if reloadedAccount.Balance != 3000 || reloadedAccount.FrozenBalance != 0 {
		t.Fatalf("unexpected account state after withdraw success: balance=%d frozen=%d", reloadedAccount.Balance, reloadedAccount.FrozenBalance)
	}

	var reloadedRequest repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-500").First(&reloadedRequest).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if reloadedRequest.Status != "success" {
		t.Fatalf("expected withdraw request success, got %q", reloadedRequest.Status)
	}
}

func TestRecordCallbackFailsWithdrawTransferAndReturnsFrozenBalance(t *testing.T) {
	paymentSvc, _, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 600),
		UserID:          "rider-1",
		UserType:        "rider",
		Balance:         3000,
		FrozenBalance:   2000,
		TotalBalance:    5000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create account failed: %v", err)
	}

	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 600),
		TransactionID:     "WITHDRAW-TXN-600",
		IdempotencyKey:    "idem-withdraw-600",
		UserID:            "rider-1",
		UserType:          "rider",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-600",
		Amount:            2000,
		BalanceBefore:     5000,
		BalanceAfter:      3000,
		PaymentMethod:     "wechat",
		PaymentChannel:    "wechat",
		ThirdPartyOrderID: "WX-PAYOUT-600",
		Status:            "processing",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 600),
		RequestID:         "WITHDRAW-REQ-600",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "rider-1",
		UserType:          "rider",
		Amount:            2000,
		Fee:               20,
		ActualAmount:      1980,
		WithdrawMethod:    "wechat",
		WithdrawAccount:   "wx-openid-rider-1",
		Status:            "transferring",
		ThirdPartyOrderID: "WX-PAYOUT-600",
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := paymentSvc.RecordCallback(context.Background(), PaymentCallbackRequest{
		Channel:           "wechat",
		EventType:         "payout.fail",
		ThirdPartyOrderID: "WX-PAYOUT-600",
		Verified:          true,
		RawBody:           `{"status":"FAILED"}`,
		Response:          "ok",
	})
	if err != nil {
		t.Fatalf("record callback failed: %v", err)
	}
	if got := result["status"]; got != "success" {
		t.Fatalf("expected callback result status success, got %v", got)
	}

	var reloadedAccount repository.WalletAccount
	if err := db.Where("user_id = ? AND user_type = ?", "rider-1", "rider").First(&reloadedAccount).Error; err != nil {
		t.Fatalf("reload account failed: %v", err)
	}
	if reloadedAccount.Balance != 5000 || reloadedAccount.FrozenBalance != 0 {
		t.Fatalf("unexpected account state after withdraw fail: balance=%d frozen=%d", reloadedAccount.Balance, reloadedAccount.FrozenBalance)
	}

	var reloadedRequest repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-600").First(&reloadedRequest).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if reloadedRequest.Status != "failed" {
		t.Fatalf("expected withdraw request failed, got %q", reloadedRequest.Status)
	}
}

func TestRecordCallbackDeduplicatesVerifiedReplay(t *testing.T) {
	paymentSvc, _, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 700),
		UserID:          "merchant-7",
		UserType:        "merchant",
		Balance:         4000,
		FrozenBalance:   1000,
		TotalBalance:    5000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create account failed: %v", err)
	}

	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 700),
		TransactionID:     "WITHDRAW-TXN-700",
		IdempotencyKey:    "idem-withdraw-700",
		UserID:            "merchant-7",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-700",
		Amount:            1000,
		BalanceBefore:     5000,
		BalanceAfter:      4000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-PAYOUT-700",
		Status:            "processing",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 700),
		RequestID:         "WITHDRAW-REQ-700",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "merchant-7",
		UserType:          "merchant",
		Amount:            1000,
		Fee:               10,
		ActualAmount:      990,
		WithdrawMethod:    "alipay",
		WithdrawAccount:   "merchant-7@example.com",
		Status:            "transferring",
		ThirdPartyOrderID: "ALI-PAYOUT-700",
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	callbackReq := PaymentCallbackRequest{
		Channel:           "alipay",
		EventType:         "payout.success",
		ThirdPartyOrderID: "ALI-PAYOUT-700",
		Signature:         "sign-700",
		Nonce:             "nonce-700",
		Verified:          true,
		RawBody:           `{"status":"SUCCESS","trade_no":"ALI-PAYOUT-700"}`,
		Response:          "ok",
	}

	firstResult, err := paymentSvc.RecordCallback(context.Background(), callbackReq)
	if err != nil {
		t.Fatalf("record first callback failed: %v", err)
	}
	if got := firstResult["status"]; got != "success" {
		t.Fatalf("expected first callback status success, got %v", got)
	}

	secondResult, err := paymentSvc.RecordCallback(context.Background(), callbackReq)
	if err != nil {
		t.Fatalf("record duplicate callback failed: %v", err)
	}
	if duplicated, _ := secondResult["duplicated"].(bool); !duplicated {
		t.Fatalf("expected duplicate callback response, got %v", secondResult)
	}

	var callbackCount int64
	if err := db.Model(&repository.PaymentCallback{}).Count(&callbackCount).Error; err != nil {
		t.Fatalf("count callbacks failed: %v", err)
	}
	if callbackCount != 1 {
		t.Fatalf("expected 1 persisted callback, got %d", callbackCount)
	}
}

func TestRecordCallbackIgnoresFailureAfterWithdrawAlreadySucceeded(t *testing.T) {
	paymentSvc, _, db := newPaymentAndWalletServicesForTest(t)

	completedAt := time.Now()
	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 710),
		UserID:          "merchant-71",
		UserType:        "merchant",
		Balance:         4000,
		FrozenBalance:   0,
		TotalBalance:    4000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create account failed: %v", err)
	}

	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 710),
		TransactionID:     "WITHDRAW-TXN-710",
		IdempotencyKey:    "idem-withdraw-710",
		UserID:            "merchant-71",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-710",
		Amount:            1000,
		BalanceBefore:     5000,
		BalanceAfter:      4000,
		PaymentMethod:     "wechat",
		PaymentChannel:    "wechat",
		ThirdPartyOrderID: "WX-PAYOUT-710",
		Status:            "success",
		CompletedAt:       &completedAt,
		CreatedAt:         completedAt,
		UpdatedAt:         completedAt,
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 710),
		RequestID:         "WITHDRAW-REQ-710",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "merchant-71",
		UserType:          "merchant",
		Amount:            1000,
		Fee:               10,
		ActualAmount:      990,
		WithdrawMethod:    "wechat",
		WithdrawAccount:   "wx-openid-merchant-71",
		Status:            "success",
		ThirdPartyOrderID: "WX-PAYOUT-710",
		CompletedAt:       &completedAt,
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	result, err := paymentSvc.RecordCallback(context.Background(), PaymentCallbackRequest{
		Channel:           "wechat",
		EventType:         "payout.fail",
		ThirdPartyOrderID: "WX-PAYOUT-710",
		Signature:         "sign-710",
		Nonce:             "nonce-710",
		Verified:          true,
		RawBody:           `{"status":"FAILED"}`,
		Response:          "ok",
	})
	if err != nil {
		t.Fatalf("record stale failure callback failed: %v", err)
	}
	if ignored, _ := result["settlement"].(map[string]interface{})["ignored"].(bool); !ignored {
		t.Fatalf("expected stale failure callback to be ignored, got %v", result)
	}

	var reloadedTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", "WITHDRAW-TXN-710").First(&reloadedTx).Error; err != nil {
		t.Fatalf("reload withdraw transaction failed: %v", err)
	}
	if reloadedTx.Status != "success" {
		t.Fatalf("expected transaction to remain success, got %q", reloadedTx.Status)
	}

	var reloadedRequest repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-710").First(&reloadedRequest).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if reloadedRequest.Status != "success" {
		t.Fatalf("expected withdraw request to remain success, got %q", reloadedRequest.Status)
	}
}

func TestRecordCallbackFailedWithdrawSchedulesAutoRetryMetadata(t *testing.T) {
	paymentSvc, _, db := newPaymentAndWalletServicesForTest(t)

	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 720),
		UserID:          "merchant-72",
		UserType:        "merchant",
		Balance:         5000,
		FrozenBalance:   2000,
		TotalBalance:    7000,
		Status:          "active",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create account failed: %v", err)
	}

	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 720),
		TransactionID:     "WITHDRAW-TXN-720",
		IdempotencyKey:    "idem-withdraw-720",
		UserID:            "merchant-72",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-720",
		Amount:            2000,
		BalanceBefore:     7000,
		BalanceAfter:      5000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-PAYOUT-720",
		Status:            "processing",
		ResponseData:      `{"status":"transferring","gateway":"alipay"}`,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 720),
		RequestID:         "WITHDRAW-REQ-720",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "merchant-72",
		UserType:          "merchant",
		Amount:            2000,
		Fee:               20,
		ActualAmount:      1980,
		WithdrawMethod:    "alipay",
		WithdrawAccount:   "merchant-72@example.com",
		Status:            "transferring",
		ThirdPartyOrderID: "ALI-PAYOUT-720",
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	if _, err := paymentSvc.RecordCallback(context.Background(), PaymentCallbackRequest{
		Channel:           "alipay",
		EventType:         "payout.fail",
		ThirdPartyOrderID: "ALI-PAYOUT-720",
		Verified:          true,
		RawBody:           `{"status":"FAILED"}`,
		Response:          "gateway failed",
	}); err != nil {
		t.Fatalf("record callback failed: %v", err)
	}

	var latestTx repository.WalletTransaction
	if err := db.Where("transaction_id = ?", "WITHDRAW-TXN-720").First(&latestTx).Error; err != nil {
		t.Fatalf("reload withdraw transaction failed: %v", err)
	}
	payload, ok := parseWalletResponsePayload(latestTx.ResponseData).(map[string]interface{})
	if !ok {
		t.Fatalf("expected response data payload map, got %T", parseWalletResponsePayload(latestTx.ResponseData))
	}
	if !toBool(payload["autoRetryEligible"]) {
		t.Fatalf("expected auto retry eligible payload, got %#v", payload["autoRetryEligible"])
	}
	if got := toInt(payload["retryCount"]); got != 0 {
		t.Fatalf("expected retryCount 0 after initial failure, got %d", got)
	}
	if nextRetryAt := firstTrimmed(fmt.Sprint(payload["nextRetryAt"])); nextRetryAt == "" {
		t.Fatalf("expected nextRetryAt to be scheduled, got payload %#v", payload)
	}
}
