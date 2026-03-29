package service

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newTestFCMPrivateKeyPEM(t *testing.T) string {
	t.Helper()

	privateKey, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatalf("generate rsa key failed: %v", err)
	}

	return string(pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	}))
}

func newMobilePushServiceForDispatchTest(t *testing.T, options MobilePushOptions) (*MobilePushService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "mobile_push_dispatch_test.db")
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
		&repository.IDLegacyMapping{},
		&repository.PushDelivery{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}
	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	return newMobilePushServiceWithOptions(db, nil, options), db
}

func TestMobilePushServiceDispatchDueDeliveriesWebhookSuccess(t *testing.T) {
	ctx := context.Background()
	requests := make([]PushDispatchRequest, 0, 1)
	var signatureHeader string
	var authHeader string
	var timestampHeader string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		signatureHeader = r.Header.Get("X-Push-Signature")
		authHeader = r.Header.Get("Authorization")
		timestampHeader = r.Header.Get("X-Push-Timestamp")
		var payload PushDispatchRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode webhook request failed: %v", err)
		}
		requests = append(requests, payload)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"providerMessageId":"provider-001"}`))
	}))
	defer server.Close()

	svc, db := newMobilePushServiceForDispatchTest(t, MobilePushOptions{
		DispatchEnabled:   true,
		ProviderName:      "webhook",
		WebhookURL:        server.URL,
		WebhookSecret:     "test-secret",
		WebhookAuthHeader: "Authorization",
		WebhookAuthValue:  "Bearer push-token",
		RequestTimeout:    2 * time.Second,
		BatchSize:         10,
		MaxRetries:        2,
		RetryBackoff:      time.Minute,
	})

	delivery := repository.PushDelivery{
		MessageID:   "26032700000001",
		UserID:      "1001",
		UserType:    "customer",
		DeviceToken: "token-1",
		AppEnv:      "prod",
		EventType:   "admin_push_message",
		Status:      "queued",
		Payload:     `{"messageId":"26032700000001","title":"Hello","content":"World","route":"/pages/message/index/index"}`,
	}
	if err := db.Create(&delivery).Error; err != nil {
		t.Fatalf("create delivery failed: %v", err)
	}

	processed, err := svc.dispatchDueDeliveries(ctx, 10)
	if err != nil {
		t.Fatalf("dispatchDueDeliveries failed: %v", err)
	}
	if processed != 1 {
		t.Fatalf("expected processed count 1, got %d", processed)
	}
	if len(requests) != 1 {
		t.Fatalf("expected 1 webhook request, got %d", len(requests))
	}
	if requests[0].MessageID != delivery.MessageID {
		t.Fatalf("expected webhook message id %q, got %q", delivery.MessageID, requests[0].MessageID)
	}
	if !strings.HasPrefix(signatureHeader, "sha256=") {
		t.Fatalf("expected signature header to be set, got %q", signatureHeader)
	}
	if authHeader != "Bearer push-token" {
		t.Fatalf("expected auth header to be propagated, got %q", authHeader)
	}
	if timestampHeader == "" {
		t.Fatal("expected push timestamp header to be set")
	}

	var stored repository.PushDelivery
	if err := db.Where("id = ?", delivery.ID).Take(&stored).Error; err != nil {
		t.Fatalf("query stored delivery failed: %v", err)
	}
	if stored.Status != "sent" {
		t.Fatalf("expected sent status, got %q", stored.Status)
	}
	if stored.SentAt == nil {
		t.Fatal("expected sent_at to be set")
	}
	if stored.DispatchProvider != "webhook" {
		t.Fatalf("expected dispatch provider webhook, got %q", stored.DispatchProvider)
	}
	if stored.ProviderMessageID != "provider-001" {
		t.Fatalf("expected provider message id provider-001, got %q", stored.ProviderMessageID)
	}
	if stored.ErrorCode != "" || stored.ErrorMessage != "" {
		t.Fatalf("expected no dispatch error, got code=%q message=%q", stored.ErrorCode, stored.ErrorMessage)
	}
}

func TestMobilePushServiceDispatchDueDeliveriesWebhookRejectsLogicalFailure(t *testing.T) {
	ctx := context.Background()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":false,"code":"invalid_token","message":"token rejected"}`))
	}))
	defer server.Close()

	svc, db := newMobilePushServiceForDispatchTest(t, MobilePushOptions{
		DispatchEnabled: true,
		ProviderName:    "webhook",
		WebhookURL:      server.URL,
		RequestTimeout:  2 * time.Second,
		BatchSize:       10,
		MaxRetries:      0,
		RetryBackoff:    time.Minute,
	})

	delivery := repository.PushDelivery{
		MessageID:   "26032700000003",
		UserID:      "3001",
		UserType:    "merchant",
		DeviceToken: "token-3",
		AppEnv:      "prod",
		EventType:   "admin_push_message",
		Status:      "queued",
		Payload:     `{"messageId":"26032700000003","title":"Reject","content":"Body"}`,
	}
	if err := db.Create(&delivery).Error; err != nil {
		t.Fatalf("create delivery failed: %v", err)
	}

	processed, err := svc.dispatchDueDeliveries(ctx, 10)
	if err != nil {
		t.Fatalf("dispatchDueDeliveries failed: %v", err)
	}
	if processed != 1 {
		t.Fatalf("expected processed count 1, got %d", processed)
	}

	var stored repository.PushDelivery
	if err := db.Where("id = ?", delivery.ID).Take(&stored).Error; err != nil {
		t.Fatalf("query stored delivery failed: %v", err)
	}
	if stored.Status != "failed" {
		t.Fatalf("expected failed status, got %q", stored.Status)
	}
	if stored.ErrorCode != "invalid_token" {
		t.Fatalf("expected invalid_token error code, got %q", stored.ErrorCode)
	}
	if stored.ErrorMessage != "token rejected" {
		t.Fatalf("expected provider rejection message, got %q", stored.ErrorMessage)
	}
}

