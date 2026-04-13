package admincli

import (
	"context"
	"crypto/rand"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	DefaultGeneratedPasswordLength = 20
	MinManualPasswordLength        = 12
)

type Selector struct {
	ID    uint
	Phone string
	UID   string
	TSID  string
}

func (s Selector) Count() int {
	count := 0
	if s.ID > 0 {
		count++
	}
	if strings.TrimSpace(s.Phone) != "" {
		count++
	}
	if strings.TrimSpace(s.UID) != "" {
		count++
	}
	if strings.TrimSpace(s.TSID) != "" {
		count++
	}
	return count
}

func (s Selector) Normalize() Selector {
	return Selector{
		ID:    s.ID,
		Phone: strings.TrimSpace(s.Phone),
		UID:   strings.TrimSpace(s.UID),
		TSID:  strings.TrimSpace(s.TSID),
	}
}

func (s Selector) ValidateSingle() error {
	if s.Count() == 0 {
		return fmt.Errorf("请至少提供一个管理员选择器")
	}
	if s.Count() > 1 {
		return fmt.Errorf("请只提供一个管理员选择器：--id / --phone / --uid / --tsid 其中之一")
	}
	return nil
}

func LoadEnvFiles(explicit string) {
	candidates := make([]string, 0, 4)
	if strings.TrimSpace(explicit) != "" {
		candidates = append(candidates, strings.TrimSpace(explicit))
	}
	candidates = append(candidates, ".env", "backend/go/.env", "backend/docker/.deploy.runtime.env")

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if _, err := os.Stat(candidate); err == nil {
			_ = godotenv.Overload(candidate)
		}
	}
}

func BuildDatabaseConfig() *config.Config {
	return &config.Config{
		Env: getEnv("ENV", getEnv("NODE_ENV", "development")),
		Database: config.DatabaseConfig{
			Host:            getEnv("DB_HOST", "127.0.0.1"),
			Port:            getEnv("DB_PORT", "5432"),
			User:            getEnv("DB_USER", getEnv("POSTGRES_USER", "yuexiang_user")),
			Password:        getEnv("DB_PASSWORD", getEnv("POSTGRES_PASSWORD", "yuexiang_password")),
			DBName:          getEnv("DB_NAME", getEnv("POSTGRES_DB", "yuexiang")),
			Driver:          strings.ToLower(strings.TrimSpace(getEnv("DB_DRIVER", "postgres"))),
			DSN:             strings.TrimSpace(os.Getenv("DB_DSN")),
			MaxOpenConns:    5,
			MaxIdleConns:    5,
			ConnMaxLifetime: time.Hour,
			ConnMaxIdleTime: 30 * time.Minute,
		},
	}
}

func OpenDB() (*gorm.DB, error) {
	db, err := repository.InitDB(BuildDatabaseConfig())
	if err != nil {
		return nil, err
	}
	if err := idkit.Bootstrap(db); err != nil {
		return nil, err
	}
	return db, nil
}

