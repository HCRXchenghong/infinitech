package handler

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/uploadasset"
	"github.com/yuexiang/go-api/internal/utils"

	"github.com/gin-gonic/gin"
)

type FileUploadHandler struct {
	privateAssetSecret string
}

const generalUploadMaxBytes int64 = 10 * 1024 * 1024

var generalPrivateUploadsRootPath = filepath.Join(".", "data", "private", "uploads")
var generalPublicUploadsRootPath = filepath.Join(".", "data", "uploads")

const (
	uploadDomainAfterSalesEvidence = "after_sales_evidence"
	uploadDomainProfileImage       = "profile_image"
	uploadDomainChatAttachment     = "chat_attachment"
	uploadDomainShopMedia          = "shop_media"
	uploadDomainReviewMedia        = "review_media"
	uploadDomainServiceSound       = "service_sound"
	uploadDomainAppDownloadQR      = "app_download_qr"
	uploadDomainMerchantDocument   = "merchant_document"
	uploadDomainMedicalDocument    = "medical_document"
	uploadDomainAdminAsset         = "admin_asset"
)

type generalUploadPolicy struct {
	domain       string
	maxBytes     int64
	allowedExts  map[string]bool
	allowedRoles map[string]bool
}

var generalUploadAllowedExts = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".webp": true,
	".bmp":  true,
	".heic": true,
	".heif": true,
	".mp3":  true,
	".m4a":  true,
	".aac":  true,
	".wav":  true,
	".ogg":  true,
	".amr":  true,
}

var audioUploadAllowedExts = map[string]bool{
	".mp3": true,
	".m4a": true,
	".aac": true,
	".wav": true,
	".ogg": true,
	".amr": true,
}

var publicImageUploadAllowedExts = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".webp": true,
	".bmp":  true,
	".heic": true,
	".heif": true,
}

var generalUploadPolicies = map[string]generalUploadPolicy{
	uploadDomainAfterSalesEvidence: {
		domain:      uploadDomainAfterSalesEvidence,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: publicImageUploadAllowedExts,
		allowedRoles: map[string]bool{
			"user":  true,
			"admin": true,
		},
	},
	uploadDomainProfileImage: {
		domain:      uploadDomainProfileImage,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: publicImageUploadAllowedExts,
		allowedRoles: map[string]bool{
			"user":     true,
			"merchant": true,
			"rider":    true,
			"admin":    true,
		},
	},
	uploadDomainChatAttachment: {
		domain:      uploadDomainChatAttachment,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: generalUploadAllowedExts,
		allowedRoles: map[string]bool{
			"user":     true,
			"merchant": true,
			"rider":    true,
			"admin":    true,
		},
	},
	uploadDomainShopMedia: {
		domain:      uploadDomainShopMedia,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: publicImageUploadAllowedExts,
		allowedRoles: map[string]bool{
			"merchant": true,
			"admin":    true,
		},
	},
	uploadDomainReviewMedia: {
		domain:      uploadDomainReviewMedia,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: publicImageUploadAllowedExts,
		allowedRoles: map[string]bool{
			"user":  true,
			"admin": true,
		},
	},
	uploadDomainServiceSound: {
		domain:      uploadDomainServiceSound,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: audioUploadAllowedExts,
		allowedRoles: map[string]bool{
			"admin": true,
		},
	},
	uploadDomainAppDownloadQR: {
		domain:      uploadDomainAppDownloadQR,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: publicImageUploadAllowedExts,
		allowedRoles: map[string]bool{
			"admin": true,
		},
	},
	uploadDomainMerchantDocument: {
		domain:      uploadDomainMerchantDocument,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: publicImageUploadAllowedExts,
		allowedRoles: map[string]bool{
			"merchant": true,
			"admin":    true,
		},
	},
	uploadDomainMedicalDocument: {
		domain:      uploadDomainMedicalDocument,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: publicImageUploadAllowedExts,
		allowedRoles: map[string]bool{
			"user":  true,
			"admin": true,
		},
	},
	uploadDomainAdminAsset: {
		domain:      uploadDomainAdminAsset,
		maxBytes:    generalUploadMaxBytes,
		allowedExts: publicImageUploadAllowedExts,
		allowedRoles: map[string]bool{
			"admin": true,
		},
	},
}

