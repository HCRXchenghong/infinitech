package handler

import (
	"bytes"
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

func newPhoneChangeHandlerTestEnv(t *testing.T) (*UserHandler, *RiderHandler, *service.AuthService, *gorm.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dbPath := filepath.Join(t.TempDir(), "phone_change_contract_test.db")
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
		&repository.User{},
		&repository.Rider{},
		&repository.SMSVerificationCode{},
	); err != nil {
		t.Fatalf("auto migrate phone change models failed: %v", err)
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

	userHandler := NewUserHandler(service.NewUserService(repo, authService))
	riderHandler := NewRiderHandler(db, nil, authService)
	return userHandler, riderHandler, authService, db
}

func storePhoneChangeSMSCode(t *testing.T, db *gorm.DB, scene, phone, code string) {
	t.Helper()

	record := repository.SMSVerificationCode{
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  phone + code,
			TSID: scene + phone + code,
		},
		Scene:     scene,
		Phone:     phone,
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	if err := db.Create(&record).Error; err != nil {
		t.Fatalf("store sms code failed: %v", err)
	}
}

func TestUserChangePhoneReturnsStandardizedAuthSessionEnvelope(t *testing.T) {
	userHandler, _, authService, db := newPhoneChangeHandlerTestEnv(t)

	user := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25042101000001"},
		Phone:           "13800138161",
		Name:            "User Change",
		Type:            "customer",
		PasswordHash:    "hash",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	storePhoneChangeSMSCode(t, db, "change_phone_verify", user.Phone, "123456")
	storePhoneChangeSMSCode(t, db, "change_phone_new", "13800138162", "654321")

	body, _ := json.Marshal(map[string]string{
		"oldPhone": user.Phone,
		"oldCode":  "123456",
		"newPhone": "13800138162",
		"newCode":  "654321",
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: user.UID}}
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/user/"+user.UID+"/change-phone", bytes.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	userHandler.ChangePhone(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	payload := decodeHandlerPayload(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}
	if data["authenticated"] != true {
		t.Fatalf("expected authenticated true, got %v", data["authenticated"])
	}
	session, ok := data["session"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected session object, got %T", data["session"])
	}
	if session["token"] == "" || session["refreshToken"] == "" {
		t.Fatalf("expected session token pair, got %#v", session)
	}
	if payload["token"] != data["token"] || payload["refreshToken"] != data["refreshToken"] {
		t.Fatalf("expected mirrored token fields to match normalized data, got %#v", payload)
	}
	verified, phone, userID, err := authService.VerifyUserToken(session["token"].(string))
	if err != nil || !verified {
		t.Fatalf("verify user token failed: %v", err)
	}
	if userID != int64(user.ID) || phone != "13800138162" {
		t.Fatalf("unexpected user token identity: phone=%q userID=%d", phone, userID)
	}

	var stored repository.User
	if err := db.First(&stored, user.ID).Error; err != nil {
		t.Fatalf("reload user failed: %v", err)
	}
	if stored.Phone != "13800138162" {
		t.Fatalf("expected stored phone to update, got %q", stored.Phone)
	}
}

func TestRiderSecureChangePhoneReturnsStandardizedRiderSessionEnvelope(t *testing.T) {
	_, riderHandler, authService, db := newPhoneChangeHandlerTestEnv(t)

	rider := repository.Rider{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25042101000002"},
		Phone:           "13800138171",
		Name:            "Rider Change",
		Nickname:        "闪送骑手",
		PasswordHash:    "hash",
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("create rider failed: %v", err)
	}

	storePhoneChangeSMSCode(t, db, "change_phone_verify", rider.Phone, "123456")
	storePhoneChangeSMSCode(t, db, "change_phone_new", "13800138172", "654321")

	body, _ := json.Marshal(map[string]string{
		"oldPhone": rider.Phone,
		"oldCode":  "123456",
		"newPhone": "13800138172",
		"newCode":  "654321",
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/riders/1/change-phone", bytes.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	riderHandler.SecureChangePhone(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	payload := decodeHandlerPayload(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}
	if data["authenticated"] != true {
		t.Fatalf("expected authenticated true, got %v", data["authenticated"])
	}
	session, ok := data["session"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected session object, got %T", data["session"])
	}
	token, _ := session["token"].(string)
	if token == "" {
		t.Fatalf("expected rider session token, got %#v", session)
	}
	if _, hasRefresh := session["refreshToken"]; hasRefresh {
		t.Fatalf("did not expect rider refresh token in session payload, got %#v", session)
	}
	if payload["token"] != token {
		t.Fatalf("expected mirrored token to match session token, got %v", payload["token"])
	}
	verified, phone, riderID, err := authService.VerifyRiderToken(token)
	if err != nil || !verified {
		t.Fatalf("verify rider token failed: %v", err)
	}
	if riderID != int64(rider.ID) || phone != "13800138172" {
		t.Fatalf("unexpected rider token identity: phone=%q riderID=%d", phone, riderID)
	}

	var stored repository.Rider
	if err := db.First(&stored, rider.ID).Error; err != nil {
		t.Fatalf("reload rider failed: %v", err)
	}
	if stored.Phone != "13800138172" {
		t.Fatalf("expected stored phone to update, got %q", stored.Phone)
	}
}
