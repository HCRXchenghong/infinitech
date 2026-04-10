package handler

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type SMSHandler struct {
	service *service.SMSService
}

func NewSMSHandler(service *service.SMSService) *SMSHandler {
	return &SMSHandler{service: service}
}

func isSMSCodeListEnabled() bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv("SMS_DEBUG_ALLOW_CODE_LIST")))
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func (h *SMSHandler) RequestCode(c *gin.Context) {
	log.Printf("[sms handler] request received %s %s", c.Request.Method, c.Request.URL.Path)

	var req service.RequestCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[sms handler] bind request failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	result, err := h.service.RequestCode(c.Request.Context(), &req)
	if err != nil {
		log.Printf("[sms handler] request code failed: %v", err)
		statusCode := http.StatusBadRequest
		switch {
		case err.Error() == "rate limit exceeded":
			statusCode = http.StatusTooManyRequests
		case err.Error() == "db not ready":
			statusCode = http.StatusInternalServerError
		case strings.HasPrefix(err.Error(), "db query failed"):
			statusCode = http.StatusInternalServerError
		}
		c.JSON(statusCode, gin.H{
			"success": false,
			"error":   result.Message,
			"message": result.Message,
		})
		return
	}

	log.Printf("[sms handler] request code succeeded phone=%s scene=%s exposed=%t", maskPhoneForLog(req.Phone), req.Scene, strings.TrimSpace(result.Code) != "")
	c.JSON(http.StatusOK, result)
}

func (h *SMSHandler) VerifyCode(c *gin.Context) {
	var req service.VerifyCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	result, err := h.service.VerifyCode(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   result.Error,
			"message": result.Message,
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *SMSHandler) VerifyCodeCheck(c *gin.Context) {
	var req service.VerifyCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	result, err := h.service.VerifyCodeCheck(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   result.Error,
			"message": result.Message,
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *SMSHandler) ListVerificationCodes(c *gin.Context) {
	if !isSMSCodeListEnabled() {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "验证码调试接口未启用",
		})
		return
	}

	codes, err := h.service.ListVerificationCodes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    codes,
	})
}
