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
	normalizedData := buildAuthSessionPayload(data)
	respondEnvelope(
		c,
		status,
		authResponseCodeForStatus(status),
		message,
		normalizedData,
		mirroredEnvelopeFields(normalizedData),
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

func cloneAuthMap(source map[string]interface{}) gin.H {
	if len(source) == 0 {
		return nil
	}

	clone := gin.H{}
	for key, value := range source {
		clone[key] = value
	}
	return clone
}

func normalizeAuthMap(source interface{}) gin.H {
	switch typed := source.(type) {
	case gin.H:
		return cloneAuthMap(typed)
	case map[string]interface{}:
		return cloneAuthMap(typed)
	default:
		return nil
	}
}

func authPayloadText(value interface{}) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return strings.TrimSpace(toText(typed))
	}
}

func authPayloadInt64(value interface{}) int64 {
	switch typed := value.(type) {
	case int:
		return int64(typed)
	case int8:
		return int64(typed)
	case int16:
		return int64(typed)
	case int32:
		return int64(typed)
	case int64:
		return typed
	case uint:
		return int64(typed)
	case uint8:
		return int64(typed)
	case uint16:
		return int64(typed)
	case uint32:
		return int64(typed)
	case uint64:
		return int64(typed)
	case float32:
		return int64(typed)
	case float64:
		return int64(typed)
	case string:
		parsed, _ := strconv.ParseInt(strings.TrimSpace(typed), 10, 64)
		return parsed
	default:
		return 0
	}
}

func authPayloadBool(value interface{}) (bool, bool) {
	switch typed := value.(type) {
	case bool:
		return typed, true
	case string:
		normalized := strings.TrimSpace(strings.ToLower(typed))
		switch normalized {
		case "1", "true", "yes", "on":
			return true, true
		case "0", "false", "no", "off":
			return false, true
		}
	case int:
		return typed != 0, true
	case int8:
		return typed != 0, true
	case int16:
		return typed != 0, true
	case int32:
		return typed != 0, true
	case int64:
		return typed != 0, true
	case uint:
		return typed != 0, true
	case uint8:
		return typed != 0, true
	case uint16:
		return typed != 0, true
	case uint32:
		return typed != 0, true
	case uint64:
		return typed != 0, true
	case float32:
		return typed != 0, true
	case float64:
		return typed != 0, true
	}
	return false, false
}

