package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
)

func decodeAuthHandlerPayload(t *testing.T, recorder *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()

	var payload map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload failed: %v", err)
	}
	return payload
}

func TestBuildAuthSessionPayloadStandardizesTokenAndBindingContracts(t *testing.T) {
	loginPayload, ok := buildAuthSessionPayload(&service.LoginResponse{
		Success:      true,
		Token:        "token_1",
		RefreshToken: "refresh_1",
		ExpiresIn:    7200,
		User: map[string]interface{}{
			"id":   "user_uid_1",
			"name": "Tester",
		},
	}).(gin.H)
	if !ok {
		t.Fatalf("expected login payload gin.H, got %T", buildAuthSessionPayload(&service.LoginResponse{}))
	}

	if loginPayload["authenticated"] != true {
		t.Fatalf("expected authenticated true, got %v", loginPayload["authenticated"])
	}
	session, ok := loginPayload["session"].(gin.H)
	if !ok {
		t.Fatalf("expected session object, got %T", loginPayload["session"])
	}
	if session["token"] != "token_1" || session["refreshToken"] != "refresh_1" {
		t.Fatalf("unexpected session payload: %#v", session)
	}
	if loginPayload["token"] != "token_1" || loginPayload["refreshToken"] != "refresh_1" {
		t.Fatalf("expected legacy mirrored token fields, got %#v", loginPayload)
	}

	wechatPayload, ok := buildAuthSessionPayload(&service.WechatSessionResult{
		Type:      "bind_required",
		Message:   "请继续绑定手机号",
		BindToken: "bind_1",
		Nickname:  "微信用户",
		AvatarURL: "https://example.com/avatar.png",
	}).(gin.H)
	if !ok {
		t.Fatalf("expected wechat payload gin.H, got %T", buildAuthSessionPayload(&service.WechatSessionResult{}))
	}
	if wechatPayload["type"] != "bind_required" {
		t.Fatalf("expected type bind_required, got %v", wechatPayload["type"])
	}
	if wechatPayload["authenticated"] != false {
		t.Fatalf("expected authenticated false, got %v", wechatPayload["authenticated"])
	}
	binding, ok := wechatPayload["binding"].(gin.H)
	if !ok {
		t.Fatalf("expected binding object, got %T", wechatPayload["binding"])
	}
	if binding["bindToken"] != "bind_1" || binding["nickname"] != "微信用户" {
		t.Fatalf("unexpected binding payload: %#v", binding)
	}
	if wechatPayload["bindToken"] != "bind_1" {
		t.Fatalf("expected bindToken mirror, got %v", wechatPayload["bindToken"])
	}
}

func TestAuthRefreshReturnsStandardizedSessionEnvelope(t *testing.T) {
	handler, authService, db := newAuthHandlerForVerifyTest(t)

	user := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072402000052"},
		Phone:           "13800138152",
		Name:            "Refresh User",
		Type:            "customer",
		PasswordHash:    "hash",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	_, refreshToken, _, err := authService.IssueTokenPair(user.Phone, int64(user.ID))
	if err != nil {
		t.Fatalf("issue token pair failed: %v", err)
	}

	body, _ := json.Marshal(map[string]interface{}{
		"refreshToken": refreshToken,
	})
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("request_id", "req-auth-refresh-test")

	handler.RefreshToken(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	payload := decodeAuthHandlerPayload(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}
	if data["authenticated"] != true {
		t.Fatalf("expected data.authenticated true, got %v", data["authenticated"])
	}
	session, ok := data["session"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data.session object, got %T", data["session"])
	}
	if session["token"] == "" || session["refreshToken"] == "" {
		t.Fatalf("expected new token pair, got %#v", session)
	}
	userData, ok := data["user"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data.user object, got %T", data["user"])
	}
	if userData["id"] != user.UID {
		t.Fatalf("expected user uid %q, got %v", user.UID, userData["id"])
	}
	if payload["token"] != data["token"] {
		t.Fatalf("expected mirrored token to match data token, got %v vs %v", payload["token"], data["token"])
	}
}

func TestConsumeWechatSessionReturnsStandardizedBindingEnvelope(t *testing.T) {
	handler, _, db := newAuthHandlerForVerifyTest(t)

	resultJSON, err := json.Marshal(service.WechatSessionResult{
		Type:      "bind_required",
		Message:   "请继续绑定手机号",
		BindToken: "bind_2",
		Nickname:  "微信昵称",
		AvatarURL: "https://example.com/avatar.png",
	})
	if err != nil {
		t.Fatalf("marshal result failed: %v", err)
	}

	session := repository.ExternalAuthSession{
		Provider:     "wechat_login",
		SessionToken: "wechat_session_1",
		Payload:      string(resultJSON),
		ExpiresAt:    time.Now().Add(5 * time.Minute),
	}
	if err := db.Create(&session).Error; err != nil {
		t.Fatalf("create external auth session failed: %v", err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/auth/wechat/session?token=wechat_session_1", nil)
	ctx.Request.URL.RawQuery = "token=wechat_session_1"
	ctx.Set("request_id", "req-wechat-session-test")

	handler.ConsumeWechatSession(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	payload := decodeAuthHandlerPayload(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}
	if data["type"] != "bind_required" {
		t.Fatalf("expected bind_required, got %v", data["type"])
	}
	if data["authenticated"] != false {
		t.Fatalf("expected data.authenticated false, got %v", data["authenticated"])
	}
	binding, ok := data["binding"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data.binding object, got %T", data["binding"])
	}
	if binding["bindToken"] != "bind_2" {
		t.Fatalf("expected bind token bind_2, got %v", binding["bindToken"])
	}
	if data["message"] != "请继续绑定手机号" {
		t.Fatalf("expected session message, got %v", data["message"])
	}
	if payload["bindToken"] != "bind_2" {
		t.Fatalf("expected mirrored bindToken bind_2, got %v", payload["bindToken"])
	}
}
