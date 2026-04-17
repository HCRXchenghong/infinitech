package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCallAlipaySidecarParsesSuccessEnvelope(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/payments/create" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get(sidecarSecretHeader); got != "alipay-sidecar-secret" {
			t.Fatalf("expected sidecar secret header to be forwarded, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":           true,
			"status":            "awaiting_client_pay",
			"gateway":           "alipay",
			"integrationTarget": "official-sidecar-sdk",
			"thirdPartyOrderId": "OUT123",
			"clientPayload": map[string]interface{}{
				"gateway": "alipay",
			},
			"responseData": map[string]interface{}{
				"status": "awaiting_client_pay",
			},
		})
	}))
	defer server.Close()

	result, err := callAlipaySidecar(context.Background(), server.URL+"/v1/payments/create", "alipay-sidecar-secret", map[string]interface{}{
		"outTradeNo": "OUT123",
	})
	if err != nil {
		t.Fatalf("expected sidecar call to succeed: %v", err)
	}
	if result.ThirdPartyOrderID != "OUT123" {
		t.Fatalf("expected third party order id to be parsed, got %q", result.ThirdPartyOrderID)
	}
	if result.Status != "awaiting_client_pay" {
		t.Fatalf("expected awaiting_client_pay, got %q", result.Status)
	}
}

func TestCallAlipaySidecarReturnsReadableError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "notifyUrl is required",
		})
	}))
	defer server.Close()

	_, err := callAlipaySidecar(context.Background(), server.URL+"/v1/payments/create", "alipay-sidecar-secret", map[string]interface{}{})
	if err == nil {
		t.Fatal("expected sidecar call to fail")
	}
	if err.Error() == "" {
		t.Fatal("expected sidecar error to contain message")
	}
}

func TestCallAlipaySidecarRequiresAPISecret(t *testing.T) {
	_, err := callAlipaySidecar(context.Background(), "http://example.com/v1/payments/create", "", map[string]interface{}{})
	if err == nil {
		t.Fatal("expected missing api secret to fail")
	}
}