var privateGeneralUploadDomains = map[string]bool{
	uploadasset.DomainMerchantDocument: true,
	uploadasset.DomainMedicalDocument:  true,
}

func NewFileUploadHandler(privateAssetSecret string) *FileUploadHandler {
	return &FileUploadHandler{
		privateAssetSecret: strings.TrimSpace(privateAssetSecret),
	}
}

func validateUploadFile(file *multipart.FileHeader, maxBytes int64, allowedExts map[string]bool) (string, error) {
	if file == nil {
		return "", fmt.Errorf("没有找到上传文件")
	}
	if file.Size > maxBytes {
		return "", fmt.Errorf("文件大小不能超过 %dMB", maxBytes/1024/1024)
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExts[ext] {
		return "", fmt.Errorf("不支持的文件格式")
	}
	return ext, nil
}

func saveUploadFile(c *gin.Context, file *multipart.FileHeader, maxBytes int64, allowedExts map[string]bool, subdirs ...string) (string, string, error) {
	ext, err := validateUploadFile(file, maxBytes, allowedExts)
	if err != nil {
		return "", "", err
	}

	uploadDirParts := append([]string{".", "data", "uploads"}, subdirs...)
	uploadDir := filepath.Join(uploadDirParts...)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", "", fmt.Errorf("创建上传目录失败")
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		return "", "", fmt.Errorf("保存上传文件失败")
	}

	finalPath := savePath
	if ext == ".heic" || ext == ".heif" {
		finalPath, err = utils.ConvertHEICIfNeeded(savePath)
		if err != nil {
			_ = os.Remove(savePath)
			return "", "", fmt.Errorf("HEIC 图片转换失败")
		}
	}

	finalFilename := filepath.Base(finalPath)
	urlParts := []string{"/uploads"}
	for _, subdir := range subdirs {
		trimmed := strings.Trim(strings.TrimSpace(subdir), "/")
		if trimmed != "" {
			urlParts = append(urlParts, trimmed)
		}
	}
	urlParts = append(urlParts, finalFilename)
	return finalFilename, strings.Join(urlParts, "/"), nil
}

func savePrivateUploadFile(c *gin.Context, file *multipart.FileHeader, maxBytes int64, allowedExts map[string]bool, domain, ownerRole, ownerID string) (string, string, error) {
	ext, err := validateUploadFile(file, maxBytes, allowedExts)
	if err != nil {
		return "", "", err
	}

	uploadDir := uploadasset.BuildStorageDir(generalPrivateUploadsRootPath, domain, ownerRole, ownerID)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", "", fmt.Errorf("创建上传目录失败")
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		return "", "", fmt.Errorf("保存上传文件失败")
	}

	finalPath := savePath
	if ext == ".heic" || ext == ".heif" {
		finalPath, err = utils.ConvertHEICIfNeeded(savePath)
		if err != nil {
			_ = os.Remove(savePath)
			return "", "", fmt.Errorf("HEIC 图片转换失败")
		}
	}

	finalFilename := filepath.Base(finalPath)
	assetRef := uploadasset.BuildReference(domain, ownerRole, ownerID, finalFilename)
	if assetRef == "" {
		_ = os.Remove(finalPath)
		return "", "", fmt.Errorf("私有资源引用生成失败")
	}
	return finalFilename, assetRef, nil
}

func isUploadInternalError(err error) bool {
	if err == nil {
		return false
	}
	message := err.Error()
	return strings.Contains(message, "创建上传目录失败") ||
		strings.Contains(message, "保存上传文件失败") ||
		strings.Contains(message, "HEIC 图片转换失败")
}

