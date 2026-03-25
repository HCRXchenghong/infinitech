package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

type FileUploadHandler struct{}

func NewFileUploadHandler() *FileUploadHandler {
	return &FileUploadHandler{}
}

func (h *FileUploadHandler) Upload(c *gin.Context) {
	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "没有找到上传的文件",
		})
		return
	}

	// 检查文件大小（限制10MB）
	if file.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文件大小不能超过10MB",
		})
		return
	}

	// 创建上传目录
	uploadDir := "./data/uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建上传目录失败",
		})
		return
	}

	// 生成唯一文件名
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, filename)

	// 保存文件
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "保存文件失败",
		})
		return
	}

	// 返回文件URL
	fileURL := fmt.Sprintf("http://%s/uploads/%s", c.Request.Host, filename)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"url":      fileURL,
		"filename": filename,
	})
}
