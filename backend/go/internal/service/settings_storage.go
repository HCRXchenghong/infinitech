package service

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func isMissingTableError(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(err.Error())
	return strings.Contains(lower, "no such table") || strings.Contains(lower, "doesn't exist")
}

func LoadJSONSetting(ctx context.Context, db *gorm.DB, key string, dest interface{}) error {
	if db == nil || dest == nil {
		return nil
	}

	var setting repository.Setting
	if err := db.WithContext(ctx).Where("key = ?", key).First(&setting).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil
		}
		if isMissingTableError(err) {
			return nil
		}
		return err
	}
	if setting.Value == "" {
		return nil
	}
	return json.Unmarshal([]byte(setting.Value), dest)
}
