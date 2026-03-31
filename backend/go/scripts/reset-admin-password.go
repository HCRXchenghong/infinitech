package main

import (
	"bufio"
	"crypto/rand"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	defaultGeneratedPasswordLength = 20
	minManualPasswordLength        = 12
)

type adminSelector struct {
	ID    uint
	Phone string
	UID   string
	TSID  string
}

func (s adminSelector) count() int {
	count := 0
	if s.ID > 0 {
		count++
	}
	if s.Phone != "" {
		count++
	}
	if s.UID != "" {
		count++
	}
	if s.TSID != "" {
		count++
	}
	return count
}

func (s adminSelector) hasAny() bool {
	return s.count() > 0
}

func main() {
	var (
		adminID        = flag.Uint("id", 0, "管理员 legacy ID")
		phone          = flag.String("phone", "", "管理员手机号")
		uid            = flag.String("uid", "", "管理员 UID")
		tsid           = flag.String("tsid", "", "管理员 TSID")
		password       = flag.String("password", "", "新的管理员密码，不建议直接写在命令历史里")
		passwordStdin  = flag.Bool("password-stdin", false, "从标准输入读取新的管理员密码")
		generate       = flag.Bool("generate", false, "自动生成一次性高强度临时密码")
		passwordLength = flag.Int("password-length", defaultGeneratedPasswordLength, "自动生成密码长度")
		confirm        = flag.String("confirm", "", "执行重置前再次确认目标管理员的 ID / UID / TSID / 手机号")
		yes            = flag.Bool("yes", false, "确认执行密码重置")
		listOnly       = flag.Bool("list", false, "仅列出管理员账号")
		showSensitive  = flag.Bool("show-sensitive", false, "列出管理员时显示完整手机号和姓名")
		envFile        = flag.String("env-file", "", "优先加载的 .env 文件")
	)
	flag.Parse()

	loadEnvFiles(strings.TrimSpace(*envFile))

	db, err := repository.InitDB(buildDatabaseConfig())
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	selector := adminSelector{
		ID:    *adminID,
		Phone: strings.TrimSpace(*phone),
		UID:   strings.TrimSpace(*uid),
		TSID:  strings.TrimSpace(*tsid),
	}

	if *listOnly || !selector.hasAny() {
		if err := listAdmins(db, *showSensitive); err != nil {
			log.Fatalf("列出管理员失败: %v", err)
		}
		if !selector.hasAny() {
			printUsageHints()
		}
		return
	}

	if selector.count() != 1 {
		log.Fatal("为避免误操作，请只提供一个选择器：--id / --phone / --uid / --tsid 其中之一")
	}

	admin, err := findAdmin(db, selector)
	if err != nil {
		log.Fatalf("查找管理员失败: %v", err)
	}

	if !*yes {
		log.Fatalf(
			"出于安全考虑，重置管理员密码必须显式带上 --yes。目标管理员：ID=%d UID=%s 手机号=%s",
			admin.ID,
			safeValue(admin.UID),
			maskPhone(admin.Phone),
		)
	}

	if !confirmationMatches(admin, strings.TrimSpace(*confirm)) {
		log.Fatalf(
			"出于安全考虑，必须通过 --confirm 再次确认目标管理员。可填该管理员当前的 ID / UID / TSID / 手机号。目标：ID=%d UID=%s TSID=%s 手机号=%s",
			admin.ID,
			safeValue(admin.UID),
			safeValue(admin.TSID),
			maskPhone(admin.Phone),
		)
	}

	resolvedPassword, generatedPassword, err := resolvePassword(strings.TrimSpace(*password), *passwordStdin, *generate, *passwordLength)
	if err != nil {
		log.Fatalf("准备新密码失败: %v", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(resolvedPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("生成密码哈希失败: %v", err)
	}

	if err := db.Model(&repository.Admin{}).
		Where("id = ?", admin.ID).
		Update("password_hash", string(hash)).
		Error; err != nil {
		log.Fatalf("重置管理员密码失败: %v", err)
	}

	fmt.Println("管理员密码已重置成功。")
	fmt.Printf("目标管理员 ID: %d\n", admin.ID)
	fmt.Printf("目标管理员 UID: %s\n", safeValue(admin.UID))
	fmt.Printf("登录手机号: %s\n", maskPhone(admin.Phone))
	fmt.Printf("管理员姓名: %s\n", maskName(admin.Name))
	fmt.Printf("新密码: %s\n", resolvedPassword)
	if generatedPassword {
		fmt.Println("说明：本次使用的是自动生成的一次性高强度临时密码。")
	}
	fmt.Println("请在管理员重新登录后立即改成真实且长期使用的密码。")
}

func printUsageHints() {
	fmt.Println("\n提示：如需重置管理员密码，请先通过 --list 找到目标管理员，再显式确认。")
	fmt.Println("推荐做法：默认使用自动生成的一次性临时密码。")
	fmt.Println("示例：")
	fmt.Println("  go run ./scripts/reset-admin-password.go --list")
	fmt.Println("  go run ./scripts/reset-admin-password.go --phone 13800138000 --confirm 13800138000 --generate --yes")
	fmt.Println("  echo 强密码示例123!Abc | go run ./scripts/reset-admin-password.go --uid ADMIN_UID --confirm ADMIN_UID --password-stdin --yes")
}

func resolvePassword(manual string, passwordStdin, generate bool, length int) (string, bool, error) {
	modeCount := 0
	if manual != "" {
		modeCount++
	}
	if passwordStdin {
		modeCount++
	}
	if generate {
		modeCount++
	}
	if modeCount > 1 {
		return "", false, fmt.Errorf("--password、--password-stdin、--generate 只能三选一")
	}

	if manual != "" {
		if err := validateManualPassword(manual); err != nil {
			return "", false, err
		}
		return manual, false, nil
	}

	if passwordStdin {
		reader := bufio.NewReader(os.Stdin)
		line, err := reader.ReadString('\n')
		if err != nil && err != io.EOF {
			return "", false, fmt.Errorf("从标准输入读取密码失败: %w", err)
		}
		value := strings.TrimSpace(line)
		if err := validateManualPassword(value); err != nil {
			return "", false, err
		}
		return value, false, nil
	}

	if length <= 0 {
		length = defaultGeneratedPasswordLength
	}
	password, err := generateSecurePassword(length)
	if err != nil {
		return "", false, err
	}
	return password, true, nil
}

func validateManualPassword(password string) error {
	password = strings.TrimSpace(password)
	if password == "" {
		return fmt.Errorf("新密码不能为空")
	}
	if len(password) < minManualPasswordLength {
		return fmt.Errorf("手动指定的新密码至少需要 %d 位", minManualPasswordLength)
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

func generateSecurePassword(length int) (string, error) {
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

func confirmationMatches(admin *repository.Admin, confirm string) bool {
	confirm = strings.TrimSpace(confirm)
	if confirm == "" {
		return false
	}
	return confirm == strconv.FormatUint(uint64(admin.ID), 10) ||
		confirm == strings.TrimSpace(admin.Phone) ||
		confirm == strings.TrimSpace(admin.UID) ||
		confirm == strings.TrimSpace(admin.TSID)
}

func loadEnvFiles(explicit string) {
	candidates := make([]string, 0, 3)
	if explicit != "" {
		candidates = append(candidates, explicit)
	}
	candidates = append(candidates, ".env", "backend/go/.env")

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if _, err := os.Stat(candidate); err == nil {
			_ = godotenv.Overload(candidate)
		}
	}
}

func buildDatabaseConfig() *config.Config {
	return &config.Config{
		Env: getEnv("ENV", getEnv("NODE_ENV", "development")),
		Database: config.DatabaseConfig{
			Host:            getEnv("DB_HOST", "127.0.0.1"),
			Port:            getEnv("DB_PORT", "5432"),
			User:            getEnv("DB_USER", "yuexiang_user"),
			Password:        getEnv("DB_PASSWORD", "yuexiang_password"),
			DBName:          getEnv("DB_NAME", "yuexiang"),
			Driver:          strings.ToLower(strings.TrimSpace(getEnv("DB_DRIVER", "postgres"))),
			DSN:             strings.TrimSpace(os.Getenv("DB_DSN")),
			MaxOpenConns:    5,
			MaxIdleConns:    5,
			ConnMaxLifetime: time.Hour,
			ConnMaxIdleTime: 30 * time.Minute,
		},
	}
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func listAdmins(db *gorm.DB, showSensitive bool) error {
	var admins []repository.Admin
	if err := db.Order("created_at DESC").Find(&admins).Error; err != nil {
		return err
	}

	if len(admins) == 0 {
		fmt.Println("当前数据库里没有管理员账号。")
		return nil
	}

	fmt.Printf("当前共有 %d 个管理员：\n", len(admins))
	for _, admin := range admins {
		phone := maskPhone(admin.Phone)
		name := maskName(admin.Name)
		if showSensitive {
			phone = safeValue(admin.Phone)
			name = safeValue(admin.Name)
		}
		fmt.Printf("- ID=%d UID=%s TSID=%s 手机号=%s 姓名=%s 类型=%s\n",
			admin.ID,
			safeValue(admin.UID),
			safeValue(admin.TSID),
			phone,
			name,
			safeValue(admin.Type),
		)
	}

	if !showSensitive {
		fmt.Println("提示：当前列表默认做了脱敏处理。如确需查看完整手机号和姓名，请显式加 --show-sensitive。")
	}
	return nil
}

func findAdmin(db *gorm.DB, selector adminSelector) (*repository.Admin, error) {
	var admin repository.Admin
	query := db.Model(&repository.Admin{})

	switch {
	case selector.ID > 0:
		query = query.Where("id = ?", selector.ID)
	case selector.Phone != "":
		query = query.Where("phone = ?", selector.Phone)
	case selector.UID != "":
		query = query.Where("uid = ?", selector.UID)
	case selector.TSID != "":
		query = query.Where("tsid = ?", selector.TSID)
	default:
		return nil, fmt.Errorf("请至少提供一个管理员选择器")
	}

	if err := query.First(&admin).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("未找到匹配的管理员账号")
		}
		return nil, err
	}

	return &admin, nil
}

func safeValue(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}
	return strings.TrimSpace(value)
}

func maskPhone(phone string) string {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return "-"
	}
	if len(phone) < 7 {
		return strings.Repeat("*", len(phone))
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}

func maskName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "-"
	}
	runes := []rune(name)
	if len(runes) == 1 {
		return string(runes[0]) + "*"
	}
	return string(runes[0]) + strings.Repeat("*", len(runes)-1)
}
