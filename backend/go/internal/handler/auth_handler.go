package handler

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type AuthHandler struct {
	service *service.AuthService
}

func NewAuthHandler(service *service.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

func authResponseCodeForStatus(status int) string {
	if status >= http.StatusOK && status < http.StatusBadRequest {
		return responseCodeOK
	}
	return couponResponseCodeForStatus(status)
}

func authMessageValue(value interface{}) string {
	text, _ := value.(string)
	return strings.TrimSpace(text)
}

func authPayloadMessage(data interface{}, err error, fallback string) string {
	if legacy := mirroredEnvelopeFields(data); legacy != nil {
		if message := firstNonEmptyText(
			authMessageValue(legacy["message"]),
			authMessageValue(legacy["error"]),
		); message != "" {
			return message
		}
	}

	return firstNonEmptyText(errorText(err), fallback)
}

func authStatusFromMessage(message string, fallback int) int {
	normalized := strings.ToLower(strings.TrimSpace(message))
	if normalized == "" {
		return fallback
	}

	switch {
	case strings.Contains(normalized, "missing authorization header"),
		strings.Contains(normalized, "invalid or expired token"),
		strings.Contains(normalized, "invalid refresh token"),
		strings.Contains(normalized, "not a refresh token"),
		strings.Contains(normalized, "invalid refresh principal"),
		strings.Contains(normalized, "invalid refresh subject"),
		strings.Contains(normalized, "invalid password"),
		strings.Contains(normalized, "token user mismatch"),
		strings.Contains(normalized, "token subject mismatch"),
		strings.Contains(normalized, "invalid principal type"):
		return http.StatusUnauthorized
	case strings.Contains(normalized, "already used"),
		strings.Contains(normalized, "session expired"):
		return http.StatusGone
	case strings.Contains(normalized, "not found"),
		strings.Contains(normalized, "please register first"),
		strings.Contains(normalized, "please onboard first"):
		return http.StatusNotFound
	case strings.Contains(normalized, "db not ready"),
		strings.Contains(normalized, "failed to "),
		strings.Contains(normalized, "verification failed"),
		strings.Contains(normalized, "invalid wechat session payload"):
		return http.StatusInternalServerError
	case strings.Contains(normalized, "phone exists"),
		strings.Contains(normalized, "already exists"):
		return http.StatusConflict
	case strings.Contains(normalized, "invalid"),
		strings.Contains(normalized, "missing"),
		strings.Contains(normalized, "required"):
		return http.StatusBadRequest
	}

	return fallback
}

func authFailureStatus(data interface{}, err error, fallback int) int {
	return authStatusFromMessage(authPayloadMessage(data, err, ""), fallback)
}

func respondAuthPayload(c *gin.Context, status int, message string, data interface{}) {
	respondEnvelope(
		c,
		status,
		authResponseCodeForStatus(status),
		message,
		data,
		mirroredEnvelopeFields(data),
	)
}

func respondAuthMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondAuthPayload(c, http.StatusOK, message, data)
}

func respondAuthInvalidRequest(c *gin.Context, message, detail string) {
	payload := gin.H{}
	legacy := gin.H{}
	if trimmedDetail := strings.TrimSpace(detail); trimmedDetail != "" {
		payload["detail"] = trimmedDetail
		legacy["detail"] = trimmedDetail
	}
	respondEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, firstNonEmptyText(message, "请求参数错误"), payload, legacy)
}

func buildVerifiedAuthIdentityPayload(identity *service.VerifiedTokenIdentity) gin.H {
	if identity == nil {
		return gin.H{}
	}

	return gin.H{
		"principalId":   identity.PrincipalID,
		"principalType": identity.PrincipalType,
		"legacyId":      strconv.FormatInt(identity.UserID, 10),
		"role":          identity.Role,
		"sessionId":     identity.SessionID,
		"phone":         identity.Phone,
		"scope":         identity.Scope,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[Auth Handler] login bind failed: %v", err)
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}

	log.Printf("[Auth Handler] login request: phone=%s hasCode=%v hasPassword=%v", maskPhoneForLog(req.Phone), req.Code != "", req.Password != "")

	result, err := h.service.Login(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("[Auth Handler] login failed: %v", err)
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusUnauthorized), authPayloadMessage(result, err, "登录失败"), result)
		return
	}

	log.Printf("[Auth Handler] login success: phone=%s", maskPhoneForLog(req.Phone))
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "登录成功"), result)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}

	result, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusBadRequest), authPayloadMessage(result, err, "注册失败"), result)
		return
	}
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "注册成功"), result)
}

