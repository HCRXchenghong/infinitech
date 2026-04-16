package service

import (
	"context"
	"strings"
	"testing"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestBuildPaymentCallbackAcknowledgement(t *testing.T) {
	wechatAck := BuildPaymentCallbackAcknowledgement("wechat", true)
	if wechatAck.ContentType != "application/json; charset=utf-8" {
		t.Fatalf("expected wechat ack content type json, got %q", wechatAck.ContentType)
	}
	if wechatAck.Body != `{"code":"SUCCESS","message":"成功"}` {
		t.Fatalf("unexpected wechat success ack body %q", wechatAck.Body)
	}

	alipayAck := BuildPaymentCallbackAcknowledgement("alipay", false)
	if alipayAck.ContentType != "text/plain; charset=utf-8" {
		t.Fatalf("expected alipay ack content type text, got %q", alipayAck.ContentType)
	}
	if alipayAck.Body != "fail" {
		t.Fatalf("unexpected alipay failure ack body %q", alipayAck.Body)
	}

	bankAck := BuildPaymentCallbackAcknowledgement("bank_card", true)
	if bankAck.Body != "ok" {
		t.Fatalf("unexpected bank-card success ack body %q", bankAck.Body)
	}
}

func TestRecordCallbackAllowsRetryAfterProcessingError(t *testing.T) {
	paymentSvc, db := newPaymentServiceForTest(t)

	callbackReq := PaymentCallbackRequest{
		Channel:           "alipay",
		EventType:         "trade.success",
		Signature:         "retry-signature",
		Nonce:             "retry-nonce",
		ThirdPartyOrderID: "ALI-MISSING-RETRY",
		Verified:          true,
		RawBody:           `{"trade_status":"TRADE_SUCCESS","trade_no":"ALI-MISSING-RETRY"}`,
	}

	if _, err := paymentSvc.RecordCallback(context.Background(), callbackReq); err == nil {
		t.Fatal("expected first callback attempt to fail when target transaction is missing")
	}
	if _, err := paymentSvc.RecordCallback(context.Background(), callbackReq); err == nil {
		t.Fatal("expected second callback attempt to retry instead of being deduplicated")
	}

	callbacks := make([]repository.PaymentCallback, 0, 2)
	if err := db.Order("id ASC").Find(&callbacks).Error; err != nil {
		t.Fatalf("query payment callbacks failed: %v", err)
	}
	if len(callbacks) != 2 {
		t.Fatalf("expected 2 callback records after retry, got %d", len(callbacks))
	}

	for _, callback := range callbacks {
		if callback.Status != "processing" {
			t.Fatalf("expected retryable callback status processing, got %q", callback.Status)
		}
		if strings.TrimSpace(callback.ResponseBody) != "fail" {
			t.Fatalf("expected retryable callback response body fail, got %q", callback.ResponseBody)
		}
	}
}
