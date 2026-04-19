package handler

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/uploadasset"
)

func newUploadRequest(t *testing.T, filename string, fields map[string]string) *http.Request {
	t.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("failed to write field %s: %v", key, err)
		}
	}

	part, err := writer.CreateFormFile("file", filename)
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

func decodeUploadResponse(t *testing.T, recorder *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()

	var payload map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	return payload
}

func TestFileUploadHandlerRejectsMissingUploadDomain(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = newUploadRequest(t, "avatar.png", map[string]string{})
	ctx.Set("operator_role", "user")
	ctx.Set("user_id", int64(88))

	NewFileUploadHandler("preview-secret").Upload(ctx)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}

	payload := decodeUploadResponse(t, recorder)
	if payload["message"] != "upload_domain 不能为空" {
		t.Fatalf("expected missing upload domain message, got %v", payload["message"])
	}
}

func TestFileUploadHandlerRejectsUnauthorizedUploadDomain(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = newUploadRequest(t, "cover.png", map[string]string{
		"upload_domain": uploadDomainShopMedia,
	})
	ctx.Set("operator_role", "user")
	ctx.Set("user_id", int64(18))

	NewFileUploadHandler("preview-secret").Upload(ctx)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", recorder.Code)
	}

	payload := decodeUploadResponse(t, recorder)
	if payload["message"] != "当前身份无权上传该业务资源" {
		t.Fatalf("expected forbidden message, got %v", payload["message"])
	}
}

func TestFileUploadHandlerRejectsMismatchedFileTypeForDomain(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = newUploadRequest(t, "sound.png", map[string]string{
		"upload_domain": uploadDomainServiceSound,
	})
	ctx.Set("operator_role", "admin")
	ctx.Set("admin_id", uint(9))

	NewFileUploadHandler("preview-secret").Upload(ctx)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}

	payload := decodeUploadResponse(t, recorder)
	if payload["message"] != "不支持的文件格式" {
		t.Fatalf("expected invalid file type message, got %v", payload["message"])
	}
}

func TestFileUploadHandlerStoresScopedUploadMetadata(t *testing.T) {
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
	ctx.Request = newUploadRequest(t, "avatar.png", map[string]string{
		"upload_domain": uploadDomainProfileImage,
	})
	ctx.Set("operator_role", "user")
	ctx.Set("user_id", int64(66))

	NewFileUploadHandler("preview-secret").Upload(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	payload := decodeUploadResponse(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}

	assetURL := data["asset_url"]
	if assetURL == nil || filepath.Dir(assetURL.(string)) != "/uploads/profile_image" {
		t.Fatalf("expected asset url under /uploads/profile_image, got %v", assetURL)
	}
	if data["owner_scope"] != "profile_image:user:66" {
		t.Fatalf("expected scoped owner scope, got %v", data["owner_scope"])
	}
	if data["access_policy"] != "public" {
		t.Fatalf("expected public access policy, got %v", data["access_policy"])
	}
}

func TestFileUploadHandlerStoresPrivateDocumentMetadata(t *testing.T) {
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
	ctx.Request = newUploadRequest(t, "license.png", map[string]string{
		"upload_domain": uploadDomainMerchantDocument,
	})
	ctx.Set("operator_role", "merchant")
	ctx.Set("merchant_id", int64(88))

	NewFileUploadHandler("preview-secret").Upload(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	payload := decodeUploadResponse(t, recorder)
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected data object, got %T", payload["data"])
	}

	assetRef := data["asset_id"]
	if assetRef == nil || !uploadasset.IsPrivateReference(assetRef.(string)) {
		t.Fatalf("expected private asset reference, got %v", assetRef)
	}
	if data["access_policy"] != "private" {
		t.Fatalf("expected private access policy, got %v", data["access_policy"])
	}

	previewURL := data["asset_url"]
	if previewURL == nil {
		t.Fatal("expected preview url")
	}
	parsedPreview, err := url.Parse(previewURL.(string))
	if err != nil {
		t.Fatalf("failed to parse preview url: %v", err)
	}
	if parsedPreview.Path != uploadasset.PreviewPath {
		t.Fatalf("expected preview path %q, got %q", uploadasset.PreviewPath, parsedPreview.Path)
	}
	if parsedPreview.Query().Get("asset_id") != assetRef.(string) {
		t.Fatalf("expected preview to include asset ref %q, got %q", assetRef.(string), parsedPreview.Query().Get("asset_id"))
	}
}

func TestFileUploadHandlerPreviewPrivateAssetStreamsFile(t *testing.T) {
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

	uploadRecorder := httptest.NewRecorder()
	uploadCtx, _ := gin.CreateTestContext(uploadRecorder)
	uploadCtx.Request = newUploadRequest(t, "rx.png", map[string]string{
		"upload_domain": uploadDomainMedicalDocument,
	})
	uploadCtx.Set("operator_role", "user")
	uploadCtx.Set("user_id", int64(42))

	handler := NewFileUploadHandler("preview-secret")
	handler.Upload(uploadCtx)
	if uploadRecorder.Code != http.StatusOK {
		t.Fatalf("expected upload status 200, got %d with body %s", uploadRecorder.Code, uploadRecorder.Body.String())
	}

	payload := decodeUploadResponse(t, uploadRecorder)
	data := payload["data"].(map[string]interface{})
	previewURL := data["asset_url"].(string)
	parsedPreview, err := url.Parse(previewURL)
	if err != nil {
		t.Fatalf("failed to parse preview url: %v", err)
	}

	request := httptest.NewRequest(http.MethodGet, parsedPreview.String(), nil)
	previewRecorder := httptest.NewRecorder()
	previewCtx, _ := gin.CreateTestContext(previewRecorder)
	previewCtx.Request = request

	handler.PreviewPrivateAsset(previewCtx)

	if previewRecorder.Code != http.StatusOK {
		t.Fatalf("expected preview status 200, got %d", previewRecorder.Code)
	}
	if body := previewRecorder.Body.String(); body != "upload-payload" {
		t.Fatalf("expected preview body upload-payload, got %q", body)
	}
}
