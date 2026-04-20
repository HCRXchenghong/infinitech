package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

func newAuthHandlerForVerifyTest(t *testing.T) (*AuthHandler, *service.AuthService, *gorm.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dbPath := filepath.Join(t.TempDir(), "auth_handler_verify_test.db")
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

	if err := db.AutoMigrate(&repository.User{}); err != nil {
		t.Fatalf("auto migrate user failed: %v", err)
	}

	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:             "12345678901234567890123456789012",
			AccessTokenExpiry:  2 * time.Hour,
			RefreshTokenExpiry: 30 * 24 * time.Hour,
		},
	}

	repo := repository.NewUserRepository(db)
	authService := service.NewAuthService(repo, cfg)
	authService.SetDBAndRedis(db, nil)
	return NewAuthHandler(authService), authService, db
}

func TestAuthVerifyReturnsStandardizedIdentityEnvelope(t *testing.T) {
	handler, authService, db := newAuthHandlerForVerifyTest(t)

	user := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072402000051"},
		Phone:           "13800138151",
		Name:            "Verify User",
		Type:            "customer",
		PasswordHash:    "hash",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	token, err := authService.IssueAccessToken(user.Phone, int64(user.ID))
	if err != nil {
		t.Fatalf("issue access token failed: %v", err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/auth/verify", nil)
	ctx.Request.Header.Set("Authorization", "Bearer "+token)
	ctx.Set("request_id", "req-auth-verify-test")

	handler.VerifyToken(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload failed: %v", err)
	}

	if payload["request_id"] != "req-auth-verify-test" {
		t.Fatalf("expected request_id req-auth-verify-test, got %v", payload["request_id"])
	}
	if payload["code"] != responseCodeOK {
		t.Fatalf("expected code %s, got %v", responseCodeOK, payload["code"])
	}
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}
	if data["valid"] != true {
		t.Fatalf("expected data.valid true, got %v", data["valid"])
	}
	identity, ok := data["identity"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data.identity object, got %T", data["identity"])
	}
	if identity["principalId"] != user.UID {
		t.Fatalf("expected principalId %q, got %v", user.UID, identity["principalId"])
	}
	if identity["principalType"] != "user" {
		t.Fatalf("expected principalType user, got %v", identity["principalType"])
	}
	if identity["legacyId"] != "1" {
		t.Fatalf("expected legacyId 1, got %v", identity["legacyId"])
	}
	if payload["userId"] != float64(user.ID) {
		t.Fatalf("expected mirrored userId %d, got %v", user.ID, payload["userId"])
	}
}
