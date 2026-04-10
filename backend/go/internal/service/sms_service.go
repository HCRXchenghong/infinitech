package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/utils"
	"gorm.io/gorm"
)

type SMSService struct {
	db      *gorm.DB
	redis   *redis.Client
	captcha *CaptchaService
	admin   *AdminService
}

var allowedSMSScenes = map[string]struct{}{
	"login":                 {},
	"register":              {},
	"reset":                 {},
	"rider_login":           {},
	"rider_reset":           {},
	"merchant_login":        {},
	"merchant_reset":        {},
	"change_phone_verify":   {},
	"change_phone_new":      {},
	"rider_change_password": {},
}

const (
	smsTargetConsumer = "consumer"
	smsTargetMerchant = "merchant"
	smsTargetRider    = "rider"
	smsTargetAdmin    = "admin"
)

func NewSMSService(db *gorm.DB, redis *redis.Client, captcha *CaptchaService, admin *AdminService) *SMSService {
	return &SMSService{
		db:      db,
		redis:   redis,
		captcha: captcha,
		admin:   admin,
	}
}

type RequestCodeRequest struct {
	Phone      string `json:"phone" binding:"required"`
	Scene      string `json:"scene" binding:"required"`
	Captcha    string `json:"captcha"`
	SessionID  string `json:"sessionId"`
	TargetType string `json:"targetType"`
}

type RequestCodeResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	Code        string `json:"code,omitempty"`
	NeedCaptcha bool   `json:"needCaptcha,omitempty"`
	SessionID   string `json:"sessionId,omitempty"`
}