func buildAuthSessionMapPayload(source map[string]interface{}) gin.H {
	payload := cloneAuthMap(source)
	if payload == nil {
		return nil
	}

	sessionSource := normalizeAuthMap(source["session"])
	if sessionSource == nil {
		sessionSource = normalizeAuthMap(source["authSession"])
	}
	token := firstNonEmptyText(
		authPayloadText(sessionSource["token"]),
		authPayloadText(sessionSource["accessToken"]),
		authPayloadText(sessionSource["access_token"]),
		authPayloadText(source["token"]),
		authPayloadText(source["accessToken"]),
		authPayloadText(source["access_token"]),
	)
	refreshToken := firstNonEmptyText(
		authPayloadText(sessionSource["refreshToken"]),
		authPayloadText(sessionSource["refresh_token"]),
		authPayloadText(source["refreshToken"]),
		authPayloadText(source["refresh_token"]),
	)
	expiresIn := authPayloadInt64(sessionSource["expiresIn"])
	if expiresIn <= 0 {
		expiresIn = authPayloadInt64(sessionSource["expires_in"])
	}
	if expiresIn <= 0 {
		expiresIn = authPayloadInt64(source["expiresIn"])
	}
	if expiresIn <= 0 {
		expiresIn = authPayloadInt64(source["expires_in"])
	}
	if session := buildAuthSessionObject(token, refreshToken, expiresIn); session != nil {
		payload["session"] = session
		payload["token"] = session["token"]
		if value, ok := session["refreshToken"]; ok {
			payload["refreshToken"] = value
		}
		if value, ok := session["expiresIn"]; ok {
			payload["expiresIn"] = value
		}
	}

	if normalizedUser := normalizeAuthMap(source["user"]); normalizedUser != nil {
		payload["user"] = normalizedUser
	}

	bindingSource := normalizeAuthMap(source["binding"])
	if bindingSource == nil {
		bindingSource = normalizeAuthMap(source["bind"])
	}
	bindToken := firstNonEmptyText(
		authPayloadText(bindingSource["bindToken"]),
		authPayloadText(bindingSource["bind_token"]),
		authPayloadText(source["bindToken"]),
		authPayloadText(source["bind_token"]),
	)
	nickname := firstNonEmptyText(
		authPayloadText(bindingSource["nickname"]),
		authPayloadText(source["nickname"]),
	)
	avatarURL := firstNonEmptyText(
		authPayloadText(bindingSource["avatarUrl"]),
		authPayloadText(bindingSource["avatar_url"]),
		authPayloadText(source["avatarUrl"]),
		authPayloadText(source["avatar_url"]),
	)
	if binding := buildAuthBindingObject(bindToken, nickname, avatarURL); binding != nil {
		payload["binding"] = binding
		if value, ok := binding["bindToken"]; ok {
			payload["bindToken"] = value
		}
		if value, ok := binding["nickname"]; ok {
			payload["nickname"] = value
		}
		if value, ok := binding["avatarUrl"]; ok {
			payload["avatarUrl"] = value
		}
	}

	if authenticated, ok := authPayloadBool(source["authenticated"]); ok {
		payload["authenticated"] = authenticated
	} else if authenticated, ok := authPayloadBool(source["isAuthenticated"]); ok {
		payload["authenticated"] = authenticated
	} else if strings.TrimSpace(token) != "" {
		payload["authenticated"] = true
	} else if strings.TrimSpace(bindToken) != "" {
		payload["authenticated"] = false
	}

	return payload
}

func buildAuthSessionObject(token, refreshToken string, expiresIn int64) gin.H {
	session := gin.H{}
	if normalized := strings.TrimSpace(token); normalized != "" {
		session["token"] = normalized
	}
	if normalized := strings.TrimSpace(refreshToken); normalized != "" {
		session["refreshToken"] = normalized
	}
	if expiresIn > 0 {
		session["expiresIn"] = expiresIn
	}
	if len(session) == 0 {
		return nil
	}
	return session
}

func buildAuthBindingObject(bindToken, nickname, avatarURL string) gin.H {
	binding := gin.H{}
	if normalized := strings.TrimSpace(bindToken); normalized != "" {
		binding["bindToken"] = normalized
	}
	if normalized := strings.TrimSpace(nickname); normalized != "" {
		binding["nickname"] = normalized
	}
	if normalized := strings.TrimSpace(avatarURL); normalized != "" {
		binding["avatarUrl"] = normalized
	}
	if len(binding) == 0 {
		return nil
	}
	return binding
}

func buildAuthCredentialPayload(success bool, token, refreshToken string, expiresIn int64, user map[string]interface{}, errorText string, needRegister bool) gin.H {
	authenticated := success && strings.TrimSpace(token) != ""
	payload := gin.H{
		"success":       success,
		"authenticated": authenticated,
	}

	if session := buildAuthSessionObject(token, refreshToken, expiresIn); session != nil {
		payload["session"] = session
		payload["token"] = session["token"]
		if value, ok := session["refreshToken"]; ok {
			payload["refreshToken"] = value
		}
		if value, ok := session["expiresIn"]; ok {
			payload["expiresIn"] = value
		}
	}

	if normalizedUser := cloneAuthMap(user); normalizedUser != nil {
		payload["user"] = normalizedUser
	}
	if normalizedError := strings.TrimSpace(errorText); normalizedError != "" {
		payload["error"] = normalizedError
	}
	if needRegister {
		payload["needRegister"] = true
	}

	return payload
}

