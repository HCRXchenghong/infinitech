package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/apiresponse"
)

func decodeMiddlewarePayload(t *testing.T, recorder *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()

	payload := map[string]interface{}{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}
	return payload
}

func TestRequireAdminMissingAuthReturnsStandardEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequireAdmin(nil))
	router.GET("/admin", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	request := httptest.NewRequest(http.MethodGet, "/admin", nil)
	request.Header.Set("X-Request-ID", "req-admin-auth-001")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}

	payload := decodeMiddlewarePayload(t, recorder)
	if payload["request_id"] != "req-admin-auth-001" {
		t.Fatalf("expected request_id to be mirrored, got %v", payload["request_id"])
	}
	if payload["code"] != apiresponse.CodeUnauthorized {
		t.Fatalf("expected code %s, got %v", apiresponse.CodeUnauthorized, payload["code"])
	}
	if payload["message"] != "缺少管理员鉴权信息" {
		t.Fatalf("expected auth message, got %v", payload["message"])
	}
	if payload["success"] != false {
		t.Fatalf("expected success false, got %v", payload["success"])
	}
	if payload["error"] != "缺少管理员鉴权信息" {
		t.Fatalf("expected error mirror, got %v", payload["error"])
	}
}

func TestRequestBodyLimitRejectsWithStandardEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestBodyLimit(4, 8))
	router.POST("/submit", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	request := httptest.NewRequest(http.MethodPost, "/submit", strings.NewReader("12345"))
	request.Header.Set("X-Request-ID", "req-body-limit-001")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d", recorder.Code)
	}

	payload := decodeMiddlewarePayload(t, recorder)
	if payload["code"] != apiresponse.CodePayloadTooLarge {
		t.Fatalf("expected code %s, got %v", apiresponse.CodePayloadTooLarge, payload["code"])
	}
	if payload["message"] != "request body too large (max 4 bytes)" {
		t.Fatalf("expected body limit message, got %v", payload["message"])
	}
}

func TestRecoveryReturnsStandardEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestID(), Recovery())
	router.GET("/panic", func(c *gin.Context) {
		panic("boom")
	})

	request := httptest.NewRequest(http.MethodGet, "/panic", nil)
	request.Header.Set("X-Request-ID", "req-recovery-001")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}

	payload := decodeMiddlewarePayload(t, recorder)
	if payload["request_id"] != "req-recovery-001" {
		t.Fatalf("expected request_id to be preserved, got %v", payload["request_id"])
	}
	if payload["code"] != apiresponse.CodeInternalError {
		t.Fatalf("expected code %s, got %v", apiresponse.CodeInternalError, payload["code"])
	}
	if payload["message"] != "Internal Server Error" {
		t.Fatalf("expected recovery message, got %v", payload["message"])
	}
}

func TestCheckSelfParamRejectsForeignIdentityWithStandardEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/users/2", nil)
	ctx.Request.Header.Set("X-Request-ID", "req-route-guard-001")
	ctx.Params = gin.Params{{Key: "userId", Value: "2"}}

	ok := checkSelfParam(ctx, "userId", 1, nil, "user")
	if ok {
		t.Fatal("expected foreign identity check to fail")
	}

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", recorder.Code)
	}

	payload := decodeMiddlewarePayload(t, recorder)
	if payload["code"] != apiresponse.CodeForbidden {
		t.Fatalf("expected code %s, got %v", apiresponse.CodeForbidden, payload["code"])
	}
	if payload["message"] != "无权访问该账号数据" {
		t.Fatalf("expected forbidden message, got %v", payload["message"])
	}
}