func TestMobilePushServiceDispatchDueDeliveriesRetryAndFail(t *testing.T) {
	ctx := context.Background()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "temporary push outage", http.StatusBadGateway)
	}))
	defer server.Close()

	svc, db := newMobilePushServiceForDispatchTest(t, MobilePushOptions{
		DispatchEnabled: true,
		ProviderName:    "webhook",
		WebhookURL:      server.URL,
		RequestTimeout:  2 * time.Second,
		BatchSize:       10,
		MaxRetries:      1,
		RetryBackoff:    time.Minute,
	})

	delivery := repository.PushDelivery{
		MessageID:   "26032700000002",
		UserID:      "2001",
		UserType:    "rider",
		DeviceToken: "token-2",
		AppEnv:      "test",
		EventType:   "admin_push_message",
		Status:      "queued",
		Payload:     `{"messageId":"26032700000002","title":"Retry","content":"Body"}`,
	}
	if err := db.Create(&delivery).Error; err != nil {
		t.Fatalf("create delivery failed: %v", err)
	}

	processed, err := svc.dispatchDueDeliveries(ctx, 10)
	if err != nil {
		t.Fatalf("first dispatchDueDeliveries failed: %v", err)
	}
	if processed != 1 {
		t.Fatalf("expected processed count 1 on first attempt, got %d", processed)
	}

	var firstAttempt repository.PushDelivery
	if err := db.Where("id = ?", delivery.ID).Take(&firstAttempt).Error; err != nil {
		t.Fatalf("query first attempt delivery failed: %v", err)
	}
	if firstAttempt.Status != "retry_pending" {
		t.Fatalf("expected retry_pending status, got %q", firstAttempt.Status)
	}
	if firstAttempt.RetryCount != 1 {
		t.Fatalf("expected retry_count 1, got %d", firstAttempt.RetryCount)
	}
	if firstAttempt.NextRetryAt == nil {
		t.Fatal("expected next_retry_at to be set after first failure")
	}
	if firstAttempt.ErrorCode != "http_502" {
		t.Fatalf("expected http_502 error code, got %q", firstAttempt.ErrorCode)
	}

	if err := db.Model(&repository.PushDelivery{}).
		Where("id = ?", delivery.ID).
		Update("next_retry_at", time.Now().Add(-time.Second)).Error; err != nil {
		t.Fatalf("update next_retry_at failed: %v", err)
	}

	processed, err = svc.dispatchDueDeliveries(ctx, 10)
	if err != nil {
		t.Fatalf("second dispatchDueDeliveries failed: %v", err)
	}
	if processed != 1 {
		t.Fatalf("expected processed count 1 on second attempt, got %d", processed)
	}

	var secondAttempt repository.PushDelivery
	if err := db.Where("id = ?", delivery.ID).Take(&secondAttempt).Error; err != nil {
		t.Fatalf("query second attempt delivery failed: %v", err)
	}
	if secondAttempt.Status != "failed" {
		t.Fatalf("expected failed status, got %q", secondAttempt.Status)
	}
	if secondAttempt.RetryCount != 2 {
		t.Fatalf("expected retry_count 2, got %d", secondAttempt.RetryCount)
	}
	if secondAttempt.NextRetryAt != nil {
		t.Fatalf("expected next_retry_at cleared after terminal failure, got %+v", secondAttempt.NextRetryAt)
	}
	if secondAttempt.DispatchProvider != "webhook" {
		t.Fatalf("expected dispatch provider webhook, got %q", secondAttempt.DispatchProvider)
	}
}

