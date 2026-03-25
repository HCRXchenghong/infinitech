package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	onboardingInviteTypeMerchant = "merchant"
	onboardingInviteTypeRider    = "rider"
	onboardingInviteTypeOldUser  = "old_user"

	onboardingInviteStatusPending = "pending"
	onboardingInviteStatusUsed    = "used"
	onboardingInviteStatusExpired = "expired"
	onboardingInviteStatusRevoked = "revoked"
)

var (
	ErrOnboardingInviteNotFound = errors.New("invite link not found")
)

type OnboardingInviteCreateRequest struct {
	InviteType   string `json:"invite_type"`
	ExpiresHours int    `json:"expires_hours"`
	MaxUses      int    `json:"max_uses"`
}

type OnboardingInviteSubmitRequest struct {
	// 商户字段
	MerchantName         string `json:"merchant_name"`
	OwnerName            string `json:"owner_name"`
	BusinessLicenseImage string `json:"business_license_image"`

	// 骑手字段
	Name                  string `json:"name"`
	IDCardImage           string `json:"id_card_image"`
	EmergencyContactName  string `json:"emergency_contact_name"`
	EmergencyContactPhone string `json:"emergency_contact_phone"`

	// 共用字段
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type OnboardingInviteCreateResult struct {
	ID            string    `json:"id"`
	InviteType    string    `json:"invite_type"`
	Status        string    `json:"status"`
	TokenPrefix   string    `json:"token_prefix"`
	MaxUses       int       `json:"max_uses"`
	UsedCount     int       `json:"used_count"`
	RemainingUses int       `json:"remaining_uses"`
	ExpiresAt     time.Time `json:"expires_at"`
	InviteURL     string    `json:"invite_url"`
}

type OnboardingInviteService struct {
	db            *gorm.DB
	inviteBaseURL string
}

func NewOnboardingInviteService(db *gorm.DB) *OnboardingInviteService {
	return &OnboardingInviteService{
		db:            db,
		inviteBaseURL: resolvePublicLandingBaseURL("ONBOARDING_INVITE_BASE_URL"),
	}
}

func (s *OnboardingInviteService) CreateInviteLink(ctx context.Context, req OnboardingInviteCreateRequest, adminID uint, adminName string) (*OnboardingInviteCreateResult, error) {
	if req.InviteType != onboardingInviteTypeMerchant &&
		req.InviteType != onboardingInviteTypeRider &&
		req.InviteType != onboardingInviteTypeOldUser {
		return nil, fmt.Errorf("邀请类型不正确")
	}
	if req.ExpiresHours <= 0 {
		req.ExpiresHours = 72
	}
	if req.ExpiresHours > 24*30 {
		return nil, fmt.Errorf("有效期不能超过720小时")
	}
	if req.MaxUses <= 0 {
		req.MaxUses = 1
	}
	if req.MaxUses > 1000 {
		return nil, fmt.Errorf("可用次数不能超过1000")
	}

	token, err := generateInviteToken(24)
	if err != nil {
		return nil, fmt.Errorf("生成邀请链接失败: %w", err)
	}

	prefix := token
	if len(prefix) > 8 {
		prefix = prefix[:8]
	}

	expiresAt := time.Now().Add(time.Duration(req.ExpiresHours) * time.Hour)
	model := repository.OnboardingInviteLink{
		InviteType:    req.InviteType,
		TokenHash:     hashInviteToken(token),
		TokenPrefix:   prefix,
		Status:        onboardingInviteStatusPending,
		MaxUses:       req.MaxUses,
		UsedCount:     0,
		ExpiresAt:     expiresAt,
		CreatedByID:   adminID,
		CreatedByName: strings.TrimSpace(adminName),
		Note:          "",
	}
	if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, err
	}

	return &OnboardingInviteCreateResult{
		ID:            model.UID,
		InviteType:    model.InviteType,
		Status:        model.Status,
		TokenPrefix:   model.TokenPrefix,
		MaxUses:       model.MaxUses,
		UsedCount:     model.UsedCount,
		RemainingUses: maxInt(0, model.MaxUses-model.UsedCount),
		ExpiresAt:     model.ExpiresAt,
		InviteURL:     fmt.Sprintf("%s/invite/%s", s.inviteBaseURL, token),
	}, nil
}

