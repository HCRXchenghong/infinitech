package handler

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func newNamedUploadRequest(t *testing.T, fieldName, filename string, fields map[string]string) *http.Request {
	t.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("failed to write field %s: %v", key, err)
		}
	}

	part, err := writer.CreateFormFile(fieldName, filename)
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	if _, err := part.Write([]byte("upload-payload")); err != nil {
		t.Fatalf("failed to write file payload: %v", err)
	}

	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func TestAdminSettingsUploadImageUsesUnifiedAdminAssetDomain(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current dir: %v", err)
	}
	tempDir := t.TempDir()
	if err := os.Chdir(tempDir); err != nil {
		t.Fatalf("failed to chdir to temp dir: %v", err)
	}
	defer func() {
		_ = os.Chdir(originalDir)
	}()

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = newNamedUploadRequest(t, "image", "banner.png", nil)
	ctx.Set("operator_role", "admin")
	ctx.Set("admin_id", uint(9))

	(&AdminSettingsHandler{}).UploadImage(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	payload := decodeUploadResponse(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}

	assetURL := data["asset_url"]
	if assetURL == nil || filepath.Dir(assetURL.(string)) != "/uploads/admin_asset" {
		t.Fatalf("expected asset url under /uploads/admin_asset, got %v", assetURL)
	}
	if data["owner_scope"] != "admin_asset:admin:9" {
		t.Fatalf("expected scoped owner scope, got %v", data["owner_scope"])
	}
	if data["access_policy"] != "public" {
		t.Fatalf("expected public access policy, got %v", data["access_policy"])
	}
	if data["imageUrl"] != assetURL {
		t.Fatalf("expected legacy imageUrl alias to match asset url, got %v", data["imageUrl"])
	}
}

func TestAdminSettingsUploadPackageUsesUnifiedAppPackageDomain(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current dir: %v", err)
	}
	tempDir := t.TempDir()
	if err := os.Chdir(tempDir); err != nil {
		t.Fatalf("failed to chdir to temp dir: %v", err)
	}
	defer func() {
		_ = os.Chdir(originalDir)
	}()

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = newNamedUploadRequest(t, "file", "app.apk", nil)
	ctx.Set("operator_role", "admin")
	ctx.Set("admin_id", uint(9))

	(&AdminSettingsHandler{}).UploadPackage(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	payload := decodeUploadResponse(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}

	assetURL := data["asset_url"]
	if assetURL == nil || filepath.Dir(assetURL.(string)) != "/uploads/app_package" {
		t.Fatalf("expected asset url under /uploads/app_package, got %v", assetURL)
	}
	if data["owner_scope"] != "app_package:admin:9" {
		t.Fatalf("expected scoped owner scope, got %v", data["owner_scope"])
	}
	if data["access_policy"] != "public" {
		t.Fatalf("expected public access policy, got %v", data["access_policy"])
	}
	if data["original_name"] != "app.apk" {
		t.Fatalf("expected original_name app.apk, got %v", data["original_name"])
	}
}
