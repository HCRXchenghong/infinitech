package service

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	wechatConfigSettingKey      = "wechat_login_config"
	wechatAuthSessionProvider   = "wechat_login"
	wechatStateTTL              = 10 * time.Minute
	wechatBindTokenTTL          = 30 * time.Minute
	wechatResultSessionTTL      = 10 * time.Minute
	wechatAuthorizeEndpoint     = "https://open.weixin.qq.com/connect/oauth2/authorize"
	wechatAccessTokenEndpoint   = "https://api.weixin.qq.com/sns/oauth2/access_token"
	wechatUserInfoEndpoint      = "https://api.weixin.qq.com/sns/userinfo"
)

type wechatLoginState struct {
	Type      string `json:"type"`
	Mode      string `json:"mode"`
	ReturnURL string `json:"return_url"`
	Exp       int64  `json:"exp"`
	Iat       int64  `json:"iat"`
}

type wechatBindClaims struct {
	Type      string `json:"type"`
	OpenID    string `json:"open_id"`
	UnionID   string `json:"union_id"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
	Exp       int64  `json:"exp"`
	Iat       int64  `json:"iat"`
}

type WechatSessionResult struct {
	Type         string                 `json:"type"`
	Message      string                 `json:"message,omitempty"`
	Token        string                 `json:"token,omitempty"`
	RefreshToken string                 `json:"refreshToken,omitempty"`
	ExpiresIn    int64                  `json:"expiresIn,omitempty"`
	User         map[string]interface{} `json:"user,omitempty"`
	BindToken    string                 `json:"bindToken,omitempty"`
	Nickname     string                 `json:"nickname,omitempty"`
	AvatarURL    string                 `json:"avatarUrl,omitempty"`
}

type wechatOAuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int64  `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	OpenID       string `json:"openid"`
	Scope        string `json:"scope"`
	UnionID      string `json:"unionid"`
	ErrCode      int64  `json:"errcode"`
	ErrMsg       string `json:"errmsg"`
}