func (s *OnboardingInviteService) ListInviteLinks(ctx context.Context, inviteType, status string, limit, offset int) ([]repository.OnboardingInviteLink, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	if err := s.expirePendingLinks(ctx); err != nil {
		return nil, 0, err
	}

	query := s.db.WithContext(ctx).Model(&repository.OnboardingInviteLink{})
	if inviteType != "" {
		query = query.Where("invite_type = ?", strings.TrimSpace(inviteType))
	}
	if status != "" {
		query = query.Where("status = ?", strings.TrimSpace(status))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var links []repository.OnboardingInviteLink
	if err := query.Order("id DESC").Limit(limit).Offset(offset).Find(&links).Error; err != nil {
		return nil, 0, err
	}
	return links, total, nil
}

func (s *OnboardingInviteService) RevokeInviteLink(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.db, "onboarding_invite_links", id)
	if err != nil {
		return fmt.Errorf("无效邀请ID")
	}

	if err := s.expirePendingLinks(ctx); err != nil {
		return err
	}

	result := s.db.WithContext(ctx).Model(&repository.OnboardingInviteLink{}).
		Where("id = ? AND status = ?", resolvedID, onboardingInviteStatusPending).
		Updates(map[string]interface{}{
			"status":     onboardingInviteStatusRevoked,
			"updated_at": time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("该邀请链接不可撤销")
	}
	return nil
}

func (s *OnboardingInviteService) GetInviteByToken(ctx context.Context, token string) (*repository.OnboardingInviteLink, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, ErrOnboardingInviteNotFound
	}

	if err := s.expirePendingLinks(ctx); err != nil {
		return nil, err
	}

	var link repository.OnboardingInviteLink
	if err := s.db.WithContext(ctx).Where("token_hash = ?", hashInviteToken(token)).First(&link).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOnboardingInviteNotFound
		}
		return nil, err
	}

	if link.MaxUses <= 0 {
		_ = s.db.WithContext(ctx).Model(&repository.OnboardingInviteLink{}).
			Where("id = ? AND max_uses <= 0", link.ID).
			Update("max_uses", 1).Error
		link.MaxUses = 1
	}
	if link.UsedCount < 0 {
		link.UsedCount = 0
	}

	if link.Status == onboardingInviteStatusPending && time.Now().After(link.ExpiresAt) {
		now := time.Now()
		_ = s.db.WithContext(ctx).Model(&repository.OnboardingInviteLink{}).Where("id = ?", link.ID).Updates(map[string]interface{}{
			"status":     onboardingInviteStatusExpired,
			"updated_at": now,
		}).Error
		link.Status = onboardingInviteStatusExpired
	}
	if link.Status == onboardingInviteStatusPending && link.UsedCount >= link.MaxUses {
		now := time.Now()
		_ = s.db.WithContext(ctx).Model(&repository.OnboardingInviteLink{}).Where("id = ?", link.ID).Updates(map[string]interface{}{
			"status":     onboardingInviteStatusUsed,
			"updated_at": now,
		}).Error
		link.Status = onboardingInviteStatusUsed
	}

	return &link, nil
}

