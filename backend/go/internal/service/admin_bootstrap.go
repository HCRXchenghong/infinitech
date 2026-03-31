package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func DefaultBootstrapAdminPhone() string {
	return defaultBootstrapAdminPhone
}

func DefaultBootstrapAdminName() string {
	return defaultBootstrapAdminName
}

func DefaultBootstrapAdminPassword() string {
	return defaultAdminPassword
}

func (s *AdminService) AdminRequiresBootstrapSetup(admin repository.Admin) bool {
	if strings.TrimSpace(admin.Phone) == defaultBootstrapAdminPhone {
		return true
	}
	return checkPassword(admin.PasswordHash, defaultAdminPassword)
}

func (s *AdminService) EnsureBootstrapAdmin(ctx context.Context) (*repository.Admin, bool, error) {
	var count int64
	if err := s.db.WithContext(ctx).Model(&repository.Admin{}).Count(&count).Error; err != nil {
		return nil, false, err
	}
	if count > 0 {
		return nil, false, nil
	}

	hash, err := hashPassword(defaultAdminPassword)
	if err != nil {
		return nil, false, err
	}

	admin := repository.Admin{
		Phone:        defaultBootstrapAdminPhone,
		Name:         defaultBootstrapAdminName,
		PasswordHash: hash,
		Type:         "super_admin",
	}
	if err := s.db.WithContext(ctx).Create(&admin).Error; err != nil {
		return nil, false, err
	}
	return &admin, true, nil
}

func (s *AdminService) CompleteBootstrapSetup(ctx context.Context, adminID uint, phone, name, newPassword string) (*AdminLoginResponse, int, error) {
	if adminID == 0 {
		return &AdminLoginResponse{Success: false, Error: "登录状态已失效，请重新登录"}, 401, ErrUnauthorized
	}

	phone = strings.TrimSpace(phone)
	name = strings.TrimSpace(name)
	newPassword = strings.TrimSpace(newPassword)

	if !isValidPhone(phone) {
		return &AdminLoginResponse{Success: false, Error: "请输入有效的管理员手机号"}, 400, fmt.Errorf("invalid admin phone")
	}
	if phone == defaultBootstrapAdminPhone {
		return &AdminLoginResponse{Success: false, Error: "请修改为真实的管理员手机号"}, 400, fmt.Errorf("bootstrap phone must be changed")
	}
	if name == "" {
		return &AdminLoginResponse{Success: false, Error: "请输入真实的管理员名称"}, 400, fmt.Errorf("admin name is required")
	}
	if len(newPassword) < 6 {
		return &AdminLoginResponse{Success: false, Error: "新密码至少需要 6 位"}, 400, fmt.Errorf("new password too short")
	}
	if newPassword == defaultAdminPassword {
		return &AdminLoginResponse{Success: false, Error: "新密码不能继续使用默认初始密码"}, 400, fmt.Errorf("new password must not equal default password")
	}

	var admin repository.Admin
	if err := s.db.WithContext(ctx).Where("id = ?", adminID).First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &AdminLoginResponse{Success: false, Error: "管理员不存在"}, 404, err
		}
		return &AdminLoginResponse{Success: false, Error: "查询管理员失败"}, 500, err
	}
	if !s.AdminRequiresBootstrapSetup(admin) {
		return &AdminLoginResponse{Success: false, Error: "当前管理员无需执行首次初始化"}, 400, fmt.Errorf("bootstrap setup already completed")
	}

	var count int64
	if err := s.db.WithContext(ctx).
		Model(&repository.Admin{}).
		Where("phone = ? AND id <> ?", phone, admin.ID).
		Count(&count).Error; err != nil {
		return &AdminLoginResponse{Success: false, Error: "校验管理员手机号失败"}, 500, err
	}
	if count > 0 {
		return &AdminLoginResponse{Success: false, Error: "该手机号已被其他管理员使用"}, 400, fmt.Errorf("admin phone already exists")
	}

	hash, err := hashPassword(newPassword)
	if err != nil {
		return &AdminLoginResponse{Success: false, Error: "生成新密码失败"}, 500, err
	}

	updates := map[string]interface{}{
		"phone":         phone,
		"name":          name,
		"password_hash": hash,
	}
	if err := s.db.WithContext(ctx).Model(&repository.Admin{}).Where("id = ?", admin.ID).Updates(updates).Error; err != nil {
		return &AdminLoginResponse{Success: false, Error: "首次初始化保存失败"}, 500, err
	}

	admin.Phone = phone
	admin.Name = name
	admin.PasswordHash = hash

	token, err := s.generateToken(admin)
	if err != nil {
		return &AdminLoginResponse{Success: false, Error: "生成新的登录凭证失败"}, 500, err
	}

	return &AdminLoginResponse{
		Success:             true,
		Token:               token,
		MustChangeBootstrap: false,
		User: map[string]interface{}{
			"id":                  admin.UID,
			"phone":               admin.Phone,
			"name":                admin.Name,
			"type":                admin.Type,
			"mustChangeBootstrap": false,
		},
	}, 200, nil
}
