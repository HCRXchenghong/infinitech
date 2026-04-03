package service

import (
	"context"
	"testing"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestListPaymentCallbacksSupportsFiltersAndWithdrawEnrichment(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 901),
		TransactionID:     "WITHDRAW-TXN-901",
		IdempotencyKey:    "idem-withdraw-901",
		UserID:            "merchant-901",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-901",
		Amount:            1200,
		BalanceBefore:     6200,
		BalanceAfter:      5000,
		PaymentMethod:     "alipay",
		PaymentChannel:    "alipay",
		ThirdPartyOrderID: "ALI-PAYOUT-901",
		Status:            "processing",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 901),
		RequestID:         "WITHDRAW-REQ-901",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "merchant-901",
		UserType:          "merchant",
		Amount:            1200,
		Fee:               12,
		ActualAmount:      1188,
		WithdrawMethod:    "alipay",
		WithdrawAccount:   "merchant-901@example.com",
		Status:            "transferring",
		ThirdPartyOrderID: "ALI-PAYOUT-901",
		TransferResult:    "queued",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	callback := &repository.PaymentCallback{
		UnifiedIdentity:   testIdentity("CB", 901),
		CallbackID:        "CALLBACK-901",
		Channel:           "alipay",
		EventType:         "payout.success",
		ThirdPartyOrderID: "ALI-PAYOUT-901",
		TransactionID:     withdrawTx.TransactionID,
		Nonce:             "nonce-901",
		Signature:         "signature-901",
		Verified:          true,
		ReplayFingerprint: "fingerprint-901",
		Status:            "success",
		RequestHeaders:    `{"x-signature":"signature-901","X-Admin-Replay":"true","X-Admin-Replay-Of":"CALLBACK-900","X-Admin-Name":"Admin Replay"}`,
		RequestBody:       `{"status":"SUCCESS","trade_no":"ALI-PAYOUT-901"}`,
		ResponseBody:      `{"ok":true}`,
		ProcessedAt:       &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(callback).Error; err != nil {
		t.Fatalf("create callback failed: %v", err)
	}

	result, err := walletSvc.ListPaymentCallbacks(context.Background(), PaymentCallbackListQuery{
		Channel:   "alipay",
		EventType: "payout.success",
		Verified:  "true",
		Page:      1,
		Limit:     20,
	})
	if err != nil {
		t.Fatalf("list payment callbacks failed: %v", err)
	}

	items, ok := result["items"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected callback items, got %T", result["items"])
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 callback item, got %d", len(items))
	}
	item := items[0]
	if item["callback_id"] != "CALLBACK-901" {
		t.Fatalf("expected callback id CALLBACK-901, got %v", item["callback_id"])
	}
	transaction, ok := item["transaction"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected transaction summary, got %T", item["transaction"])
	}
	if transaction["business_type"] != "withdraw_request" {
		t.Fatalf("expected withdraw_request business type, got %v", transaction["business_type"])
	}
	withdraw, ok := item["withdraw"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected withdraw summary, got %T", item["withdraw"])
	}
	if withdraw["request_id"] != "WITHDRAW-REQ-901" {
		t.Fatalf("expected withdraw request id WITHDRAW-REQ-901, got %v", withdraw["request_id"])
	}
	if preview := item["request_body_preview"]; preview == "" {
		t.Fatalf("expected request body preview, got %v", preview)
	}
	if replayed, _ := item["is_admin_replay"].(bool); !replayed {
		t.Fatalf("expected callback item to be marked as admin replay, got %#v", item["is_admin_replay"])
	}
	if item["replayed_from_callback_id"] != "CALLBACK-900" {
		t.Fatalf("expected replay source callback id CALLBACK-900, got %v", item["replayed_from_callback_id"])
	}
}