func TestMobilePushServiceDispatchDueDeliveriesFCMSuccess(t *testing.T) {
	ctx := context.Background()
	privateKeyPEM := newTestFCMPrivateKeyPEM(t)
	var tokenAuthHeader string
	var fcmAuthHeader string
	var fcmBody map[string]interface{}

	tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenAuthHeader = r.Header.Get("Content-Type")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"fcm-test-access-token","token_type":"Bearer","expires_in":3600}`))
	}))
	defer tokenServer.Close()

	fcmServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		fcmAuthHeader = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&fcmBody); err != nil {
			t.Fatalf("decode fcm request failed: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"name":"projects/demo-project/messages/42"}`))
	}))
	defer fcmServer.Close()

	svc, db := newMobilePushServiceForDispatchTest(t, MobilePushOptions{
		DispatchEnabled: true,
		ProviderName:    "fcm",
		FCMProjectID:    "demo-project",
		FCMClientEmail:  "firebase-adminsdk@example.iam.gserviceaccount.com",
		FCMPrivateKey:   privateKeyPEM,
		FCMTokenURL:     tokenServer.URL,
		FCMAPIBaseURL:   fcmServer.URL,
		RequestTimeout:  2 * time.Second,
		BatchSize:       10,
		MaxRetries:      1,
		RetryBackoff:    time.Minute,
	})

	delivery := repository.PushDelivery{
		MessageID:   "26032700000088",
		UserID:      "8801",
		UserType:    "customer",
		DeviceToken: "fcm-device-token",
		AppEnv:      "prod",
		EventType:   "admin_push_message",
		Status:      "queued",
		Payload:     `{"messageId":"26032700000088","title":"Hello","content":"FCM world","route":"/pages/message/index/index"}`,
	}
	if err := db.Create(&delivery).Error; err != nil {
		t.Fatalf("create delivery failed: %v", err)
	}

	processed, err := svc.dispatchDueDeliveries(ctx, 10)
	if err != nil {
		t.Fatalf("dispatchDueDeliveries failed: %v", err)
	}
	if processed != 1 {
		t.Fatalf("expected processed count 1, got %d", processed)
	}
	if tokenAuthHeader != "application/x-www-form-urlencoded" {
		t.Fatalf("expected token content-type header, got %q", tokenAuthHeader)
	}
	if fcmAuthHeader != "Bearer fcm-test-access-token" {
		t.Fatalf("expected bearer auth header, got %q", fcmAuthHeader)
	}

	message, ok := fcmBody["message"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected FCM message payload, got %#v", fcmBody)
	}
	if token := message["token"]; token != "fcm-device-token" {
		t.Fatalf("expected device token in FCM payload, got %#v", token)
	}

	var stored repository.PushDelivery
	if err := db.Where("id = ?", delivery.ID).Take(&stored).Error; err != nil {
		t.Fatalf("query stored delivery failed: %v", err)
	}
	if stored.Status != "sent" {
		t.Fatalf("expected sent status, got %q", stored.Status)
	}
	if stored.DispatchProvider != "fcm" {
		t.Fatalf("expected dispatch provider fcm, got %q", stored.DispatchProvider)
	}
	if stored.ProviderMessageID != "projects/demo-project/messages/42" {
		t.Fatalf("expected FCM provider message id, got %q", stored.ProviderMessageID)
	}
}