func IsValidPhone(phone string) bool {
	if len(phone) != 11 {
		return false
	}
	if phone[0] != '1' {
		return false
	}
	for _, ch := range phone {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return true
}

func NormalizeAdminType(value string) (string, error) {
	text := strings.ToLower(strings.TrimSpace(value))
	if text == "" {
		return "super_admin", nil
	}
	if text != "admin" && text != "super_admin" {
		return "", fmt.Errorf("管理员类型只能是 admin 或 super_admin")
	}
	return text, nil
}

func ValidateManualPassword(password string) error {
	password = strings.TrimSpace(password)
	if password == "" {
		return fmt.Errorf("新密码不能为空")
	}
	if len(password) < MinManualPasswordLength {
		return fmt.Errorf("手动指定的新密码至少需要 %d 位", MinManualPasswordLength)
	}
	if password == "123456" {
		return fmt.Errorf("禁止使用默认弱密码 123456")
	}

	categoryCount := 0
	if containsRange(password, 'a', 'z') {
		categoryCount++
	}
	if containsRange(password, 'A', 'Z') {
		categoryCount++
	}
	if containsRange(password, '0', '9') {
		categoryCount++
	}
	if containsSymbol(password) {
		categoryCount++
	}
	if categoryCount < 3 {
		return fmt.Errorf("手动指定的新密码至少需要同时包含大写字母、小写字母、数字、符号中的三类")
	}
	return nil
}

func GenerateSecurePassword(length int) (string, error) {
	if length < 16 {
		length = 16
	}

	const lower = "abcdefghijkmnopqrstuvwxyz"
	const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
	const digits = "23456789"
	const symbols = "!@#$%^&*()-_=+[]{}"
	const all = lower + upper + digits + symbols

	requiredPools := []string{lower, upper, digits, symbols}
	buffer := make([]byte, 0, length)
	for _, pool := range requiredPools {
		ch, err := randomChar(pool)
		if err != nil {
			return "", fmt.Errorf("生成安全密码失败: %w", err)
		}
		buffer = append(buffer, ch)
	}

	for len(buffer) < length {
		ch, err := randomChar(all)
		if err != nil {
			return "", fmt.Errorf("生成安全密码失败: %w", err)
		}
		buffer = append(buffer, ch)
	}

	if err := shuffleBytes(buffer); err != nil {
		return "", fmt.Errorf("生成安全密码失败: %w", err)
	}
	return string(buffer), nil
}

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func ListAdmins(ctx context.Context, db *gorm.DB) ([]repository.Admin, error) {
	var admins []repository.Admin
	if err := db.WithContext(ctx).Order("created_at DESC").Find(&admins).Error; err != nil {
		return nil, err
	}
	return admins, nil
}

func FindAdmin(ctx context.Context, db *gorm.DB, selector Selector) (*repository.Admin, error) {
	normalized := selector.Normalize()
	if err := normalized.ValidateSingle(); err != nil {
		return nil, err
	}

	query := db.WithContext(ctx).Model(&repository.Admin{})
	switch {
	case normalized.ID > 0:
		query = query.Where("id = ?", normalized.ID)
	case normalized.Phone != "":
		query = query.Where("phone = ?", normalized.Phone)
	case normalized.UID != "":
		query = query.Where("uid = ?", normalized.UID)
	case normalized.TSID != "":
		query = query.Where("tsid = ?", normalized.TSID)
	}

	var admin repository.Admin
	if err := query.First(&admin).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("未找到匹配的管理员账号")
		}
		return nil, err
	}
	return &admin, nil
}

func CreateAdmin(ctx context.Context, db *gorm.DB, phone, name, password, adminType string) (*repository.Admin, error) {
	phone = strings.TrimSpace(phone)
	name = strings.TrimSpace(name)
	password = strings.TrimSpace(password)

	if !IsValidPhone(phone) {
		return nil, fmt.Errorf("手机号格式不正确")
	}
	if name == "" {
		return nil, fmt.Errorf("管理员姓名不能为空")
	}
	if err := ValidateManualPassword(password); err != nil {
		return nil, err
	}
	normalizedType, err := NormalizeAdminType(adminType)
	if err != nil {
		return nil, err
	}

	var count int64
	if err := db.WithContext(ctx).Model(&repository.Admin{}).Where("phone = ?", phone).Count(&count).Error; err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, fmt.Errorf("手机号已存在")
	}

	hash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}

	admin := repository.Admin{
		Phone:        phone,
		Name:         name,
		PasswordHash: hash,
		Type:         normalizedType,
	}
	if err := db.WithContext(ctx).Create(&admin).Error; err != nil {
		return nil, err
	}
	return &admin, nil
}

