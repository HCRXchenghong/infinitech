package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/utils"

	"github.com/gin-gonic/gin"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

func (h *UploadHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件上传失败"})
		return
	}

	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件大小不能超过 5MB"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
		".webp": true, ".bmp": true, ".heic": true, ".heif": true,
	}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "仅支持 jpg、jpeg、png、gif、webp、bmp、heic、heif"})
		return
	}

	dateDir := time.Now().Format("2006-01-02")
	uploadDir := filepath.Join(".", "data", "uploads", "images", dateDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建目录失败"})
		return
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件失败"})
		return
	}

	finalPath := filePath
	if ext == ".heic" || ext == ".heif" {
		finalPath, err = utils.ConvertHEICIfNeeded(filePath)
		if err != nil {
			_ = os.Remove(filePath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "HEIC 图片转换失败"})
			return
		}
	}

	finalFilename := filepath.Base(finalPath)
	url := fmt.Sprintf("/uploads/images/%s/%s", dateDir, finalFilename)
	c.JSON(http.StatusOK, gin.H{
		"url":      url,
		"filename": finalFilename,
		"size":     file.Size,
	})
}
