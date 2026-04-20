package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/admincli"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/ridercert"
	"github.com/yuexiang/go-api/internal/uploadasset"
	"gorm.io/gorm"
)

const defaultBootstrapAdminPhone = "13800138000"
const defaultBootstrapAdminName = "Bootstrap Admin"
const riderOnlineTTL = 90 * time.Second

// AdminService handles admin-side operations.
type AdminService struct {
	db          *gorm.DB
	redis       *redis.Client
	tokenSecret string
}

func riderOnlineCutoff(now time.Time) time.Time {
	return now.Add(-riderOnlineTTL)
}

func riderOnlineActive(rider repository.Rider, now time.Time) bool {
	return rider.IsOnline && rider.UpdatedAt.After(riderOnlineCutoff(now))
}

func adminRiderCertPreviewURL(riderID uint, field, raw string) string {
	return ridercert.BuildPreviewURL(riderID, field, raw)
}

func NewAdminService(db *gorm.DB, redis *redis.Client, tokenSecret string) *AdminService {
	return &AdminService{
		db:          db,
		redis:       redis,
		tokenSecret: strings.TrimSpace(tokenSecret),
	}
}

type AdminLoginRequest struct {
	Phone     string `json:"phone"`
	Password  string `json:"password"`
	Code      string `json:"code"`
	LoginType string `json:"loginType"`
}

type AdminLoginResponse struct {
	Success             bool                   `json:"success"`
	Token               string                 `json:"token,omitempty"`
	User                map[string]interface{} `json:"user,omitempty"`
	Error               string                 `json:"error,omitempty"`
	MustChangeBootstrap bool                   `json:"mustChangeBootstrap,omitempty"`
}

type PushMessageStats struct {
	MessageID          string     `json:"message_id"`
	TotalDeliveries    int64      `json:"total_deliveries"`
	TotalUsers         int64      `json:"total_users"`
	QueuedCount        int64      `json:"queued_count"`
	SentCount          int64      `json:"sent_count"`
	FailedCount        int64      `json:"failed_count"`
	AcknowledgedCount  int64      `json:"acknowledged_count"`
	ReceivedCount      int64      `json:"received_count"`
	ReadCount          int64      `json:"read_count"`
	UnreadCount        int64      `json:"unread_count"`
	ReadRate           float64    `json:"read_rate"`
	ReadRatePercent    float64    `json:"read_rate_percent"`
	LatestAcknowledged *time.Time `json:"latest_acknowledged_at,omitempty"`
}