func respondUploadError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func buildPublicAssetPayload(url, filename, ownerScope string, size int64) gin.H {
	return gin.H{
		"asset_id":      strings.TrimSpace(url),
		"asset_url":     strings.TrimSpace(url),
		"access_policy": "public",
		"content_type":  contentTypeByFilename(filename),
		"owner_scope":   strings.TrimSpace(ownerScope),
		"filename":      strings.TrimSpace(filename),
		"size":          size,
	}
}

func buildMirroredPublicAssetPayload(url, filename, ownerScope string, size int64) gin.H {
	payload := buildPublicAssetPayload(url, filename, ownerScope, size)
	payload["url"] = strings.TrimSpace(url)
	return payload
}

func buildPrivateAssetPayload(assetRef, previewURL, filename, ownerScope string, size int64) gin.H {
	payload := gin.H{
		"asset_id":      strings.TrimSpace(assetRef),
		"asset_url":     strings.TrimSpace(previewURL),
		"access_policy": "private",
		"content_type":  contentTypeByFilename(filename),
		"owner_scope":   strings.TrimSpace(ownerScope),
		"filename":      strings.TrimSpace(filename),
		"size":          size,
		"assetRef":      strings.TrimSpace(assetRef),
		"previewUrl":    strings.TrimSpace(previewURL),
		"url":           strings.TrimSpace(previewURL),
	}
	return payload
}

func respondUploadSuccess(c *gin.Context, message string, payload gin.H) {
	respondMirroredSuccessEnvelope(c, message, payload)
}

func resolveGeneralUploadPolicy(c *gin.Context) (generalUploadPolicy, int, string) {
	if c == nil {
		return generalUploadPolicy{}, http.StatusUnauthorized, "鉴权失败"
	}

	uploadDomain := strings.ToLower(strings.TrimSpace(c.PostForm("upload_domain")))
	if uploadDomain == "" {
		return generalUploadPolicy{}, http.StatusBadRequest, "upload_domain 不能为空"
	}

	policy, exists := generalUploadPolicies[uploadDomain]
	if !exists {
		return generalUploadPolicy{}, http.StatusBadRequest, "不支持的上传业务域"
	}

	operatorRole := strings.ToLower(strings.TrimSpace(c.GetString("operator_role")))
	if operatorRole == "" {
		return generalUploadPolicy{}, http.StatusUnauthorized, "鉴权失败"
	}
	if !policy.allowedRoles[operatorRole] {
		return generalUploadPolicy{}, http.StatusForbidden, "当前身份无权上传该业务资源"
	}

	return policy, http.StatusOK, ""
}

func uploadActorID(c *gin.Context, operatorRole string) string {
	if c == nil {
		return ""
	}
	switch strings.ToLower(strings.TrimSpace(operatorRole)) {
	case "admin":
		return strings.TrimSpace(fmt.Sprint(parseContextUint(c.Get("admin_id"))))
	case "merchant":
		return strings.TrimSpace(fmt.Sprint(c.GetInt64("merchant_id")))
	case "rider":
		return strings.TrimSpace(fmt.Sprint(c.GetInt64("rider_id")))
	case "user":
		return strings.TrimSpace(fmt.Sprint(c.GetInt64("user_id")))
	default:
		return ""
	}
}

func buildGeneralUploadOwnerScope(c *gin.Context, uploadDomain string) string {
	operatorRole := strings.ToLower(strings.TrimSpace(c.GetString("operator_role")))
	if operatorRole == "" {
		return strings.TrimSpace(uploadDomain)
	}

	actorID := uploadActorID(c, operatorRole)
	if actorID == "" || actorID == "0" {
		return fmt.Sprintf("%s:%s", strings.TrimSpace(uploadDomain), operatorRole)
	}
	return fmt.Sprintf("%s:%s:%s", strings.TrimSpace(uploadDomain), operatorRole, actorID)
}

func resolveGeneralUploadActor(c *gin.Context) (string, string) {
	if c == nil {
		return "", ""
	}
	operatorRole := strings.ToLower(strings.TrimSpace(c.GetString("operator_role")))
	return operatorRole, uploadActorID(c, operatorRole)
}

