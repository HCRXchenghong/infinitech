package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRespondSuccessEnvelopeIncludesRequestMetadata(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/test", nil)
	ctx.Set("request_id", "req-test-001")

	respondSuccessEnvelope(ctx, "loaded", gin.H{"item": "value"}, gin.H{"legacy_field": "legacy"})

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}

	if payload["request_id"] != "req-test-001" {
		t.Fatalf("expected request_id req-test-001, got %v", payload["request_id"])
	}
	if payload["code"] != responseCodeOK {
		t.Fatalf("expected code %s, got %v", responseCodeOK, payload["code"])
	}
	if payload["message"] != "loaded" {
		t.Fatalf("expected message loaded, got %v", payload["message"])
	}
	if payload["success"] != true {
		t.Fatalf("expected success true, got %v", payload["success"])
	}
	if payload["legacy_field"] != "legacy" {
		t.Fatalf("expected legacy field to be preserved, got %v", payload["legacy_field"])
	}

	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}
	if data["item"] != "value" {
		t.Fatalf("expected data.item value, got %v", data["item"])
	}
}

func TestRespondSensitiveEnvelopeSetsNoStoreHeaders(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/test", nil)
	ctx.Set("request_id", "req-test-002")

	respondSensitiveEnvelope(ctx, http.StatusOK, responseCodeOK, "rotated", gin.H{
		"temporaryCredential": gin.H{"temporaryPassword": "TempPass123!"},
	}, nil)

	if got := recorder.Header().Get("Cache-Control"); got != "no-store, no-cache, must-revalidate, private" {
		t.Fatalf("expected no-store cache control, got %q", got)
	}
	if got := recorder.Header().Get("Pragma"); got != "no-cache" {
		t.Fatalf("expected pragma no-cache, got %q", got)
	}
	if got := recorder.Header().Get("Expires"); got != "0" {
		t.Fatalf("expected expires 0, got %q", got)
	}
	if got := recorder.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("expected nosniff header, got %q", got)
	}
}