type PushMessageDeliveryItem struct {
	ID                string     `json:"id"`
	UserID            string     `json:"user_id"`
	UserType          string     `json:"user_type"`
	DeviceToken       string     `json:"device_token"`
	AppEnv            string     `json:"app_env"`
	Status            string     `json:"status"`
	Action            string     `json:"action"`
	EventType         string     `json:"event_type"`
	DispatchProvider  string     `json:"dispatch_provider"`
	ProviderMessageID string     `json:"provider_message_id"`
	RetryCount        int        `json:"retry_count"`
	NextRetryAt       *time.Time `json:"next_retry_at,omitempty"`
	SentAt            *time.Time `json:"sent_at,omitempty"`
	AcknowledgedAt    *time.Time `json:"acknowledged_at,omitempty"`
	ErrorCode         string     `json:"error_code,omitempty"`
	ErrorMessage      string     `json:"error_message,omitempty"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type PushMessageDeliveryList struct {
	MessageID string                    `json:"message_id"`
	Total     int64                     `json:"total"`
	Items     []PushMessageDeliveryItem `json:"items"`
}

func (s *AdminService) Login(ctx context.Context, req AdminLoginRequest) (*AdminLoginResponse, int, error) {
	if !isValidPhone(req.Phone) {
		return &AdminLoginResponse{Success: false, Error: "请输入正确的管理员手机号"}, 400, fmt.Errorf("invalid phone")
	}
	useCode := req.LoginType == "code" || req.Code != ""
	usePassword := req.LoginType == "password" || req.Password != ""
	var admin repository.Admin
	if useCode {
		if err := s.verifySMSCode(ctx, req.Phone, req.Code); err != nil {
			return &AdminLoginResponse{Success: false, Error: "验证码错误或已失效"}, 400, err
		}
		if err := s.db.WithContext(ctx).Where("phone = ?", req.Phone).First(&admin).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &AdminLoginResponse{Success: false, Error: "管理员账号不存在"}, 404, err
			}
			return &AdminLoginResponse{Success: false, Error: "查询管理员账号失败"}, 500, err
		}
	} else if usePassword {
		if err := s.db.WithContext(ctx).Where("phone = ?", req.Phone).First(&admin).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &AdminLoginResponse{Success: false, Error: "管理员账号不存在"}, 404, err
			}
			return &AdminLoginResponse{Success: false, Error: "查询管理员账号失败"}, 500, err
		}
		if !checkPassword(admin.PasswordHash, req.Password) {
			return &AdminLoginResponse{Success: false, Error: "管理员密码错误"}, 403, fmt.Errorf("invalid password")
		}
	} else {
		return &AdminLoginResponse{Success: false, Error: "请填写登录凭证"}, 400, fmt.Errorf("missing credentials")
	}
	token, err := s.generateToken(admin)
	if err != nil {
		return &AdminLoginResponse{Success: false, Error: "生成登录凭证失败"}, 500, err
	}
	mustChangeBootstrap := s.AdminRequiresBootstrapSetup(admin)
	return &AdminLoginResponse{
		Success:             true,
		Token:               token,
		MustChangeBootstrap: mustChangeBootstrap,
		User: map[string]interface{}{
			"id":                  admin.UID,
			"phone":               admin.Phone,
			"name":                admin.Name,
			"type":                admin.Type,
			"mustChangeBootstrap": mustChangeBootstrap,
		},
	}, 200, nil
}
func (s *AdminService) verifySMSCode(ctx context.Context, phone, code string) error {
	if code == "" {
		return fmt.Errorf("missing code")
	}
	ok, err := VerifySMSCodeWithFallback(ctx, s.db, s.redis, "login", phone, code, true)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("invalid code")
	}
	return nil
}

func (s *AdminService) generateToken(admin repository.Admin) (string, error) {
	if s.tokenSecret == "" {
		return "", fmt.Errorf("admin token secret is not configured")
	}
	payload := buildAdminTokenPayload(admin)
	payload["bootstrapPending"] = s.AdminRequiresBootstrapSetup(admin)
	return signUnifiedTokenPayload(s.tokenSecret, payload)
}

// VerifyToken validates admin token and returns admin info.
func (s *AdminService) VerifyToken(ctx context.Context, authHeader string) (*repository.Admin, error) {
	if s.tokenSecret == "" {
		return nil, fmt.Errorf("admin token secret is not configured")
	}

	payload, err := verifyUnifiedTokenPayload(authHeader, s.tokenSecret)
	if err != nil {
		return nil, err
	}

	if normalizeUnifiedTokenKind(payload) != tokenKindAccess {
		return nil, fmt.Errorf("invalid admin token kind")
	}

	if principalType := normalizeUnifiedPrincipalType(payload, principalTypeAdmin); principalType != principalTypeAdmin {
		return nil, fmt.Errorf("invalid admin principal type")
	}

	adminType := strings.ToLower(strings.TrimSpace(claimString(payload, "role", "type", "userType")))
	if adminType != "" && adminType != "admin" && adminType != "super_admin" {
		return nil, fmt.Errorf("invalid admin type")
	}

	phone := claimString(payload, "phone")
	principalID := normalizeUnifiedPrincipalID(payload)
	userID := claimInt64(payload, "principal_legacy_id", "userId")

	var admin repository.Admin
	if userID > 0 {
		findByID := s.db.WithContext(ctx).Where("id = ?", userID).Limit(1).Find(&admin)
		if findByID.Error != nil {
			return nil, findByID.Error
		}
		if findByID.RowsAffected > 0 {
			if phone == "" || admin.Phone == phone {
				return &admin, nil
			}
			return nil, fmt.Errorf("token user mismatch")
		}
	}

	if admin.ID == 0 && principalID != "" {
		resolvedID, resolveErr := resolveEntityID(ctx, s.db, "admins", principalID)
		if resolveErr != nil {
			return nil, resolveErr
		}
		findByID := s.db.WithContext(ctx).Where("id = ?", resolvedID).Limit(1).Find(&admin)
		if findByID.Error != nil {
			return nil, findByID.Error
		}
		if findByID.RowsAffected == 0 {
			return nil, fmt.Errorf("admin not found")
		}
		if phone != "" && admin.Phone != phone {
			return nil, fmt.Errorf("token user mismatch")
		}
	}

	if phone == "" {
		return nil, fmt.Errorf("invalid token subject")
	}

	if admin.ID == 0 {
		findByPhone := s.db.WithContext(ctx).Where("phone = ?", phone).Limit(1).Find(&admin)
		if findByPhone.Error != nil {
			return nil, findByPhone.Error
		}
		if findByPhone.RowsAffected == 0 {
			return nil, fmt.Errorf("admin not found")
		}
	}

	if !unifiedPrincipalMatchesEntity(principalID, admin.UID, admin.ID, admin.Phone) {
		return nil, fmt.Errorf("token subject mismatch")
	}
	if adminType != "" && strings.ToLower(strings.TrimSpace(admin.Type)) != adminType {
		return nil, fmt.Errorf("token role mismatch")
	}

	return &admin, nil
}

// Admin management
func (s *AdminService) ListAdmins(ctx context.Context) ([]repository.Admin, error) {
	var admins []repository.Admin
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&admins).Error; err != nil {
		return nil, err
	}
	return admins, nil
}

func normalizeManagedAdminType(value string, defaultValue string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		if strings.TrimSpace(defaultValue) == "" {
			return "", fmt.Errorf("管理员类型不能为空")
		}
		return strings.TrimSpace(defaultValue), nil
	}
	if normalized != "admin" && normalized != "super_admin" {
		return "", fmt.Errorf("管理员类型只能是 admin 或 super_admin")
	}
	return normalized, nil
}

func normalizeOptionalTextValue(value interface{}) string {
	if value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return strings.TrimSpace(fmt.Sprint(typed))
	}
}

func validatePrivilegedPassword(password string) error {
	return admincli.ValidateManualPassword(password)
}

func generateTemporaryPasswordHash() (string, string, error) {
	password, err := admincli.GenerateSecurePassword(admincli.DefaultGeneratedPasswordLength)
	if err != nil {
		return "", "", err
	}
	hash, err := hashPassword(password)
	if err != nil {
		return "", "", err
	}
	return password, hash, nil
}

func (s *AdminService) CreateAdmin(ctx context.Context, phone, name, password, adminType string) error {
	phone = strings.TrimSpace(phone)
	name = strings.TrimSpace(name)
	password = strings.TrimSpace(password)

	if !isValidPhone(phone) {
		return fmt.Errorf("手机号格式不正确")
	}
	if name == "" {
		return fmt.Errorf("管理员姓名不能为空")
	}
	if err := validatePrivilegedPassword(password); err != nil {
		return err
	}
	normalizedType, err := normalizeManagedAdminType(adminType, "admin")
	if err != nil {
		return err
	}

	var count int64
	s.db.WithContext(ctx).Model(&repository.Admin{}).Where("phone = ?", phone).Count(&count)
	if count > 0 {
		return fmt.Errorf("手机号已存在")
	}

	hash, err := hashPassword(password)
	if err != nil {
		return err
	}

	admin := repository.Admin{
		Phone:        phone,
		Name:         name,
		PasswordHash: hash,
		Type:         normalizedType,
	}
	return s.db.WithContext(ctx).Create(&admin).Error
}

func (s *AdminService) UpdateAdmin(ctx context.Context, id string, updates map[string]interface{}) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "admins", id)
	if err != nil {
		return err
	}

	normalizedUpdates := map[string]interface{}{}
	if rawPhone, ok := updates["phone"]; ok {
		phone := normalizeOptionalTextValue(rawPhone)
		if !isValidPhone(phone) {
			return fmt.Errorf("手机号格式不正确")
		}
		var count int64
		if err := s.db.WithContext(ctx).
			Model(&repository.Admin{}).
			Where("phone = ? AND id <> ?", phone, resolvedID).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("手机号已存在")
		}
		normalizedUpdates["phone"] = phone
	}
	if rawName, ok := updates["name"]; ok {
		name := normalizeOptionalTextValue(rawName)
		if name == "" {
			return fmt.Errorf("管理员姓名不能为空")
		}
		normalizedUpdates["name"] = name
	}
	if rawType, ok := updates["type"]; ok {
		normalizedType, err := normalizeManagedAdminType(normalizeOptionalTextValue(rawType), "")
		if err != nil {
			return err
		}
		normalizedUpdates["type"] = normalizedType
	}
	if len(normalizedUpdates) == 0 {
		return fmt.Errorf("没有需要更新的字段")
	}
	return s.db.WithContext(ctx).Model(&repository.Admin{}).Where("id = ?", resolvedID).Updates(normalizedUpdates).Error
}

func (s *AdminService) DeleteAdmin(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "admins", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Delete(&repository.Admin{}, resolvedID).Error
}

func (s *AdminService) ResetAdminPassword(ctx context.Context, id string) (string, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "admins", id)
	if err != nil {
		return "", err
	}
	newPassword, hash, err := generateTemporaryPasswordHash()
	if err != nil {
		return "", err
	}
	if err := s.db.WithContext(ctx).Model(&repository.Admin{}).Where("id = ?", resolvedID).Update("password_hash", hash).Error; err != nil {
		return "", err
	}
	return newPassword, nil
}

func (s *AdminService) ChangeOwnPassword(ctx context.Context, adminID uint, currentPassword, newPassword string) error {
	if adminID == 0 {
		return fmt.Errorf("%w: admin identity is missing", ErrUnauthorized)
	}
	if strings.TrimSpace(currentPassword) == "" {
		return fmt.Errorf("当前密码不能为空")
	}
	if err := validatePrivilegedPassword(strings.TrimSpace(newPassword)); err != nil {
		return err
	}

	var admin repository.Admin
	if err := s.db.WithContext(ctx).Where("id = ?", adminID).First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: admin not found", ErrUnauthorized)
		}
		return err
	}

	if !checkPassword(admin.PasswordHash, currentPassword) {
		return fmt.Errorf("当前密码不正确")
	}
	if checkPassword(admin.PasswordHash, newPassword) {
		return fmt.Errorf("新密码不能与当前密码相同")
	}

	hash, err := hashPassword(newPassword)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).
		Model(&repository.Admin{}).
		Where("id = ?", adminID).
		Update("password_hash", hash).
		Error
}

// Users
func (s *AdminService) ListUsers(ctx context.Context, search, userType string, limit, offset int) ([]map[string]interface{}, int64, error) {
	var users []repository.User
	var total int64

	query := s.db.WithContext(ctx).Model(&repository.User{})
	if userType != "" {
		query = query.Where("type = ?", userType)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("name LIKE ? OR phone LIKE ?", like, like)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	if err := query.Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	result := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		identities := userIdentityCandidates(user)
		today, week, month := s.countOrders(ctx, "user_id", identities)
		pointsBalance := s.sumPointsBalance(ctx, identities)
		vipLevel := resolveVIPLevel(pointsBalance)
		result = append(result, map[string]interface{}{
			"id":                user.UID,
			"role_id":           user.RoleID,
			"name":              user.Name,
			"phone":             user.Phone,
			"created_at":        formatTime(user.CreatedAt),
			"order_count_today": today,
			"order_count_week":  week,
			"order_count_month": month,
			"points_balance":    pointsBalance,
			"vip_level":         vipLevel,
		})
	}

	return result, total, nil
}

func (s *AdminService) CreateUser(ctx context.Context, phone, name, password, userType string) error {
	if !isValidPhone(phone) {
		return fmt.Errorf("手机号格式不正确")
	}
	if password == "" {
		return fmt.Errorf("密码不能为空")
	}
	if userType == "" {
		userType = "customer"
	}
	var count int64
	s.db.WithContext(ctx).Model(&repository.User{}).Where("phone = ?", phone).Count(&count)
	if count > 0 {
		return fmt.Errorf("手机号已存在")
	}
	hash, err := hashPassword(password)
	if err != nil {
		return err
	}
	user := repository.User{
		Phone:        phone,
		Name:         name,
		PasswordHash: hash,
		Type:         userType,
	}
	if err := s.db.WithContext(ctx).Create(&user).Error; err != nil {
		return err
	}
	if user.RoleID == 0 {
		s.db.Model(&user).Update("role_id", int(user.ID))
	}
	return nil
}

func (s *AdminService) ResetUserPassword(ctx context.Context, id string) (string, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "users", id)
	if err != nil {
		return "", err
	}
	newPassword, hash, err := generateTemporaryPasswordHash()
	if err != nil {
		return "", err
	}
	if err := s.db.WithContext(ctx).Model(&repository.User{}).Where("id = ?", resolvedID).Update("password_hash", hash).Error; err != nil {
		return "", err
	}
	return newPassword, nil
}

func (s *AdminService) DeleteUserOrders(ctx context.Context, id string) (int64, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "users", id)
	if err != nil {
		return 0, err
	}
	userID := fmt.Sprintf("%d", resolvedID)
	var user repository.User
	if err := s.db.WithContext(ctx).First(&user, resolvedID).Error; err != nil {
		user = repository.User{}
	}
	res := s.db.WithContext(ctx).Where("user_id = ? OR user_id = ?", userID, user.Phone).Delete(&repository.Order{})
	return res.RowsAffected, res.Error
}

func (s *AdminService) DeleteUser(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "users", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Delete(&repository.User{}, resolvedID).Error
}

func (s *AdminService) DeleteAllUsers(ctx context.Context) (int64, error) {
	res := s.db.WithContext(ctx).Where("1 = 1").Delete(&repository.User{})
	return res.RowsAffected, res.Error
}

func (s *AdminService) ReorganizeUserRoleIDs(ctx context.Context) error {
	var users []repository.User
	if err := s.db.WithContext(ctx).Order("created_at ASC").Find(&users).Error; err != nil {
		return err
	}
	for i, user := range users {
		newID := i + 1
		if err := s.db.WithContext(ctx).Model(&repository.User{}).Where("id = ?", user.ID).Update("role_id", newID).Error; err != nil {
			return err
		}
	}
	return nil
}

// Riders
func (s *AdminService) ListRiders(ctx context.Context, search string, limit, offset int) ([]map[string]interface{}, int64, error) {
	var riders []repository.Rider
	var total int64

	query := s.db.WithContext(ctx).Model(&repository.Rider{})
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("name LIKE ? OR phone LIKE ?", like, like)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	if err := query.Order("created_at DESC").Find(&riders).Error; err != nil {
		return nil, 0, err
	}

	result := make([]map[string]interface{}, 0, len(riders))
	now := time.Now()
	for _, rider := range riders {
		today, week, month := s.countOrders(ctx, "rider_id", riderOrderIdentities(rider))
		isOnline := riderOnlineActive(rider, now)
		status := "offline"
		if isOnline {
			status = "online"
		}
		rating := rider.Rating
		if rider.RatingCount == 0 && rating <= 0 {
			rating = 5
		}
		result = append(result, map[string]interface{}{
			"id":                rider.UID,
			"role_id":           rider.RoleID,
			"name":              rider.Name,
			"phone":             rider.Phone,
			"is_online":         isOnline,
			"rating":            rating,
			"rating_count":      rider.RatingCount,
			"status":            status,
			"created_at":        formatTime(rider.CreatedAt),
			"order_count_today": today,
			"order_count_week":  week,
			"order_count_month": month,
		})
	}

	return result, total, nil
}

func riderOrderIdentities(rider repository.Rider) []string {
	candidates := []string{
		fmt.Sprintf("%d", rider.ID),
		strings.TrimSpace(rider.UID),
		strconv.Itoa(rider.RoleID),
		strings.TrimSpace(rider.Phone),
	}
	seen := make(map[string]struct{}, len(candidates))
	out := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if _, exists := seen[candidate]; exists {
			continue
		}
		seen[candidate] = struct{}{}
		out = append(out, candidate)
	}
	return out
}

func (s *AdminService) GetRider(ctx context.Context, id string) (map[string]interface{}, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "riders", id)
	if err != nil {
		return nil, fmt.Errorf("无效的骑手ID")
	}

	var rider repository.Rider
	if err := s.db.WithContext(ctx).First(&rider, resolvedID).Error; err != nil {
		return nil, fmt.Errorf("骑手不存在")
	}
	if !riderOnlineActive(rider, time.Now()) {
		rider.IsOnline = false
	}

	onboardingInfo, _ := s.GetLatestOnboardingInfo(ctx, "rider", rider.ID)
	return map[string]interface{}{
		"id":                        rider.UID,
		"role_id":                   rider.RoleID,
		"name":                      rider.Name,
		"phone":                     rider.Phone,
		"is_online":                 rider.IsOnline,
		"rating":                    rider.Rating,
		"rating_count":              rider.RatingCount,
		"id_card_front":             rider.IDCardFront,
		"id_card_image":             rider.IDCardFront,
		"id_card_front_preview_url": adminRiderCertPreviewURL(rider.ID, "id_card_front", rider.IDCardFront),
		"emergency_contact_name":    rider.EmergencyContactName,
		"emergency_contact_phone":   rider.EmergencyContactPhone,
		"created_at":                formatTime(rider.CreatedAt),
		"updated_at":                formatTime(rider.UpdatedAt),
		"onboarding_info":           onboardingInfo,
	}, nil
}

func (s *AdminService) CreateRider(ctx context.Context, phone, name, password string) error {
	if !isValidPhone(phone) {
		return fmt.Errorf("手机号格式不正确")
	}
	if password == "" {
		return fmt.Errorf("密码不能为空")
	}
	var count int64
	s.db.WithContext(ctx).Model(&repository.Rider{}).Where("phone = ?", phone).Count(&count)
	if count > 0 {
		return fmt.Errorf("手机号已存在")
	}
	hash, err := hashPassword(password)
	if err != nil {
		return err
	}
	rider := repository.Rider{
		Phone:        phone,
		Name:         name,
		PasswordHash: hash,
		IsOnline:     false,
	}
	if err := s.db.WithContext(ctx).Create(&rider).Error; err != nil {
		return err
	}
	if rider.RoleID == 0 {
		s.db.Model(&rider).Update("role_id", int(rider.ID))
	}
	return nil
}

func (s *AdminService) UpdateRider(ctx context.Context, id string, phone, name, idCardFront, emergencyContactName, emergencyContactPhone string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "riders", id)
	if err != nil {
		return fmt.Errorf("无效的骑手ID")
	}
	if strings.TrimSpace(name) == "" {
		return fmt.Errorf("姓名不能为空")
	}
	if phone == "" || !isValidPhone(phone) {
		return fmt.Errorf("手机号格式不正确")
	}
	if emergencyContactPhone != "" && !isValidPhone(emergencyContactPhone) {
		return fmt.Errorf("紧急联系人电话格式不正确")
	}

	var rider repository.Rider
	if err := s.db.WithContext(ctx).First(&rider, resolvedID).Error; err != nil {
		return fmt.Errorf("骑手不存在")
	}

	var count int64
	s.db.WithContext(ctx).Model(&repository.Rider{}).
		Where("phone = ? AND id <> ?", phone, resolvedID).
		Count(&count)
	if count > 0 {
		return fmt.Errorf("手机号已存在")
	}

	if strings.TrimSpace(idCardFront) == "" {
		idCardFront = rider.IDCardFront
	}
	normalizedIDCardFront := strings.TrimSpace(idCardFront)
	if normalizedIDCardFront != "" {
		normalizedIDCardFront, err = ridercert.NormalizeOwnedUpdateReference(rider.ID, "id_card_front", normalizedIDCardFront, rider.IDCardFront)
		if err != nil {
			return err
		}
	}
	if strings.TrimSpace(emergencyContactName) == "" {
		emergencyContactName = rider.EmergencyContactName
	}
	if strings.TrimSpace(emergencyContactPhone) == "" {
		emergencyContactPhone = rider.EmergencyContactPhone
	}

	updates := map[string]interface{}{
		"phone":                   strings.TrimSpace(phone),
		"name":                    strings.TrimSpace(name),
		"id_card_front":           normalizedIDCardFront,
		"emergency_contact_name":  strings.TrimSpace(emergencyContactName),
		"emergency_contact_phone": strings.TrimSpace(emergencyContactPhone),
	}
	return s.db.WithContext(ctx).Model(&repository.Rider{}).Where("id = ?", resolvedID).Updates(updates).Error
}

func (s *AdminService) ResetRiderPassword(ctx context.Context, id string) (string, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "riders", id)
	if err != nil {
		return "", err
	}
	newPassword, hash, err := generateTemporaryPasswordHash()
	if err != nil {
		return "", err
	}
	if err := s.db.WithContext(ctx).Model(&repository.Rider{}).Where("id = ?", resolvedID).Update("password_hash", hash).Error; err != nil {
		return "", err
	}
	return newPassword, nil
}

func (s *AdminService) DeleteRiderOrders(ctx context.Context, id string) (int64, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "riders", id)
	if err != nil {
		return 0, err
	}
	riderID := fmt.Sprintf("%d", resolvedID)
	var rider repository.Rider
	if err := s.db.WithContext(ctx).First(&rider, resolvedID).Error; err != nil {
		rider = repository.Rider{}
	}
	res := s.db.WithContext(ctx).Where("rider_id = ? OR rider_id = ?", riderID, rider.Phone).Delete(&repository.Order{})
	return res.RowsAffected, res.Error
}

func (s *AdminService) DeleteRider(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "riders", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Delete(&repository.Rider{}, resolvedID).Error
}

func (s *AdminService) DeleteAllRiders(ctx context.Context) (int64, error) {
	res := s.db.WithContext(ctx).Where("1 = 1").Delete(&repository.Rider{})
	return res.RowsAffected, res.Error
}

func (s *AdminService) ReorganizeRiderRoleIDs(ctx context.Context) error {
	var riders []repository.Rider
	if err := s.db.WithContext(ctx).Order("created_at ASC").Find(&riders).Error; err != nil {
		return err
	}
	for i, rider := range riders {
		newID := i + 1
		if err := s.db.WithContext(ctx).Model(&repository.Rider{}).Where("id = ?", rider.ID).Update("role_id", newID).Error; err != nil {
			return err
		}
	}
	return nil
}

// Merchants
func (s *AdminService) ListMerchants(ctx context.Context, search string, limit, offset int) ([]map[string]interface{}, int64, error) {
	var merchants []repository.Merchant
	var total int64

	query := s.db.WithContext(ctx).Model(&repository.Merchant{})
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("name LIKE ? OR phone LIKE ?", like, like)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	if err := query.Order("created_at DESC").Find(&merchants).Error; err != nil {
		return nil, 0, err
	}

	result := make([]map[string]interface{}, 0, len(merchants))
	for _, merchant := range merchants {
		result = append(result, map[string]interface{}{
			"id":                merchant.UID,
			"role_id":           merchant.RoleID,
			"name":              merchant.Name,
			"owner_name":        merchant.OwnerName,
			"phone":             merchant.Phone,
			"is_online":         merchant.IsOnline,
			"created_at":        formatTime(merchant.CreatedAt),
			"order_count_today": 0,
			"order_count_week":  0,
			"order_count_month": 0,
		})
	}

	return result, total, nil
}

func (s *AdminService) GetMerchant(ctx context.Context, id string) (map[string]interface{}, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "merchants", id)
	if err != nil {
		return nil, fmt.Errorf("无效的商户ID")
	}

	var merchant repository.Merchant
	if err := s.db.WithContext(ctx).First(&merchant, resolvedID).Error; err != nil {
		return nil, fmt.Errorf("商户不存在")
	}

	onboardingInfo, _ := s.GetLatestOnboardingInfo(ctx, "merchant", merchant.ID)
	return map[string]interface{}{
		"id":                     merchant.UID,
		"role_id":                merchant.RoleID,
		"name":                   merchant.Name,
		"owner_name":             merchant.OwnerName,
		"phone":                  merchant.Phone,
		"business_license_image": uploadasset.BuildConfiguredPreviewURL(merchant.BusinessLicenseImage),
		"is_online":              merchant.IsOnline,
		"created_at":             formatTime(merchant.CreatedAt),
		"updated_at":             formatTime(merchant.UpdatedAt),
		"onboarding_info":        onboardingInfo,
	}, nil
}

func (s *AdminService) CreateMerchant(ctx context.Context, phone, name, ownerName, password string) error {
	if !isValidPhone(phone) {
		return fmt.Errorf("手机号格式不正确")
	}
	if password == "" {
		return fmt.Errorf("密码不能为空")
	}
	if ownerName == "" {
		ownerName = name
	}
	var count int64
	s.db.WithContext(ctx).Model(&repository.Merchant{}).Where("phone = ?", phone).Count(&count)
	if count > 0 {
		return fmt.Errorf("手机号已存在")
	}
	hash, err := hashPassword(password)
	if err != nil {
		return err
	}
	merchant := repository.Merchant{
		Phone:        phone,
		Name:         name,
		OwnerName:    ownerName,
		PasswordHash: hash,
		IsOnline:     false,
	}
	if err := s.db.WithContext(ctx).Create(&merchant).Error; err != nil {
		return err
	}
	if merchant.RoleID == 0 {
		s.db.Model(&merchant).Update("role_id", int(merchant.ID))
	}
	return nil
}

func (s *AdminService) UpdateMerchant(ctx context.Context, id string, phone, name, ownerName, businessLicenseImage string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "merchants", id)
	if err != nil {
		return fmt.Errorf("无效的商户ID")
	}
	if phone == "" || !isValidPhone(phone) {
		return fmt.Errorf("手机号格式不正确")
	}
	if name == "" {
		return fmt.Errorf("商户名称不能为空")
	}
	if ownerName == "" {
		ownerName = name
	}

	var merchant repository.Merchant
	if err := s.db.WithContext(ctx).First(&merchant, resolvedID).Error; err != nil {
		return fmt.Errorf("商户不存在")
	}

	var count int64
	s.db.WithContext(ctx).Model(&repository.Merchant{}).
		Where("phone = ? AND id <> ?", phone, resolvedID).
		Count(&count)
	if count > 0 {
		return fmt.Errorf("手机号已存在")
	}

	if strings.TrimSpace(businessLicenseImage) == "" {
		businessLicenseImage = merchant.BusinessLicenseImage
	}
	normalizedBusinessLicenseImage := strings.TrimSpace(businessLicenseImage)
	if extracted := uploadasset.ExtractReference(normalizedBusinessLicenseImage); extracted != "" {
		merchantOwnerID := strconv.FormatUint(uint64(resolvedID), 10)
		currentStoredRef := uploadasset.ExtractReference(merchant.BusinessLicenseImage)
		if legacyPath, legacyDomain, ok := uploadasset.NormalizeProtectedLegacyPath(extracted); ok &&
			legacyDomain == uploadasset.DomainOnboardingDocument &&
			extracted == currentStoredRef {
			onboardingRef, _, promoteErr := uploadasset.PromoteLegacyProtectedAsset(
				legacyPath,
				uploadasset.DomainOnboardingDocument,
				"merchant",
				merchantOwnerID,
				documentPublicUploadsRootPath,
				documentPrivateUploadsRootPath,
			)
			if promoteErr != nil {
				return promoteErr
			}
			normalizedBusinessLicenseImage, _, err = uploadasset.TransferPrivateAsset(
				onboardingRef,
				uploadasset.DomainOnboardingDocument,
				"merchant",
				merchantOwnerID,
				uploadasset.DomainMerchantDocument,
				"merchant",
				merchantOwnerID,
				documentPrivateUploadsRootPath,
			)
			if err != nil {
				return err
			}
		} else if parsed, ok := uploadasset.ParseReference(extracted); ok &&
			parsed.Domain == uploadasset.DomainOnboardingDocument &&
			extracted == currentStoredRef {
			normalizedBusinessLicenseImage, _, err = uploadasset.TransferPrivateAsset(
				extracted,
				uploadasset.DomainOnboardingDocument,
				"",
				"",
				uploadasset.DomainMerchantDocument,
				"merchant",
				merchantOwnerID,
				documentPrivateUploadsRootPath,
			)
			if err != nil {
				return err
			}
		} else {
			normalizedBusinessLicenseImage, err = normalizePrivateDocumentReference(ctx, normalizedBusinessLicenseImage, uploadasset.DomainMerchantDocument)
			if err != nil {
				return err
			}
		}
	}

	updates := map[string]interface{}{
		"phone":                  phone,
		"name":                   name,
		"owner_name":             ownerName,
		"business_license_image": normalizedBusinessLicenseImage,
	}
	return s.db.WithContext(ctx).Model(&repository.Merchant{}).Where("id = ?", resolvedID).Updates(updates).Error
}

func (s *AdminService) GetLatestOnboardingInfo(ctx context.Context, entityType string, entityID uint) (map[string]interface{}, error) {
	entityType = strings.TrimSpace(entityType)
	if entityID == 0 || (entityType != "merchant" && entityType != "rider") {
		return nil, nil
	}

	var submission repository.OnboardingInviteSubmission
	if err := s.db.WithContext(ctx).
		Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Order("id DESC").
		First(&submission).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	info := map[string]interface{}{
		"submission_id": submission.ID,
		"source":        submission.Source,
		"invite_type":   submission.InviteType,
		"invite_link_id": func() uint {
			if submission.InviteLinkID == nil {
				return 0
			}
			return *submission.InviteLinkID
		}(),
		"submitted_at": formatTime(submission.CreatedAt),
	}

	if submission.InviteLinkID != nil && *submission.InviteLinkID > 0 {
		var link repository.OnboardingInviteLink
		if err := s.db.WithContext(ctx).First(&link, *submission.InviteLinkID).Error; err == nil {
			info["invite_status"] = link.Status
			info["invite_expires_at"] = formatTime(link.ExpiresAt)
			info["invite_used_at"] = formatTimePtr(link.UsedAt)
			info["invite_note"] = link.Note
		}
	}

	return info, nil
}

func (s *AdminService) ResetMerchantPassword(ctx context.Context, id string) (string, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "merchants", id)
	if err != nil {
		return "", err
	}
	newPassword, hash, err := generateTemporaryPasswordHash()
	if err != nil {
		return "", err
	}
	if err := s.db.WithContext(ctx).Model(&repository.Merchant{}).Where("id = ?", resolvedID).Update("password_hash", hash).Error; err != nil {
		return "", err
	}
	return newPassword, nil
}

func (s *AdminService) DeleteMerchant(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "merchants", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Delete(&repository.Merchant{}, resolvedID).Error
}

func (s *AdminService) DeleteAllMerchants(ctx context.Context) (int64, error) {
	res := s.db.WithContext(ctx).Where("1 = 1").Delete(&repository.Merchant{})
	return res.RowsAffected, res.Error
}

func (s *AdminService) ReorganizeMerchantRoleIDs(ctx context.Context) error {
	var merchants []repository.Merchant
	if err := s.db.WithContext(ctx).Order("created_at ASC").Find(&merchants).Error; err != nil {
		return err
	}
	for i, merchant := range merchants {
		newID := i + 1
		if err := s.db.WithContext(ctx).Model(&repository.Merchant{}).Where("id = ?", merchant.ID).Update("role_id", newID).Error; err != nil {
			return err
		}
	}
	return nil
}

// Orders (admin)
func (s *AdminService) ListOrders(
	ctx context.Context,
	search,
	status,
	bizType string,
	limit,
	offset int,
	role string,
	merchantID int64,
	merchantPhone string,
) ([]repository.Order, int64, error) {
	var orders []repository.Order
	var total int64

	query := s.db.WithContext(ctx).Model(&repository.Order{})
	if strings.TrimSpace(role) == "merchant" {
		if merchantID <= 0 {
			return nil, 0, fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		merchantIDText := strconv.FormatInt(merchantID, 10)
		shopSubQuery := s.db.WithContext(ctx).
			Model(&repository.Shop{}).
			Select("id").
			Where("merchant_id = ?", merchantID)
		if strings.TrimSpace(merchantPhone) != "" {
			query = query.Where("(shop_id IN (?) OR merchant_id = ? OR merchant_id = ?)", shopSubQuery, merchantIDText, merchantPhone)
		} else {
			query = query.Where("(shop_id IN (?) OR merchant_id = ?)", shopSubQuery, merchantIDText)
		}
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	bizType = strings.ToLower(strings.TrimSpace(bizType))
	if bizType != "" {
		if bizType == "takeout" {
			query = query.Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", bizType)
		} else {
			query = query.Where("biz_type = ?", bizType)
		}
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where(
			"uid LIKE ? OR tsid LIKE ? OR CAST(id AS TEXT) LIKE ? OR daily_order_id LIKE ? OR user_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR rider_name LIKE ? OR rider_phone LIKE ?",
			like, like, like, like, like, like, like, like, like,
		)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	if err := query.Order("created_at DESC").Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (s *AdminService) GetOrder(ctx context.Context, id uint) (*repository.Order, error) {
	var order repository.Order
	if err := s.db.WithContext(ctx).First(&order, id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (s *AdminService) DeleteAllOrders(ctx context.Context) (int64, error) {
	res := s.db.WithContext(ctx).Where("1 = 1").Delete(&repository.Order{})
	return res.RowsAffected, res.Error
}

func quoteTableNameForDialect(dialect, table string) string {
	switch strings.ToLower(strings.TrimSpace(dialect)) {
	case "postgres":
		escaped := strings.ReplaceAll(table, `"`, `""`)
		return fmt.Sprintf(`"%s"`, escaped)
	default:
		escaped := strings.ReplaceAll(table, "`", "``")
		return fmt.Sprintf("`%s`", escaped)
	}
}

