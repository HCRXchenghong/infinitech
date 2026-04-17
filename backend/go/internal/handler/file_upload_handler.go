package handler

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/utils"

	"github.com/gin-gonic/gin"
)

type FileUploadHandler struct{}

const generalUploadMaxBytes int64 = 10 * 1024 * 1024

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

func NewFileUploadHandler() *FileUploadHandler {
	return &FileUploadHandler{}
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
			buildGeneralUploadOwnerScope(c, policy.domain),
			file.Size,
		),
	)
}