func (s *OnboardingInviteService) SubmitByInviteToken(ctx context.Context, token string, req OnboardingInviteSubmitRequest, ip, userAgent string) (*repository.OnboardingInviteSubmission, error) {
	tokenHash := hashInviteToken(strings.TrimSpace(token))
	if tokenHash == "" {
		return nil, ErrOnboardingInviteNotFound
	}

	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer tx.Rollback()

	if err := s.expirePendingLinksTx(tx); err != nil {
		return nil, err
	}

	var link repository.OnboardingInviteLink
	if err := tx.Where("token_hash = ?", tokenHash).First(&link).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOnboardingInviteNotFound
		}
		return nil, err
	}

	if link.Status != onboardingInviteStatusPending {
		return nil, fmt.Errorf("邀请链接已失效")
	}
	if link.MaxUses <= 0 {
		if err := tx.Model(&repository.OnboardingInviteLink{}).
			Where("id = ? AND max_uses <= 0", link.ID).
			Update("max_uses", 1).Error; err != nil {
			return nil, err
		}
		link.MaxUses = 1
	}
	if link.UsedCount < 0 {
		link.UsedCount = 0
	}
	if link.UsedCount >= link.MaxUses {
		now := time.Now()
		if err := tx.Model(&repository.OnboardingInviteLink{}).Where("id = ?", link.ID).Updates(map[string]interface{}{
			"status":     onboardingInviteStatusUsed,
			"updated_at": now,
		}).Error; err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("邀请链接次数已用完")
	}
	if time.Now().After(link.ExpiresAt) {
		now := time.Now()
		if err := tx.Model(&repository.OnboardingInviteLink{}).Where("id = ?", link.ID).Updates(map[string]interface{}{
			"status":     onboardingInviteStatusExpired,
			"updated_at": now,
		}).Error; err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("邀请链接已过期")
	}

	req.Phone = strings.TrimSpace(req.Phone)
	req.Password = strings.TrimSpace(req.Password)
	if !isValidPhone(req.Phone) {
		return nil, fmt.Errorf("手机号格式不正确")
	}
	if len(req.Password) < 6 {
		return nil, fmt.Errorf("登录密码至少6位")
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("密码处理失败")
	}

	submission := repository.OnboardingInviteSubmission{
		InviteLinkID: &link.ID,
		InviteType:   link.InviteType,
		Source:       "invite",
		Phone:        req.Phone,
		EntityType:   link.InviteType,
		Status:       "created",
	}

	if link.InviteType == onboardingInviteTypeMerchant {
		req.MerchantName = strings.TrimSpace(req.MerchantName)
		req.OwnerName = strings.TrimSpace(req.OwnerName)
		req.BusinessLicenseImage = strings.TrimSpace(req.BusinessLicenseImage)

		if req.MerchantName == "" {
			return nil, fmt.Errorf("商户名不能为空")
		}
		if req.OwnerName == "" {
			return nil, fmt.Errorf("负责人不能为空")
		}
		if req.BusinessLicenseImage == "" {
			return nil, fmt.Errorf("请上传营业执照照片")
		}

		var merchantCount int64
		if err := tx.Model(&repository.Merchant{}).Where("phone = ?", req.Phone).Count(&merchantCount).Error; err != nil {
			return nil, err
		}
		if merchantCount > 0 {
			return nil, fmt.Errorf("手机号已存在")
		}

		merchant := repository.Merchant{
			Phone:                req.Phone,
			Name:                 req.MerchantName,
			OwnerName:            req.OwnerName,
			BusinessLicenseImage: req.BusinessLicenseImage,
			PasswordHash:         hash,
			IsOnline:             false,
		}
		if err := tx.Create(&merchant).Error; err != nil {
			return nil, err
		}
		if merchant.RoleID == 0 {
			if err := tx.Model(&repository.Merchant{}).Where("id = ?", merchant.ID).Update("role_id", int(merchant.ID)).Error; err != nil {
				return nil, err
			}
		}

		submission.MerchantName = req.MerchantName
		submission.OwnerName = req.OwnerName
		submission.BusinessLicenseImage = req.BusinessLicenseImage
		submission.EntityID = merchant.ID
	} else if link.InviteType == onboardingInviteTypeRider {
		req.Name = strings.TrimSpace(req.Name)
		req.IDCardImage = strings.TrimSpace(req.IDCardImage)
		req.EmergencyContactName = strings.TrimSpace(req.EmergencyContactName)
		req.EmergencyContactPhone = strings.TrimSpace(req.EmergencyContactPhone)

		if req.Name == "" {
			return nil, fmt.Errorf("姓名不能为空")
		}
		if req.IDCardImage == "" {
			return nil, fmt.Errorf("请上传身份证照片")
		}
		if req.EmergencyContactName == "" {
			return nil, fmt.Errorf("紧急联系人不能为空")
		}
		if !isValidPhone(req.EmergencyContactPhone) {
			return nil, fmt.Errorf("紧急联系人电话格式不正确")
		}

		var riderCount int64
		if err := tx.Model(&repository.Rider{}).Where("phone = ?", req.Phone).Count(&riderCount).Error; err != nil {
			return nil, err
		}
		if riderCount > 0 {
			return nil, fmt.Errorf("手机号已存在")
		}

		rider := repository.Rider{
			Phone:                 req.Phone,
			Name:                  req.Name,
			PasswordHash:          hash,
			IsOnline:              false,
			IDCardFront:           req.IDCardImage,
			EmergencyContactName:  req.EmergencyContactName,
			EmergencyContactPhone: req.EmergencyContactPhone,
		}
		if err := tx.Create(&rider).Error; err != nil {
			return nil, err
		}
		if rider.RoleID == 0 {
			if err := tx.Model(&repository.Rider{}).Where("id = ?", rider.ID).Update("role_id", int(rider.ID)).Error; err != nil {
				return nil, err
			}
		}

		submission.RiderName = req.Name
		submission.IDCardImage = req.IDCardImage
		submission.EmergencyContactName = req.EmergencyContactName
		submission.EmergencyContactPhone = req.EmergencyContactPhone
		submission.EntityID = rider.ID
	} else if link.InviteType == onboardingInviteTypeOldUser {
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			return nil, fmt.Errorf("用户名不能为空")
		}

		var userCount int64
		if err := tx.Model(&repository.User{}).Where("phone = ?", req.Phone).Count(&userCount).Error; err != nil {
			return nil, err
		}
		if userCount > 0 {
			return nil, fmt.Errorf("手机号已存在")
		}

		user := repository.User{
			Phone:        req.Phone,
			Name:         req.Name,
			PasswordHash: hash,
			Type:         "customer",
		}
		if err := tx.Create(&user).Error; err != nil {
			return nil, err
		}
		if user.RoleID == 0 {
			if err := tx.Model(&repository.User{}).Where("id = ?", user.ID).Update("role_id", int(user.ID)).Error; err != nil {
				return nil, err
			}
		}

		submission.CustomerName = req.Name
		submission.EntityType = "customer"
		submission.EntityID = user.ID
	} else {
		return nil, fmt.Errorf("邀请类型不正确")
	}

	if err := tx.Create(&submission).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	update := map[string]interface{}{
		"status": gorm.Expr(
			"CASE WHEN used_count + 1 >= max_uses THEN ? ELSE ? END",
			onboardingInviteStatusUsed,
			onboardingInviteStatusPending,
		),
		"used_count":      gorm.Expr("used_count + 1"),
		"used_at":         now,
		"used_ip":         trimMax(ip, 64),
		"used_user_agent": trimMax(userAgent, 255),
		"submission_id":   submission.ID,
		"updated_at":      now,
	}
	result := tx.Model(&repository.OnboardingInviteLink{}).
		Where("id = ? AND status = ? AND used_count < max_uses", link.ID, onboardingInviteStatusPending).
		Updates(update)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, fmt.Errorf("邀请链接已失效或次数已用完")
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &submission, nil
}