func (s *AdminService) ClearAllBusinessData(ctx context.Context) (map[string]interface{}, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database is not initialized")
	}

	tables, err := s.db.Migrator().GetTables()
	if err != nil {
		return nil, err
	}
	sort.Strings(tables)

	protectedTables := []string{
		"admins",
		"settings",
		"id_codebook",
		"id_sequences",
		"schema_migrations",
		"goose_db_version",
		"sqlite_sequence",
	}
	protectedSet := make(map[string]struct{}, len(protectedTables))
	for _, table := range protectedTables {
		protectedSet[strings.ToLower(strings.TrimSpace(table))] = struct{}{}
	}

	clearedTables := make(map[string]int64)
	var clearedRows int64

	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		dialect := strings.ToLower(strings.TrimSpace(tx.Dialector.Name()))
		if dialect == "mysql" {
			if err := tx.Exec("SET FOREIGN_KEY_CHECKS = 0").Error; err != nil {
				return err
			}
			defer func() {
				_ = tx.Exec("SET FOREIGN_KEY_CHECKS = 1").Error
			}()
		}

		for _, table := range tables {
			normalizedTable := strings.ToLower(strings.TrimSpace(table))
			if normalizedTable == "" {
				continue
			}
			if _, keep := protectedSet[normalizedTable]; keep {
				continue
			}

			var rowCount int64
			if err := tx.Table(table).Count(&rowCount).Error; err != nil {
				return err
			}
			if rowCount <= 0 {
				continue
			}

			quotedTable := quoteTableNameForDialect(dialect, table)
			if err := tx.Exec(fmt.Sprintf("DELETE FROM %s", quotedTable)).Error; err != nil {
				return err
			}
			clearedTables[table] = rowCount
			clearedRows += rowCount
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"clearedRows":     clearedRows,
		"tableCount":      len(clearedTables),
		"clearedTables":   clearedTables,
		"protectedTables": protectedTables,
	}, nil
}

