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

func respondCaptchaError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondCaptchaInvalidRequest(c *gin.Context, message string) {
	respondCaptchaError(c, http.StatusBadRequest, message)
}

func (h *CaptchaHandler) Get(c *gin.Context) {
	sessionID := strings.TrimSpace(c.Query("sessionId"))
	if sessionID == "" {
		respondCaptchaInvalidRequest(c, "sessionId is required")
		return
	}

	svg, err := h.service.Generate(c.Request.Context(), sessionID)
	if err != nil {
		respondCaptchaError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Header("Pragma", "no-cache")
	c.Data(http.StatusOK, "image/svg+xml; charset=utf-8", []byte(svg))
}
