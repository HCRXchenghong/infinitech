package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const defaultResetPassword = "123456"

func main() {
	var (
		adminID   = flag.Uint("id", 0, "Admin legacy ID")
		phone     = flag.String("phone", "", "Admin phone")
		uid       = flag.String("uid", "", "Admin UID")
		tsid      = flag.String("tsid", "", "Admin TSID")
		password  = flag.String("password", defaultResetPassword, "New admin password")
		listOnly  = flag.Bool("list", false, "List admins only")
		envFile   = flag.String("env-file", "", "Optional .env file to load first")
	)
	flag.Parse()

	loadEnvFiles(strings.TrimSpace(*envFile))

	db, err := repository.InitDB(buildDatabaseConfig())
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	if *listOnly || !hasSelector(*adminID, *phone, *uid, *tsid) {
		if err := listAdmins(db); err != nil {
			log.Fatalf("列出管理员失败: %v", err)
		}
		if !hasSelector(*adminID, *phone, *uid, *tsid) {
			fmt.Println("\n提示：如需重置密码，可执行：")
			fmt.Println("  go run ./scripts/reset-admin-password.go --phone 13800138000")
			fmt.Println("  go run ./scripts/reset-admin-password.go --phone 13800138000 --password 新密码123")
		}
		return
	}

	admin, err := findAdmin(db, *adminID, strings.TrimSpace(*phone), strings.TrimSpace(*uid), strings.TrimSpace(*tsid))
	if err != nil {
		log.Fatalf("查找管理员失败: %v", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(strings.TrimSpace(*password)), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("生成密码哈希失败: %v", err)
	}

	if err := db.Model(&repository.Admin{}).
		Where("id = ?", admin.ID).
		Update("password_hash", string(hash)).
		Error; err != nil {
		log.Fatalf("重置管理员密码失败: %v", err)
	}

	fmt.Printf("管理员密码已重置成功。\n")
	fmt.Printf("登录手机号: %s\n", admin.Phone)
	fmt.Printf("管理员姓名: %s\n", admin.Name)
	fmt.Printf("新密码: %s\n", strings.TrimSpace(*password))
}

func hasSelector(id uint, phone, uid, tsid string) bool {
	return id > 0 || strings.TrimSpace(phone) != "" || strings.TrimSpace(uid) != "" || strings.TrimSpace(tsid) != ""
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

func listAdmins(db *gorm.DB) error {
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
		fmt.Printf("- ID=%d UID=%s TSID=%s 手机号=%s 姓名=%s 类型=%s\n",
			admin.ID,
			safeValue(admin.UID),
			safeValue(admin.TSID),
			safeValue(admin.Phone),
			safeValue(admin.Name),
			safeValue(admin.Type),
		)
	}

	return nil
}

func findAdmin(db *gorm.DB, id uint, phone, uid, tsid string) (*repository.Admin, error) {
	var admin repository.Admin
	query := db.Model(&repository.Admin{})

	switch {
	case id > 0:
		query = query.Where("id = ?", id)
	case phone != "":
		query = query.Where("phone = ?", phone)
	case uid != "":
		query = query.Where("uid = ?", uid)
	case tsid != "":
		query = query.Where("tsid = ?", tsid)
	default:
		return nil, fmt.Errorf("请至少提供 --id、--phone、--uid、--tsid 其中一个参数")
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