// Export / Import
func (s *AdminService) ExportUsers(ctx context.Context) ([]map[string]interface{}, error) {
	var users []repository.User
	if err := s.db.WithContext(ctx).Find(&users).Error; err != nil {
		return nil, err
	}
	results := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		results = append(results, exportUserRecord(user))
	}
	return results, nil
}

func (s *AdminService) ImportUsers(ctx context.Context, items []map[string]interface{}) (int, int) {
	successCount := 0
	errorCount := 0
	for _, item := range items {
		if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			uid := parseImportString(item, "id", "uid")
			tsid := parseImportString(item, "tsid")
			legacyID := parseImportLegacyID(item)
			existingID, err := findImportedRecordID(ctx, tx, "users", uid, tsid, legacyID)
			if err != nil {
				return err
			}

			user := repository.User{}
			if existingID > 0 {
				if err := tx.WithContext(ctx).Where("id = ?", existingID).First(&user).Error; err != nil {
					return err
				}
			}

			user.CreatedAt = importRecordCreatedAt(item, user.CreatedAt)
			user.UpdatedAt = importRecordUpdatedAt(item, user.CreatedAt, user.UpdatedAt)
			uid, tsid, err = ensureImportedIdentity(ctx, tx, "users", uid, tsid, user.CreatedAt, user.UpdatedAt)
			if err != nil {
				return err
			}
			if existingID > 0 {
				user.ID = existingID
			} else if legacyID > 0 {
				user.ID = legacyID
			}
			user.UID = uid
			user.TSID = tsid

			if hasImportKey(item, "role_id") {
				user.RoleID = int(parseInt64(item["role_id"]))
			}
			if hasImportKey(item, "phone") {
				user.Phone = parseImportString(item, "phone")
			}
			if hasImportKey(item, "name") {
				user.Name = parseImportString(item, "name")
			}
			if hasImportKey(item, "avatar_url", "avatarUrl") {
				user.AvatarURL = parseImportString(item, "avatar_url", "avatarUrl")
			}
			if hasImportKey(item, "header_bg", "headerBg") {
				user.HeaderBg = parseImportString(item, "header_bg", "headerBg")
			}
			if hasImportKey(item, "wechat_open_id") {
				user.WechatOpenID = parseImportString(item, "wechat_open_id")
			}
			if hasImportKey(item, "wechat_union_id") {
				user.WechatUnionID = parseImportString(item, "wechat_union_id")
			}
			if hasImportKey(item, "wechat_nickname") {
				user.WechatNickname = parseImportString(item, "wechat_nickname")
			}
			if hasImportKey(item, "wechat_avatar") {
				user.WechatAvatar = parseImportString(item, "wechat_avatar")
			}
			if hasImportKey(item, "type") {
				user.Type = parseImportString(item, "type")
			}
			if user.Type == "" {
				user.Type = "customer"
			}
			if hasImportKey(item, "password_hash") {
				user.PasswordHash = parseImportString(item, "password_hash")
			} else if hasImportKey(item, "password") {
				if hash, err := hashPassword(parseImportString(item, "password")); err == nil {
					user.PasswordHash = hash
				}
			}

			if err := saveImportedModel(ctx, tx, "users", &user, user.ID, user.UID, user.TSID); err != nil {
				return err
			}
			if !hasImportKey(item, "role_id") && user.RoleID == 0 {
				user.RoleID = int(user.ID)
				if err := tx.WithContext(ctx).
					Session(&gorm.Session{SkipHooks: true}).
					Model(&repository.User{}).
					Where("id = ?", user.ID).
					Update("role_id", user.RoleID).Error; err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			errorCount++
			continue
		}
		successCount++
	}
	return successCount, errorCount
}

func (s *AdminService) ExportRiders(ctx context.Context) ([]map[string]interface{}, error) {
	var riders []repository.Rider
	if err := s.db.WithContext(ctx).Find(&riders).Error; err != nil {
		return nil, err
	}
	results := make([]map[string]interface{}, 0, len(riders))
	for _, rider := range riders {
		results = append(results, exportRiderRecord(rider))
	}
	return results, nil
}

func (s *AdminService) ImportRiders(ctx context.Context, items []map[string]interface{}) (int, int) {
	successCount := 0
	errorCount := 0
	for _, item := range items {
		if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			uid := parseImportString(item, "id", "uid")
			tsid := parseImportString(item, "tsid")
			legacyID := parseImportLegacyID(item)
			existingID, err := findImportedRecordID(ctx, tx, "riders", uid, tsid, legacyID)
			if err != nil {
				return err
			}

			rider := repository.Rider{}
			if existingID > 0 {
				if err := tx.WithContext(ctx).Where("id = ?", existingID).First(&rider).Error; err != nil {
					return err
				}
			}

			rider.CreatedAt = importRecordCreatedAt(item, rider.CreatedAt)
			rider.UpdatedAt = importRecordUpdatedAt(item, rider.CreatedAt, rider.UpdatedAt)
			uid, tsid, err = ensureImportedIdentity(ctx, tx, "riders", uid, tsid, rider.CreatedAt, rider.UpdatedAt)
			if err != nil {
				return err
			}
			if existingID > 0 {
				rider.ID = existingID
			} else if legacyID > 0 {
				rider.ID = legacyID
			}
			rider.UID = uid
			rider.TSID = tsid

			if hasImportKey(item, "role_id") {
				rider.RoleID = int(parseInt64(item["role_id"]))
			}
			if hasImportKey(item, "phone") {
				rider.Phone = parseImportString(item, "phone")
			}
			if hasImportKey(item, "name") {
				rider.Name = parseImportString(item, "name")
			}
			if hasImportKey(item, "is_online") {
				rider.IsOnline = parseBool(item["is_online"])
			}
			if hasImportKey(item, "rating") {
				rider.Rating = parseFloat(item["rating"])
			}
			if hasImportKey(item, "rating_count") {
				rider.RatingCount = int(parseInt64(item["rating_count"]))
			}
			if hasImportKey(item, "avatar") {
				rider.Avatar = parseImportString(item, "avatar")
			}
			if hasImportKey(item, "nickname") {
				rider.Nickname = parseImportString(item, "nickname")
			}
			if hasImportKey(item, "real_name") {
				rider.RealName = parseImportString(item, "real_name")
			}
			if hasImportKey(item, "id_card_number") {
				rider.IDCardNumber = parseImportString(item, "id_card_number")
			}
			if hasImportKey(item, "emergency_contact_name") {
				rider.EmergencyContactName = parseImportString(item, "emergency_contact_name")
			}
			if hasImportKey(item, "emergency_contact_phone") {
				rider.EmergencyContactPhone = parseImportString(item, "emergency_contact_phone")
			}
			if hasImportKey(item, "id_card_front") {
				rider.IDCardFront = parseImportString(item, "id_card_front")
			}
			if hasImportKey(item, "id_card_back") {
				rider.IDCardBack = parseImportString(item, "id_card_back")
			}
			if hasImportKey(item, "health_cert") {
				rider.HealthCert = parseImportString(item, "health_cert")
			}
			if hasImportKey(item, "health_cert_expiry") {
				rider.HealthCertExpiry = parseImportTimePtr(item, "health_cert_expiry")
			}
			if hasImportKey(item, "is_verified") {
				rider.IsVerified = parseBool(item["is_verified"])
			}
			if hasImportKey(item, "level") {
				rider.Level = int(parseInt64(item["level"]))
			}
			if hasImportKey(item, "total_orders") {
				rider.TotalOrders = int(parseInt64(item["total_orders"]))
			}
			if hasImportKey(item, "week_orders") {
				rider.WeekOrders = int(parseInt64(item["week_orders"]))
			}
			if hasImportKey(item, "consecutive_weeks") {
				rider.ConsecutiveWeeks = int(parseInt64(item["consecutive_weeks"]))
			}
			if hasImportKey(item, "today_online_minutes") {
				rider.TodayOnlineMinutes = int(parseInt64(item["today_online_minutes"]))
			}
			if hasImportKey(item, "online_start_time") {
				rider.OnlineStartTime = parseImportTimePtr(item, "online_start_time")
			}
			if hasImportKey(item, "last_online_date") {
				rider.LastOnlineDate = parseImportString(item, "last_online_date")
			}
			if hasImportKey(item, "password_hash") {
				rider.PasswordHash = parseImportString(item, "password_hash")
			} else if hasImportKey(item, "password") {
				if hash, err := hashPassword(parseImportString(item, "password")); err == nil {
					rider.PasswordHash = hash
				}
			}

			if err := saveImportedModel(ctx, tx, "riders", &rider, rider.ID, rider.UID, rider.TSID); err != nil {
				return err
			}
			if !hasImportKey(item, "role_id") && rider.RoleID == 0 {
				rider.RoleID = int(rider.ID)
				if err := tx.WithContext(ctx).
					Session(&gorm.Session{SkipHooks: true}).
					Model(&repository.Rider{}).
					Where("id = ?", rider.ID).
					Update("role_id", rider.RoleID).Error; err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			errorCount++
			continue
		}
		successCount++
	}
	return successCount, errorCount
}