type wechatUserInfoResponse struct {
	OpenID     string `json:"openid"`
	Nickname   string `json:"nickname"`
	HeadImgURL string `json:"headimgurl"`
	UnionID    string `json:"unionid"`
	ErrCode    int64  `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

type wechatIdentity struct {
	OpenID    string
	UnionID   string
	Nickname  string
	AvatarURL string
}

func (s *AuthService) BuildWechatAuthorizeURL(ctx context.Context, mode, returnURL string) (string, error) {
	cfg, err := s.loadEnabledWechatLoginConfig(ctx)
	if err != nil {
		return "", err
	}

	redirectURL := strings.TrimSpace(returnURL)
	if err := validateWechatAbsoluteURL(redirectURL, "wechat return_url"); err != nil {
		return "", err
	}

	stateToken, err := s.issueWechatStateToken(mode, redirectURL)
	if err != nil {
		return "", err
	}

	query := url.Values{}
	query.Set("appid", cfg.AppID)
	query.Set("redirect_uri", cfg.CallbackURL)
	query.Set("response_type", "code")
	query.Set("scope", cfg.Scope)
	query.Set("state", stateToken)

	return wechatAuthorizeEndpoint + "?" + query.Encode() + "#wechat_redirect", nil
}

func (s *AuthService) CompleteWechatOAuth(ctx context.Context, code, stateToken string) (string, string, error) {
	state, err := s.parseWechatStateToken(stateToken)
	if err != nil {
		return "", "", err
	}

	identity, err := s.resolveWechatIdentity(ctx, strings.TrimSpace(code))
	if err != nil {
		sessionToken, sessionErr := s.createExternalAuthSession(ctx, WechatSessionResult{
			Type:    "error",
			Message: err.Error(),
		}, wechatResultSessionTTL)
		if sessionErr != nil {
			return "", "", sessionErr
		}
		return state.ReturnURL, sessionToken, nil
	}

	user, err := s.findUserByWechatIdentity(ctx, identity)
	if err != nil {
		return "", "", err
	}

	var result WechatSessionResult
	if user != nil {
		if err := s.bindWechatIdentityToUser(ctx, user, identity, false); err != nil {
			return "", "", err
		}
		loginResponse, err := s.buildLoginResponseForUser(user)
		if err != nil {
			return "", "", err
		}
		result = WechatSessionResult{
			Type:         "login",
			Token:        loginResponse.Token,
			RefreshToken: loginResponse.RefreshToken,
			ExpiresIn:    loginResponse.ExpiresIn,
			User:         loginResponse.User,
		}
	} else {
		bindToken, err := s.issueWechatBindToken(identity)
		if err != nil {
			return "", "", err
		}
		message := "请完成手机号登录或注册后绑定微信账号"
		if state.Mode == "register" {
			message = "请继续完成注册并绑定微信账号"
		}
		result = WechatSessionResult{
			Type:      "bind_required",
			Message:   message,
			BindToken: bindToken,
			Nickname:  identity.Nickname,
			AvatarURL: identity.AvatarURL,
		}
	}

	sessionToken, err := s.createExternalAuthSession(ctx, result, wechatResultSessionTTL)
	if err != nil {
		return "", "", err
	}
	return state.ReturnURL, sessionToken, nil
}

func (s *AuthService) BuildWechatErrorRedirect(ctx context.Context, stateToken, message string) (string, string, error) {
	state, err := s.parseWechatStateToken(stateToken)
	if err != nil {
		return "", "", err
	}
	sessionToken, err := s.createExternalAuthSession(ctx, WechatSessionResult{
		Type:    "error",
		Message: strings.TrimSpace(message),
	}, wechatResultSessionTTL)
	if err != nil {
		return "", "", err
	}
	return state.ReturnURL, sessionToken, nil
}

func (s *AuthService) ConsumeWechatSession(ctx context.Context, sessionToken string) (*WechatSessionResult, error) {
	token := strings.TrimSpace(sessionToken)
	if token == "" {
		return nil, fmt.Errorf("wechat session token is required")
	}
	if s.db == nil {
		return nil, fmt.Errorf("db not ready")
	}

	now := time.Now()
	var session repository.ExternalAuthSession
	if err := s.db.WithContext(ctx).
		Where("provider = ? AND session_token = ?", wechatAuthSessionProvider, token).
		First(&session).Error; err != nil {
		return nil, fmt.Errorf("wechat session not found")
	}
	if session.ConsumedAt != nil {
		return nil, fmt.Errorf("wechat session already used")
	}
	if now.After(session.ExpiresAt) {
		return nil, fmt.Errorf("wechat session expired")
	}

	var result WechatSessionResult
	if err := json.Unmarshal([]byte(session.Payload), &result); err != nil {
		return nil, fmt.Errorf("invalid wechat session payload")
	}

	consumedAt := now
	if err := s.db.WithContext(ctx).
		Model(&repository.ExternalAuthSession{}).
		Where("id = ? AND consumed_at IS NULL", session.ID).
		Update("consumed_at", &consumedAt).Error; err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *AuthService) WechatBindLogin(ctx context.Context, phone, code, password, bindToken string) (*LoginResponse, error) {
	claims, err := s.parseWechatBindToken(bindToken)
	if err != nil {
		return &LoginResponse{Success: false, Error: "invalid wechat bind token"}, err
	}

	user, authErr := s.authenticateUserByCredentials(ctx, phone, code, password)
	if authErr != nil {
		return &LoginResponse{Success: false, Error: authErr.Error()}, authErr
	}

	if err := s.bindWechatIdentityToUser(ctx, user, wechatIdentity{
		OpenID:    claims.OpenID,
		UnionID:   claims.UnionID,
		Nickname:  claims.Nickname,
		AvatarURL: claims.AvatarURL,
	}, true); err != nil {
		return &LoginResponse{Success: false, Error: err.Error()}, err
	}

	return s.buildLoginResponseForUser(user)
}

func (s *AuthService) BindWechatIdentityOnRegister(ctx context.Context, user *repository.User, bindToken string) error {
	return s.BindWechatIdentityOnRegisterWithDB(ctx, s.db, user, bindToken)
}

func (s *AuthService) BindWechatIdentityOnRegisterWithDB(ctx context.Context, db *gorm.DB, user *repository.User, bindToken string) error {
	if user == nil {
		return fmt.Errorf("user is required")
	}
	claims, err := s.parseWechatBindToken(bindToken)
	if err != nil {
		return err
	}
	return s.bindWechatIdentityToUserWithDB(ctx, db, user, wechatIdentity{
		OpenID:    claims.OpenID,
		UnionID:   claims.UnionID,
		Nickname:  claims.Nickname,
		AvatarURL: claims.AvatarURL,
	}, true)
}

func (s *AuthService) maybeLoadWechatBindIdentity(bindToken string) (*wechatBindClaims, error) {
	token := strings.TrimSpace(bindToken)
	if token == "" {
		return nil, nil
	}
	claims, err := s.parseWechatBindToken(token)
	if err != nil {
		return nil, err
	}
	return claims, nil
}

func (s *AuthService) loadWechatLoginConfig(ctx context.Context) (WechatLoginConfig, error) {
	cfg := DefaultWechatLoginConfig()
	if s.db == nil {
		return cfg, fmt.Errorf("db not ready")
	}

	var setting repository.Setting
	if err := s.db.WithContext(ctx).Where("key = ?", wechatConfigSettingKey).Limit(1).Find(&setting).Error; err != nil {
		return cfg, err
	}
	if strings.TrimSpace(setting.Value) == "" {
		return cfg, nil
	}

	var raw map[string]interface{}
	if err := json.Unmarshal([]byte(setting.Value), &raw); err != nil {
		return cfg, err
	}
	return NormalizeWechatLoginConfigMap(raw), nil
}

func (s *AuthService) loadEnabledWechatLoginConfig(ctx context.Context) (WechatLoginConfig, error) {
	cfg, err := s.loadWechatLoginConfig(ctx)
	if err != nil {
		return cfg, err
	}
	cfg = NormalizeWechatLoginConfig(cfg)
	if !cfg.Enabled {
		return cfg, fmt.Errorf("wechat login is disabled")
	}
	if err := ValidateWechatLoginConfig(cfg); err != nil {
		return cfg, err
	}
	return cfg, nil
}

func (s *AuthService) issueWechatStateToken(mode, returnURL string) (string, error) {
	normalizedMode := strings.ToLower(strings.TrimSpace(mode))
	if normalizedMode != "register" {
		normalizedMode = "login"
	}
	payload := wechatLoginState{
		Type:      "wechat_state",
		Mode:      normalizedMode,
		ReturnURL: strings.TrimSpace(returnURL),
		Iat:       time.Now().Unix(),
		Exp:       time.Now().Add(wechatStateTTL).Unix(),
	}
	return s.signWechatPayload(payload)
}

func (s *AuthService) parseWechatStateToken(token string) (*wechatLoginState, error) {
	var payload wechatLoginState
	if err := s.parseSignedWechatPayload(token, &payload); err != nil {
		return nil, err
	}
	if payload.Type != "wechat_state" {
		return nil, fmt.Errorf("invalid wechat state token")
	}
	if time.Now().Unix() > payload.Exp {
		return nil, fmt.Errorf("wechat state token expired")
	}
	if err := validateWechatAbsoluteURL(payload.ReturnURL, "wechat return_url"); err != nil {
		return nil, err
	}
	if payload.Mode != "login" && payload.Mode != "register" {
		payload.Mode = "login"
	}
	return &payload, nil
}

func (s *AuthService) issueWechatBindToken(identity wechatIdentity) (string, error) {
	payload := wechatBindClaims{
		Type:      "wechat_bind",
		OpenID:    strings.TrimSpace(identity.OpenID),
		UnionID:   strings.TrimSpace(identity.UnionID),
		Nickname:  strings.TrimSpace(identity.Nickname),
		AvatarURL: strings.TrimSpace(identity.AvatarURL),
		Iat:       time.Now().Unix(),
		Exp:       time.Now().Add(wechatBindTokenTTL).Unix(),
	}
	return s.signWechatPayload(payload)
}

func (s *AuthService) parseWechatBindToken(token string) (*wechatBindClaims, error) {
	var payload wechatBindClaims
	if err := s.parseSignedWechatPayload(token, &payload); err != nil {
		return nil, err
	}
	if payload.Type != "wechat_bind" {
		return nil, fmt.Errorf("invalid wechat bind token")
	}
	if time.Now().Unix() > payload.Exp {
		return nil, fmt.Errorf("wechat bind token expired")
	}
	if strings.TrimSpace(payload.OpenID) == "" && strings.TrimSpace(payload.UnionID) == "" {
		return nil, fmt.Errorf("wechat identity is missing")
	}
	return &payload, nil
}

func (s *AuthService) signWechatPayload(payload interface{}) (string, error) {
	if s == nil || s.config == nil || strings.TrimSpace(s.config.JWT.Secret) == "" {
		return "", fmt.Errorf("jwt secret is not configured")
	}
	encodedPayload, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	payloadBase64 := base64.URLEncoding.EncodeToString(encodedPayload)
	mac := hmac.New(sha256.New, []byte(s.config.JWT.Secret))
	mac.Write([]byte(payloadBase64))
	signature := base64.URLEncoding.EncodeToString(mac.Sum(nil))
	return payloadBase64 + "." + signature, nil
}

func (s *AuthService) parseSignedWechatPayload(token string, dest interface{}) error {
	trimmed := strings.TrimSpace(token)
	parts := strings.Split(trimmed, ".")
	if len(parts) != 2 {
		return fmt.Errorf("invalid token format")
	}
	payloadBase64 := parts[0]
	signature := parts[1]
	mac := hmac.New(sha256.New, []byte(s.config.JWT.Secret))
	mac.Write([]byte(payloadBase64))
	expectedSignature := base64.URLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return fmt.Errorf("invalid token signature")
	}
	payloadJSON, err := base64.URLEncoding.DecodeString(payloadBase64)
	if err != nil {
		return fmt.Errorf("failed to decode token payload")
	}
	if err := json.Unmarshal(payloadJSON, dest); err != nil {
		return fmt.Errorf("failed to parse token payload")
	}
	return nil
}

func (s *AuthService) resolveWechatIdentity(ctx context.Context, code string) (wechatIdentity, error) {
	cfg, err := s.loadEnabledWechatLoginConfig(ctx)
	if err != nil {
		return wechatIdentity{}, err
	}
	if strings.TrimSpace(code) == "" {
		return wechatIdentity{}, fmt.Errorf("wechat code is required")
	}

	tokenResp, err := s.fetchWechatOAuthToken(ctx, cfg, code)
	if err != nil {
		return wechatIdentity{}, err
	}

	identity := wechatIdentity{
		OpenID:  strings.TrimSpace(tokenResp.OpenID),
		UnionID: strings.TrimSpace(tokenResp.UnionID),
	}
	if identity.OpenID == "" && identity.UnionID == "" {
		return wechatIdentity{}, fmt.Errorf("wechat identity is missing")
	}

	if cfg.Scope == "snsapi_userinfo" || identity.UnionID == "" {
		userInfo, err := s.fetchWechatUserInfo(ctx, tokenResp.AccessToken, tokenResp.OpenID)
		if err != nil && cfg.Scope == "snsapi_userinfo" {
			return wechatIdentity{}, err
		}
		if err == nil {
			if strings.TrimSpace(userInfo.OpenID) != "" {
				identity.OpenID = strings.TrimSpace(userInfo.OpenID)
			}
			if strings.TrimSpace(userInfo.UnionID) != "" {
				identity.UnionID = strings.TrimSpace(userInfo.UnionID)
			}
			identity.Nickname = strings.TrimSpace(userInfo.Nickname)
			identity.AvatarURL = strings.TrimSpace(userInfo.HeadImgURL)
		}
	}

	return identity, nil
}

func (s *AuthService) fetchWechatOAuthToken(ctx context.Context, cfg WechatLoginConfig, code string) (*wechatOAuthTokenResponse, error) {
	query := url.Values{}
	query.Set("appid", cfg.AppID)
	query.Set("secret", cfg.AppSecret)
	query.Set("code", strings.TrimSpace(code))
	query.Set("grant_type", "authorization_code")
	endpoint := wechatAccessTokenEndpoint + "?" + query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.wechatHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("wechat access_token request failed: %w", err)
	}
	defer resp.Body.Close()

	var payload wechatOAuthTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("failed to parse wechat access_token response")
	}
	if payload.ErrCode != 0 {
		return nil, fmt.Errorf("wechat access_token error: %s", strings.TrimSpace(payload.ErrMsg))
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return nil, fmt.Errorf("wechat access_token is empty")
	}
	return &payload, nil
}

func (s *AuthService) fetchWechatUserInfo(ctx context.Context, accessToken, openID string) (*wechatUserInfoResponse, error) {
	query := url.Values{}
	query.Set("access_token", strings.TrimSpace(accessToken))
	query.Set("openid", strings.TrimSpace(openID))
	query.Set("lang", "zh_CN")
	endpoint := wechatUserInfoEndpoint + "?" + query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.wechatHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("wechat userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	var payload wechatUserInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("failed to parse wechat userinfo response")
	}
	if payload.ErrCode != 0 {
		return nil, fmt.Errorf("wechat userinfo error: %s", strings.TrimSpace(payload.ErrMsg))
	}
	return &payload, nil
}

func (s *AuthService) wechatHTTPClient() *http.Client {
	return &http.Client{Timeout: 8 * time.Second}
}

func (s *AuthService) findUserByWechatIdentity(ctx context.Context, identity wechatIdentity) (*repository.User, error) {
	if s.db == nil {
		return nil, fmt.Errorf("db not ready")
	}

	if unionID := strings.TrimSpace(identity.UnionID); unionID != "" {
		var user repository.User
		if err := s.db.WithContext(ctx).Where("wechat_union_id = ?", unionID).Limit(1).Find(&user).Error; err != nil {
			return nil, err
		}
		if user.ID > 0 {
			return &user, nil
		}
	}

	if openID := strings.TrimSpace(identity.OpenID); openID != "" {
		var user repository.User
		if err := s.db.WithContext(ctx).Where("wechat_open_id = ?", openID).Limit(1).Find(&user).Error; err != nil {
			return nil, err
		}
		if user.ID > 0 {
			return &user, nil
		}
	}

	return nil, nil
}

func (s *AuthService) bindWechatIdentityToUser(ctx context.Context, user *repository.User, identity wechatIdentity, allowProfileFill bool) error {
	return s.bindWechatIdentityToUserWithDB(ctx, s.db, user, identity, allowProfileFill)
}

func (s *AuthService) bindWechatIdentityToUserWithDB(ctx context.Context, db *gorm.DB, user *repository.User, identity wechatIdentity, allowProfileFill bool) error {
	if db == nil {
		return fmt.Errorf("db not ready")
	}
	if user == nil {
		return fmt.Errorf("user is required")
	}
	if err := s.ensureWechatIdentityAvailableWithDB(ctx, db, user.ID, identity); err != nil {
		return err
	}

	updates := map[string]interface{}{}
	if openID := strings.TrimSpace(identity.OpenID); openID != "" && user.WechatOpenID != openID {
		updates["wechat_open_id"] = openID
		user.WechatOpenID = openID
	}
	if unionID := strings.TrimSpace(identity.UnionID); unionID != "" && user.WechatUnionID != unionID {
		updates["wechat_union_id"] = unionID
		user.WechatUnionID = unionID
	}
	if nickname := strings.TrimSpace(identity.Nickname); nickname != "" && user.WechatNickname != nickname {
		updates["wechat_nickname"] = nickname
		user.WechatNickname = nickname
		if allowProfileFill && strings.TrimSpace(user.Name) == "" {
			updates["name"] = nickname
			user.Name = nickname
		}
	}
	if avatarURL := strings.TrimSpace(identity.AvatarURL); avatarURL != "" && user.WechatAvatar != avatarURL {
		updates["wechat_avatar"] = avatarURL
		user.WechatAvatar = avatarURL
		if allowProfileFill && strings.TrimSpace(user.AvatarURL) == "" {
			updates["avatar_url"] = avatarURL
			user.AvatarURL = avatarURL
		}
	}

	if len(updates) == 0 {
		return nil
	}
	return db.WithContext(ctx).Model(&repository.User{}).Where("id = ?", user.ID).Updates(updates).Error
}

func (s *AuthService) ensureWechatIdentityAvailable(ctx context.Context, userID uint, identity wechatIdentity) error {
	return s.ensureWechatIdentityAvailableWithDB(ctx, s.db, userID, identity)
}

func (s *AuthService) ensureWechatIdentityAvailableWithDB(ctx context.Context, db *gorm.DB, userID uint, identity wechatIdentity) error {
	if db == nil {
		return fmt.Errorf("db not ready")
	}
	if unionID := strings.TrimSpace(identity.UnionID); unionID != "" {
		var count int64
		if err := db.WithContext(ctx).
			Model(&repository.User{}).
			Where("wechat_union_id = ? AND id <> ?", unionID, userID).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("wechat account already bound to another user")
		}
	}
	if openID := strings.TrimSpace(identity.OpenID); openID != "" {
		var count int64
		if err := db.WithContext(ctx).
			Model(&repository.User{}).
			Where("wechat_open_id = ? AND id <> ?", openID, userID).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("wechat account already bound to another user")
		}
	}
	return nil
}

func (s *AuthService) authenticateUserByCredentials(ctx context.Context, phone, code, password string) (*repository.User, error) {
	normalizedPhone := strings.TrimSpace(phone)
	if !isValidPhone(normalizedPhone) {
		return nil, fmt.Errorf("invalid phone format")
	}

	var user *repository.User
	var err error
	switch {
	case strings.TrimSpace(code) != "":
		if err := s.verifyCodeByScene(ctx, "login", normalizedPhone, strings.TrimSpace(code)); err != nil {
			return nil, fmt.Errorf("invalid verification code")
		}
		user, err = s.repo.GetByPhone(ctx, normalizedPhone)
		if err != nil || user == nil {
			return nil, fmt.Errorf("user not found, please register first")
		}
	case strings.TrimSpace(password) != "":
		user, err = s.repo.GetByPhone(ctx, normalizedPhone)
		if err != nil || user == nil {
			return nil, fmt.Errorf("user not found")
		}
		if !checkPassword(user.PasswordHash, password) {
			return nil, fmt.Errorf("invalid password")
		}
	default:
		return nil, fmt.Errorf("missing credentials")
	}
	return user, nil
}

func (s *AuthService) buildLoginResponseForUser(user *repository.User) (*LoginResponse, error) {
	if user == nil {
		return nil, fmt.Errorf("user is required")
	}
	token, refreshToken, expiresIn, err := s.IssueTokenPair(user.Phone, int64(user.ID))
	if err != nil {
		return nil, err
	}
	return &LoginResponse{
		Success:      true,
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresIn:    expiresIn,
		User:         buildUserPayload(user),
	}, nil
}

func (s *AuthService) createExternalAuthSession(ctx context.Context, payload WechatSessionResult, ttl time.Duration) (string, error) {
	if s.db == nil {
		return "", fmt.Errorf("db not ready")
	}
	if err := s.cleanupExpiredWechatSessions(ctx); err != nil {
		return "", err
	}

	sessionToken, err := randomSessionToken(24)
	if err != nil {
		return "", err
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	session := repository.ExternalAuthSession{
		Provider:     wechatAuthSessionProvider,
		SessionToken: sessionToken,
		Payload:      string(payloadJSON),
		ExpiresAt:    time.Now().Add(ttl),
	}
	if err := s.db.WithContext(ctx).Create(&session).Error; err != nil {
		return "", err
	}
	return sessionToken, nil
}

func (s *AuthService) cleanupExpiredWechatSessions(ctx context.Context) error {
	if s.db == nil {
		return nil
	}
	now := time.Now()
	return s.db.WithContext(ctx).
		Where("provider = ? AND (expires_at <= ? OR consumed_at IS NOT NULL)", wechatAuthSessionProvider, now).
		Delete(&repository.ExternalAuthSession{}).Error
}

func randomSessionToken(numBytes int) (string, error) {
	buf := make([]byte, numBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
