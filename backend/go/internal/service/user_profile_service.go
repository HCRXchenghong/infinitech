package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
)

type UserProfileUpdateInput struct {
	Nickname  string
	AvatarURL string
	HeaderBg  string
}

func buildUserPayload(user *repository.User) map[string]interface{} {
	if user == nil {
		return map[string]interface{}{}
	}

	name := strings.TrimSpace(user.Name)
	if name == "" {
		name = strings.TrimSpace(user.WechatNickname)
	}
	avatarURL := strings.TrimSpace(user.AvatarURL)
	if avatarURL == "" {
		avatarURL = strings.TrimSpace(user.WechatAvatar)
	}
	return map[string]interface{}{
		"id":         user.UID,
		"phone":      user.Phone,
		"name":       name,
		"nickname":   name,
		"role_id":    user.RoleID,
		"avatarUrl":  avatarURL,
		"headerBg":   strings.TrimSpace(user.HeaderBg),
		"avatarText": deriveAvatarText(name),
	}
}

func deriveAvatarText(name string) string {
	value := strings.TrimSpace(name)
	if value == "" {
		return "U"
	}
	runes := []rune(value)
	if len(runes) == 0 {
		return "U"
	}
	return strings.ToUpper(string(runes[0]))
}

func (s *UserService) GetUserView(ctx context.Context, id string) (map[string]interface{}, error) {
	normalizedID := strings.TrimSpace(id)
	if normalizedID == "" {
		return nil, fmt.Errorf("invalid user id")
	}

	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "users", normalizedID)
	if err != nil {
		user, phoneErr := s.repo.GetByPhone(ctx, normalizedID)
		if phoneErr != nil {
			return nil, phoneErr
		}
		return buildUserPayload(user), nil
	}

	user, err := s.repo.GetByID(ctx, resolvedID)
	if err != nil {
		return nil, err
	}
	return buildUserPayload(user), nil
}

func (s *UserService) UpdateProfile(ctx context.Context, id string, input UserProfileUpdateInput) (map[string]interface{}, error) {
	if s.repo == nil || s.repo.DB() == nil {
		return nil, fmt.Errorf("db not ready")
	}

	normalizedID := strings.TrimSpace(id)
	if normalizedID == "" {
		return nil, fmt.Errorf("invalid user id")
	}

	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "users", normalizedID)
	if err != nil {
		return nil, fmt.Errorf("resolve user id failed: %w", err)
	}

	user, err := s.repo.GetByID(ctx, resolvedID)
	if err != nil {
		return nil, err
	}

	nickname := strings.TrimSpace(input.Nickname)
	if nickname == "" {
		return nil, fmt.Errorf("nickname is required")
	}
	if len([]rune(nickname)) > 20 {
		return nil, fmt.Errorf("nickname too long")
	}

	avatarURL := strings.TrimSpace(input.AvatarURL)
	if len(avatarURL) > 255 {
		return nil, fmt.Errorf("avatarUrl too long")
	}

	headerBg := strings.TrimSpace(input.HeaderBg)
	if len(headerBg) > 255 {
		return nil, fmt.Errorf("headerBg too long")
	}

	user.Name = nickname
	user.AvatarURL = avatarURL
	user.HeaderBg = headerBg

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, err
	}

	return buildUserPayload(user), nil
}