func (s *AdminService) ExportMerchants(ctx context.Context) ([]map[string]interface{}, error) {
	var merchants []repository.Merchant
	if err := s.db.WithContext(ctx).Find(&merchants).Error; err != nil {
		return nil, err
	}
	results := make([]map[string]interface{}, 0, len(merchants))
	for _, merchant := range merchants {
		results = append(results, exportMerchantRecord(merchant))
	}
	return results, nil
}

func (s *AdminService) ImportMerchants(ctx context.Context, items []map[string]interface{}) (int, int) {
	successCount := 0
	errorCount := 0
	for _, item := range items {
		if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			uid := parseImportString(item, "id", "uid")
			tsid := parseImportString(item, "tsid")
			legacyID := parseImportLegacyID(item)
			existingID, err := findImportedRecordID(ctx, tx, "merchants", uid, tsid, legacyID)
			if err != nil {
				return err
			}

			merchant := repository.Merchant{}
			if existingID > 0 {
				if err := tx.WithContext(ctx).Where("id = ?", existingID).First(&merchant).Error; err != nil {
					return err
				}
			}

			merchant.CreatedAt = importRecordCreatedAt(item, merchant.CreatedAt)
			merchant.UpdatedAt = importRecordUpdatedAt(item, merchant.CreatedAt, merchant.UpdatedAt)
			uid, tsid, err = ensureImportedIdentity(ctx, tx, "merchants", uid, tsid, merchant.CreatedAt, merchant.UpdatedAt)
			if err != nil {
				return err
			}
			if existingID > 0 {
				merchant.ID = existingID
			} else if legacyID > 0 {
				merchant.ID = legacyID
			}
			merchant.UID = uid
			merchant.TSID = tsid

			if hasImportKey(item, "role_id") {
				merchant.RoleID = int(parseInt64(item["role_id"]))
			}
			if hasImportKey(item, "phone") {
				merchant.Phone = parseImportString(item, "phone")
			}
			if hasImportKey(item, "name") {
				merchant.Name = parseImportString(item, "name")
			}
			if hasImportKey(item, "owner_name") {
				merchant.OwnerName = parseImportString(item, "owner_name")
			}
			if hasImportKey(item, "business_license_image") {
				merchant.BusinessLicenseImage = parseImportString(item, "business_license_image")
			}
			if hasImportKey(item, "is_online") {
				merchant.IsOnline = parseBool(item["is_online"])
			}
			if hasImportKey(item, "password_hash") {
				merchant.PasswordHash = parseImportString(item, "password_hash")
			} else if hasImportKey(item, "password") {
				if hash, err := hashPassword(parseImportString(item, "password")); err == nil {
					merchant.PasswordHash = hash
				}
			}

			if err := saveImportedModel(ctx, tx, "merchants", &merchant, merchant.ID, merchant.UID, merchant.TSID); err != nil {
				return err
			}
			if !hasImportKey(item, "role_id") && merchant.RoleID == 0 {
				merchant.RoleID = int(merchant.ID)
				if err := tx.WithContext(ctx).
					Session(&gorm.Session{SkipHooks: true}).
					Model(&repository.Merchant{}).
					Where("id = ?", merchant.ID).
					Update("role_id", merchant.RoleID).Error; err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			errorCount++
			continue
		}
		successCount++
	}
	return successCount, errorCount
}

func (s *AdminService) ExportOrders(ctx context.Context) ([]map[string]interface{}, error) {
	var orders []repository.Order
	if err := s.db.WithContext(ctx).Find(&orders).Error; err != nil {
		return nil, err
	}
	results := make([]map[string]interface{}, 0, len(orders))
	for _, order := range orders {
		results = append(results, exportOrderRecord(order))
	}
	return results, nil
}

func (s *AdminService) ImportOrders(ctx context.Context, items []map[string]interface{}) (int, int) {
	successCount := 0
	errorCount := 0
	for _, item := range items {
		if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			uid := parseImportString(item, "id", "uid")
			tsid := parseImportString(item, "tsid")
			legacyID := parseImportLegacyID(item)
			existingID, err := findImportedRecordID(ctx, tx, "orders", uid, tsid, legacyID)
			if err != nil {
				return err
			}

			order := repository.Order{}
			if existingID > 0 {
				if err := tx.WithContext(ctx).Where("id = ?", existingID).First(&order).Error; err != nil {
					return err
				}
			}

			order.CreatedAt = importRecordCreatedAt(item, order.CreatedAt)
			order.UpdatedAt = importRecordUpdatedAt(item, order.CreatedAt, order.UpdatedAt)
			uid, tsid, err = ensureImportedIdentity(ctx, tx, "orders", uid, tsid, order.CreatedAt, order.UpdatedAt)
			if err != nil {
				return err
			}
			if existingID > 0 {
				order.ID = existingID
			} else if legacyID > 0 {
				order.ID = legacyID
			}
			order.UID = uid
			order.TSID = tsid

			if hasImportKey(item, "daily_order_id") {
				order.DailyOrderID = parseImportString(item, "daily_order_id")
			}
			if hasImportKey(item, "daily_order_number") {
				order.DailyOrderNumber = parseInt64(item["daily_order_number"])
			}
			if hasImportKey(item, "user_id") {
				order.UserID = parseImportString(item, "user_id")
			}
			if hasImportKey(item, "customer_name") {
				order.CustomerName = parseImportString(item, "customer_name")
			}
			if hasImportKey(item, "customer_phone") {
				order.CustomerPhone = parseImportString(item, "customer_phone")
			}
			if hasImportKey(item, "rider_id") {
				order.RiderID = parseImportString(item, "rider_id")
			}
			if hasImportKey(item, "rider_name") {
				order.RiderName = parseImportString(item, "rider_name")
			}
			if hasImportKey(item, "rider_phone") {
				order.RiderPhone = parseImportString(item, "rider_phone")
			}
			if hasImportKey(item, "merchant_id") {
				order.MerchantID = parseImportString(item, "merchant_id")
			}
			if hasImportKey(item, "shop_id") {
				order.ShopID = parseImportString(item, "shop_id")
			}
			if hasImportKey(item, "shop_name") {
				order.ShopName = parseImportString(item, "shop_name")
			}
			if hasImportKey(item, "biz_type") {
				order.BizType = parseImportString(item, "biz_type")
			}
			if hasImportKey(item, "status") {
				order.Status = parseImportString(item, "status")
			}
			if hasImportKey(item, "service_type") {
				order.ServiceType = parseImportString(item, "service_type")
			}
			if hasImportKey(item, "service_description") {
				order.ServiceDescription = parseImportString(item, "service_description")
			}
			if hasImportKey(item, "package_name") {
				order.PackageName = parseImportString(item, "package_name")
			}
			if hasImportKey(item, "package_price") {
				order.PackagePrice = parseFloat(item["package_price"])
			}
			if hasImportKey(item, "phone_model") {
				order.PhoneModel = parseImportString(item, "phone_model")
			}
			if hasImportKey(item, "special_notes") {
				order.SpecialNotes = parseImportString(item, "special_notes")
			}
			if hasImportKey(item, "preferred_time") {
				order.PreferredTime = parseImportString(item, "preferred_time")
			}
			if hasImportKey(item, "food_request") {
				order.FoodRequest = parseImportString(item, "food_request")
			}
			if hasImportKey(item, "food_shop") {
				order.FoodShop = parseImportString(item, "food_shop")
			}
			if hasImportKey(item, "food_allergies") {
				order.FoodAllergies = parseImportString(item, "food_allergies")
			}
			if hasImportKey(item, "taste_notes") {
				order.TasteNotes = parseImportString(item, "taste_notes")
			}
			if hasImportKey(item, "drink_request") {
				order.DrinkRequest = parseImportString(item, "drink_request")
			}
			if hasImportKey(item, "drink_pickup_code") {
				order.DrinkPickupCode = parseImportString(item, "drink_pickup_code")
			}
			if hasImportKey(item, "drink_sugar") {
				order.DrinkSugar = parseImportString(item, "drink_sugar")
			}
			if hasImportKey(item, "drink_pickup_qr_image") {
				order.DrinkPickupQRImage = parseImportString(item, "drink_pickup_qr_image")
			}
			if hasImportKey(item, "delivery_request") {
				order.DeliveryRequest = parseImportString(item, "delivery_request")
			}
			if hasImportKey(item, "delivery_name") {
				order.DeliveryName = parseImportString(item, "delivery_name")
			}
			if hasImportKey(item, "delivery_phone") {
				order.DeliveryPhone = parseImportString(item, "delivery_phone")
			}
			if hasImportKey(item, "delivery_codes") {
				order.DeliveryCodes = parseImportString(item, "delivery_codes")
			}
			if hasImportKey(item, "delivery_photo") {
				order.DeliveryPhoto = parseImportString(item, "delivery_photo")
			}
			if hasImportKey(item, "delivery_message") {
				order.DeliveryMessage = parseImportString(item, "delivery_message")
			}
			if hasImportKey(item, "delivery_photo_time") {
				order.DeliveryPhotoTime = parseImportString(item, "delivery_photo_time")
			}
			if hasImportKey(item, "errand_request") {
				order.ErrandRequest = parseImportString(item, "errand_request")
			}
			if hasImportKey(item, "errand_location") {
				order.ErrandLocation = parseImportString(item, "errand_location")
			}
			if hasImportKey(item, "errand_requirements") {
				order.ErrandRequirements = parseImportString(item, "errand_requirements")
			}
			if hasImportKey(item, "dorm_number") {
				order.DormNumber = parseImportString(item, "dorm_number")
			}
			if hasImportKey(item, "address") {
				order.Address = parseImportString(item, "address")
			}
			if hasImportKey(item, "total_price") {
				order.TotalPrice = parseFloat(item["total_price"])
			}
			if hasImportKey(item, "rider_quoted_price") {
				order.RiderQuotedPrice = parseFloat(item["rider_quoted_price"])
			}
			if hasImportKey(item, "delivery_fee") {
				order.DeliveryFee = parseFloat(item["delivery_fee"])
			}
			if hasImportKey(item, "product_price") {
				order.ProductPrice = parseFloat(item["product_price"])
			}
			if hasImportKey(item, "items") {
				order.Items = parseImportString(item, "items")
			}
			if hasImportKey(item, "raw_payload") {
				order.RawPayload = parseImportString(item, "raw_payload")
			}
			if hasImportKey(item, "payment_method") {
				order.PaymentMethod = parseImportString(item, "payment_method")
			}
			if hasImportKey(item, "payment_status") {
				order.PaymentStatus = parseImportString(item, "payment_status")
			}
			if hasImportKey(item, "payment_transaction_id") {
				order.PaymentTransactionID = parseImportString(item, "payment_transaction_id")
			}
			if hasImportKey(item, "payment_time") {
				order.PaymentTime = parseImportTimePtr(item, "payment_time")
			}
			if hasImportKey(item, "refund_transaction_id") {
				order.RefundTransactionID = parseImportString(item, "refund_transaction_id")
			}
			if hasImportKey(item, "refund_amount") {
				order.RefundAmount = parseInt64(item["refund_amount"])
			}
			if hasImportKey(item, "refund_time") {
				order.RefundTime = parseImportTimePtr(item, "refund_time")
			}
			if hasImportKey(item, "platform_commission") {
				order.PlatformCommission = parseInt64(item["platform_commission"])
			}
			if hasImportKey(item, "rider_income") {
				order.RiderIncome = parseInt64(item["rider_income"])
			}
			if hasImportKey(item, "merchant_income") {
				order.MerchantIncome = parseInt64(item["merchant_income"])
			}
			if hasImportKey(item, "accepted_at") {
				order.AcceptedAt = parseImportTimePtr(item, "accepted_at")
			}
			if hasImportKey(item, "paid_at") {
				order.PaidAt = parseImportTimePtr(item, "paid_at")
			}
			if hasImportKey(item, "completed_at") {
				order.CompletedAt = parseImportTimePtr(item, "completed_at")
			}
			if hasImportKey(item, "latest_exception_reason") {
				order.LatestExceptionReason = parseImportString(item, "latest_exception_reason")
			}
			if hasImportKey(item, "latest_exception_reporter_id") {
				order.LatestExceptionReporterID = parseImportString(item, "latest_exception_reporter_id")
			}
			if hasImportKey(item, "latest_exception_reporter_role") {
				order.LatestExceptionReporterRole = parseImportString(item, "latest_exception_reporter_role")
			}
			if hasImportKey(item, "latest_exception_reported_at") {
				order.LatestExceptionReportedAt = parseImportTimePtr(item, "latest_exception_reported_at")
			}
			if hasImportKey(item, "exception_reports") {
				order.ExceptionReports = parseImportString(item, "exception_reports")
			}
			if hasImportKey(item, "is_reviewed") {
				order.IsReviewed = parseBool(item["is_reviewed"])
			}
			if hasImportKey(item, "reviewed_at") {
				order.ReviewedAt = parseImportTimePtr(item, "reviewed_at")
			}

			if err := saveImportedModel(ctx, tx, "orders", &order, order.ID, order.UID, order.TSID); err != nil {
				return err
			}
			return nil
		}); err != nil {
			errorCount++
			continue
		}
		successCount++
	}
	return successCount, errorCount
}

