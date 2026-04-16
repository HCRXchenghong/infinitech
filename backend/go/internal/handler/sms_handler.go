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

func respondSMSError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondSMSInvalidRequest(c *gin.Context, message string) {
	respondSMSError(c, http.StatusBadRequest, message)
}

func respondSMSRequestSuccess(c *gin.Context, result *service.RequestCodeResponse) {
	if result == nil {
		respondSuccessEnvelope(c, "验证码已发送", gin.H{}, nil)
		return
	}

	legacy := gin.H{
		"needCaptcha": result.NeedCaptcha,
		"sessionId":   strings.TrimSpace(result.SessionID),
	}
	if smsCode := strings.TrimSpace(result.Code); smsCode != "" {
		legacy["sms_code"] = smsCode
	}

	respondSuccessEnvelope(c, firstNonEmptyText(result.Message, "验证码已发送"), result, legacy)
}

func respondSMSVerificationSuccess(c *gin.Context, result *service.VerifyCodeResponse) {
	if result == nil {
		respondSuccessEnvelope(c, "验证码校验成功", gin.H{}, nil)
		return
	}
	respondSuccessEnvelope(c, firstNonEmptyText(result.Message, "验证码校验成功"), result, nil)
}

func smsRequestMessage(result *service.RequestCodeResponse, err error) string {
	if result != nil {
		return firstNonEmptyText(result.Message, errorText(err))
	}
	return firstNonEmptyText(errorText(err), "请求失败")
}

func smsVerificationMessage(result *service.VerifyCodeResponse, err error) string {
	if result != nil {
		return firstNonEmptyText(result.Message, errorText(err))
	}
	return firstNonEmptyText(errorText(err), "验证码校验失败")
}

func errorText(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func smsRequestErrorStatus(err error) int {
	if err == nil {
		return http.StatusBadRequest
	}

	switch {
	case err.Error() == "rate limit exceeded":
		return http.StatusTooManyRequests
	case err.Error() == "db not ready":
		return http.StatusInternalServerError
	case strings.HasPrefix(err.Error(), "db query failed"):
		return http.StatusInternalServerError
	}

	return http.StatusBadRequest
}

func smsVerifyErrorStatus(result *service.VerifyCodeResponse, err error) int {
	if result != nil {
		switch strings.TrimSpace(strings.ToLower(result.Error)) {
		case "verification failed":
			return http.StatusInternalServerError
		case "invalid phone format", "invalid code":
			return http.StatusBadRequest
		}
	}

	if err != nil && strings.Contains(strings.ToLower(err.Error()), "verification failed") {
		return http.StatusInternalServerError
	}

	return http.StatusBadRequest
}

func (h *SMSHandler) RequestCode(c *gin.Context) {
	log.Printf("[sms handler] request received %s %s", c.Request.Method, c.Request.URL.Path)

	var req service.RequestCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[sms handler] bind request failed: %v", err)
		respondSMSInvalidRequest(c, "请求参数错误")
		return
	}

	result, err := h.service.RequestCode(c.Request.Context(), &req)
	if err != nil {
		log.Printf("[sms handler] request code failed: %v", err)
		respondSMSError(c, smsRequestErrorStatus(err), smsRequestMessage(result, err))
		return
	}

	log.Printf("[sms handler] request code succeeded phone=%s scene=%s exposed=%t", maskPhoneForLog(req.Phone), req.Scene, strings.TrimSpace(result.Code) != "")
	respondSMSRequestSuccess(c, result)
}

func (h *SMSHandler) VerifyCode(c *gin.Context) {
	var req service.VerifyCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondSMSInvalidRequest(c, "请求参数错误")
		return
	}

	result, err := h.service.VerifyCode(c.Request.Context(), &req)
	if err != nil {
		respondSMSError(c, smsVerifyErrorStatus(result, err), smsVerificationMessage(result, err))
		return
	}

	respondSMSVerificationSuccess(c, result)
}

func (h *SMSHandler) VerifyCodeCheck(c *gin.Context) {
	var req service.VerifyCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondSMSInvalidRequest(c, "请求参数错误")
		return
	}

	result, err := h.service.VerifyCodeCheck(c.Request.Context(), &req)
	if err != nil {
		respondSMSError(c, smsVerifyErrorStatus(result, err), smsVerificationMessage(result, err))
		return
	}

	respondSMSVerificationSuccess(c, result)
}

func (h *SMSHandler) ListVerificationCodes(c *gin.Context) {
	if !isSMSCodeListEnabled() {
		respondSMSError(c, http.StatusNotFound, "验证码调试接口未启用")
		return
	}

	codes, err := h.service.ListVerificationCodes(c.Request.Context())
	if err != nil {
		respondSMSError(c, http.StatusInternalServerError, err.Error())
		return
	}

	respondPaginatedEnvelope(c, responseCodeOK, "验证码调试列表加载成功", "codes", codes, int64(len(codes)), 1, len(codes))
}
