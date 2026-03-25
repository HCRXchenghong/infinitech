package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type AuthService struct {
	repo   repository.UserRepository
	db     *gorm.DB
	redis  *redis.Client
	config *config.Config
}

func NewAuthService(repo repository.UserRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		repo:   repo,
		config: cfg,
	}
}

func (s *AuthService) MatchEntityIdentifier(ctx context.Context, entityType string, expectedID int64, raw string) bool {
	value := strings.TrimSpace(raw)
	if expectedID <= 0 || value == "" {
		return false
	}
	if numericID, err := strconv.ParseInt(value, 10, 64); err == nil && numericID > 0 {
		return numericID == expectedID
	}
	if s.db == nil {
		return false
	}

	tableName := ""
	switch strings.ToLower(strings.TrimSpace(entityType)) {
	case "merchant":
		tableName = "merchants"
	case "rider":
		tableName = "riders"
	case "user":
		tableName = "users"
	default:
		return false
	}

	query := s.db.WithContext(ctx).Table(tableName).Select("id").Limit(1)
	switch {
	case idkit.UIDPattern.MatchString(value):
		query = query.Where("uid = ?", value)
	case idkit.TSIDPattern.MatchString(value):
		query = query.Where("tsid = ?", value)
	default:
		return false
	}

	var result struct {
		ID int64 `gorm:"column:id"`
	}
	if err := query.Scan(&result).Error; err != nil {
		return false
	}
	return result.ID == expectedID
}

// SetDBAndRedis wires runtime database and redis clients into auth service.
func (s *AuthService) SetDBAndRedis(db *gorm.DB, redis *redis.Client) {
	s.db = db
	s.redis = redis
}

func (s *AuthService) verifyCodeByScene(ctx context.Context, scene, phone, code string) error {
	if code == "" {
		return fmt.Errorf("missing code")
	}
	ok, err := VerifySMSCodeWithFallback(ctx, s.db, s.redis, scene, phone, code, true)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("invalid code")
	}
	return nil
}

// LoginRequest defines the login request payload.
type LoginRequest struct {
	Phone    string `json:"phone"`
	Code     string `json:"code"`
	Password string `json:"password"`
}

// LoginResponse defines the login response payload.
type LoginResponse struct {
	Success      bool                   `json:"success"`
	Token        string                 `json:"token,omitempty"`
	RefreshToken string                 `json:"refreshToken,omitempty"`
	ExpiresIn    int64                  `json:"expiresIn,omitempty"`
	User         map[string]interface{} `json:"user,omitempty"`
	Error        string                 `json:"error,omitempty"`
	NeedRegister bool                   `json:"needRegister,omitempty"`
}

func (s *AuthService) Login(ctx context.Context, phone, code, password string) (interface{}, error) {
	if !isValidPhone(phone) {
		return &LoginResponse{
			Success: false,
			Error:   "invalid phone format",
		}, fmt.Errorf("invalid phone format")
	}

	var user *repository.User
	var err error

	switch {
	case code != "":
		if err := s.verifyCodeByScene(ctx, "login", phone, code); err != nil {
			return &LoginResponse{
				Success: false,
				Error:   "invalid verification code",
			}, err
		}

		user, err = s.repo.GetByPhone(ctx, phone)
		if err != nil || user == nil {
			return &LoginResponse{
				Success:      false,
				Error:        "user not found, please register first",
				NeedRegister: true,
			}, fmt.Errorf("user not found")
		}

	case password != "":
		user, err = s.repo.GetByPhone(ctx, phone)
		if err != nil || user == nil {
			return &LoginResponse{
				Success: false,
				Error:   "user not found",
			}, fmt.Errorf("user not found")
		}
		if !checkPassword(user.PasswordHash, password) {
			return &LoginResponse{
				Success: false,
				Error:   "invalid password",
			}, fmt.Errorf("invalid password")
		}

	default:
		return &LoginResponse{
			Success: false,
			Error:   "missing credentials",
		}, fmt.Errorf("missing credentials")
	}

	if user == nil {
		return &LoginResponse{
			Success: false,
			Error:   "user not found",
		}, fmt.Errorf("user not found")
	}

	token, err := s.generateToken(phone, int64(user.ID))
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to generate token",
		}, err
	}

	refreshToken, err := s.generateRefreshToken(phone, int64(user.ID))
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to generate refresh token",
		}, err
	}

	return &LoginResponse{
		Success:      true,
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresIn:    7200,
		User:         buildUserPayload(user),
	}, nil
}

