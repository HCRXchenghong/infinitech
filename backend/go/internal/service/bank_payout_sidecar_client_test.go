package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestCallBankPayoutSidecarParsesSuccessEnvelope(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/payouts/create" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get(sidecarSecretHeader); got != "bank-sidecar-secret" {
			t.Fatalf("expected sidecar secret header to be forwarded, got %q", got)
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

	result, err := callBankPayoutSidecar(context.Background(), server.URL+"/v1/payouts/create", "bank-sidecar-secret", map[string]interface{}{
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

	_, err := callBankPayoutSidecar(context.Background(), server.URL+"/v1/payouts/create", "bank-sidecar-secret", map[string]interface{}{})
	if err == nil {
		t.Fatal("expected sidecar call to fail")
	}
	if err.Error() == "" {
		t.Fatal("expected sidecar error to contain message")
	}
}

func TestCallBankPayoutSidecarRequiresAPISecret(t *testing.T) {
	_, err := callBankPayoutSidecar(context.Background(), "http://example.com/v1/payouts/create", "", map[string]interface{}{})
	if err == nil {
		t.Fatal("expected missing api secret to fail")
	}
}

func TestVerifyBankPayoutSidecarCallbackParsesVerifiedEnvelope(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/notify/verify" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get(sidecarSecretHeader); got != "bank-sidecar-secret" {
			t.Fatalf("expected sidecar secret header to be forwarded, got %q", got)
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
			SidecarURL:       server.URL,
			SidecarAPISecret: "bank-sidecar-secret",
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

func TestCreateBankPayoutSidecarDoesNotForwardAllowStubInRequestBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload failed: %v", err)
		}
		if _, exists := payload["allowStub"]; exists {
			t.Fatalf("expected allowStub to stay out of sidecar request payload, got %#v", payload["allowStub"])
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success":           true,
			"status":            "transferring",
			"gateway":           "bank_card",
			"integrationTarget": "bank-payout-sidecar",
			"thirdPartyOrderId": "BANK-OUT-ALLOW-STUB",
		})
	}))
	defer server.Close()

	walletService := &WalletService{}
	_, err := walletService.createBankPayoutSidecar(context.Background(), paymentGatewayRuntimeConfig{
		BankCard: bankCardPayoutRuntimeConfig{
			SidecarURL:       server.URL,
			SidecarAPISecret: "bank-sidecar-secret",
			ProviderURL:      "https://bank.example.com",
			MerchantID:       "merchant-1",
			APIKey:           "api-key-1",
			NotifyURL:        "https://example.com/bank/notify",
			AllowStub:        true,
			ArrivalText:      "24小时-48小时",
		},
	}, &repository.WithdrawRequest{
		RequestID:       "REQ-ALLOW-STUB",
		TransactionID:   "TXN-ALLOW-STUB",
		UserID:          "merchant-1",
		UserType:        "merchant",
		Amount:          1000,
		ActualAmount:    980,
		Fee:             20,
		WithdrawMethod:  "bank_card",
		WithdrawAccount: "6222000000000000",
		WithdrawName:    "Merchant",
		BankName:        "Test Bank",
		BankBranch:      "Test Branch",
	})
	if err != nil {
		t.Fatalf("expected bank payout sidecar call to succeed: %v", err)
	}
}