func UpdateAdmin(ctx context.Context, db *gorm.DB, selector Selector, phone, name, adminType string) (*repository.Admin, error) {
	admin, err := FindAdmin(ctx, db, selector)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if phone = strings.TrimSpace(phone); phone != "" {
		if !IsValidPhone(phone) {
			return nil, fmt.Errorf("手机号格式不正确")
		}
		var count int64
		if err := db.WithContext(ctx).
			Model(&repository.Admin{}).
			Where("phone = ? AND id <> ?", phone, admin.ID).
			Count(&count).Error; err != nil {
			return nil, err
		}
		if count > 0 {
			return nil, fmt.Errorf("手机号已存在")
		}
		updates["phone"] = phone
	}
	if name = strings.TrimSpace(name); name != "" {
		updates["name"] = name
	}
	if adminType = strings.TrimSpace(adminType); adminType != "" {
		normalizedType, typeErr := NormalizeAdminType(adminType)
		if typeErr != nil {
			return nil, typeErr
		}
		updates["type"] = normalizedType
	}
	if len(updates) == 0 {
		return nil, fmt.Errorf("没有需要更新的字段")
	}

	if err := db.WithContext(ctx).Model(&repository.Admin{}).Where("id = ?", admin.ID).Updates(updates).Error; err != nil {
		return nil, err
	}
	return FindAdmin(ctx, db, Selector{ID: admin.ID})
}

func ResetAdminPassword(ctx context.Context, db *gorm.DB, selector Selector, newPassword string) (*repository.Admin, error) {
	admin, err := FindAdmin(ctx, db, selector)
	if err != nil {
		return nil, err
	}
	if err := ValidateManualPassword(newPassword); err != nil {
		return nil, err
	}
	hash, err := HashPassword(newPassword)
	if err != nil {
		return nil, err
	}
	if err := db.WithContext(ctx).Model(&repository.Admin{}).Where("id = ?", admin.ID).Update("password_hash", hash).Error; err != nil {
		return nil, err
	}
	return FindAdmin(ctx, db, Selector{ID: admin.ID})
}

func DeleteAdmin(ctx context.Context, db *gorm.DB, selector Selector) error {
	admin, err := FindAdmin(ctx, db, selector)
	if err != nil {
		return err
	}

	var count int64
	if err := db.WithContext(ctx).Model(&repository.Admin{}).Count(&count).Error; err != nil {
		return err
	}
	if count <= 1 {
		return fmt.Errorf("系统至少需要保留一个管理员账号")
	}

	return db.WithContext(ctx).Delete(&repository.Admin{}, admin.ID).Error
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func containsRange(value string, min, max rune) bool {
	for _, r := range value {
		if r >= min && r <= max {
			return true
		}
	}
	return false
}

func containsSymbol(value string) bool {
	for _, r := range value {
		if (r >= 33 && r <= 47) || (r >= 58 && r <= 64) || (r >= 91 && r <= 96) || (r >= 123 && r <= 126) {
			return true
		}
	}
	return false
}

func randomChar(pool string) (byte, error) {
	if len(pool) == 0 {
		return 0, fmt.Errorf("empty pool")
	}
	index, err := randomIndex(len(pool))
	if err != nil {
		return 0, err
	}
	return pool[index], nil
}

func shuffleBytes(values []byte) error {
	for i := len(values) - 1; i > 0; i-- {
		j, err := randomIndex(i + 1)
		if err != nil {
			return err
		}
		values[i], values[j] = values[j], values[i]
	}
	return nil
}

func randomIndex(limit int) (int, error) {
	if limit <= 0 {
		return 0, fmt.Errorf("invalid limit")
	}
	var b [1]byte
	max := 256 - (256 % limit)
	for {
		if _, err := rand.Read(b[:]); err != nil {
			return 0, err
		}
		if int(b[0]) < max {
			return int(b[0]) % limit, nil
		}
	}
}

func MustParseUint(value string) uint {
	parsed, _ := strconv.ParseUint(strings.TrimSpace(value), 10, 64)
	return uint(parsed)
}