// RegisterRequest defines the registration request payload.
type RegisterRequest struct {
	Phone    string `json:"phone"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

// RegisterResponse defines the registration response payload.
type RegisterResponse struct {
	Success bool                   `json:"success"`
	Token   string                 `json:"token,omitempty"`
	User    map[string]interface{} `json:"user,omitempty"`
	Error   string                 `json:"error,omitempty"`
}

func (s *AuthService) lookupInviteCode(ctx context.Context, db *gorm.DB, code string) (*repository.InviteCode, error) {
	normalized := strings.ToUpper(strings.TrimSpace(code))
	if normalized == "" {
		return nil, nil
	}
	if db == nil {
		return nil, fmt.Errorf("db not ready")
	}

	var invite repository.InviteCode
	if err := db.WithContext(ctx).Where("code = ?", normalized).First(&invite).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid invite code")
		}
		return nil, err
	}
	return &invite, nil
}

func inviteeIdentityValue(user *repository.User) string {
	if user == nil {
		return ""
	}
	if uid := strings.TrimSpace(user.UID); uid != "" {
		return uid
	}
	if user.ID > 0 {
		return strconv.FormatUint(uint64(user.ID), 10)
	}
	return strings.TrimSpace(user.Phone)
}

func (s *AuthService) inviteRegisterRewardPoints() int {
	if s == nil || s.config == nil {
		return 0
	}
	if s.config.Invite.RegisterRewardPoints < 0 {
		return 0
	}
	return s.config.Invite.RegisterRewardPoints
}

func buildInviteRewardOrderID(record *repository.InviteRecord) string {
	if record == nil {
		return ""
	}
	if uid := strings.TrimSpace(record.UID); uid != "" {
		return "invite:" + uid
	}
	if record.ID > 0 {
		return fmt.Sprintf("invite:%d", record.ID)
	}
	return ""
}

func (s *AuthService) settleInviteRewardTx(ctx context.Context, tx *gorm.DB, record *repository.InviteRecord) error {
	if tx == nil || record == nil || record.ID == 0 {
		return nil
	}

	rewardPoints := s.inviteRegisterRewardPoints()
	if rewardPoints <= 0 {
		return nil
	}

	inviterIdentity := strings.TrimSpace(record.InviterUserID)
	if inviterIdentity == "" {
		inviterIdentity = strings.TrimSpace(record.InviterPhone)
	}
	if inviterIdentity == "" {
		return nil
	}

	orderID := buildInviteRewardOrderID(record)
	if orderID == "" {
		return nil
	}

	var existingCount int64
	if err := tx.WithContext(ctx).
		Model(&repository.PointsLedger{}).
		Where("user_id = ? AND order_id = ? AND type = ?", inviterIdentity, orderID, "invite").
		Count(&existingCount).Error; err != nil {
		return err
	}

	if existingCount == 0 {
		expiresAt := time.Now().AddDate(0, 3, 0)
		ledger := repository.PointsLedger{
			UserID:    inviterIdentity,
			OrderID:   orderID,
			Change:    rewardPoints,
			Type:      "invite",
			ExpiresAt: &expiresAt,
			CreatedAt: time.Now(),
		}
		if err := tx.WithContext(ctx).Create(&ledger).Error; err != nil {
			return err
		}
	}

	return tx.WithContext(ctx).
		Model(&repository.InviteRecord{}).
		Where("id = ?", record.ID).
		Updates(map[string]interface{}{
			"status":        "rewarded",
			"reward_points": rewardPoints,
			"updated_at":    time.Now(),
		}).Error
}

func (s *AuthService) createInviteRegistrationRecord(ctx context.Context, tx *gorm.DB, invite *repository.InviteCode, invitee *repository.User) error {
	if tx == nil || invite == nil || invitee == nil {
		return nil
	}

	inviteePhone := strings.TrimSpace(invitee.Phone)
	inviteeID := inviteeIdentityValue(invitee)
	inviterID := strings.TrimSpace(invite.UserID)
	inviterPhone := strings.TrimSpace(invite.Phone)
	if inviterID == "" {
		inviterID = inviterPhone
	}
	inviteCode := strings.TrimSpace(invite.Code)

	if inviteePhone != "" && inviteePhone == inviterPhone {
		return fmt.Errorf("invite code cannot be used by inviter")
	}
	if inviteeID != "" && inviteeID == inviterID {
		return fmt.Errorf("invite code cannot be used by inviter")
	}

	var existing repository.InviteRecord
	query := tx.WithContext(ctx).Where("invitee_phone = ?", inviteePhone)
	if inviteeID != "" {
		query = query.Or("invitee_user_id = ?", inviteeID)
	}
	if err := query.Order("created_at DESC").First(&existing).Error; err == nil {
		return s.settleInviteRewardTx(ctx, tx, &existing)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	var sharedRecord repository.InviteRecord
	sharedQuery := tx.WithContext(ctx).Where("invite_code = ?", inviteCode)
	if inviterID != "" {
		sharedQuery = sharedQuery.Where("inviter_user_id = ?", inviterID)
	} else if inviterPhone != "" {
		sharedQuery = sharedQuery.Where("inviter_phone = ?", inviterPhone)
	}
	if err := sharedQuery.Where("status = ?", "shared").Order("created_at DESC").First(&sharedRecord).Error; err == nil {
		updates := map[string]interface{}{
			"invitee_phone":   inviteePhone,
			"invitee_user_id": inviteeID,
			"status":          "registered",
			"updated_at":      time.Now(),
		}
		if err := tx.WithContext(ctx).Model(&repository.InviteRecord{}).Where("id = ?", sharedRecord.ID).Updates(updates).Error; err != nil {
			return err
		}
		sharedRecord.InviteePhone = inviteePhone
		sharedRecord.InviteeUserID = inviteeID
		sharedRecord.Status = "registered"
		sharedRecord.UpdatedAt = time.Now()
		return s.settleInviteRewardTx(ctx, tx, &sharedRecord)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	record := repository.InviteRecord{
		InviterUserID: inviterID,
		InviterPhone:  inviterPhone,
		InviteCode:    inviteCode,
		InviteePhone:  inviteePhone,
		InviteeUserID: inviteeID,
		Status:        "registered",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	if err := tx.WithContext(ctx).Create(&record).Error; err != nil {
		return err
	}
	return s.settleInviteRewardTx(ctx, tx, &record)
}

func (s *AuthService) Register(ctx context.Context, data interface{}) (interface{}, error) {
	req, ok := data.(map[string]interface{})
	if !ok {
		return &RegisterResponse{Success: false, Error: "invalid request"}, fmt.Errorf("invalid request")
	}

	phone, _ := req["phone"].(string)
	name, _ := req["name"].(string)
	password, _ := req["password"].(string)
	inviteCode, _ := req["inviteCode"].(string)
	wechatBindToken, _ := req["wechatBindToken"].(string)
	inviteCode = strings.ToUpper(strings.TrimSpace(inviteCode))

	if !isValidPhone(phone) {
		return &RegisterResponse{Success: false, Error: "invalid phone format"}, fmt.Errorf("invalid phone format")
	}
	if password == "" {
		return &RegisterResponse{Success: false, Error: "missing password"}, fmt.Errorf("missing password")
	}
	wechatClaims, err := s.maybeLoadWechatBindIdentity(wechatBindToken)
	if err != nil {
		return &RegisterResponse{Success: false, Error: "invalid wechat bind token"}, err
	}

	if name == "" && wechatClaims != nil && strings.TrimSpace(wechatClaims.Nickname) != "" {
		name = strings.TrimSpace(wechatClaims.Nickname)
	}
	if name == "" {
		name = "User"
	}

	if existing, err := s.repo.GetByPhone(ctx, phone); err == nil && existing != nil {
		return &RegisterResponse{Success: false, Error: "phone exists"}, fmt.Errorf("phone exists")
	}

	db := s.repo.DB()
	if db == nil {
		db = s.db
	}

	var inviteSource *repository.InviteCode
	if inviteCode != "" {
		var err error
		inviteSource, err = s.lookupInviteCode(ctx, db, inviteCode)
		if err != nil {
			return &RegisterResponse{Success: false, Error: "invalid invite code"}, err
		}
	}

	hash, err := hashPassword(password)
	if err != nil {
		return &RegisterResponse{Success: false, Error: "failed to hash password"}, err
	}

	user := &repository.User{
		Phone:        phone,
		Name:         name,
		PasswordHash: hash,
		Type:         "customer",
	}
	if wechatClaims != nil && strings.TrimSpace(wechatClaims.AvatarURL) != "" {
		user.AvatarURL = strings.TrimSpace(wechatClaims.AvatarURL)
	}

	if db != nil {
		if err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(user).Error; err != nil {
				return err
			}
			if user.RoleID == 0 {
				if err := tx.Model(user).Update("role_id", int(user.ID)).Error; err != nil {
					return err
				}
				user.RoleID = int(user.ID)
			}
			if strings.TrimSpace(wechatBindToken) != "" {
				if err := s.BindWechatIdentityOnRegisterWithDB(ctx, tx, user, wechatBindToken); err != nil {
					return err
				}
			}
			return s.createInviteRegistrationRecord(ctx, tx, inviteSource, user)
		}); err != nil {
			if inviteSource != nil {
				return &RegisterResponse{Success: false, Error: "failed to process invite code"}, err
			}
			return &RegisterResponse{Success: false, Error: "register failed"}, err
		}
	} else {
		if strings.TrimSpace(wechatBindToken) != "" {
			return &RegisterResponse{Success: false, Error: "register failed"}, fmt.Errorf("db not ready for wechat binding")
		}
		if err := s.repo.Create(ctx, user); err != nil {
			return &RegisterResponse{Success: false, Error: "register failed"}, err
		}
		if user.RoleID == 0 {
			user.RoleID = int(user.ID)
		}
	}

	token, err := s.generateToken(phone, int64(user.ID))
	if err != nil {
		return &RegisterResponse{Success: false, Error: "failed to generate token"}, err
	}

	return &RegisterResponse{
		Success: true,
		Token:   token,
		User:    buildUserPayload(user),
	}, nil
}

// generateToken issues an access token.
func (s *AuthService) generateToken(phone string, userId int64) (string, error) {
	return s.generateTokenWithExpiry(phone, userId, s.config.JWT.AccessTokenExpiry, "access")
}

// generateRefreshToken issues a refresh token.
func (s *AuthService) generateRefreshToken(phone string, userId int64) (string, error) {
	return s.generateTokenWithExpiry(phone, userId, s.config.JWT.RefreshTokenExpiry, "refresh")
}

// IssueAccessToken exposes access-token issuance for other authenticated flows
// such as phone changes where the subject phone number has just been updated.
func (s *AuthService) IssueAccessToken(phone string, userId int64) (string, error) {
	return s.generateToken(phone, userId)
}

// IssueTokenPair re-issues access and refresh tokens after identity changes.
func (s *AuthService) IssueTokenPair(phone string, userId int64) (string, string, int64, error) {
	accessToken, err := s.generateToken(phone, userId)
	if err != nil {
		return "", "", 0, err
	}

	refreshToken, err := s.generateRefreshToken(phone, userId)
	if err != nil {
		return "", "", 0, err
	}

	return accessToken, refreshToken, int64(s.config.JWT.AccessTokenExpiry.Seconds()), nil
}

// generateTokenWithExpiry builds a signed token with the given expiry and type.
func (s *AuthService) generateTokenWithExpiry(phone string, userId int64, expiry time.Duration, tokenType string) (string, error) {
	secret := s.config.JWT.Secret

	// Build the token payload.
	payload := map[string]interface{}{
		"phone":  phone,
		"userId": userId,
		"type":   tokenType,
		"exp":    time.Now().Add(expiry).Unix(),
		"iat":    time.Now().Unix(),
	}

	// Serialize the payload before encoding.
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	// Base64-encode the payload.
	payloadBase64 := base64.URLEncoding.EncodeToString(payloadJSON)

	// Sign the encoded payload with HMAC-SHA256.
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payloadBase64))
	signature := base64.URLEncoding.EncodeToString(h.Sum(nil))

	// Compose the final token as payload.signature.
	token := payloadBase64 + "." + signature

	return token, nil
}

// VerifyToken preserves the legacy verification entrypoint.
func (s *AuthService) VerifyToken(tokenString string) (bool, string, int64, error) {
	return s.VerifyUserToken(tokenString)
}

// VerifyUserToken validates a user token.
func (s *AuthService) VerifyUserToken(tokenString string) (bool, string, int64, error) {
	token := strings.TrimSpace(tokenString)
	if strings.HasPrefix(strings.ToLower(token), "bearer ") {
		token = strings.TrimSpace(token[7:])
	}
	if token == "" {
		return false, "", 0, fmt.Errorf("missing token")
	}
	if s.db == nil {
		return false, "", 0, fmt.Errorf("db not initialized")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false, "", 0, fmt.Errorf("invalid token format")
	}

	payloadBase64 := parts[0]
	signature := parts[1]

	h := hmac.New(sha256.New, []byte(s.config.JWT.Secret))
	h.Write([]byte(payloadBase64))
	expectedSignature := base64.URLEncoding.EncodeToString(h.Sum(nil))
	if signature != expectedSignature {
		return false, "", 0, fmt.Errorf("invalid signature")
	}

	payloadJSON, err := base64.URLEncoding.DecodeString(payloadBase64)
	if err != nil {
		return false, "", 0, fmt.Errorf("failed to decode payload")
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return false, "", 0, fmt.Errorf("failed to parse payload")
	}

	exp, ok := payload["exp"].(float64)
	if !ok {
		return false, "", 0, fmt.Errorf("invalid exp field")
	}
	if time.Now().Unix() > int64(exp) {
		return false, "", 0, fmt.Errorf("token expired")
	}

	phone, _ := payload["phone"].(string)

	var userID int64
	switch value := payload["userId"].(type) {
	case float64:
		userID = int64(value)
	case int:
		userID = int64(value)
	case int64:
		userID = value
	case string:
		parsed, parseErr := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
		if parseErr == nil {
			userID = parsed
		}
	}
	if userID <= 0 {
		return false, "", 0, fmt.Errorf("invalid token subject")
	}

	var user repository.User
	find := s.db.WithContext(context.Background()).Where("id = ?", userID).Limit(1).Find(&user)
	if find.Error != nil {
		return false, "", 0, find.Error
	}
	if find.RowsAffected == 0 {
		return false, "", 0, fmt.Errorf("user not found")
	}
	if phone != "" && user.Phone != phone {
		return false, "", 0, fmt.Errorf("token user mismatch")
	}

	return true, user.Phone, int64(user.ID), nil
}

// VerifyRiderToken validates a rider token.
func (s *AuthService) VerifyRiderToken(tokenString string) (bool, string, int64, error) {
	token := strings.TrimSpace(tokenString)
	if strings.HasPrefix(strings.ToLower(token), "bearer ") {
		token = strings.TrimSpace(token[7:])
	}
	if token == "" {
		return false, "", 0, fmt.Errorf("missing token")
	}
	if s.db == nil {
		return false, "", 0, fmt.Errorf("db not initialized")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false, "", 0, fmt.Errorf("invalid token format")
	}

	payloadBase64 := parts[0]
	signature := parts[1]

	h := hmac.New(sha256.New, []byte(s.config.JWT.Secret))
	h.Write([]byte(payloadBase64))
	expectedSignature := base64.URLEncoding.EncodeToString(h.Sum(nil))
	if signature != expectedSignature {
		return false, "", 0, fmt.Errorf("invalid signature")
	}

	payloadJSON, err := base64.URLEncoding.DecodeString(payloadBase64)
	if err != nil {
		return false, "", 0, fmt.Errorf("failed to decode payload")
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return false, "", 0, fmt.Errorf("failed to parse payload")
	}

	exp, ok := payload["exp"].(float64)
	if !ok {
		return false, "", 0, fmt.Errorf("invalid exp field")
	}
	if time.Now().Unix() > int64(exp) {
		return false, "", 0, fmt.Errorf("token expired")
	}

	phone, _ := payload["phone"].(string)

	var riderID int64
	switch value := payload["userId"].(type) {
	case float64:
		riderID = int64(value)
	case int:
		riderID = int64(value)
	case int64:
		riderID = value
	case string:
		parsed, parseErr := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
		if parseErr == nil {
			riderID = parsed
		}
	}
	if riderID <= 0 {
		return false, "", 0, fmt.Errorf("invalid token subject")
	}

	var rider repository.Rider
	find := s.db.WithContext(context.Background()).Where("id = ?", riderID).Limit(1).Find(&rider)
	if find.Error != nil {
		return false, "", 0, find.Error
	}
	if find.RowsAffected == 0 {
		return false, "", 0, fmt.Errorf("rider not found")
	}
	if phone != "" && rider.Phone != phone {
		return false, "", 0, fmt.Errorf("token user mismatch")
	}

	return true, rider.Phone, int64(rider.ID), nil
}

// VerifyMerchantToken validates a merchant token.
func (s *AuthService) VerifyMerchantToken(tokenString string) (bool, string, int64, error) {
	token := strings.TrimSpace(tokenString)
	if strings.HasPrefix(strings.ToLower(token), "bearer ") {
		token = strings.TrimSpace(token[7:])
	}
	if token == "" {
		return false, "", 0, fmt.Errorf("missing token")
	}
	if s.db == nil {
		return false, "", 0, fmt.Errorf("db not initialized")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false, "", 0, fmt.Errorf("invalid token format")
	}

	payloadBase64 := parts[0]
	signature := parts[1]

	h := hmac.New(sha256.New, []byte(s.config.JWT.Secret))
	h.Write([]byte(payloadBase64))
	expectedSignature := base64.URLEncoding.EncodeToString(h.Sum(nil))
	if signature != expectedSignature {
		return false, "", 0, fmt.Errorf("invalid signature")
	}

	payloadJSON, err := base64.URLEncoding.DecodeString(payloadBase64)
	if err != nil {
		return false, "", 0, fmt.Errorf("failed to decode payload")
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return false, "", 0, fmt.Errorf("failed to parse payload")
	}

	exp, ok := payload["exp"].(float64)
	if !ok {
		return false, "", 0, fmt.Errorf("invalid exp field")
	}
	if time.Now().Unix() > int64(exp) {
		return false, "", 0, fmt.Errorf("token expired")
	}

	phone, _ := payload["phone"].(string)

	var merchantID int64
	switch value := payload["userId"].(type) {
	case float64:
		merchantID = int64(value)
	case int:
		merchantID = int64(value)
	case int64:
		merchantID = value
	case string:
		parsed, parseErr := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
		if parseErr == nil {
			merchantID = parsed
		}
	}
	if merchantID <= 0 {
		return false, "", 0, fmt.Errorf("invalid token subject")
	}

	var merchant repository.Merchant
	find := s.db.WithContext(context.Background()).Where("id = ?", merchantID).Limit(1).Find(&merchant)
	if find.Error != nil {
		return false, "", 0, find.Error
	}
	if find.RowsAffected == 0 {
		return false, "", 0, fmt.Errorf("merchant not found")
	}
	if phone != "" && merchant.Phone != phone {
		return false, "", 0, fmt.Errorf("token user mismatch")
	}

	return true, merchant.Phone, int64(merchant.ID), nil
}

// RefreshToken validates a refresh token and issues a new token pair.
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error) {
	secret := s.config.JWT.Secret

	// Split the token into payload and signature parts.
	parts := strings.Split(refreshToken, ".")
	if len(parts) != 2 {
		return &LoginResponse{
			Success: false,
			Error:   "invalid refresh token format",
		}, fmt.Errorf("invalid token format")
	}

	payloadBase64 := parts[0]
	signature := parts[1]

	// Verify the refresh token signature.
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payloadBase64))
	expectedSignature := base64.URLEncoding.EncodeToString(h.Sum(nil))

	if signature != expectedSignature {
		return &LoginResponse{
			Success: false,
			Error:   "invalid refresh token signature",
		}, fmt.Errorf("invalid signature")
	}

	// Decode the payload.
	payloadJSON, err := base64.URLEncoding.DecodeString(payloadBase64)
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to decode refresh token",
		}, fmt.Errorf("failed to decode payload")
	}

	// Parse the payload JSON.
	var payload map[string]interface{}
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to parse refresh token",
		}, fmt.Errorf("failed to parse payload")
	}

	// Ensure the token type is refresh.
	tokenType, _ := payload["type"].(string)
	if tokenType != "refresh" {
		return &LoginResponse{
			Success: false,
			Error:   "not a refresh token",
		}, fmt.Errorf("invalid token type")
	}

	// Validate refresh token expiry.
	exp, ok := payload["exp"].(float64)
	if !ok {
		return &LoginResponse{
			Success: false,
			Error:   "invalid exp field",
		}, fmt.Errorf("invalid exp field")
	}

	if time.Now().Unix() > int64(exp) {
		return &LoginResponse{
			Success: false,
			Error:   "refresh token expired",
		}, fmt.Errorf("token expired")
	}

	// Extract the subject identity from the payload.
	phone, _ := payload["phone"].(string)
	userId, _ := payload["userId"].(float64)

	// Ensure the referenced user still exists.
	user, err := s.repo.GetByPhone(ctx, phone)
	if err != nil || user == nil {
		return &LoginResponse{
			Success: false,
			Error:   "user not found",
		}, fmt.Errorf("user not found")
	}

	// Issue a new access token.
	newAccessToken, err := s.generateToken(phone, int64(userId))
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to generate new access token",
		}, err
	}

	// Issue a new refresh token.
	newRefreshToken, err := s.generateRefreshToken(phone, int64(userId))
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to generate new refresh token",
		}, err
	}

	userInfo := buildUserPayload(user)

	return &LoginResponse{
		Success:      true,
		Token:        newAccessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    7200, // 2 hours
		User:         userInfo,
	}, nil
}

// findOrCreateUser returns the existing user by phone or creates one on demand.

func (s *AuthService) findOrCreateUser(ctx context.Context, phone string) (*repository.User, error) {
	user, err := s.repo.GetByPhone(ctx, phone)
	if err == nil && user != nil {
		return user, nil
	}

	if s.db == nil {
		return nil, fmt.Errorf("db not ready")
	}

	name := "user_" + phone[len(phone)-4:]
	newUser := &repository.User{
		Phone: phone,
		Name:  name,
		Type:  "customer",
	}
	if err := s.repo.Create(ctx, newUser); err != nil {
		return nil, err
	}
	if newUser.RoleID == 0 {
		s.db.Model(newUser).Update("role_id", int(newUser.ID))
		newUser.RoleID = int(newUser.ID)
	}
	return newUser, nil
}

// RiderLogin authenticates a rider with code or password.
func (s *AuthService) RiderLogin(ctx context.Context, phone, code, password string) (interface{}, error) {
	// validate phone format before rider/merchant login
	if !isValidPhone(phone) {
		return &LoginResponse{
			Success: false,
			Error:   "invalid phone format",
		}, fmt.Errorf("invalid phone format")
	}

	var rider repository.Rider

	// Verify rider login by SMS code.
	if code != "" {
		// verify rider login code
		if err := s.verifyCodeByScene(ctx, "rider_login", phone, code); err != nil {
			return &LoginResponse{
				Success: false,
				Error:   "invalid verification code",
			}, err
		}

		// Load rider by phone after code verification.
		if err := s.db.Where("phone = ?", phone).First(&rider).Error; err != nil {
			return &LoginResponse{
				Success: false,
				Error:   "rider not found, please register first",
			}, fmt.Errorf("rider not found")
		}
	} else if password != "" {
		// Load rider and verify password login.
		if err := s.db.Where("phone = ?", phone).First(&rider).Error; err != nil {
			return &LoginResponse{
				Success: false,
				Error:   "rider not found",
			}, fmt.Errorf("rider not found")
		}
		if !checkPassword(rider.PasswordHash, password) {
			return &LoginResponse{
				Success: false,
				Error:   "invalid password",
			}, fmt.Errorf("invalid password")
		}
	} else {
		return &LoginResponse{
			Success: false,
			Error:   "missing credentials",
		}, fmt.Errorf("missing credentials")
	}

	// Issue a rider JWT token.
	token, err := s.generateToken(phone, int64(rider.ID))
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to generate token",
		}, err
	}

	riderInfo := map[string]interface{}{
		"id":       rider.UID,
		"phone":    rider.Phone,
		"name":     rider.Name,
		"nickname": rider.Name,
		"avatar":   rider.Avatar,
	}

	return &LoginResponse{
		Success: true,
		Token:   token,
		User:    riderInfo,
	}, nil
}

// MerchantLogin authenticates a merchant with code or password.
func (s *AuthService) MerchantLogin(ctx context.Context, phone, code, password string) (interface{}, error) {
	// validate phone format before merchant login
	if !isValidPhone(phone) {
		return &LoginResponse{
			Success: false,
			Error:   "invalid phone format",
		}, fmt.Errorf("invalid phone format")
	}

	var merchant repository.Merchant

	// Verify merchant login by SMS code.
	if code != "" {
		// verify merchant login code
		if err := s.verifyCodeByScene(ctx, "merchant_login", phone, code); err != nil {
			return &LoginResponse{
				Success: false,
				Error:   "invalid verification code",
			}, err
		}

		// Load merchant by phone after code verification.
		if err := s.db.Where("phone = ?", phone).First(&merchant).Error; err != nil {
			return &LoginResponse{
				Success: false,
				Error:   "merchant not found, please onboard first",
			}, fmt.Errorf("merchant not found")
		}
	} else if password != "" {
		// Load merchant and verify password login.
		if err := s.db.Where("phone = ?", phone).First(&merchant).Error; err != nil {
			return &LoginResponse{
				Success: false,
				Error:   "merchant not found",
			}, fmt.Errorf("merchant not found")
		}
		if !checkPassword(merchant.PasswordHash, password) {
			return &LoginResponse{
				Success: false,
				Error:   "invalid password",
			}, fmt.Errorf("invalid password")
		}
	} else {
		return &LoginResponse{
			Success: false,
			Error:   "missing credentials",
		}, fmt.Errorf("missing credentials")
	}

	// Issue a merchant JWT token.
	token, err := s.generateToken(phone, int64(merchant.ID))
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to generate token",
		}, err
	}

	merchantInfo := map[string]interface{}{
		"id":       merchant.UID,
		"phone":    merchant.Phone,
		"name":     merchant.Name,
		"nickname": merchant.Name,
	}

	return &LoginResponse{
		Success: true,
		Token:   token,
		User:    merchantInfo,
	}, nil
}

// SetNewPassword resets a consumer password after SMS verification.
func (s *AuthService) SetNewPassword(ctx context.Context, phone, code, newPassword string) (interface{}, error) {
	if !isValidPhone(phone) {
		return map[string]interface{}{"success": false, "error": "invalid phone format"}, fmt.Errorf("invalid phone")
	}
	if err := s.verifyCodeByScene(ctx, "reset", phone, code); err != nil {
		return map[string]interface{}{"success": false, "error": "invalid verification code"}, err
	}
	user, err := s.repo.GetByPhone(ctx, phone)
	if err != nil {
		return map[string]interface{}{"success": false, "error": "user not found"}, err
	}
	hash, err := hashPassword(newPassword)
	if err != nil {
		return map[string]interface{}{"success": false, "error": "failed to hash password"}, err
	}
	if err := s.db.Model(user).Update("password_hash", hash).Error; err != nil {
		return map[string]interface{}{"success": false, "error": "failed to update password"}, err
	}
	return map[string]interface{}{"success": true, "message": "password updated"}, nil
}

// RiderSetNewPassword resets a rider password.
func (s *AuthService) RiderSetNewPassword(ctx context.Context, phone, code, newPassword string) (interface{}, error) {
	if !isValidPhone(phone) {
		return map[string]interface{}{"success": false, "error": "invalid phone format"}, fmt.Errorf("invalid phone")
	}
	if err := s.verifyCodeByScene(ctx, "rider_reset", phone, code); err != nil {
		return map[string]interface{}{"success": false, "error": "invalid verification code"}, err
	}
	var rider repository.Rider
	if err := s.db.Where("phone = ?", phone).First(&rider).Error; err != nil {
		return map[string]interface{}{"success": false, "error": "rider not found"}, err
	}
	hash, err := hashPassword(newPassword)
	if err != nil {
		return map[string]interface{}{"success": false, "error": "failed to hash password"}, err
	}
	if err := s.db.Model(&rider).Update("password_hash", hash).Error; err != nil {
		return map[string]interface{}{"success": false, "error": "failed to update password"}, err
	}
	return map[string]interface{}{"success": true, "message": "password updated"}, nil
}

// MerchantSetNewPassword resets a merchant password.
func (s *AuthService) MerchantSetNewPassword(ctx context.Context, phone, code, newPassword string) (interface{}, error) {
	if !isValidPhone(phone) {
		return map[string]interface{}{"success": false, "error": "invalid phone format"}, fmt.Errorf("invalid phone")
	}
	if err := s.verifyCodeByScene(ctx, "merchant_reset", phone, code); err != nil {
		return map[string]interface{}{"success": false, "error": "invalid verification code"}, err
	}
	var merchant repository.Merchant
	if err := s.db.Where("phone = ?", phone).First(&merchant).Error; err != nil {
		return map[string]interface{}{"success": false, "error": "merchant not found"}, err
	}
	hash, err := hashPassword(newPassword)
	if err != nil {
		return map[string]interface{}{"success": false, "error": "failed to hash password"}, err
	}
	if err := s.db.Model(&merchant).Update("password_hash", hash).Error; err != nil {
		return map[string]interface{}{"success": false, "error": "failed to update password"}, err
	}
	return map[string]interface{}{"success": true, "message": "password updated"}, nil
}
