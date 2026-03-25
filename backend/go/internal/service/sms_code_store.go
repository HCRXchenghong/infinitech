package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func smsCodeKey(scene, phone, code string) string {
	return fmt.Sprintf("sms:code:%s:%s:%s", scene, phone, code)
}

func smsRateLimitKey(scene, phone string) string {
	return fmt.Sprintf("sms:ratelimit:%s:%s", scene, phone)
}

// CheckSMSRateLimitWithFallback checks rate-limit via Redis first and falls back to DB.
func CheckSMSRateLimitWithFallback(ctx context.Context, db *gorm.DB, redisClient *redis.Client, scene, phone string, window time.Duration) (bool, error) {
	if redisClient != nil {
		exists, err := redisClient.Exists(ctx, smsRateLimitKey(scene, phone)).Result()
		if err == nil {
			return exists > 0, nil
		}
		log.Printf("⚠️ Redis rate-limit check failed, fallback to DB: %v", err)
	}

	if db == nil {
		return false, fmt.Errorf("db not ready")
	}

	var count int64
	cutoff := time.Now().Add(-window)
	if err := db.WithContext(ctx).
		Model(&repository.SMSVerificationCode{}).
		Where("scene = ? AND phone = ? AND created_at >= ?", scene, phone, cutoff).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// StoreSMSCodeWithFallback persists code in DB and best-effort writes to Redis.
func StoreSMSCodeWithFallback(
	ctx context.Context,
	db *gorm.DB,
	redisClient *redis.Client,
	scene, phone, code string,
	codeTTL, rateLimitTTL time.Duration,
) error {
	if db == nil {
		return fmt.Errorf("db not ready")
	}

	record := &repository.SMSVerificationCode{
		Scene:     scene,
		Phone:     phone,
		Code:      code,
		ExpiresAt: time.Now().Add(codeTTL),
	}
	if err := db.WithContext(ctx).Create(record).Error; err != nil {
		return err
	}

	if redisClient != nil {
		pipe := redisClient.Pipeline()
		pipe.Set(ctx, smsCodeKey(scene, phone, code), code, codeTTL)
		pipe.Set(ctx, smsRateLimitKey(scene, phone), "1", rateLimitTTL)
		if _, err := pipe.Exec(ctx); err != nil {
			log.Printf("⚠️ Redis write failed (ignored, DB already persisted): %v", err)
		}
	}

	return nil
}

// VerifySMSCodeWithFallback verifies code from DB source-of-truth and falls back to Redis compatibility.
func VerifySMSCodeWithFallback(ctx context.Context, db *gorm.DB, redisClient *redis.Client, scene, phone, code string, consume bool) (bool, error) {
	if db == nil {
		return false, fmt.Errorf("db not ready")
	}

	now := time.Now()
	var record repository.SMSVerificationCode
	err := db.WithContext(ctx).
		Where("scene = ? AND phone = ? AND code = ? AND consumed_at IS NULL AND expires_at > ?", scene, phone, code, now).
		Order("id DESC").
		First(&record).Error
	if err == nil {
		if consume {
			consumedAt := now
			if err := db.WithContext(ctx).
				Model(&repository.SMSVerificationCode{}).
				Where("id = ? AND consumed_at IS NULL", record.ID).
				Update("consumed_at", consumedAt).Error; err != nil {
				return false, err
			}
			if redisClient != nil {
				redisClient.Del(ctx, smsCodeKey(scene, phone, code))
			}
		}
		return true, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}

	// Compatibility fallback: support old codes that only existed in Redis.
	if redisClient != nil {
		exists, redisErr := redisClient.Exists(ctx, smsCodeKey(scene, phone, code)).Result()
		if redisErr != nil {
			log.Printf("⚠️ Redis verify fallback failed: %v", redisErr)
			return false, nil
		}
		if exists > 0 {
			if consume {
				redisClient.Del(ctx, smsCodeKey(scene, phone, code))
			}
			return true, nil
		}
	}

	return false, nil
}
