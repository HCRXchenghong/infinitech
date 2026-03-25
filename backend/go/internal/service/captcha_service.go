package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"html"
	"math/big"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const captchaCharset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

type CaptchaService struct {
	db *gorm.DB
}

func NewCaptchaService(db *gorm.DB) *CaptchaService {
	return &CaptchaService{db: db}
}

func (s *CaptchaService) Generate(ctx context.Context, sessionID string) (string, error) {
	if s.db == nil {
		return "", fmt.Errorf("db not ready")
	}

	normalizedSessionID := normalizeCaptchaSessionID(sessionID)
	if normalizedSessionID == "" {
		return "", fmt.Errorf("sessionId is required")
	}

	code, err := generateCaptchaCode(4)
	if err != nil {
		return "", err
	}

	expiresAt := time.Now().Add(5 * time.Minute)
	record := &repository.CaptchaChallenge{}
	if err := s.db.WithContext(ctx).
		Where("session_id = ?", normalizedSessionID).
		Assign(map[string]interface{}{
			"code":        code,
			"expires_at":  expiresAt,
			"consumed_at": nil,
		}).
		FirstOrCreate(record, &repository.CaptchaChallenge{SessionID: normalizedSessionID}).Error; err != nil {
		return "", err
	}

	return buildCaptchaSVG(code), nil
}

func (s *CaptchaService) Verify(ctx context.Context, sessionID, code string, consume bool) (bool, error) {
	if s.db == nil {
		return false, fmt.Errorf("db not ready")
	}

	normalizedSessionID := normalizeCaptchaSessionID(sessionID)
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	if normalizedSessionID == "" || normalizedCode == "" {
		return false, nil
	}

	var record repository.CaptchaChallenge
	if err := s.db.WithContext(ctx).
		Where("session_id = ? AND consumed_at IS NULL AND expires_at > ?", normalizedSessionID, time.Now()).
		Order("id DESC").
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	if !strings.EqualFold(strings.TrimSpace(record.Code), normalizedCode) {
		return false, nil
	}

	if consume {
		now := time.Now()
		if err := s.db.WithContext(ctx).
			Model(&repository.CaptchaChallenge{}).
			Where("id = ? AND consumed_at IS NULL", record.ID).
			Update("consumed_at", now).Error; err != nil {
			return false, err
		}
	}

	return true, nil
}

func normalizeCaptchaSessionID(sessionID string) string {
	value := strings.TrimSpace(sessionID)
	if len(value) > 128 {
		value = value[:128]
	}
	return value
}

func generateCaptchaCode(length int) (string, error) {
	if length <= 0 {
		length = 4
	}
	result := make([]byte, 0, length)
	for len(result) < length {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(captchaCharset))))
		if err != nil {
			return "", err
		}
		result = append(result, captchaCharset[n.Int64()])
	}
	return string(result), nil
}

func randomInt(max int64) int64 {
	if max <= 0 {
		return 0
	}
	n, err := rand.Int(rand.Reader, big.NewInt(max))
	if err != nil {
		return 0
	}
	return n.Int64()
}

func buildCaptchaSVG(code string) string {
	var builder strings.Builder
	builder.WriteString(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="42" viewBox="0 0 120 42">`)
	builder.WriteString(`<rect width="120" height="42" rx="8" fill="#f8fafc"/>`)

	for i := 0; i < 6; i++ {
		x1 := randomInt(120)
		y1 := randomInt(42)
		x2 := randomInt(120)
		y2 := randomInt(42)
		builder.WriteString(fmt.Sprintf(
			`<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="rgba(148,163,184,0.45)" stroke-width="1"/>`,
			x1, y1, x2, y2,
		))
	}

	for i, r := range []rune(code) {
		x := 16 + i*22
		y := 28 + int(randomInt(5))
		rotate := int(randomInt(21)) - 10
		fill := []string{"#0f172a", "#1d4ed8", "#047857", "#b45309"}[i%4]
		builder.WriteString(fmt.Sprintf(
			`<text x="%d" y="%d" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="%s" transform="rotate(%d %d %d)">%s</text>`,
			x, y, fill, rotate, x, y, html.EscapeString(string(r)),
		))
	}

	for i := 0; i < 10; i++ {
		cx := randomInt(120)
		cy := randomInt(42)
		radius := 1 + randomInt(3)
		builder.WriteString(fmt.Sprintf(
			`<circle cx="%d" cy="%d" r="%d" fill="rgba(59,130,246,0.18)"/>`,
			cx, cy, radius,
		))
	}

	builder.WriteString(`</svg>`)
	return builder.String()
}
