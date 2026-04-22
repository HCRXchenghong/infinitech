package handler

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func enterTempWorkingDir(t *testing.T) string {
	t.Helper()

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current dir: %v", err)
	}
	tempDir := t.TempDir()
	if err := os.Chdir(tempDir); err != nil {
		t.Fatalf("failed to chdir to temp dir: %v", err)
	}
	return originalDir
}

func leaveTempWorkingDir(t *testing.T, originalDir string) {
	t.Helper()
	if err := os.Chdir(originalDir); err != nil {
		t.Fatalf("failed to restore working dir: %v", err)
	}
}

func TestUploadHandlerRoutesAdminLegacyImageUploadsToAdminAssetDomain(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalDir := enterTempWorkingDir(t)
	defer leaveTempWorkingDir(t, originalDir)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = newNamedUploadRequest(t, "file", "editor.png", nil)
	ctx.Set("operator_role", "admin")
	ctx.Set("admin_id", uint(9))

	NewUploadHandler().UploadImage(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	payload := decodeUploadResponse(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}

	if data["asset_url"] == nil || filepath.Dir(data["asset_url"].(string)) != "/uploads/admin_asset" {
		t.Fatalf("expected admin asset url, got %v", data["asset_url"])
	}
	if data["owner_scope"] != "admin_asset:admin:9" {
		t.Fatalf("expected admin asset scope, got %v", data["owner_scope"])
	}
}

func TestUploadHandlerRoutesMerchantLegacyImageUploadsToShopMediaDomain(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalDir := enterTempWorkingDir(t)
	defer leaveTempWorkingDir(t, originalDir)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = newNamedUploadRequest(t, "file", "merchant.png", nil)
	ctx.Set("operator_role", "merchant")
	ctx.Set("merchant_id", int64(18))

	NewUploadHandler().UploadImage(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	payload := decodeUploadResponse(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}

	if data["asset_url"] == nil || filepath.Dir(data["asset_url"].(string)) != "/uploads/shop_media" {
		t.Fatalf("expected shop media url, got %v", data["asset_url"])
	}
	if data["owner_scope"] != "shop_media:merchant:18" {
		t.Fatalf("expected shop media scope, got %v", data["owner_scope"])
	}
}
