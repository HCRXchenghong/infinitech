package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"testing"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestBuildScanTokenRequiresSigningSecret(t *testing.T) {
	svc := NewGroupbuyService(nil, "   ")
	voucher := repository.GroupbuyVoucher{
		ID:        1,
		VoucherNo: "VOUCHER-001",
		ShopID:    "shop-1",
		OrderID:   9,
	}

	if _, _, err := svc.buildScanToken(voucher, time.Minute); err == nil {
		t.Fatal("expected missing signing secret to fail")
	}
}

func TestTryParseScanTokenRejectsLegacyFallbackSecret(t *testing.T) {
	token := signLegacyGroupbuyToken(t, voucherScanPayload{
		VoucherID: 7,
		VoucherNo: "VOUCHER-007",
		ShopID:    "shop-7",
		OrderID:   17,
		Exp:       time.Now().Add(time.Minute).Unix(),
		Nonce:     "abcd1234",
	})

	if _, ok := tryParseScanToken(token, "real-signing-secret"); ok {
		t.Fatal("expected legacy fallback-signed token to be rejected")
	}
}

func TestTryParseScanTokenAcceptsConfiguredSecret(t *testing.T) {
	secret := "real-signing-secret"
	token := signGroupbuyToken(t, voucherScanPayload{
		VoucherID: 12,
		VoucherNo: "VOUCHER-012",
		ShopID:    "shop-12",
		OrderID:   23,
		Exp:       time.Now().Add(time.Minute).Unix(),
		Nonce:     "efgh5678",
	}, secret)

	payload, ok := tryParseScanToken(token, secret)
	if !ok {
		t.Fatal("expected configured secret to verify scan token")
	}
	if payload.VoucherID != 12 || payload.VoucherNo != "VOUCHER-012" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
}

func signLegacyGroupbuyToken(t *testing.T, payload voucherScanPayload) string {
	t.Helper()
	return signGroupbuyToken(t, payload, "groupbuy-scan-secret")
}

func signGroupbuyToken(t *testing.T, payload voucherScanPayload, secret string) string {
	t.Helper()

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	payloadSegment := base64.RawURLEncoding.EncodeToString(raw)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(payloadSegment))
	signature := hex.EncodeToString(mac.Sum(nil))
	return payloadSegment + "." + signature
}
