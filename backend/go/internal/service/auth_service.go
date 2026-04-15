package service

import (
	"context"
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

type VerifiedTokenIdentity struct {
	Phone         string   `json:"phone"`
	UserID        int64    `json:"userId"`
	PrincipalType string   `json:"principalType"`
	PrincipalID   string   `json:"principalId"`
	Role          string   `json:"role,omitempty"`
	SessionID     string   `json:"sessionId,omitempty"`
	Scope         []string `json:"scope,omitempty"`
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

func (s *AuthService) generatePrincipalAccessToken(principalType, phone string, principalNumericID int64) (string, error) {
	if s == nil || s.config == nil {
		return "", fmt.Errorf("auth config not initialized")
	}

	normalizedPrincipalType := strings.TrimSpace(principalType)
	if normalizedPrincipalType == "" {
		return "", fmt.Errorf("principal type is required")
	}

	principalID := principalIDForUnifiedToken("", principalNumericID)
	normalizedPhone := strings.TrimSpace(phone)
	name := ""
	role := normalizedPrincipalType

	switch normalizedPrincipalType {
	case principalTypeUser:
		if user := s.resolveUserTokenProfile(normalizedPhone, principalNumericID); user != nil {
			principalID = principalIDForUnifiedToken(user.UID, int64(user.ID))
			normalizedPhone = strings.TrimSpace(user.Phone)
			name = strings.TrimSpace(user.Name)
			if normalizedRole := strings.TrimSpace(user.Type); normalizedRole != "" {
				role = normalizedRole
			}
		}
	case principalTypeRider:
		if s.db != nil && principalNumericID > 0 {
			var rider repository.Rider
			if err := s.db.WithContext(context.Background()).Where("id = ?", principalNumericID).Limit(1).Find(&rider).Error; err == nil && rider.ID > 0 {
				principalID = principalIDForUnifiedToken(rider.UID, int64(rider.ID))
				normalizedPhone = strings.TrimSpace(rider.Phone)
				name = strings.TrimSpace(rider.Name)
			}
		}
	case principalTypeMerchant:
		if s.db != nil && principalNumericID > 0 {
			var merchant repository.Merchant
			if err := s.db.WithContext(context.Background()).Where("id = ?", principalNumericID).Limit(1).Find(&merchant).Error; err == nil && merchant.ID > 0 {
				principalID = principalIDForUnifiedToken(merchant.UID, int64(merchant.ID))
				normalizedPhone = strings.TrimSpace(merchant.Phone)
				name = strings.TrimSpace(merchant.Name)
			}
		}
	default:
		return "", fmt.Errorf("unsupported principal type")
	}

	payload := buildBusinessTokenPayload(
		normalizedPrincipalType,
		principalNumericID,
		principalID,
		normalizedPhone,
		name,
		role,
		tokenKindAccess,
		s.config.JWT.AccessTokenExpiry,
	)
	return signUnifiedTokenPayload(s.config.JWT.Secret, payload)
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

func (s *AuthService) resolveUserTokenProfile(phone string, userId int64) *repository.User {
	if s == nil || s.repo == nil || userId <= 0 {
		return nil
	}
	if user, err := s.repo.GetByID(context.Background(), uint(userId)); err == nil && user != nil {
		return user
	}
	if strings.TrimSpace(phone) == "" {
		return nil
	}
	user, err := s.repo.GetByPhone(context.Background(), phone)
	if err != nil || user == nil || int64(user.ID) != userId {
		return nil
	}
	return user
}

// generateTokenWithExpiry builds a signed token with the given expiry and type.
func (s *AuthService) generateTokenWithExpiry(phone string, userId int64, expiry time.Duration, tokenType string) (string, error) {
	principalID := principalIDForUnifiedToken("", userId)
	role := principalTypeUser
	name := ""
	if user := s.resolveUserTokenProfile(phone, userId); user != nil {
		principalID = principalIDForUnifiedToken(user.UID, int64(user.ID))
		name = strings.TrimSpace(user.Name)
		if normalizedRole := strings.TrimSpace(user.Type); normalizedRole != "" {
			role = normalizedRole
		}
		phone = user.Phone
	}

	payload := buildBusinessTokenPayload(
		principalTypeUser,
		userId,
		principalID,
		phone,
		name,
		role,
		tokenType,
		expiry,
	)
	return signUnifiedTokenPayload(s.config.JWT.Secret, payload)
}

func (s *AuthService) verifyAccessTokenPayload(tokenString, expectedPrincipalType string) (map[string]interface{}, string, int64, string, error) {
	if s.db == nil {
		return nil, "", 0, "", fmt.Errorf("db not initialized")
	}

	payload, err := verifyUnifiedTokenPayload(tokenString, s.config.JWT.Secret)
	if err != nil {
		return nil, "", 0, "", err
	}

	if normalizeUnifiedTokenKind(payload) != tokenKindAccess {
		return nil, "", 0, "", fmt.Errorf("invalid token kind")
	}

	if principalType := normalizeUnifiedPrincipalType(payload, expectedPrincipalType); principalType != expectedPrincipalType {
		return nil, "", 0, "", fmt.Errorf("invalid principal type")
	}

	phone := claimString(payload, "phone")
	numericID := claimInt64(payload, "principal_legacy_id", "userId")
	principalID := normalizeUnifiedPrincipalID(payload)
	if numericID <= 0 && strings.TrimSpace(principalID) == "" {
		return nil, "", 0, "", fmt.Errorf("invalid token subject")
	}

	return payload, phone, numericID, principalID, nil
}

func (s *AuthService) resolveVerifiedEntityID(tableName, principalID string, numericID int64) (uint, error) {
	if numericID > 0 {
		return uint(numericID), nil
	}
	return resolveEntityID(context.Background(), s.db, tableName, principalID)
}

// VerifyToken preserves the legacy verification entrypoint.
func (s *AuthService) VerifyToken(tokenString string) (bool, string, int64, error) {
	identity, err := s.VerifyTokenIdentity(tokenString)
	if err != nil {
		return false, "", 0, err
	}
	return true, identity.Phone, identity.UserID, nil
}

// VerifyUserToken validates a user token.
func (s *AuthService) VerifyUserToken(tokenString string) (bool, string, int64, error) {
	identity, err := s.VerifyTokenIdentity(tokenString)
	if err != nil {
		return false, "", 0, err
	}

	return true, identity.Phone, identity.UserID, nil
}

func (s *AuthService) VerifyTokenIdentity(tokenString string) (*VerifiedTokenIdentity, error) {
	payload, phone, userID, principalID, err := s.verifyAccessTokenPayload(tokenString, principalTypeUser)
	if err != nil {
		return nil, err
	}

	resolvedID, err := s.resolveVerifiedEntityID("users", principalID, userID)
	if err != nil {
		return nil, err
	}

	var user repository.User
	find := s.db.WithContext(context.Background()).Where("id = ?", resolvedID).Limit(1).Find(&user)
	if find.Error != nil {
		return nil, find.Error
	}
	if find.RowsAffected == 0 {
		return nil, fmt.Errorf("user not found")
	}
	if phone != "" && user.Phone != phone {
		return nil, fmt.Errorf("token user mismatch")
	}
	if !unifiedPrincipalMatchesEntity(principalID, user.UID, user.ID, user.Phone) {
		return nil, fmt.Errorf("token subject mismatch")
	}

	return &VerifiedTokenIdentity{
		Phone:         user.Phone,
		UserID:        int64(user.ID),
		PrincipalType: normalizeUnifiedPrincipalType(payload, principalTypeUser),
		PrincipalID:   principalIDForUnifiedToken(user.UID, int64(user.ID)),
		Role:          claimString(payload, "role"),
		SessionID:     claimString(payload, "session_id", "sessionId"),
		Scope:         claimStringSlice(payload, "scope"),
	}, nil
}

// VerifyRiderToken validates a rider token.
func (s *AuthService) VerifyRiderToken(tokenString string) (bool, string, int64, error) {
	_, phone, riderID, principalID, err := s.verifyAccessTokenPayload(tokenString, principalTypeRider)
	if err != nil {
		return false, "", 0, err
	}

	resolvedID, err := s.resolveVerifiedEntityID("riders", principalID, riderID)
	if err != nil {
		return false, "", 0, err
	}

	var rider repository.Rider
	find := s.db.WithContext(context.Background()).Where("id = ?", resolvedID).Limit(1).Find(&rider)
	if find.Error != nil {
		return false, "", 0, find.Error
	}
	if find.RowsAffected == 0 {
		return false, "", 0, fmt.Errorf("rider not found")
	}
	if phone != "" && rider.Phone != phone {
		return false, "", 0, fmt.Errorf("token user mismatch")
	}
	if !unifiedPrincipalMatchesEntity(principalID, rider.UID, rider.ID, rider.Phone) {
		return false, "", 0, fmt.Errorf("token subject mismatch")
	}

	return true, rider.Phone, int64(rider.ID), nil
}

// VerifyMerchantToken validates a merchant token.
func (s *AuthService) VerifyMerchantToken(tokenString string) (bool, string, int64, error) {
	_, phone, merchantID, principalID, err := s.verifyAccessTokenPayload(tokenString, principalTypeMerchant)
	if err != nil {
		return false, "", 0, err
	}

	resolvedID, err := s.resolveVerifiedEntityID("merchants", principalID, merchantID)
	if err != nil {
		return false, "", 0, err
	}

	var merchant repository.Merchant
	find := s.db.WithContext(context.Background()).Where("id = ?", resolvedID).Limit(1).Find(&merchant)
	if find.Error != nil {
		return false, "", 0, find.Error
	}
	if find.RowsAffected == 0 {
		return false, "", 0, fmt.Errorf("merchant not found")
	}
	if phone != "" && merchant.Phone != phone {
		return false, "", 0, fmt.Errorf("token user mismatch")
	}
	if !unifiedPrincipalMatchesEntity(principalID, merchant.UID, merchant.ID, merchant.Phone) {
		return false, "", 0, fmt.Errorf("token subject mismatch")
	}

	return true, merchant.Phone, int64(merchant.ID), nil
}

// RefreshToken validates a refresh token and issues a new token pair.
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error) {
	payload, err := verifyUnifiedTokenPayload(refreshToken, s.config.JWT.Secret)
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "invalid refresh token",
		}, err
	}

	if normalizeUnifiedTokenKind(payload) != tokenKindRefresh {
		return &LoginResponse{
			Success: false,
			Error:   "not a refresh token",
		}, fmt.Errorf("invalid token type")
	}

	if principalType := normalizeUnifiedPrincipalType(payload, principalTypeUser); principalType != principalTypeUser {
		return &LoginResponse{
			Success: false,
			Error:   "invalid refresh principal",
		}, fmt.Errorf("invalid principal type")
	}

	phone := claimString(payload, "phone")
	userID := claimInt64(payload, "principal_legacy_id", "userId")
	principalID := normalizeUnifiedPrincipalID(payload)
	if userID <= 0 && strings.TrimSpace(principalID) != "" {
		resolvedID, resolveErr := resolveEntityID(ctx, s.db, "users", principalID)
		if resolveErr == nil {
			userID = int64(resolvedID)
		}
	}
	if userID <= 0 {
		return &LoginResponse{
			Success: false,
			Error:   "invalid refresh subject",
		}, fmt.Errorf("invalid refresh subject")
	}

	user, err := s.repo.GetByID(ctx, uint(userID))
	if err != nil || user == nil {
		return &LoginResponse{
			Success: false,
			Error:   "user not found",
		}, fmt.Errorf("user not found")
	}
	if phone != "" && user.Phone != phone {
		return &LoginResponse{
			Success: false,
			Error:   "token user mismatch",
		}, fmt.Errorf("token user mismatch")
	}
	if !unifiedPrincipalMatchesEntity(principalID, user.UID, user.ID, user.Phone) {
		return &LoginResponse{
			Success: false,
			Error:   "token subject mismatch",
		}, fmt.Errorf("token subject mismatch")
	}

	// Issue a new access token.
	newAccessToken, err := s.generateToken(user.Phone, int64(user.ID))
	if err != nil {
		return &LoginResponse{
			Success: false,
			Error:   "failed to generate new access token",
		}, err
	}

	// Issue a new refresh token.
	newRefreshToken, err := s.generateRefreshToken(user.Phone, int64(user.ID))
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
	token, err := s.generatePrincipalAccessToken(principalTypeRider, phone, int64(rider.ID))
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
	token, err := s.generatePrincipalAccessToken(principalTypeMerchant, phone, int64(merchant.ID))
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
