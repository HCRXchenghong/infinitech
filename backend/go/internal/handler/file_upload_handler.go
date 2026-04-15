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

func (h *FileUploadHandler) Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "没有找到上传文件",
		})
		return
	}

	finalFilename, url, err := saveUploadFile(c, file, generalUploadMaxBytes, generalUploadAllowedExts)
	if err != nil {
		status := http.StatusBadRequest
		if isUploadInternalError(err) {
			status = http.StatusInternalServerError
		}
		c.JSON(status, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"url":      url,
		"filename": finalFilename,
		"data":     buildPublicAssetPayload(url, finalFilename, "authenticated_upload", file.Size),
	})
}
