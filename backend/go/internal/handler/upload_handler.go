package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

func resolveLegacyEditorImageUploadDomain(c *gin.Context) string {
	if c == nil {
		return uploadDomainAdminAsset
	}

	switch strings.ToLower(strings.TrimSpace(c.GetString("operator_role"))) {
	case "merchant":
		return uploadDomainShopMedia
	default:
		return uploadDomainAdminAsset
	}
}

func (h *UploadHandler) UploadImage(c *gin.Context) {
	policy, status, policyErr := resolveFixedGeneralUploadPolicy(
		c,
		resolveLegacyEditorImageUploadDomain(c),
	)
	if status != http.StatusOK {
		respondUploadError(c, status, policyErr)
		return
	}

	payload, status, uploadErr := buildGeneralUploadPayload(c, "file", policy, "")
	if status != http.StatusOK {
		respondUploadError(c, status, uploadErr)
		return
	}

	respondUploadSuccess(c, "图片上传成功", payload)
}