func buildWechatSessionPayload(result *service.WechatSessionResult) gin.H {
	if result == nil {
		return nil
	}

	payload := gin.H{
		"type":          strings.TrimSpace(result.Type),
		"success":       true,
		"authenticated": strings.TrimSpace(result.Token) != "",
	}
	if message := strings.TrimSpace(result.Message); message != "" {
		payload["message"] = message
	}

	if session := buildAuthSessionObject(result.Token, result.RefreshToken, result.ExpiresIn); session != nil {
		payload["session"] = session
		payload["token"] = session["token"]
		if value, ok := session["refreshToken"]; ok {
			payload["refreshToken"] = value
		}
		if value, ok := session["expiresIn"]; ok {
			payload["expiresIn"] = value
		}
	}
	if normalizedUser := cloneAuthMap(result.User); normalizedUser != nil {
		payload["user"] = normalizedUser
	}
	if binding := buildAuthBindingObject(result.BindToken, result.Nickname, result.AvatarURL); binding != nil {
		payload["binding"] = binding
		if value, ok := binding["bindToken"]; ok {
			payload["bindToken"] = value
		}
		if value, ok := binding["nickname"]; ok {
			payload["nickname"] = value
		}
		if value, ok := binding["avatarUrl"]; ok {
			payload["avatarUrl"] = value
		}
	}

	return payload
}

func buildAuthSessionPayload(data interface{}) interface{} {
	switch typed := data.(type) {
	case *service.LoginResponse:
		return buildAuthCredentialPayload(
			typed.Success,
			typed.Token,
			typed.RefreshToken,
			typed.ExpiresIn,
			typed.User,
			typed.Error,
			typed.NeedRegister,
		)
	case service.LoginResponse:
		return buildAuthCredentialPayload(
			typed.Success,
			typed.Token,
			typed.RefreshToken,
			typed.ExpiresIn,
			typed.User,
			typed.Error,
			typed.NeedRegister,
		)
	case *service.RegisterResponse:
		return buildAuthCredentialPayload(
			typed.Success,
			typed.Token,
			typed.RefreshToken,
			typed.ExpiresIn,
			typed.User,
			typed.Error,
			false,
		)
	case service.RegisterResponse:
		return buildAuthCredentialPayload(
			typed.Success,
			typed.Token,
			typed.RefreshToken,
			typed.ExpiresIn,
			typed.User,
			typed.Error,
			false,
		)
	case *service.WechatSessionResult:
		return buildWechatSessionPayload(typed)
	case service.WechatSessionResult:
		copy := typed
		return buildWechatSessionPayload(&copy)
	case gin.H:
		return buildAuthSessionMapPayload(typed)
	case map[string]interface{}:
		return buildAuthSessionMapPayload(typed)
	default:
		return data
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
		Phone        string `json:"phone"`
		Code         string `json:"code"`
		NextPassword string `json:"nextPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}
	result, err := h.service.SetNewPassword(c.Request.Context(), req.Phone, req.Code, req.NextPassword)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusBadRequest), authPayloadMessage(result, err, "密码重置失败"), result)
		return
	}
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "密码重置成功"), result)
}

func (h *AuthHandler) RiderSetNewPassword(c *gin.Context) {
	var req struct {
		Phone        string `json:"phone"`
		Code         string `json:"code"`
		NextPassword string `json:"nextPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}
	result, err := h.service.RiderSetNewPassword(c.Request.Context(), req.Phone, req.Code, req.NextPassword)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusBadRequest), authPayloadMessage(result, err, "骑手密码重置失败"), result)
		return
	}
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "骑手密码重置成功"), result)
}

func (h *AuthHandler) MerchantSetNewPassword(c *gin.Context) {
	var req struct {
		Phone        string `json:"phone"`
		Code         string `json:"code"`
		NextPassword string `json:"nextPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}
	result, err := h.service.MerchantSetNewPassword(c.Request.Context(), req.Phone, req.Code, req.NextPassword)
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