func (h *FileUploadHandler) Upload(c *gin.Context) {
	policy, status, policyErr := resolveGeneralUploadPolicy(c)
	if status != http.StatusOK {
		respondUploadError(c, status, policyErr)
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		respondUploadError(c, http.StatusBadRequest, "没有找到上传文件")
		return
	}

	ownerScope := buildGeneralUploadOwnerScope(c, policy.domain)
	if privateGeneralUploadDomains[policy.domain] {
		if h == nil || strings.TrimSpace(h.privateAssetSecret) == "" {
			respondUploadError(c, http.StatusInternalServerError, "私有资源签名配置缺失")
			return
		}

		operatorRole, actorID := resolveGeneralUploadActor(c)
		if operatorRole == "" || actorID == "" || actorID == "0" {
			respondUploadError(c, http.StatusUnauthorized, "鉴权失败")
			return
		}

		finalFilename, assetRef, saveErr := savePrivateUploadFile(
			c,
			file,
			policy.maxBytes,
			policy.allowedExts,
			policy.domain,
			operatorRole,
			actorID,
		)
		if saveErr != nil {
			saveStatus := http.StatusBadRequest
			if isUploadInternalError(saveErr) || strings.Contains(saveErr.Error(), "私有资源引用生成失败") {
				saveStatus = http.StatusInternalServerError
			}
			respondUploadError(c, saveStatus, saveErr.Error())
			return
		}

		previewURL := uploadasset.BuildPreviewURL(assetRef, h.privateAssetSecret, time.Now(), uploadasset.DefaultPreviewTTL)
		if previewURL == "" || previewURL == assetRef {
			respondUploadError(c, http.StatusInternalServerError, "私有资源预览地址生成失败")
			return
		}

		respondUploadSuccess(
			c,
			"文件上传成功",
			buildPrivateAssetPayload(
				assetRef,
				previewURL,
				finalFilename,
				ownerScope,
				file.Size,
			),
		)
		return
	}

	finalFilename, url, err := saveUploadFile(
		c,
		file,
		policy.maxBytes,
		policy.allowedExts,
		policy.domain,
	)
	if err != nil {
		status := http.StatusBadRequest
		if isUploadInternalError(err) {
			status = http.StatusInternalServerError
		}
		respondUploadError(c, status, err.Error())
		return
	}

	respondUploadSuccess(
		c,
		"文件上传成功",
		buildMirroredPublicAssetPayload(
			url,
			finalFilename,
			ownerScope,
			file.Size,
		),
	)
}

func (h *FileUploadHandler) PreviewPrivateAsset(c *gin.Context) {
	if h == nil || strings.TrimSpace(h.privateAssetSecret) == "" {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	assetID := strings.TrimSpace(c.Query("asset_id"))
	if !uploadasset.VerifyPreviewQuery(assetID, c.Query("expires"), c.Query("signature"), h.privateAssetSecret, time.Now()) {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	if ref, absPath, err := uploadasset.ResolveAbsolutePath(generalPrivateUploadsRootPath, assetID); err == nil {
		if !privateGeneralUploadDomains[ref.Domain] {
			c.AbortWithStatus(http.StatusForbidden)
			return
		}
		if _, statErr := os.Stat(absPath); statErr != nil {
			if os.IsNotExist(statErr) {
				c.AbortWithStatus(http.StatusNotFound)
				return
			}
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}

		c.Header("Cache-Control", "private, max-age=300")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Content-Type", contentTypeByFilename(ref.Filename))
		c.File(absPath)
		return
	}

	domain, absPath, filename, err := uploadasset.ResolveLegacyProtectedAbsolutePath(generalPublicUploadsRootPath, assetID)
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	if !privateGeneralUploadDomains[domain] {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	if _, statErr := os.Stat(absPath); statErr != nil {
		if os.IsNotExist(statErr) {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	c.Header("Cache-Control", "private, max-age=300")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Content-Type", contentTypeByFilename(filename))
	c.File(absPath)
}