// Stats and ranks
func (s *AdminService) GetStats(ctx context.Context) (map[string]interface{}, error) {
	var customerCount int64
	var totalOrders int64
	var todayOrders int64
	var riderCount int64
	var onlineRiderCount int64
	var pendingOrdersCount int64

	s.db.WithContext(ctx).Model(&repository.User{}).Where("type = ?", "customer").Count(&customerCount)
	s.db.WithContext(ctx).Model(&repository.Order{}).Count(&totalOrders)

	startToday := startOfDay(time.Now())
	s.db.WithContext(ctx).Model(&repository.Order{}).Where("created_at >= ?", startToday).Count(&todayOrders)

	onlineCutoff := riderOnlineCutoff(time.Now())
	s.db.WithContext(ctx).Model(&repository.Rider{}).Count(&riderCount)
	s.db.WithContext(ctx).Model(&repository.Rider{}).Where("is_online = ? AND updated_at >= ?", true, onlineCutoff).Count(&onlineRiderCount)
	s.db.WithContext(ctx).Model(&repository.Order{}).Where("status = ?", "pending").Count(&pendingOrdersCount)

	return map[string]interface{}{
		"customerCount":      customerCount,
		"totalOrders":        totalOrders,
		"todayOrders":        todayOrders,
		"riderCount":         riderCount,
		"onlineRiderCount":   onlineRiderCount,
		"pendingOrdersCount": pendingOrdersCount,
	}, nil
}

func (s *AdminService) GetUserRanks(ctx context.Context, period, rankType string) ([]map[string]interface{}, error) {
	start := periodStart(period)
	if start.IsZero() {
		start = startOfDay(time.Now().AddDate(0, 0, -6))
	}
	var users []repository.User
	if err := s.db.WithContext(ctx).Find(&users).Error; err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		userID := fmt.Sprintf("%d", user.ID)
		query := s.db.WithContext(ctx).Model(&repository.Order{}).Where("created_at >= ?", start).Where("user_id = ? OR user_id = ?", userID, user.Phone)
		if rankType == "amount" {
			var sum float64
			query.Select("COALESCE(SUM(total_price),0)").Scan(&sum)
			results = append(results, map[string]interface{}{
				"name":  displayName(user.Name, user.Phone),
				"value": fmt.Sprintf("%.2f", sum),
			})
		} else {
			var count int64
			query.Count(&count)
			results = append(results, map[string]interface{}{
				"name":  displayName(user.Name, user.Phone),
				"value": count,
			})
		}
	}

	// sort descending by value (amount or count)
	sortResults(results, rankType == "amount")
	return results, nil
}

func (s *AdminService) GetRiderRanks(ctx context.Context, period string) ([]map[string]interface{}, error) {
	start := periodStart(period)
	if start.IsZero() {
		start = startOfDay(time.Now().AddDate(0, 0, -6))
	}
	var riders []repository.Rider
	if err := s.db.WithContext(ctx).Find(&riders).Error; err != nil {
		return nil, err
	}
	results := make([]map[string]interface{}, 0, len(riders))
	for _, rider := range riders {
		riderID := fmt.Sprintf("%d", rider.ID)
		var count int64
		s.db.WithContext(ctx).Model(&repository.Order{}).Where("created_at >= ?", start).Where("rider_id = ? OR rider_id = ?", riderID, rider.Phone).Count(&count)
		results = append(results, map[string]interface{}{
			"name":  displayName(rider.Name, rider.Phone),
			"value": count,
			"level": rider.Level,
		})
	}

	sortResults(results, false)
	return results, nil
}

// Settings
func (s *AdminService) GetSetting(ctx context.Context, key string, dest interface{}) error {
	var settings []repository.Setting
	if err := s.db.WithContext(ctx).Where("key = ?", key).Limit(1).Find(&settings).Error; err != nil {
		return err
	}
	if len(settings) == 0 {
		return nil
	}
	setting := settings[0]
	if setting.Value == "" {
		return nil
	}
	return json.Unmarshal([]byte(setting.Value), dest)
}

func (s *AdminService) SaveSetting(ctx context.Context, key string, value interface{}) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}

	var setting repository.Setting
	err = s.db.WithContext(ctx).Where("key = ?", key).Limit(1).Find(&setting).Error
	if err != nil {
		return err
	}
	if setting.Key != "" {
		setting.Value = string(payload)
		return s.db.WithContext(ctx).Save(&setting).Error
	}

	setting = repository.Setting{Key: key, Value: string(payload)}
	return s.db.WithContext(ctx).Create(&setting).Error
}

func (s *AdminService) ListCarousel(ctx context.Context) ([]repository.Carousel, error) {
	var items []repository.Carousel
	if err := s.db.WithContext(ctx).Order("sort_order ASC, created_at DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *AdminService) CreateCarousel(ctx context.Context, item *repository.Carousel) error {
	if item == nil {
		return fmt.Errorf("%w: carousel payload is required", ErrInvalidArgument)
	}
	item.Title = strings.TrimSpace(item.Title)
	if err := s.ensureCarouselTitleUnique(ctx, item.Title, 0); err != nil {
		return err
	}
	return s.db.WithContext(ctx).Create(item).Error
}

func (s *AdminService) UpdateCarousel(ctx context.Context, id string, updates map[string]interface{}) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "carousels", id)
	if err != nil {
		return err
	}
	if title, ok := extractTrimmedStringUpdate(updates, "title"); ok {
		if err := s.ensureCarouselTitleUnique(ctx, title, resolvedID); err != nil {
			return err
		}
	}
	return s.db.WithContext(ctx).Model(&repository.Carousel{}).Where("id = ?", resolvedID).Updates(updates).Error
}

func (s *AdminService) DeleteCarousel(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "carousels", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Delete(&repository.Carousel{}, resolvedID).Error
}

func (s *AdminService) ListPushMessages(ctx context.Context) ([]repository.PushMessage, error) {
	var items []repository.PushMessage
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *AdminService) CreatePushMessage(ctx context.Context, item *repository.PushMessage) error {
	if item == nil {
		return fmt.Errorf("%w: push message payload is required", ErrInvalidArgument)
	}
	item.Title = strings.TrimSpace(item.Title)
	if err := s.ensurePushMessageTitleUnique(ctx, item.Title, 0); err != nil {
		return err
	}
	if err := s.db.WithContext(ctx).Create(item).Error; err != nil {
		return err
	}
	return s.syncPushMessageDeliveries(ctx, item)
}

func (s *AdminService) UpdatePushMessage(ctx context.Context, id string, updates map[string]interface{}) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "push_messages", id)
	if err != nil {
		return err
	}
	if title, ok := extractTrimmedStringUpdate(updates, "title"); ok {
		if err := s.ensurePushMessageTitleUnique(ctx, title, resolvedID); err != nil {
			return err
		}
	}
	if err := s.db.WithContext(ctx).Model(&repository.PushMessage{}).Where("id = ?", resolvedID).Updates(updates).Error; err != nil {
		return err
	}

	var message repository.PushMessage
	if err := s.db.WithContext(ctx).Where("id = ?", resolvedID).First(&message).Error; err != nil {
		return err
	}
	return s.syncPushMessageDeliveries(ctx, &message)
}

func (s *AdminService) DeletePushMessage(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "push_messages", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Delete(&repository.PushMessage{}, resolvedID).Error
}

