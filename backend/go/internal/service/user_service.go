package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
)

type UserService struct {
	repo repository.UserRepository
	auth *AuthService
}

func NewUserService(repo repository.UserRepository, auth *AuthService) *UserService {
	return &UserService{
		repo: repo,
		auth: auth,
	}
}

func (s *UserService) GetUser(ctx context.Context, id string) (interface{}, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, fmt.Errorf("invalid user id")
	}

	if resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "users", id); err == nil {
		user, err := s.repo.GetByID(ctx, resolvedID)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"id":       user.UID,
			"phone":    user.Phone,
			"name":     user.Name,
			"nickname": user.Name,
			"role_id":  user.RoleID,
		}, nil
	}

	user, err := s.repo.GetByPhone(ctx, id)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id":       user.UID,
		"phone":    user.Phone,
		"name":     user.Name,
		"nickname": user.Name,
		"role_id":  user.RoleID,
	}, nil
}

func (s *UserService) ChangePhone(ctx context.Context, id, oldPhone, oldCode, newPhone, newCode string) (map[string]interface{}, error) {
	if s.repo == nil || s.repo.DB() == nil {
		return map[string]interface{}{
			"success": false,
			"error":   "服务暂不可用，请稍后重试",
		}, fmt.Errorf("db not ready")
	}
	if s.auth == nil {
		return map[string]interface{}{
			"success": false,
			"error":   "服务暂不可用，请稍后重试",
		}, fmt.Errorf("auth service not ready")
	}

	normalizedID := strings.TrimSpace(id)
	normalizedOldPhone := strings.TrimSpace(oldPhone)
	normalizedOldCode := strings.TrimSpace(oldCode)
	normalizedNewPhone := strings.TrimSpace(newPhone)
	normalizedNewCode := strings.TrimSpace(newCode)

	if normalizedID == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "无效用户",
		}, fmt.Errorf("invalid user id")
	}
	if !isValidPhone(normalizedOldPhone) || !isValidPhone(normalizedNewPhone) {
		return map[string]interface{}{
			"success": false,
			"error":   "手机号格式不正确",
		}, fmt.Errorf("invalid phone format")
	}
	if normalizedOldCode == "" || normalizedNewCode == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "验证码不能为空",
		}, fmt.Errorf("missing code")
	}
	if normalizedOldPhone == normalizedNewPhone {
		return map[string]interface{}{
			"success": false,
			"error":   "新手机号不能与原手机号相同",
		}, fmt.Errorf("same phone")
	}

	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "users", normalizedID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "无效用户",
		}, fmt.Errorf("resolve user id failed: %w", err)
	}

	user, err := s.repo.GetByID(ctx, resolvedID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "用户不存在",
		}, err
	}
	if strings.TrimSpace(user.Phone) != normalizedOldPhone {
		return map[string]interface{}{
			"success": false,
			"error":   "原手机号与当前账号不匹配",
		}, fmt.Errorf("old phone mismatch")
	}

	oldOK, err := VerifySMSCodeWithFallback(ctx, s.repo.DB(), nil, "change_phone_verify", normalizedOldPhone, normalizedOldCode, true)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "验证码服务异常，请稍后重试",
		}, err
	}
	if !oldOK {
		return map[string]interface{}{
			"success": false,
			"error":   "原手机号验证码错误或已过期",
		}, fmt.Errorf("invalid old phone code")
	}

	newOK, err := VerifySMSCodeWithFallback(ctx, s.repo.DB(), nil, "change_phone_new", normalizedNewPhone, normalizedNewCode, true)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "验证码服务异常，请稍后重试",
		}, err
	}
	if !newOK {
		return map[string]interface{}{
			"success": false,
			"error":   "新手机号验证码错误或已过期",
		}, fmt.Errorf("invalid new phone code")
	}

	if existing, err := s.repo.GetByPhone(ctx, normalizedNewPhone); err == nil && existing != nil && existing.ID != user.ID {
		return map[string]interface{}{
			"success": false,
			"error":   "该手机号已被使用",
		}, fmt.Errorf("phone already exists")
	}

	user.Phone = normalizedNewPhone
	if err := s.repo.Update(ctx, user); err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "修改失败",
		}, err
	}

	token, refreshToken, expiresIn, err := s.auth.IssueTokenPair(user.Phone, int64(user.ID))
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   "签发登录凭证失败",
		}, err
	}

	return map[string]interface{}{
		"success":      true,
		"message":      "手机号修改成功",
		"token":        token,
		"refreshToken": refreshToken,
		"expiresIn":    expiresIn,
		"user": map[string]interface{}{
			"id":       user.UID,
			"phone":    user.Phone,
			"name":     user.Name,
			"nickname": user.Name,
			"role_id":  user.RoleID,
		},
	}, nil
}
