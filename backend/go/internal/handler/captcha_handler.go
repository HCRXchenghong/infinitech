package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type CaptchaHandler struct {
	service *service.CaptchaService
}

func NewCaptchaHandler(svc *service.CaptchaService) *CaptchaHandler {
	return &CaptchaHandler{service: svc}
}

func (h *CaptchaHandler) Get(c *gin.Context) {
	sessionID := strings.TrimSpace(c.Query("sessionId"))
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "sessionId is required",
		})
		return
	}

	svg, err := h.service.Generate(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Header("Pragma", "no-cache")
	c.Data(http.StatusOK, "image/svg+xml; charset=utf-8", []byte(svg))
}
