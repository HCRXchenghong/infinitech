package handler

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *AuthHandler) WechatStart(c *gin.Context) {
	mode := strings.TrimSpace(c.Query("mode"))
	returnURL := strings.TrimSpace(c.Query("returnUrl"))
	authorizeURL, err := h.service.BuildWechatAuthorizeURL(c.Request.Context(), mode, returnURL)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(nil, err, http.StatusBadRequest), authPayloadMessage(nil, err, "微信登录启动失败"), nil)
		return
	}
	c.Redirect(http.StatusFound, authorizeURL)
}

func (h *AuthHandler) WechatCallback(c *gin.Context) {
	stateToken := strings.TrimSpace(c.Query("state"))
	code := strings.TrimSpace(c.Query("code"))
	if stateToken == "" {
		respondAuthPayload(c, http.StatusBadRequest, "wechat state is required", nil)
		return
	}

	if code == "" {
		redirectURL, sessionToken, err := h.service.BuildWechatErrorRedirect(c.Request.Context(), stateToken, "微信授权失败，请重试")
		if err != nil {
			respondAuthPayload(c, authFailureStatus(nil, err, http.StatusBadRequest), authPayloadMessage(nil, err, "微信授权失败"), nil)
			return
		}
		c.Redirect(http.StatusFound, appendQueryValue(redirectURL, "wechatSession", sessionToken))
		return
	}

	redirectURL, sessionToken, err := h.service.CompleteWechatOAuth(c.Request.Context(), code, stateToken)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(nil, err, http.StatusBadRequest), authPayloadMessage(nil, err, "微信授权失败"), nil)
		return
	}
	c.Redirect(http.StatusFound, appendQueryValue(redirectURL, "wechatSession", sessionToken))
}

func (h *AuthHandler) ConsumeWechatSession(c *gin.Context) {
	sessionToken := strings.TrimSpace(c.Query("token"))
	result, err := h.service.ConsumeWechatSession(c.Request.Context(), sessionToken)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(nil, err, http.StatusBadRequest), authPayloadMessage(nil, err, "微信登录会话加载失败"), nil)
		return
	}
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "微信登录会话加载成功"), result)
}

func (h *AuthHandler) WechatBindLogin(c *gin.Context) {
	var req struct {
		Phone     string `json:"phone"`
		Code      string `json:"code"`
		Password  string `json:"password"`
		BindToken string `json:"bindToken"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAuthInvalidRequest(c, "请求参数错误", err.Error())
		return
	}

	result, err := h.service.WechatBindLogin(c.Request.Context(), req.Phone, req.Code, req.Password, req.BindToken)
	if err != nil {
		respondAuthPayload(c, authFailureStatus(result, err, http.StatusUnauthorized), authPayloadMessage(result, err, "微信绑定登录失败"), result)
		return
	}
	respondAuthMirroredSuccess(c, authPayloadMessage(result, nil, "微信绑定登录成功"), result)
}

func appendQueryValue(rawURL, key, value string) string {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return rawURL
	}
	query := parsed.Query()
	query.Set(key, value)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}
