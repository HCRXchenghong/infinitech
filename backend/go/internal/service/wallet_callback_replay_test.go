package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestReplayPaymentCallbackReprocessesVerifiedWithdrawSuccess(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 950),
		UserID:          "merchant-replay-1",
		UserType:        "merchant",
		Balance:         3000,
		FrozenBalance:   2000,
		TotalBalance:    5000,
		Status:          "active",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create account failed: %v", err)
	}

	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 950),
		TransactionID:     "WITHDRAW-TXN-950",
		IdempotencyKey:    "idem-withdraw-950",
		UserID:            "merchant-replay-1",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-950",
		Amount:            2000,
		BalanceBefore:     5000,
		BalanceAfter:      3000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-PAYOUT-950",
		Status:            "processing",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 950),
		RequestID:         "WITHDRAW-REQ-950",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "merchant-replay-1",
		UserType:          "merchant",
		Amount:            2000,
		Fee:               20,
		ActualAmount:      1980,
		WithdrawMethod:    "alipay",
		WithdrawAccount:   "merchant-replay@example.com",
		Status:            "transferring",
		ThirdPartyOrderID: "ALI-PAYOUT-950",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	processedAt := now
	callback := &repository.PaymentCallback{
		UnifiedIdentity:   testIdentity("CB", 950),
		CallbackID:        "CALLBACK-REPLAY-950",
		Channel:           "alipay",
		EventType:         "payout.success",
		ThirdPartyOrderID: "ALI-PAYOUT-950",
		TransactionID:     withdrawTx.TransactionID,
		Signature:         "alipay-signature-950",
		Verified:          true,
		ReplayFingerprint: "fingerprint-original-950",
		Status:            "success",
		RequestHeaders:    `{"Alipay-Signature":"alipay-signature-950"}`,
		RequestBody:       `{"trade_status":"SUCCESS"}`,
		ResponseBody:      "ok",
		ProcessedAt:       &processedAt,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(callback).Error; err != nil {
		t.Fatalf("create payment callback failed: %v", err)
	}

	result, err := walletSvc.ReplayPaymentCallback(context.Background(), "CALLBACK-REPLAY-950", AdminWalletActor{
		AdminID:   "admin-950",
		AdminName: "Admin Replay",
	}, PaymentCallbackReplayRequest{
		Remark: "后台重放支付宝出款回调",
	})
	if err != nil {
		t.Fatalf("replay payment callback failed: %v", err)
	}
	if replayed, _ := result["replayed"].(bool); !replayed {
		t.Fatalf("expected replayed flag, got %#v", result["replayed"])
	}
	if got := result["replayedFromCallbackId"]; got != "CALLBACK-REPLAY-950" {
		t.Fatalf("expected replay source callback id, got %v", got)
	}
	replayedCallbackID, _ := result["callbackId"].(string)
	if strings.TrimSpace(replayedCallbackID) == "" {
		t.Fatalf("expected replay callback id, got %#v", result["callbackId"])
	}

	var latestRequest repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-950").First(&latestRequest).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRequest.Status != "success" {
		t.Fatalf("expected withdraw request success after replay, got %q", latestRequest.Status)
	}

	var callbackCount int64
	if err := db.Model(&repository.PaymentCallback{}).Count(&callbackCount).Error; err != nil {
		t.Fatalf("count callback records failed: %v", err)
	}
	if callbackCount != 2 {
		t.Fatalf("expected original + replay callback records, got %d", callbackCount)
	}

	var replayedCallback repository.PaymentCallback
	if err := db.Where("callback_id = ? OR callback_id_raw = ?", replayedCallbackID, replayedCallbackID).First(&replayedCallback).Error; err != nil {
		t.Fatalf("load replay callback record failed: %v", err)
	}
	if replayedCallback.CallbackID == callback.CallbackID {
		t.Fatal("expected replay to create a new callback record")
	}
	if !strings.Contains(replayedCallback.RequestHeaders, "X-Admin-Replay") {
		t.Fatalf("expected replay header marker, got %q", replayedCallback.RequestHeaders)
	}
}

