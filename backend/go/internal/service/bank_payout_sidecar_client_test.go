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
