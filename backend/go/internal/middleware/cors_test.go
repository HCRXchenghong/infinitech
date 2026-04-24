package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/apiresponse"
)

func TestResolveCORSRuntimeConfigAllowsProductionWithExplicitWebOrigins(t *testing.T) {
	config, err := resolveCORSRuntimeConfig(func(name string) string {
		switch name {
		case "ENV":
			return "production"
		case "ADMIN_WEB_BASE_URL":
			return "https://admin.example.com/dashboard"
		case "SITE_WEB_BASE_URL":
			return "https://www.example.com/app"
		default:
			return ""
		}
	})
	if err != nil {
		t.Fatalf("expected explicit web origins to satisfy production config, got %v", err)
	}

	if !config.productionLike {
		t.Fatal("expected productionLike to be true")
	}
	if len(config.allowedOrigins) != 2 {
		t.Fatalf("expected 2 allowed origins, got %d", len(config.allowedOrigins))
	}
	if config.allowedOrigins[0] != "https://admin.example.com" {
		t.Fatalf("expected normalized admin origin, got %q", config.allowedOrigins[0])
	}
	if config.allowedOrigins[1] != "https://www.example.com" {
		t.Fatalf("expected normalized site origin, got %q", config.allowedOrigins[1])
	}
}

func TestResolveCORSRuntimeConfigRejectsProductionWithoutOrigins(t *testing.T) {
	_, err := resolveCORSRuntimeConfig(func(name string) string {
		switch name {
		case "ENV":
			return "production"
		default:
			return ""
		}
	})
	if err == nil {
		t.Fatal("expected missing production cors origins to fail")
	}
}

func TestResolveAllowedOriginAllowsLoopbackInDevelopmentFallback(t *testing.T) {
	origin := resolveAllowedOrigin(corsRuntimeConfig{}, "http://127.0.0.1:1888")
	if origin != "http://127.0.0.1:1888" {
		t.Fatalf("expected loopback origin to be allowed, got %q", origin)
	}
}

func TestCORSRejectsDisallowedOrigin(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("ADMIN_WEB_BASE_URL", "https://admin.example.com")
	t.Setenv("SITE_WEB_BASE_URL", "https://www.example.com")
	t.Setenv("ALLOWED_ORIGINS", "")

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS())
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	request := httptest.NewRequest(http.MethodGet, "/ping", nil)
	request.Header.Set("X-Request-ID", "req-cors-001")
	request.Header.Set("Origin", "https://evil.example.com")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for disallowed origin, got %d", recorder.Code)
	}

	payload := map[string]interface{}{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode cors reject payload: %v", err)
	}
	if payload["request_id"] != "req-cors-001" {
		t.Fatalf("expected request_id req-cors-001, got %v", payload["request_id"])
	}
	if payload["code"] != apiresponse.CodeForbidden {
		t.Fatalf("expected code %s, got %v", apiresponse.CodeForbidden, payload["code"])
	}
	if payload["message"] != "origin not allowed" {
		t.Fatalf("expected origin reject message, got %v", payload["message"])
	}
}

func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "https://app.example.com, https://admin.example.com")
	t.Setenv("ADMIN_WEB_BASE_URL", "")
	t.Setenv("SITE_WEB_BASE_URL", "")

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS())
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	request := httptest.NewRequest(http.MethodGet, "/ping", nil)
	request.Header.Set("Origin", "https://admin.example.com")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200 for configured origin, got %d", recorder.Code)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "https://admin.example.com" {
		t.Fatalf("expected allow origin header to be set, got %q", got)
	}
}