func (s *OnboardingInviteService) ListSubmissions(ctx context.Context, inviteType string, limit, offset int) ([]repository.OnboardingInviteSubmission, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	query := s.db.WithContext(ctx).Model(&repository.OnboardingInviteSubmission{})
	if inviteType != "" {
		query = query.Where("invite_type = ?", strings.TrimSpace(inviteType))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var list []repository.OnboardingInviteSubmission
	if err := query.Order("id DESC").Limit(limit).Offset(offset).Find(&list).Error; err != nil {
		return nil, 0, err
	}

	return list, total, nil
}

func (s *OnboardingInviteService) expirePendingLinks(ctx context.Context) error {
	return s.expirePendingLinksTx(s.db.WithContext(ctx))
}

func (s *OnboardingInviteService) expirePendingLinksTx(tx *gorm.DB) error {
	return tx.Model(&repository.OnboardingInviteLink{}).
		Where("status = ? AND expires_at <= ?", onboardingInviteStatusPending, time.Now()).
		Updates(map[string]interface{}{
			"status":     onboardingInviteStatusExpired,
			"updated_at": time.Now(),
		}).Error
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func generateInviteToken(byteLen int) (string, error) {
	if byteLen <= 0 {
		byteLen = 24
	}
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashInviteToken(token string) string {
	token = strings.TrimSpace(token)
	if token == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func trimMax(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) <= max {
		return value
	}
	return value[:max]
}
