package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newRiderHandlerForProfileSecurityTest(t *testing.T) (*RiderHandler, *gorm.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dbPath := filepath.Join(t.TempDir(), "rider_handler_profile_security_test.db")
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

	if err := db.AutoMigrate(&repository.Rider{}); err != nil {
		t.Fatalf("auto migrate rider failed: %v", err)
	}

	return NewRiderHandler(db, nil, nil), db
}

func decodeHandlerPayload(t *testing.T, recorder *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()

	var payload map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload failed: %v", err)
	}
	return payload
}

func TestRiderUpdateProfileRejectsSelfVerifiedMutation(t *testing.T) {
	handler, db := newRiderHandlerForProfileSecurityTest(t)

	rider := repository.Rider{
		Phone:      "13800138041",
		Name:       "Rider",
		RealName:   "Tester",
		IsVerified: false,
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("create rider failed: %v", err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	ctx.Request = httptest.NewRequest(
		http.MethodPut,
		"/api/riders/1/profile",
		bytes.NewBufferString(`{"is_verified":true}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.UpdateProfile(ctx)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", recorder.Code)
	}

	payload := decodeHandlerPayload(t, recorder)
	if payload["message"] != "骑手不能自行修改认证状态" {
		t.Fatalf("unexpected message: %v", payload["message"])
	}

	var stored repository.Rider
	if err := db.First(&stored, rider.ID).Error; err != nil {
		t.Fatalf("load rider failed: %v", err)
	}
	if stored.IsVerified {
		t.Fatal("expected rider verification flag to remain unchanged")
	}
}

func TestRiderUpdateProfileResetsVerificationAfterIdentityChange(t *testing.T) {
	handler, db := newRiderHandlerForProfileSecurityTest(t)

	rider := repository.Rider{
		Phone:        "13800138042",
		Name:         "Rider",
		RealName:     "Old Name",
		IDCardNumber: "110101199001011234",
		IDCardFront:  "private:rider-cert/1/id_card_front/front.png",
		IDCardBack:   "private:rider-cert/1/id_card_back/back.png",
		HealthCert:   "private:rider-cert/1/health_cert/health.png",
		IsVerified:   true,
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("create rider failed: %v", err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	ctx.Request = httptest.NewRequest(
		http.MethodPut,
		"/api/riders/1/profile",
		bytes.NewBufferString(`{"real_name":"New Name"}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.UpdateProfile(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	payload := decodeHandlerPayload(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}
	if data["verification_reset"] != true {
		t.Fatalf("expected verification_reset true, got %v", data["verification_reset"])
	}

	var stored repository.Rider
	if err := db.First(&stored, rider.ID).Error; err != nil {
		t.Fatalf("load rider failed: %v", err)
	}
	if stored.RealName != "New Name" {
		t.Fatalf("expected updated real name, got %q", stored.RealName)
	}
	if stored.IsVerified {
		t.Fatal("expected rider verification flag to reset after identity change")
	}
}

func TestRiderUpdateProfileKeepsVerificationForNonIdentityChanges(t *testing.T) {
	handler, db := newRiderHandlerForProfileSecurityTest(t)

	rider := repository.Rider{
		Phone:        "13800138043",
		Name:         "Rider",
		Nickname:     "Old Nick",
		RealName:     "Verified Rider",
		IDCardNumber: "110101199001011235",
		IDCardFront:  "private:rider-cert/1/id_card_front/front.png",
		IDCardBack:   "private:rider-cert/1/id_card_back/back.png",
		IsVerified:   true,
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("create rider failed: %v", err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	ctx.Request = httptest.NewRequest(
		http.MethodPut,
		"/api/riders/1/profile",
		bytes.NewBufferString(`{"nickname":"New Nick"}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.UpdateProfile(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	payload := decodeHandlerPayload(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}
	if data["verification_reset"] != false {
		t.Fatalf("expected verification_reset false, got %v", data["verification_reset"])
	}

	var stored repository.Rider
	if err := db.First(&stored, rider.ID).Error; err != nil {
		t.Fatalf("load rider failed: %v", err)
	}
	if stored.Nickname != "New Nick" {
		t.Fatalf("expected nickname to update, got %q", stored.Nickname)
	}
	if !stored.IsVerified {
		t.Fatal("expected rider verification flag to remain true for nickname update")
	}
}