func (s *AdminService) GetPushMessageStats(ctx context.Context, id string) (*PushMessageStats, error) {
	message, err := s.getPushMessageByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.syncPushMessageDeliveries(ctx, message); err != nil {
		return nil, err
	}

	messageIDs := collectPushMessageLookupIDs(*message, id)
	baseQuery := s.db.WithContext(ctx).Model(&repository.PushDelivery{}).Where("message_id IN ?", messageIDs)

	var totalDeliveries int64
	if err := baseQuery.Count(&totalDeliveries).Error; err != nil {
		return nil, err
	}

	totalUsers, err := countDistinctPushDeliveryUsers(baseQuery)
	if err != nil {
		return nil, err
	}

	var queuedCount int64
	if err := s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Where("message_id IN ?", messageIDs).
		Where("status IN ?", []string{"queued", "dispatching", "retry_pending", "pending"}).
		Count(&queuedCount).Error; err != nil {
		return nil, err
	}

	var sentCount int64
	if err := s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Where("message_id IN ?", messageIDs).
		Where("status IN ?", []string{"sent", "acknowledged"}).
		Count(&sentCount).Error; err != nil {
		return nil, err
	}

	var failedCount int64
	if err := s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Where("message_id IN ?", messageIDs).
		Where("status = ?", "failed").
		Count(&failedCount).Error; err != nil {
		return nil, err
	}

	var acknowledgedCount int64
	if err := s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Where("message_id IN ?", messageIDs).
		Where("status = ?", "acknowledged").
		Count(&acknowledgedCount).Error; err != nil {
		return nil, err
	}

	receivedUsers, err := countDistinctPushDeliveryUsers(
		s.db.WithContext(ctx).
			Model(&repository.PushDelivery{}).
			Where("message_id IN ?", messageIDs).
			Where("action IN ?", []string{"received", "opened"}),
	)
	if err != nil {
		return nil, err
	}

	readUsers, err := countDistinctPushDeliveryUsers(
		s.db.WithContext(ctx).
			Model(&repository.PushDelivery{}).
			Where("message_id IN ?", messageIDs).
			Where("action = ?", "opened"),
	)
	if err != nil {
		return nil, err
	}

	unreadCount := totalUsers - readUsers
	if unreadCount < 0 {
		unreadCount = 0
	}

	var latestRecord repository.PushDelivery
	latestErr := s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Where("message_id IN ?", messageIDs).
		Where("acknowledged_at IS NOT NULL").
		Order("acknowledged_at DESC").
		Limit(1).
		Take(&latestRecord).Error
	if latestErr != nil && !errors.Is(latestErr, gorm.ErrRecordNotFound) {
		return nil, latestErr
	}

	stats := &PushMessageStats{
		MessageID:         canonicalPushMessageID(*message),
		TotalDeliveries:   totalDeliveries,
		TotalUsers:        totalUsers,
		QueuedCount:       queuedCount,
		SentCount:         sentCount,
		FailedCount:       failedCount,
		AcknowledgedCount: acknowledgedCount,
		ReceivedCount:     receivedUsers,
		ReadCount:         readUsers,
		UnreadCount:       unreadCount,
	}
	if totalUsers > 0 {
		stats.ReadRate = float64(readUsers) / float64(totalUsers)
		stats.ReadRatePercent = stats.ReadRate * 100
	}
	if latestRecord.AcknowledgedAt != nil {
		stats.LatestAcknowledged = latestRecord.AcknowledgedAt
	}

	return stats, nil
}

func (s *AdminService) ListPushMessageDeliveries(ctx context.Context, id string, limit int) (*PushMessageDeliveryList, error) {
	message, err := s.getPushMessageByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.syncPushMessageDeliveries(ctx, message); err != nil {
		return nil, err
	}

	messageIDs := collectPushMessageLookupIDs(*message, id)
	query := s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Where("message_id IN ?", messageIDs)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	var deliveries []repository.PushDelivery
	if err := s.db.WithContext(ctx).
		Where("message_id IN ?", messageIDs).
		Order("acknowledged_at DESC").
		Order("sent_at DESC").
		Order("updated_at DESC").
		Limit(limit).
		Find(&deliveries).Error; err != nil {
		return nil, err
	}

	items := make([]PushMessageDeliveryItem, 0, len(deliveries))
	for _, delivery := range deliveries {
		items = append(items, PushMessageDeliveryItem{
			ID:                strings.TrimSpace(delivery.UID),
			UserID:            strings.TrimSpace(delivery.UserID),
			UserType:          strings.TrimSpace(delivery.UserType),
			DeviceToken:       strings.TrimSpace(delivery.DeviceToken),
			AppEnv:            strings.TrimSpace(delivery.AppEnv),
			Status:            strings.TrimSpace(delivery.Status),
			Action:            strings.TrimSpace(delivery.Action),
			EventType:         strings.TrimSpace(delivery.EventType),
			DispatchProvider:  strings.TrimSpace(delivery.DispatchProvider),
			ProviderMessageID: strings.TrimSpace(delivery.ProviderMessageID),
			RetryCount:        delivery.RetryCount,
			NextRetryAt:       delivery.NextRetryAt,
			SentAt:            delivery.SentAt,
			AcknowledgedAt:    delivery.AcknowledgedAt,
			ErrorCode:         strings.TrimSpace(delivery.ErrorCode),
			ErrorMessage:      strings.TrimSpace(delivery.ErrorMessage),
			UpdatedAt:         delivery.UpdatedAt,
		})
	}

	return &PushMessageDeliveryList{
		MessageID: canonicalPushMessageID(*message),
		Total:     total,
		Items:     items,
	}, nil
}

func (s *AdminService) getPushMessageByID(ctx context.Context, id string) (*repository.PushMessage, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "push_messages", id)
	if err != nil {
		return nil, err
	}

	var message repository.PushMessage
	if err := s.db.WithContext(ctx).Where("id = ?", resolvedID).First(&message).Error; err != nil {
		return nil, err
	}
	return &message, nil
}

func (s *AdminService) syncPushMessageDeliveries(ctx context.Context, message *repository.PushMessage) error {
	if s == nil || s.db == nil || message == nil {
		return nil
	}

	messageID := canonicalPushMessageID(*message)
	if messageID == "" {
		return nil
	}

	now := time.Now()
	if !shouldMaterializePushMessage(*message, now) {
		return s.db.WithContext(ctx).
			Model(&repository.PushDelivery{}).
			Where("message_id = ?", messageID).
			Where("status IN ?", []string{"queued", "pending", "inactive", "retry_pending", "dispatching"}).
			Updates(map[string]interface{}{
				"status":        "inactive",
				"next_retry_at": nil,
				"updated_at":    now,
			}).Error
	}

	var devices []repository.PushDevice
	if err := s.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("last_registered_at DESC").
		Order("updated_at DESC").
		Order("id DESC").
		Find(&devices).Error; err != nil {
		return err
	}

	latestDevices := make([]repository.PushDevice, 0, len(devices))
	seenRecipients := make(map[string]struct{}, len(devices))
	for _, device := range devices {
		key := buildPushRecipientKey(device.UserType, device.UserID)
		if key == "" {
			continue
		}
		if _, exists := seenRecipients[key]; exists {
			continue
		}
		seenRecipients[key] = struct{}{}
		latestDevices = append(latestDevices, device)
	}

	var existing []repository.PushDelivery
	if err := s.db.WithContext(ctx).
		Where("message_id = ?", messageID).
		Find(&existing).Error; err != nil {
		return err
	}
	existingMap := make(map[string]repository.PushDelivery, len(existing))
	for _, item := range existing {
		existingMap[buildPushRecipientKey(item.UserType, item.UserID)] = item
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"messageId": messageID,
		"title":     strings.TrimSpace(message.Title),
		"content":   strings.TrimSpace(message.Content),
		"imageUrl":  strings.TrimSpace(message.ImageURL),
	})
	payloadText := string(payload)
	activeRecipients := make(map[string]struct{}, len(latestDevices))

	for _, device := range latestDevices {
		key := buildPushRecipientKey(device.UserType, device.UserID)
		activeRecipients[key] = struct{}{}
		if current, exists := existingMap[key]; exists {
			updates := map[string]interface{}{"updated_at": now}
			if shouldUpdatePushDeliveryMutableState(current.Status) {
				updates["device_token"] = device.DeviceToken
				updates["app_env"] = strings.TrimSpace(device.AppEnv)
				updates["event_type"] = "admin_push_message"
				updates["payload"] = payloadText
			}
			if shouldResetPushDeliveryToQueue(current, device, payloadText) {
				updates["status"] = "queued"
				updates["retry_count"] = 0
				updates["next_retry_at"] = nil
				updates["error_code"] = ""
				updates["error_message"] = ""
				updates["dispatch_provider"] = ""
				updates["provider_message_id"] = ""
				updates["sent_at"] = nil
			}
			if len(updates) == 1 {
				continue
			}
			if err := s.db.WithContext(ctx).
				Model(&repository.PushDelivery{}).
				Where("id = ?", current.ID).
				Updates(updates).Error; err != nil {
				return err
			}
			continue
		}

		record := repository.PushDelivery{
			MessageID:   messageID,
			UserID:      strings.TrimSpace(device.UserID),
			UserType:    strings.TrimSpace(device.UserType),
			DeviceToken: strings.TrimSpace(device.DeviceToken),
			AppEnv:      strings.TrimSpace(device.AppEnv),
			EventType:   "admin_push_message",
			Status:      "queued",
			Payload:     payloadText,
		}
		if err := s.db.WithContext(ctx).Create(&record).Error; err != nil {
			return err
		}
	}

	for _, current := range existing {
		key := buildPushRecipientKey(current.UserType, current.UserID)
		if key == "" {
			continue
		}
		if _, exists := activeRecipients[key]; exists {
			continue
		}
		if !shouldUpdatePushDeliveryMutableState(current.Status) {
			continue
		}
		if err := s.db.WithContext(ctx).
			Model(&repository.PushDelivery{}).
			Where("id = ?", current.ID).
			Updates(map[string]interface{}{
				"status":        "inactive",
				"next_retry_at": nil,
				"updated_at":    now,
			}).Error; err != nil {
			return err
		}
	}

	return nil
}

func shouldMaterializePushMessage(message repository.PushMessage, now time.Time) bool {
	if !message.IsActive {
		return false
	}

	if start, ok := parsePushScheduleTime(message.ScheduledStartTime); ok && now.Before(start) {
		return false
	}
	if end, ok := parsePushScheduleTime(message.ScheduledEndTime); ok && now.After(end) {
		return false
	}
	return true
}

func parsePushScheduleTime(raw string) (time.Time, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return time.Time{}, false
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
	}
	for _, layout := range layouts {
		if parsed, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func canonicalPushMessageID(message repository.PushMessage) string {
	if uid := strings.TrimSpace(message.UID); uid != "" {
		return uid
	}
	if tsid := strings.TrimSpace(message.TSID); tsid != "" {
		return tsid
	}
	if message.ID > 0 {
		return strconv.FormatUint(uint64(message.ID), 10)
	}
	return ""
}

func buildPushRecipientKey(userType, userID string) string {
	normalizedType := strings.TrimSpace(userType)
	normalizedID := strings.TrimSpace(userID)
	if normalizedType == "" || normalizedID == "" {
		return ""
	}
	return normalizedType + "::" + normalizedID
}

func shouldUpdatePushDeliveryMutableState(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", "inactive", "queued", "pending", "retry_pending", "failed", "dispatching":
		return true
	default:
		return false
	}
}

func shouldResetPushDeliveryToQueue(current repository.PushDelivery, device repository.PushDevice, payloadText string) bool {
	status := strings.ToLower(strings.TrimSpace(current.Status))
	deviceTokenChanged := strings.TrimSpace(current.DeviceToken) != strings.TrimSpace(device.DeviceToken)
	payloadChanged := strings.TrimSpace(current.Payload) != strings.TrimSpace(payloadText)
	appEnvChanged := strings.TrimSpace(current.AppEnv) != strings.TrimSpace(device.AppEnv)

	switch status {
	case "", "inactive", "queued", "pending":
		return deviceTokenChanged || payloadChanged || appEnvChanged || status != "queued"
	case "retry_pending", "failed", "dispatching":
		return deviceTokenChanged || payloadChanged || appEnvChanged
	default:
		return false
	}
}