func TestGetPaymentCallbackDetailReturnsParsedPayloadsAndWithdrawContext(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 902),
		TransactionID:     "WITHDRAW-TXN-902",
		IdempotencyKey:    "idem-withdraw-902",
		UserID:            "merchant-902",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-902",
		Amount:            2600,
		BalanceBefore:     8600,
		BalanceAfter:      6000,
		PaymentMethod:     "wechat",
		PaymentChannel:    "wechat",
		ThirdPartyOrderID: "WX-PAYOUT-902",
		Status:            "processing",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 902),
		RequestID:         "WITHDRAW-REQ-902",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "merchant-902",
		UserType:          "merchant",
		Amount:            2600,
		Fee:               26,
		ActualAmount:      2574,
		WithdrawMethod:    "wechat",
		WithdrawAccount:   "openid-merchant-902",
		Status:            "transferring",
		ThirdPartyOrderID: "WX-PAYOUT-902",
		TransferResult:    "queued",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	callback := &repository.PaymentCallback{
		UnifiedIdentity:   testIdentity("CB", 902),
		CallbackID:        "CALLBACK-902",
		Channel:           "wechat",
		EventType:         "payout.fail",
		ThirdPartyOrderID: "WX-PAYOUT-902",
		TransactionID:     withdrawTx.TransactionID,
		Nonce:             "nonce-902",
		Signature:         "signature-902",
		Verified:          true,
		ReplayFingerprint: "fingerprint-902",
		Status:            "success",
		RequestHeaders:    `{"wechatpay-signature":"signature-902","wechatpay-timestamp":"1712040000","X-Admin-Replay":"true","X-Admin-Replay-Of":"CALLBACK-OLD-902","X-Admin-ID":"admin-902","X-Admin-Name":"Admin Replay"}`,
		RequestBody:       `{"status":"FAILED","out_batch_no":"WX-PAYOUT-902"}`,
		ResponseBody:      `{"message":"accepted"}`,
		ProcessedAt:       &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(callback).Error; err != nil {
		t.Fatalf("create callback failed: %v", err)
	}

	result, err := walletSvc.GetPaymentCallbackDetail(context.Background(), "CALLBACK-902")
	if err != nil {
		t.Fatalf("get payment callback detail failed: %v", err)
	}

	if result["callback_id"] != "CALLBACK-902" {
		t.Fatalf("expected callback id CALLBACK-902, got %v", result["callback_id"])
	}
	requestHeaders, ok := result["request_headers"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected parsed request headers, got %T", result["request_headers"])
	}
	if requestHeaders["wechatpay-signature"] != "signature-902" {
		t.Fatalf("expected parsed signature header, got %v", requestHeaders["wechatpay-signature"])
	}
	requestBody, ok := result["request_body"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected parsed request body, got %T", result["request_body"])
	}
	if requestBody["status"] != "FAILED" {
		t.Fatalf("expected parsed request body status FAILED, got %v", requestBody["status"])
	}
	withdraw, ok := result["withdraw"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected withdraw detail, got %T", result["withdraw"])
	}
	if withdraw["request_id"] != "WITHDRAW-REQ-902" {
		t.Fatalf("expected linked withdraw request, got %v", withdraw["request_id"])
	}
	if replayed, _ := result["is_admin_replay"].(bool); !replayed {
		t.Fatalf("expected callback detail to be marked as admin replay, got %#v", result["is_admin_replay"])
	}
	if result["replayed_from_callback_id"] != "CALLBACK-OLD-902" {
		t.Fatalf("expected replay source callback id CALLBACK-OLD-902, got %v", result["replayed_from_callback_id"])
	}
	if result["replay_admin_name"] != "Admin Replay" {
		t.Fatalf("expected replay admin name, got %v", result["replay_admin_name"])
	}
}

func TestListPaymentCallbacksLinksHistoricalCallbackByBusinessIDRaw(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	withdrawTx := &repository.WalletTransaction{
		UnifiedIdentity:   testIdentity("WD", 903),
		TransactionID:     "WITHDRAW-TXN-903",
		IdempotencyKey:    "idem-withdraw-903",
		UserID:            "merchant-903",
		UserType:          "merchant",
		Type:              "withdraw",
		BusinessType:      "withdraw_request",
		BusinessID:        "WITHDRAW-REQ-903",
		Amount:            1800,
		BalanceBefore:     6800,
		BalanceAfter:      5000,
		PaymentMethod:     "wechat",
		PaymentChannel:    "wechat",
		ThirdPartyOrderID: "WX-PAYOUT-903",
		Status:            "processing",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(withdrawTx).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	withdrawRequest := &repository.WithdrawRequest{
		UnifiedIdentity:   testIdentity("WR", 903),
		RequestID:         "WITHDRAW-REQ-903",
		TransactionID:     withdrawTx.TransactionID,
		UserID:            "merchant-903",
		UserType:          "merchant",
		Amount:            1800,
		Fee:               18,
		ActualAmount:      1782,
		WithdrawMethod:    "wechat",
		WithdrawAccount:   "openid-merchant-903",
		Status:            "transferring",
		ThirdPartyOrderID: "WX-PAYOUT-903",
		TransferResult:    "queued",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(withdrawRequest).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	callback := &repository.PaymentCallback{
		UnifiedIdentity:   testIdentity("CB", 903),
		CallbackID:        "CALLBACK-903",
		Channel:           "wechat",
		EventType:         "payout.success",
		ThirdPartyOrderID: "WX-PAYOUT-903",
		TransactionID:     "76000000000003",
		TransactionIDRaw:  "WITHDRAW-REQ-903",
		Nonce:             "nonce-903",
		Signature:         "signature-903",
		Verified:          true,
		ReplayFingerprint: "fingerprint-903",
		Status:            "success",
		RequestHeaders:    `{"wechatpay-signature":"signature-903"}`,
		RequestBody:       `{"status":"SUCCESS","out_batch_no":"WITHDRAW-REQ-903"}`,
		ResponseBody:      `{"ok":true}`,
		ProcessedAt:       &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := db.Create(callback).Error; err != nil {
		t.Fatalf("create callback failed: %v", err)
	}

	result, err := walletSvc.ListPaymentCallbacks(context.Background(), PaymentCallbackListQuery{
		Channel:  "wechat",
		Page:     1,
		Limit:    20,
		Verified: "true",
	})
	if err != nil {
		t.Fatalf("list payment callbacks failed: %v", err)
	}

	items, ok := result["items"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected callback items, got %T", result["items"])
	}
	if len(items) == 0 {
		t.Fatal("expected callback items")
	}
	item := items[0]
	transaction, ok := item["transaction"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected linked transaction summary, got %T", item["transaction"])
	}
	if transaction["transaction_id"] != "WITHDRAW-TXN-903" {
		t.Fatalf("expected linked transaction id WITHDRAW-TXN-903, got %v", transaction["transaction_id"])
	}
	withdraw, ok := item["withdraw"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected linked withdraw summary, got %T", item["withdraw"])
	}
	if withdraw["request_id"] != "WITHDRAW-REQ-903" {
		t.Fatalf("expected linked withdraw request id WITHDRAW-REQ-903, got %v", withdraw["request_id"])
	}
}