type VerifyCodeRequest struct {
	Phone string `json:"phone" binding:"required"`
	Scene string `json:"scene" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

type VerifyCodeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

func (s *SMSService) RequestCode(ctx context.Context, req *RequestCodeRequest) (*RequestCodeResponse, error) {
	scene := strings.TrimSpace(req.Scene)
	if _, ok := allowedSMSScenes[scene]; !ok {
		return &RequestCodeResponse{
			Success: false,
			Message: "不支持的验证码场景",
		}, fmt.Errorf("invalid scene")
	}
	req.Scene = scene

	req.Phone = strings.TrimSpace(req.Phone)
	if !isValidPhone(req.Phone) {
		return &RequestCodeResponse{
			Success: false,
			Message: "手机号格式不正确",
		}, fmt.Errorf("invalid phone format")
	}

	if s.db == nil {
		return &RequestCodeResponse{
			Success: false,
			Message: "短信服务暂不可用，请稍后重试",
		}, fmt.Errorf("db not ready")
	}

	if err := s.validateScenePhoneState(ctx, req.Scene, req.Phone, req.TargetType); err != nil {
		var respErr *smsResponseError
		if errors.As(err, &respErr) && respErr != nil {
			return respErr.response, err
		}
		return &RequestCodeResponse{
			Success: false,
			Message: "短信服务暂不可用，请稍后重试",
		}, err
	}

	cfg, err := s.loadSMSProviderConfig(ctx)
	if err != nil {
		return &RequestCodeResponse{
			Success: false,
			Message: "短信服务暂不可用，请稍后重试",
		}, err
	}
	if err := validateSMSRequestTargetEnabled(cfg, req.Scene, req.TargetType); err != nil {
		return &RequestCodeResponse{
			Success: false,
			Message: err.Error(),
		}, err
	}

	captchaRequired, err := s.shouldRequireCaptcha(ctx, req.Scene, req.Phone)
	if err != nil {
		return &RequestCodeResponse{
			Success: false,
			Message: "验证码校验暂不可用，请稍后重试",
		}, err
	}
	if captchaRequired {
		sessionID := normalizeCaptchaSessionID(req.SessionID)
		if sessionID == "" {
			sessionID = fmt.Sprintf("%d", time.Now().UnixNano())
		}
		if s.captcha == nil {
			return &RequestCodeResponse{
				Success: false,
				Message: "图形验证码服务暂不可用，请稍后重试",
			}, fmt.Errorf("captcha service not ready")
		}
		if strings.TrimSpace(req.Captcha) == "" {
			return &RequestCodeResponse{
				Success:     true,
				Message:     "请先完成图形验证码校验",
				NeedCaptcha: true,
				SessionID:   sessionID,
			}, nil
		}

		captchaOK, captchaErr := s.captcha.Verify(ctx, sessionID, req.Captcha, true)
		if captchaErr != nil {
			return &RequestCodeResponse{
				Success: false,
				Message: "图形验证码校验失败，请稍后重试",
			}, captchaErr
		}
		if !captchaOK {
			return &RequestCodeResponse{
				Success:     true,
				Message:     "图形验证码错误，请重新输入",
				NeedCaptcha: true,
				SessionID:   sessionID,
			}, nil
		}
	}

	limited, err := CheckSMSRateLimitWithFallback(ctx, s.db, s.redis, req.Scene, req.Phone, 60*time.Second)
	if err != nil {
		return &RequestCodeResponse{
			Success: false,
			Message: "短信服务暂不可用，请稍后重试",
		}, fmt.Errorf("rate limit check failed: %w", err)
	}
	if limited {
		return &RequestCodeResponse{
			Success: false,
			Message: "发送过于频繁，请稍后再试",
		}, fmt.Errorf("rate limit exceeded")
	}

	code := generateCode(6)
	if err := s.sendVerificationCodeWithConfig(ctx, cfg, req.Phone, req.Scene, code); err != nil {
		log.Printf("[sms] send failed scene=%s phone=%s err=%v", req.Scene, maskPhone(req.Phone), err)
		return &RequestCodeResponse{
			Success: false,
			Message: "短信发送失败，请稍后重试",
		}, err
	}

	if err := StoreSMSCodeWithFallback(ctx, s.db, s.redis, req.Scene, req.Phone, code, 5*time.Minute, 60*time.Second); err != nil {
		log.Printf("[sms] store issued code failed scene=%s phone=%s err=%v", req.Scene, maskPhone(req.Phone), err)
		return &RequestCodeResponse{
			Success: false,
			Message: "短信服务暂不可用，请稍后重试",
		}, fmt.Errorf("store sms code failed: %w", err)
	}

	s.logSMSIssued(req.Phone, req.Scene)

	response := &RequestCodeResponse{
		Success: true,
		Message: "验证码已发送",
	}
	if shouldExposeSMSCode() {
		response.Code = code
	}

	return response, nil
}

type smsResponseError struct {
	response *RequestCodeResponse
	cause    error
}

func (e *smsResponseError) Error() string {
	if e == nil || e.cause == nil {
		return ""
	}
	return e.cause.Error()
}

func (e *smsResponseError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.cause
}

func newSMSResponseError(message string, cause error) error {
	return &smsResponseError{
		response: &RequestCodeResponse{
			Success: false,
			Message: message,
		},
		cause: cause,
	}
}

func (s *SMSService) validateScenePhoneState(ctx context.Context, scene, phone, targetType string) error {
	target := strings.ToLower(strings.TrimSpace(targetType))
	switch scene {
	case "login", "reset":
		if target == smsTargetAdmin {
			exists, err := s.phoneExistsInTable(ctx, "admins", phone)
			if err != nil {
				return newSMSResponseError("短信服务暂不可用，请稍后重试", fmt.Errorf("db query failed: %w", err))
			}
			if !exists {
				return newSMSResponseError("管理员账号不存在，请联系超级管理员", fmt.Errorf("admin not found"))
			}
			return nil
		}
		exists, err := s.phoneExistsInTable(ctx, "users", phone)
		if err != nil {
			return newSMSResponseError("短信服务暂不可用，请稍后重试", fmt.Errorf("db query failed: %w", err))
		}
		if !exists {
			return newSMSResponseError("该手机号未注册，请先注册", fmt.Errorf("user not found"))
		}
	case "register":
		exists, err := s.phoneExistsInTable(ctx, "users", phone)
		if err != nil {
			return newSMSResponseError("短信服务暂不可用，请稍后重试", fmt.Errorf("db query failed: %w", err))
		}
		if exists {
			return newSMSResponseError("该手机号已注册，请直接登录", fmt.Errorf("user already exists"))
		}
	case "rider_login", "rider_reset", "rider_change_password":
		exists, err := s.phoneExistsInTable(ctx, "riders", phone)
		if err != nil {
			return newSMSResponseError("短信服务暂不可用，请稍后重试", fmt.Errorf("db query failed: %w", err))
		}
		if !exists {
			return newSMSResponseError("骑手账号不存在，请联系管理员开通", fmt.Errorf("rider not found"))
		}
	case "merchant_login", "merchant_reset":
		exists, err := s.phoneExistsInTable(ctx, "merchants", phone)
		if err != nil {
			return newSMSResponseError("短信服务暂不可用，请稍后重试", fmt.Errorf("db query failed: %w", err))
		}
		if !exists {
			return newSMSResponseError("商户账号不存在，请联系管理员开通", fmt.Errorf("merchant not found"))
		}
	case "change_phone_verify":
		table := "users"
		notFoundMessage := "该手机号未注册，请先注册"
		notFoundError := "user not found"
		if target == smsTargetAdmin {
			table = "admins"
			notFoundMessage = "管理员账号不存在，请联系超级管理员"
			notFoundError = "admin not found"
		} else if target == smsTargetRider {
			table = "riders"
			notFoundMessage = "骑手账号不存在，请联系管理员开通"
			notFoundError = "rider not found"
		} else if target == smsTargetMerchant {
			table = "merchants"
			notFoundMessage = "商户账号不存在，请联系管理员开通"
			notFoundError = "merchant not found"
		}
		exists, err := s.phoneExistsInTable(ctx, table, phone)
		if err != nil {
			return newSMSResponseError("短信服务暂不可用，请稍后重试", fmt.Errorf("db query failed: %w", err))
		}
		if !exists {
			return newSMSResponseError(notFoundMessage, errors.New(notFoundError))
		}
	case "change_phone_new":
		table := "users"
		if target == smsTargetAdmin {
			table = "admins"
		} else if target == smsTargetRider {
			table = "riders"
		} else if target == smsTargetMerchant {
			table = "merchants"
		}
		exists, err := s.phoneExistsInTable(ctx, table, phone)
		if err != nil {
			return newSMSResponseError("短信服务暂不可用，请稍后重试", fmt.Errorf("db query failed: %w", err))
		}
		if exists {
			return newSMSResponseError("该手机号已注册，请更换后重试", fmt.Errorf("phone already exists"))
		}
	}

	return nil
}

func resolveSMSRequestTarget(scene, targetType string) string {
	target := strings.ToLower(strings.TrimSpace(targetType))
	if target == smsTargetAdmin {
		return smsTargetAdmin
	}
	if target == smsTargetMerchant {
		return smsTargetMerchant
	}
	if target == smsTargetRider {
		return smsTargetRider
	}

	switch strings.TrimSpace(scene) {
	case "merchant_login", "merchant_reset":
		return smsTargetMerchant
	case "rider_login", "rider_reset", "rider_change_password":
		return smsTargetRider
	default:
		return smsTargetConsumer
	}
}

func getSMSRequestTargetLabel(target string) string {
	switch strings.ToLower(strings.TrimSpace(target)) {
	case smsTargetAdmin:
		return "管理端"
	case smsTargetMerchant:
		return "商户端"
	case smsTargetRider:
		return "骑手端"
	default:
		return "用户端"
	}
}

func validateSMSRequestTargetEnabled(cfg SMSProviderConfig, scene, targetType string) error {
	target := resolveSMSRequestTarget(scene, targetType)
	if cfg.IsTargetEnabled(target) {
		return nil
	}
	return fmt.Errorf("%s短信验证码已关闭", getSMSRequestTargetLabel(target))
}

func (s *SMSService) phoneExistsInTable(ctx context.Context, table, phone string) (bool, error) {
	if s.db == nil {
		return false, fmt.Errorf("db not ready")
	}

	var count int64
	if err := s.db.WithContext(ctx).Table(table).Where("phone = ?", phone).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *SMSService) shouldRequireCaptcha(ctx context.Context, scene, phone string) (bool, error) {
	if s.db == nil {
		return false, fmt.Errorf("db not ready")
	}
	if strings.TrimSpace(scene) != "register" {
		return false, nil
	}

	var count int64
	cutoff := time.Now().Add(-10 * time.Minute)
	if err := s.db.WithContext(ctx).
		Model(&repository.SMSVerificationCode{}).
		Where("scene = ? AND phone = ? AND created_at >= ?", scene, phone, cutoff).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count >= 2, nil
}

func (s *SMSService) VerifyCode(ctx context.Context, req *VerifyCodeRequest) (*VerifyCodeResponse, error) {
	req.Phone = strings.TrimSpace(req.Phone)
	req.Scene = strings.TrimSpace(req.Scene)
	req.Code = strings.TrimSpace(req.Code)

	if !isValidPhone(req.Phone) {
		return &VerifyCodeResponse{
			Success: false,
			Message: "手机号格式不正确",
			Error:   "invalid phone format",
		}, fmt.Errorf("invalid phone format")
	}

	isValid, err := VerifySMSCodeWithFallback(ctx, s.db, s.redis, req.Scene, req.Phone, req.Code, true)
	if err != nil {
		return &VerifyCodeResponse{
			Success: false,
			Message: "验证码校验失败",
			Error:   "verification failed",
		}, err
	}

	if !isValid {
		return &VerifyCodeResponse{
			Success: false,
			Message: "验证码错误或已过期",
			Error:   "invalid code",
		}, fmt.Errorf("invalid code")
	}

	return &VerifyCodeResponse{
		Success: true,
		Message: "验证码校验成功",
	}, nil
}

func (s *SMSService) VerifyCodeCheck(ctx context.Context, req *VerifyCodeRequest) (*VerifyCodeResponse, error) {
	req.Phone = strings.TrimSpace(req.Phone)
	req.Scene = strings.TrimSpace(req.Scene)
	req.Code = strings.TrimSpace(req.Code)

	if !isValidPhone(req.Phone) {
		return &VerifyCodeResponse{
			Success: false,
			Message: "手机号格式不正确",
			Error:   "invalid phone format",
		}, fmt.Errorf("invalid phone format")
	}

	isValid, err := VerifySMSCodeWithFallback(ctx, s.db, s.redis, req.Scene, req.Phone, req.Code, false)
	if err != nil {
		return &VerifyCodeResponse{
			Success: false,
			Message: "验证码校验失败",
			Error:   "verification failed",
		}, err
	}

	if !isValid {
		return &VerifyCodeResponse{
			Success: false,
			Message: "验证码错误或已过期",
			Error:   "invalid code",
		}, fmt.Errorf("invalid code")
	}

	return &VerifyCodeResponse{
		Success: true,
		Message: "验证码校验成功",
	}, nil
}

func (s *SMSService) sendVerificationCode(ctx context.Context, phone, scene, code string) error {
	cfg, err := s.loadSMSProviderConfig(ctx)
	if err != nil {
		return err
	}
	return s.sendVerificationCodeWithConfig(ctx, cfg, phone, scene, code)
}

func (s *SMSService) sendVerificationCodeWithConfig(ctx context.Context, cfg SMSProviderConfig, phone, scene, code string) error {
	if !cfg.IsConfigured() {
		return fmt.Errorf("sms provider is not configured")
	}

	switch cfg.Provider {
	case defaultSMSProvider:
		return s.sendAliyunSMS(ctx, cfg, phone, scene, code)
	default:
		return fmt.Errorf("unsupported sms provider: %s", cfg.Provider)
	}
}

func (s *SMSService) loadSMSProviderConfig(ctx context.Context) (SMSProviderConfig, error) {
	cfg := DefaultSMSProviderConfig()
	if s.admin == nil {
		return cfg, nil
	}

	raw := map[string]interface{}{}
	if err := s.admin.GetSetting(ctx, "sms_config", &raw); err != nil {
		return cfg, err
	}
	return NormalizeSMSProviderConfigMap(raw), nil
}

func generateCode(length int) string {
	code, err := utils.GenerateSecureCode(length)
	if err != nil {
		log.Printf("generate sms code failed, fallback to timestamp: %v", err)
		return fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
	}
	return code
}

func isValidPhone(phone string) bool {
	if len(phone) != 11 {
		return false
	}
	if phone[0] != '1' {
		return false
	}
	for _, c := range phone {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

type VerificationCode struct {
	Phone     string `json:"phone"`
	Code      string `json:"code"`
	Scene     string `json:"scene"`
	ExpiresIn int    `json:"expires_in"`
}

func (s *SMSService) ListVerificationCodes(ctx context.Context) ([]VerificationCode, error) {
	if s.db == nil {
		return nil, fmt.Errorf("db not ready")
	}

	now := time.Now()
	var rows []repository.SMSVerificationCode
	if err := s.db.WithContext(ctx).
		Where("consumed_at IS NULL AND expires_at > ?", now).
		Order("created_at DESC").
		Limit(200).
		Find(&rows).Error; err != nil {
		return nil, err
	}

	codes := make([]VerificationCode, 0, len(rows))
	for _, row := range rows {
		ttl := int(row.ExpiresAt.Sub(now).Seconds())
		if ttl < 0 {
			ttl = 0
		}
		codes = append(codes, VerificationCode{
			Phone:     row.Phone,
			Code:      row.Code,
			Scene:     row.Scene,
			ExpiresIn: ttl,
		})
	}

	return codes, nil
}

func shouldExposeSMSCode() bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv("SMS_DEBUG_EXPOSE_CODE")))
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func (s *SMSService) logSMSIssued(phone, scene string) {
	maskedPhone := maskPhone(phone)
	if shouldExposeSMSCode() {
		log.Printf("[sms] code issued scene=%s phone=%s debug_response=%t", scene, maskedPhone, true)
		return
	}
	log.Printf("[sms] code issued scene=%s phone=%s", scene, maskedPhone)
}

func maskPhone(phone string) string {
	if len(phone) != 11 {
		return phone
	}
	return phone[:3] + "****" + phone[7:]
}
