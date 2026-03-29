package config

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"testing"
	"time"
)

func newValidConfigForTest() *Config {
	return &Config{
		Env:  "development",
		Port: "1029",
		Database: DatabaseConfig{
			Host:            "127.0.0.1",
			Port:            "5432",
			User:            "yuexiang_user",
			Password:        "yuexiang_password",
			DBName:          "yuexiang",
			Driver:          "postgres",
			MaxOpenConns:    40,
			MaxIdleConns:    20,
			ConnMaxLifetime: time.Hour,
			ConnMaxIdleTime: 30 * time.Minute,
		},
		Redis: RedisConfig{
			Enabled:  true,
			Required: false,
			Host:     "127.0.0.1",
			Port:     "2550",
		},
		Push: PushConfig{
			DispatchEnabled:  false,
			DispatchProvider: "log",
			FCMTokenURL:      "https://oauth2.googleapis.com/token",
			FCMAPIBaseURL:    "https://fcm.googleapis.com",
			RequestTimeout:   5 * time.Second,
			PollInterval:     15 * time.Second,
			BatchSize:        100,
			MaxRetries:       5,
			RetryBackoff:     60 * time.Second,
			ReadyMaxQueue:    5000,
			ReadyMaxQueueAge: 30 * time.Minute,
		},
		HTTP: HTTPConfig{
			ReadTimeout:        15 * time.Second,
			ReadHeaderTimeout:  10 * time.Second,
			WriteTimeout:       30 * time.Second,
			IdleTimeout:        60 * time.Second,
			ShutdownTimeout:    15 * time.Second,
			SlowRequestWarn:    1500 * time.Millisecond,
			MaxBodyBytes:       1024 * 1024,
			MaxUploadBytes:     12 * 1024 * 1024,
			MaxMultipartMemory: 8 * 1024 * 1024,
			RateLimitEnabled:   true,
			RateLimitWindow:    60 * time.Second,
			RateLimitMax:       6000,
			TrustedProxies:     []string{"127.0.0.1", "::1"},
		},
	}
}

func validFCMPrivateKeyForTest(t *testing.T) string {
	t.Helper()

	key, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatalf("generate rsa key: %v", err)
	}

	encoded, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatalf("marshal private key: %v", err)
	}

	return string(pem.EncodeToMemory(&pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: encoded,
	}))
}

func TestValidateAllowsDevelopmentSQLite(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Database.Driver = "sqlite"
	cfg.Database.DSN = "data/yuexiang.db"
	cfg.Database.Host = ""
	cfg.Database.Port = ""
	cfg.Database.User = ""
	cfg.Database.DBName = ""

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected development sqlite to be allowed, got %v", err)
	}
}

func TestValidateRejectsProductionSQLite(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Database.Driver = "sqlite"
	cfg.Database.DSN = "data/yuexiang.db"
	cfg.Database.Host = ""
	cfg.Database.Port = ""
	cfg.Database.User = ""
	cfg.Database.DBName = ""

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected production sqlite to be rejected")
	}
}

func TestValidateRejectsProductionMySQLByDefault(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Database.Driver = "mysql"
	cfg.Database.Port = "3306"

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected production mysql to be rejected without override")
	}
}

func TestValidateAllowsProductionMySQLWithEmergencyOverride(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Database.Driver = "mysql"
	cfg.Database.Port = "3306"
	cfg.Database.AllowLegacyProductionDriver = true

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected production mysql with override to pass, got %v", err)
	}
}

func TestValidateRejectsRequiredRedisWhenDisabled(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Enabled = false
	cfg.Redis.Required = true

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected required redis disabled to be rejected")
	}
}

func TestValidateRejectsNegativePushReadyMaxQueue(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Push.ReadyMaxQueue = -1

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected negative push ready max queue to be rejected")
	}
}

func TestValidateRejectsNegativePushReadyMaxQueueAge(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Push.ReadyMaxQueueAge = -1 * time.Second

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected negative push ready max queue age to be rejected")
	}
}

func TestValidateRejectsProductionLogPushProviderWhenDispatchEnabled(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "log"

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected production log push provider to be rejected")
	}
}