func TestReplayPaymentCallbackPrefersRawBusinessIDForHistoricalWithdraw(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	account := &repository.WalletAccount{
		UnifiedIdentity: testIdentity("WA", 952),
		UserID:          "merchant-replay-raw-1",
		UserType:        "merchant",
		Balance:         5000,
		FrozenBalance:   1500,
		TotalBalance:    6500,
		Status:          "active",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("create account failed: %v", err)
	}

	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WD", 952),
		TransactionID:   "WITHDRAW-TXN-952",
		IdempotencyKey:  "idem-withdraw-952",
		UserID:          "merchant-replay-raw-1",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-952",
		Amount:          1500,
		BalanceBefore:   6500,
		BalanceAfter:    5000,
		PaymentMethod:   "alipay",
		PaymentChannel:  "alipay",
		Status:          "processing",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 952),
		RequestID:       "WITHDRAW-REQ-952",
		TransactionID:   withdrawTx.TransactionID,
		UserID:          "merchant-replay-raw-1",
		UserType:        "merchant",
		Amount:          1500,
		Fee:             15,
		ActualAmount:    1485,
		WithdrawMethod:  "alipay",
		WithdrawAccount: "merchant-replay-raw@example.com",
		Status:          "transferring",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	processedAt := now
	callback := &repository.PaymentCallback{
		UnifiedIdentity:   testIdentity("CB", 952),
		CallbackID:        "CALLBACK-REPLAY-952",
		Channel:           "alipay",
		EventType:         "payout.success",
		TransactionID:     "LEGACY-CALLBACK-TXN-952",
		TransactionIDRaw:  withdrawRequest.RequestID,
		Signature:         "alipay-signature-952",
		Verified:          true,
		ReplayFingerprint: "fingerprint-original-952",
		Status:            "success",
		RequestHeaders:    `{"Alipay-Signature":"alipay-signature-952"}`,
		RequestBody:       `{"trade_status":"SUCCESS"}`,
		ResponseBody:      "ok",
		ProcessedAt:       &processedAt,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(callback).Error; err != nil {
		t.Fatalf("create payment callback failed: %v", err)
	}

	result, err := walletSvc.ReplayPaymentCallback(context.Background(), "CALLBACK-REPLAY-952", AdminWalletActor{
		AdminID:   "admin-952",
		AdminName: "Admin Replay",
	}, PaymentCallbackReplayRequest{
		Remark: "admin replay historical request id callback",
	})
	if err != nil {
		t.Fatalf("replay payment callback failed: %v", err)
	}

	replayedCallbackID, _ := result["callbackId"].(string)
	if strings.TrimSpace(replayedCallbackID) == "" {
		t.Fatalf("expected replay callback id, got %#v", result["callbackId"])
	}

	var latestRequest repository.WithdrawRequest
	if err := db.Where("request_id = ?", "WITHDRAW-REQ-952").First(&latestRequest).Error; err != nil {
		t.Fatalf("reload withdraw request failed: %v", err)
	}
	if latestRequest.Status != "success" {
		t.Fatalf("expected withdraw request success after replay, got %q", latestRequest.Status)
	}

	var replayedCallback repository.PaymentCallback
	if err := db.Where("callback_id = ? OR callback_id_raw = ?", replayedCallbackID, replayedCallbackID).First(&replayedCallback).Error; err != nil {
		t.Fatalf("load replay callback record failed: %v", err)
	}
	if replayedCallback.TransactionID != withdrawTx.TransactionID {
		t.Fatalf("expected replay callback to bind real transaction id %q, got %q", withdrawTx.TransactionID, replayedCallback.TransactionID)
	}
}

func TestReplayPaymentCallbackRejectsUnverifiedRecords(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	callback := &repository.PaymentCallback{
		UnifiedIdentity:   testIdentity("CB", 951),
		CallbackID:        "CALLBACK-REPLAY-951",
		Channel:           "wechat",
		EventType:         "payment.success",
		TransactionID:     "PAY-TXN-951",
		Signature:         "wechat-signature-951",
		Verified:          false,
		ReplayFingerprint: "fingerprint-original-951",
		Status:            "failed",
		RequestBody:       `{"event":"payment.success"}`,
		ResponseBody:      "verify failed",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(callback).Error; err != nil {
		t.Fatalf("create payment callback failed: %v", err)
	}

	_, err := walletSvc.ReplayPaymentCallback(context.Background(), "CALLBACK-REPLAY-951", AdminWalletActor{
		AdminID:   "admin-951",
		AdminName: "Admin Replay",
	}, PaymentCallbackReplayRequest{})
	if err == nil {
		t.Fatal("expected replaying unverified callback to fail")
	}
	if !strings.Contains(err.Error(), "verified") {
		t.Fatalf("expected verified validation error, got %v", err)
	}
}
