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

func NewFileUploadHandler() *FileUploadHandler {
	return &FileUploadHandler{}
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

	if file.Size > generalUploadMaxBytes {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文件大小不能超过 10MB",
		})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !generalUploadAllowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "不支持的文件格式",
		})
		return
	}

	uploadDir := filepath.Join(".", "data", "uploads")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建上传目录失败",
		})
		return
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "保存上传文件失败",
		})
		return
	}

	finalPath := savePath
	if ext == ".heic" || ext == ".heif" {
		finalPath, err = utils.ConvertHEICIfNeeded(savePath)
		if err != nil {
			_ = os.Remove(savePath)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "HEIC 图片转换失败",
			})
			return
		}
	}

	finalFilename := filepath.Base(finalPath)
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"url":      "/uploads/" + finalFilename,
		"filename": finalFilename,
	})
}
