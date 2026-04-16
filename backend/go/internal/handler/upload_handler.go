package handler

import (
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

func (h *UploadHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		respondUploadError(c, http.StatusBadRequest, "文件上传失败")
		return
	}

	dateDir := time.Now().Format("2006-01-02")
	finalFilename, url, err := saveUploadFile(
		c,
		file,
		5*1024*1024,
		publicImageUploadAllowedExts,
		"images",
		filepath.Clean(dateDir),
	)
	if err != nil {
		status := http.StatusBadRequest
		if isUploadInternalError(err) {
			status = http.StatusInternalServerError
		}
		respondUploadError(c, status, err.Error())
		return
	}

	respondUploadSuccess(c, "图片上传成功", buildMirroredPublicAssetPayload(url, finalFilename, "merchant_or_admin_image", file.Size))
}