func (h *AuthHandler) RiderLogin(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[Rider Auth] bind failed: %v", err)
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}

	log.Printf("[Rider Auth] login request: phone=%s hasCode=%v hasPassword=%v", maskPhoneForLog(req.Phone), req.Code != "", req.Password != "")

	result, err := h.service.RiderLogin(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("[Rider Auth] login failed: %v", err)
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusUnauthorized), authPayloadMessage(result, err, "骑手登录失败"), result)
		return
	}

	log.Printf("[Rider Auth] login success: phone=%s", maskPhoneForLog(req.Phone))
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "骑手登录成功"), result)
}

func (h *AuthHandler) MerchantLogin(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[Merchant Auth] bind failed: %v", err)
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}

	log.Printf("[Merchant Auth] login request: phone=%s hasCode=%v hasPassword=%v", maskPhoneForLog(req.Phone), req.Code != "", req.Password != "")

	result, err := h.service.MerchantLogin(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("[Merchant Auth] login failed: %v", err)
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusUnauthorized), authPayloadMessage(result, err, "商户登录失败"), result)
		return
	}

	log.Printf("[Merchant Auth] login success: phone=%s", maskPhoneForLog(req.Phone))
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "商户登录成功"), result)
}

func (h *AuthHandler) SetNewPassword(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}
	result, err := h.service.SetNewPassword(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusBadRequest), authPayloadMessage(result, err, "密码重置失败"), result)
		return
	}
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "密码重置成功"), result)
}

func (h *AuthHandler) RiderSetNewPassword(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}
	result, err := h.service.RiderSetNewPassword(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusBadRequest), authPayloadMessage(result, err, "骑手密码重置失败"), result)
		return
	}
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "骑手密码重置成功"), result)
}

func (h *AuthHandler) MerchantSetNewPassword(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}
	result, err := h.service.MerchantSetNewPassword(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusBadRequest), authPayloadMessage(result, err, "商户密码重置失败"), result)
		return
	}
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "商户密码重置成功"), result)
}

func (h *AuthHandler) VerifyToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		respondAuthPayload(c, http.StatusUnauthorized, "missing authorization header", gin.H{
			"valid": false,
		})
		return
	}

	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	identity, err := h.service.VerifyTokenIdentity(token)
	if err != nil {
		log.Printf("[Auth Handler] token verify failed: %v", err)
		respondAuthPayload(c, authFailureStatus(nil, err, http.StatusUnauthorized), "invalid or expired token", gin.H{
			"valid": false,
		})
		return
	}

	log.Printf("[Auth Handler] token verify success: phone=%s userId=%d", maskPhoneForLog(identity.Phone), identity.UserID)
	identityPayload := buildVerifiedAuthIdentityPayload(identity)
	respondAuthMirroredSuccess(c, "令牌校验成功", gin.H{
		"valid":         true,
		"identity":      identityPayload,
		"phone":         identity.Phone,
		"userId":        identity.UserID,
		"id":            identity.PrincipalID,
		"principalType": identity.PrincipalType,
		"principalId":   identity.PrincipalID,
		"role":          identity.Role,
		"sessionId":     identity.SessionID,
		"scope":         identity.Scope,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[Auth Handler] refresh token bind failed: %v", err)
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}

	if req.RefreshToken == "" {
		respondAuthPayload(c, http.StatusBadRequest, "refresh token is required", gin.H{
			"success": false,
		})
		return
	}

	log.Printf("[Auth Handler] refresh token request")
	result, err := h.service.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		log.Printf("[Auth Handler] refresh token failed: %v", err)
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusUnauthorized), authPayloadMessage(result, err, "令牌刷新失败"), result)
		return
	}

	log.Printf("[Auth Handler] refresh token success")
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "令牌刷新成功"), result)
}
