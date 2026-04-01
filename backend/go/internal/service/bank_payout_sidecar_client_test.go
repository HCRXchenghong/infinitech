package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCallBankPayoutSidecarParsesSuccessEnvelope(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/payouts/create" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":           true,
			"status":            "transferring",
			"gateway":           "bank_card",
			"integrationTarget": "bank-payout-sidecar",
			"thirdPartyOrderId": "BANK-OUT-1",
			"transferResult":    "queued",
			"responseData": map[string]interface{}{
				"status": "transferring",
			},
		})
	}))
	defer server.Close()

	result, err := callBankPayoutSidecar(context.Background(), server.URL+"/v1/payouts/create", map[string]interface{}{
		"requestId": "REQ-1",
	})
	if err != nil {
		t.Fatalf("expected sidecar call to succeed: %v", err)
	}
	if result.ThirdPartyOrderID != "BANK-OUT-1" {
		t.Fatalf("expected third party order id to be parsed, got %q", result.ThirdPartyOrderID)
	}
	if result.Status != "transferring" {
		t.Fatalf("expected transferring, got %q", result.Status)
	}
}

func TestCallBankPayoutSidecarReturnsReadableError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "merchantId is required",
		})
	}))
	defer server.Close()

	_, err := callBankPayoutSidecar(context.Background(), server.URL+"/v1/payouts/create", map[string]interface{}{})
	if err == nil {
		t.Fatal("expected sidecar call to fail")
	}
	if err.Error() == "" {
		t.Fatal("expected sidecar error to contain message")
	}
}

func TestVerifyBankPayoutSidecarCallbackParsesVerifiedEnvelope(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/notify/verify" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":           true,
			"status":            "verified",
			"verified":          true,
			"gateway":           "bank_card",
			"integrationTarget": "bank-payout-sidecar",
			"transactionId":     "WITHDRAW-TXN-1",
			"thirdPartyOrderId": "BANK-PAYOUT-1",
			"eventType":         "payout.success",
			"responseData": map[string]interface{}{
				"gatewayStatus": "success",
			},
		})
	}))
	defer server.Close()

	envelope, err := verifyBankPayoutSidecarCallback(context.Background(), paymentGatewayRuntimeConfig{
		BankCard: bankCardPayoutRuntimeConfig{
			SidecarURL: server.URL,
		},
	}, PaymentCallbackRequest{
		Channel: "bank_card",
		Params: map[string]string{
			"requestId": "WITHDRAW-REQ-1",
		},
		RawBody: `{"status":"success"}`,
	})
	if err != nil {
		t.Fatalf("expected verify callback to succeed: %v", err)
	}
	if !envelope.Verified {
		t.Fatal("expected verified callback envelope")
	}
	if envelope.EventType != "payout.success" {
		t.Fatalf("expected payout.success, got %q", envelope.EventType)
	}
	if envelope.TransactionID != "WITHDRAW-TXN-1" {
		t.Fatalf("expected transaction id to be parsed, got %q", envelope.TransactionID)
	}
	if envelope.ThirdPartyOrderID != "BANK-PAYOUT-1" {
		t.Fatalf("expected third party order id to be parsed, got %q", envelope.ThirdPartyOrderID)
	}
}