func collectPushMessageLookupIDs(message repository.PushMessage, rawID string) []string {
	values := []string{
		strings.TrimSpace(rawID),
		strings.TrimSpace(message.UID),
		strings.TrimSpace(message.TSID),
	}
	if message.ID > 0 {
		values = append(values, strconv.FormatUint(uint64(message.ID), 10))
	}

	seen := make(map[string]struct{}, len(values))
	ids := make([]string, 0, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		ids = append(ids, value)
	}
	return ids
}

func countDistinctPushDeliveryUsers(query *gorm.DB) (int64, error) {
	rows, err := query.Session(&gorm.Session{}).
		Select("user_id, user_type").
		Group("user_id, user_type").
		Rows()
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var count int64
	for rows.Next() {
		count++
	}
	return count, rows.Err()
}

func (s *AdminService) ListPublicAPIs(ctx context.Context) ([]map[string]interface{}, error) {
	var items []repository.PublicAPI
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&items).Error; err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, 0, len(items))
	for _, item := range items {
		perms := []string{}
		if item.Permissions != "" {
			_ = json.Unmarshal([]byte(item.Permissions), &perms)
		}
		results = append(results, map[string]interface{}{
			"id":          item.UID,
			"tsid":        item.TSID,
			"legacy_id":   item.ID,
			"name":        item.Name,
			"path":        item.Path,
			"permissions": perms,
			"api_key":     item.APIKey,
			"description": item.Description,
			"is_active":   item.IsActive,
			"created_at":  formatTime(item.CreatedAt),
			"updated_at":  formatTime(item.UpdatedAt),
		})
	}
	return results, nil
}

func (s *AdminService) CreatePublicAPI(ctx context.Context, name, path string, permissions []string, apiKey, desc string, isActive bool) error {
	name = strings.TrimSpace(name)
	path = strings.TrimSpace(path)
	if err := s.ensurePublicAPINameUnique(ctx, name, 0); err != nil {
		return err
	}
	payload, _ := json.Marshal(permissions)
	item := repository.PublicAPI{
		Name:        name,
		Path:        path,
		Permissions: string(payload),
		APIKey:      apiKey,
		Description: desc,
		IsActive:    isActive,
	}
	return s.db.WithContext(ctx).Create(&item).Error
}

func (s *AdminService) UpdatePublicAPI(ctx context.Context, id string, updates map[string]interface{}) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "public_apis", id)
	if err != nil {
		return err
	}
	if name, ok := extractTrimmedStringUpdate(updates, "name"); ok {
		if err := s.ensurePublicAPINameUnique(ctx, name, resolvedID); err != nil {
			return err
		}
	}
	if path, ok := extractTrimmedStringUpdate(updates, "path"); ok {
		updates["path"] = path
	}
	if perms, ok := updates["permissions"].([]string); ok {
		payload, _ := json.Marshal(perms)
		updates["permissions"] = string(payload)
	}
	return s.db.WithContext(ctx).Model(&repository.PublicAPI{}).Where("id = ?", resolvedID).Updates(updates).Error
}

func (s *AdminService) DeletePublicAPI(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "public_apis", id)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Delete(&repository.PublicAPI{}, resolvedID).Error
}

func (s *AdminService) ensureCarouselTitleUnique(ctx context.Context, title string, excludeID uint) error {
	return ensureScopedNameUnique(ctx, s.db, scopedNameUniquenessSpec{
		TableName:     "carousels",
		ColumnName:    "title",
		RawValue:      title,
		ExcludeID:     excludeID,
		ConflictLabel: "轮播图标题",
	})
}

func (s *AdminService) ensurePushMessageTitleUnique(ctx context.Context, title string, excludeID uint) error {
	return ensureScopedNameUnique(ctx, s.db, scopedNameUniquenessSpec{
		TableName:     "push_messages",
		ColumnName:    "title",
		RawValue:      title,
		ExcludeID:     excludeID,
		ConflictLabel: "推送消息标题",
	})
}

func (s *AdminService) ensurePublicAPINameUnique(ctx context.Context, name string, excludeID uint) error {
	return ensureScopedNameUnique(ctx, s.db, scopedNameUniquenessSpec{
		TableName:     "public_apis",
		ColumnName:    "name",
		RawValue:      name,
		ExcludeID:     excludeID,
		ConflictLabel: "开放 API 名称",
	})
}

// helpers
func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02 15:04:05")
}

func formatTimePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return formatTime(*t)
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func periodStart(period string) time.Time {
	now := time.Now()
	switch period {
	case "week":
		return startOfDay(now.AddDate(0, 0, -6))
	case "month":
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	default:
		return time.Time{}
	}
}

func displayName(name, phone string) string {
	if strings.TrimSpace(name) != "" {
		return name
	}
	return phone
}

func (s *AdminService) countOrders(ctx context.Context, field string, values []string) (int64, int64, int64) {
	startToday := startOfDay(time.Now())
	startWeek := startOfDay(time.Now().AddDate(0, 0, -6))
	startMonth := time.Date(time.Now().Year(), time.Now().Month(), 1, 0, 0, 0, 0, time.Now().Location())

	filter := s.db.WithContext(ctx).Model(&repository.Order{})
	filtered := toInterfaceSlice(values)
	if len(filtered) == 0 {
		return 0, 0, 0
	}
	filter = filter.Where(field+" IN ?", filtered)

	var today int64
	filter.Where("created_at >= ?", startToday).Count(&today)

	var week int64
	filter.Where("created_at >= ?", startWeek).Count(&week)

	var month int64
	filter.Where("created_at >= ?", startMonth).Count(&month)

	return today, week, month
}

func (s *AdminService) sumPointsBalance(ctx context.Context, values []string) int64 {
	filtered := toInterfaceSlice(values)
	if len(filtered) == 0 {
		return 0
	}

	var balance int64
	now := time.Now()
	if err := s.db.WithContext(ctx).
		Model(&repository.PointsLedger{}).
		Where("user_id IN ? AND (expires_at IS NULL OR expires_at > ?)", filtered, now).
		Select("COALESCE(SUM(`change`), 0)").
		Scan(&balance).Error; err != nil {
		return 0
	}

	return balance
}

func userIdentityCandidates(user repository.User) []string {
	values := []string{
		user.UID,
		user.TSID,
		fmt.Sprintf("%d", user.ID),
		user.Phone,
	}
	if user.RoleID > 0 {
		values = append(values, fmt.Sprintf("%d", user.RoleID))
	}
	return uniqueNonEmptyStrings(values...)
}

func uniqueNonEmptyStrings(values ...string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		key := strings.TrimSpace(value)
		if key == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, key)
	}
	return result
}

func resolveVIPLevel(pointsBalance int64) string {
	switch {
	case pointsBalance >= 8000:
		return "鑷冲皧VIP"
	case pointsBalance >= 5000:
		return "灏婅吹VIP"
	case pointsBalance >= 3000:
		return "榛勯噾VIP"
	case pointsBalance >= 800:
		return "浼樿川VIP"
	default:
		return "普通用户"
	}
}

func toInterfaceSlice(items []string) []interface{} {
	out := make([]interface{}, 0, len(items))
	for _, item := range items {
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func sortResults(items []map[string]interface{}, isAmount bool) {
	// simple bubble sort for small datasets
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if compareRank(items[i], items[j], isAmount) < 0 {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
}

func compareRank(a, b map[string]interface{}, isAmount bool) int {
	if isAmount {
		av := parseFloat(a["value"])
		bv := parseFloat(b["value"])
		if av > bv {
			return 1
		}
		if av < bv {
			return -1
		}
		return 0
	}
	av := parseInt64(a["value"])
	bv := parseInt64(b["value"])
	if av > bv {
		return 1
	}
	if av < bv {
		return -1
	}
	return 0
}

func parseFloat(v interface{}) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case int64:
		return float64(t)
	case int:
		return float64(t)
	case uint:
		return float64(t)
	case uint64:
		return float64(t)
	case string:
		f, _ := strconv.ParseFloat(t, 64)
		return f
	default:
		return 0
	}
}

func parseInt64(v interface{}) int64 {
	switch t := v.(type) {
	case int64:
		return t
	case int:
		return int64(t)
	case uint:
		return int64(t)
	case uint64:
		return int64(t)
	case float64:
		return int64(t)
	case string:
		i, _ := strconv.ParseInt(t, 10, 64)
		return i
	default:
		return 0
	}
}

func parseString(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case []byte:
		return string(t)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case uint:
		return strconv.FormatUint(uint64(t), 10)
	case uint64:
		return strconv.FormatUint(t, 10)
	default:
		return ""
	}
}

func parseBool(v interface{}) bool {
	switch t := v.(type) {
	case bool:
		return t
	case int:
		return t != 0
	case int64:
		return t != 0
	case float64:
		return t != 0
	case string:
		return t == "1" || strings.ToLower(t) == "true"
	default:
		return false
	}
}

// GetUsers 获取用户列表（带分页和搜索）
func (s *AdminService) GetUsers(ctx context.Context, page, limit int, search, userType string) (map[string]interface{}, error) {
	offset := (page - 1) * limit
	var users []repository.User
	var total int64

	query := s.db.Model(&repository.User{})
	if userType != "" {
		query = query.Where("type = ?", userType)
	}
	if search != "" {
		query = query.Where("phone LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"users": users,
		"total": total,
	}, nil
}

// GetRiders 获取骑手列表（带分页和搜索）
func (s *AdminService) GetRiders(ctx context.Context, page, limit int, search string) (map[string]interface{}, error) {
	offset := (page - 1) * limit
	var riders []repository.Rider
	var total int64

	query := s.db.Model(&repository.Rider{})
	if search != "" {
		query = query.Where("phone LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&riders).Error; err != nil {
		return nil, err
	}
	now := time.Now()
	for i := range riders {
		if !riderOnlineActive(riders[i], now) {
			riders[i].IsOnline = false
		}
	}

	return map[string]interface{}{
		"riders": riders,
		"total":  total,
	}, nil
}

// GetMerchants 获取商户列表（带分页和搜索）
func (s *AdminService) GetMerchants(ctx context.Context, page, limit int, search string) (map[string]interface{}, error) {
	offset := (page - 1) * limit
	var merchants []repository.Merchant
	var total int64

	query := s.db.Model(&repository.Merchant{})
	if search != "" {
		query = query.Where("phone LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&merchants).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"merchants": merchants,
		"total":     total,
	}, nil
}

// ReorganizeRoleIds 重组角色 ID
func (s *AdminService) ReorganizeRoleIds(ctx context.Context, userType string) error {
	switch userType {
	case "customer":
		var users []repository.User
		if err := s.db.Where("type = ?", "customer").Order("created_at ASC").Find(&users).Error; err != nil {
			return err
		}
		for i, user := range users {
			if err := s.db.Model(&user).Update("role_id", i+1).Error; err != nil {
				return err
			}
		}
	case "rider":
		var riders []repository.Rider
		if err := s.db.Order("created_at ASC").Find(&riders).Error; err != nil {
			return err
		}
		for i, rider := range riders {
			if err := s.db.Model(&rider).Update("role_id", i+1).Error; err != nil {
				return err
			}
		}
	case "merchant":
		var merchants []repository.Merchant
		if err := s.db.Order("created_at ASC").Find(&merchants).Error; err != nil {
			return err
		}
		for i, merchant := range merchants {
			if err := s.db.Model(&merchant).Update("role_id", i+1).Error; err != nil {
				return err
			}
		}
	default:
		return fmt.Errorf("invalid user type: %s", userType)
	}
	return nil
}