func TestValidateAllowsProductionWebhookPushProviderWhenConfigured(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "webhook"
	cfg.Push.WebhookURL = "https://push-gateway.example.com/dispatch"
	cfg.Push.WebhookSecret = "test-secret"

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected production webhook push provider to pass, got %v", err)
	}
}

func TestValidateRejectsProductionWebhookWithoutHTTPS(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "webhook"
	cfg.Push.WebhookURL = "http://push-gateway.example.com/dispatch"
	cfg.Push.WebhookSecret = "test-secret"

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected non-https production webhook push provider to be rejected")
	}
}

func TestValidateRejectsProductionWebhookToLocalhost(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "webhook"
	cfg.Push.WebhookURL = "https://localhost:9443/dispatch"
	cfg.Push.WebhookSecret = "test-secret"

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected localhost production webhook push provider to be rejected")
	}
}

func TestValidateRejectsProductionWebhookToPrivateIP(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "webhook"
	cfg.Push.WebhookURL = "https://10.20.30.40/dispatch"
	cfg.Push.WebhookSecret = "test-secret"

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected private-ip production webhook push provider to be rejected")
	}
}

func TestValidateRejectsProductionWebhookWithoutAuthOrSigning(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "webhook"
	cfg.Push.WebhookURL = "https://push-gateway.example.com/dispatch"

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected unsigned and unauthenticated production webhook push provider to be rejected")
	}
}

func TestValidateRejectsIncompleteWebhookAuthConfig(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "webhook"
	cfg.Push.WebhookURL = "https://push-gateway.example.com/dispatch"
	cfg.Push.WebhookAuthHeader = "Authorization"
	cfg.Push.WebhookAuthValue = ""

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected incomplete webhook auth config to be rejected")
	}
}

func TestValidateAllowsProductionFCMWhenConfigured(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "fcm"
	cfg.Push.FCMProjectID = "demo-project"
	cfg.Push.FCMClientEmail = "firebase-adminsdk@example.iam.gserviceaccount.com"
	cfg.Push.FCMPrivateKey = validFCMPrivateKeyForTest(t)

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected production fcm push provider to pass, got %v", err)
	}
}

func TestValidateRejectsProductionFCMWithoutCredentials(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "fcm"
	cfg.Push.FCMProjectID = ""
	cfg.Push.FCMClientEmail = ""
	cfg.Push.FCMPrivateKey = ""

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected incomplete production fcm push provider to be rejected")
	}
}

func TestValidateRejectsProductionFCMPrivateTokenEndpoint(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "fcm"
	cfg.Push.FCMProjectID = "demo-project"
	cfg.Push.FCMClientEmail = "firebase-adminsdk@example.iam.gserviceaccount.com"
	cfg.Push.FCMPrivateKey = validFCMPrivateKeyForTest(t)
	cfg.Push.FCMTokenURL = "https://127.0.0.1/token"

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected private production fcm token endpoint to be rejected")
	}
}

func TestValidateRejectsProductionFCMWithInvalidClientEmail(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "fcm"
	cfg.Push.FCMProjectID = "demo-project"
	cfg.Push.FCMClientEmail = "invalid-email"
	cfg.Push.FCMPrivateKey = validFCMPrivateKeyForTest(t)

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected invalid production fcm client email to be rejected")
	}
}

func TestValidateRejectsProductionFCMWithInvalidPrivateKey(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.Env = "production"
	cfg.Redis.Required = true
	cfg.Push.DispatchEnabled = true
	cfg.Push.DispatchProvider = "fcm"
	cfg.Push.FCMProjectID = "demo-project"
	cfg.Push.FCMClientEmail = "firebase-adminsdk@example.iam.gserviceaccount.com"
	cfg.Push.FCMPrivateKey = "-----BEGIN PRIVATE KEY-----\ninvalid\n-----END PRIVATE KEY-----"

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected invalid production fcm private key to be rejected")
	}
}

func TestValidateRejectsNonPositiveSlowRequestWarn(t *testing.T) {
	cfg := newValidConfigForTest()
	cfg.HTTP.SlowRequestWarn = 0

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected non-positive slow request warn threshold to be rejected")
	}
}
