package repository

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/config"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitDB(cfg *config.Config) (*gorm.DB, error) {
	var (
		db  *gorm.DB
		err error
	)

	driver := strings.ToLower(strings.TrimSpace(cfg.Database.Driver))
	dsn := strings.TrimSpace(cfg.Database.DSN)

	switch driver {
	case "sqlite":
		dbPath := dsn
		if dbPath == "" {
			dbPath = "data/yuexiang.db"
		}

		dbDir := filepath.Dir(dbPath)
		if err := os.MkdirAll(dbDir, 0o755); err != nil {
			return nil, fmt.Errorf("failed to create database directory: %w", err)
		}

		db, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})

	case "mysql":
		if dsn == "" {
			dsnWithoutDB := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
				cfg.Database.User,
				cfg.Database.Password,
				cfg.Database.Host,
				cfg.Database.Port,
			)

			tempDB, tempErr := gorm.Open(mysql.Open(dsnWithoutDB), &gorm.Config{})
			if tempErr == nil {
				tempDB.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", cfg.Database.DBName))
			}

			dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
				cfg.Database.User,
				cfg.Database.Password,
				cfg.Database.Host,
				cfg.Database.Port,
				cfg.Database.DBName,
			)
		}
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})

	case "postgres":
		if dsn == "" {
			dsn = fmt.Sprintf(
				"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai",
				cfg.Database.Host,
				cfg.Database.User,
				cfg.Database.Password,
				cfg.Database.DBName,
				cfg.Database.Port,
			)
		}
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

	default:
		return nil, fmt.Errorf("unsupported database driver: %s (supported: sqlite, mysql, postgres)", cfg.Database.Driver)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB handle: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.Database.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.Database.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.Database.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(cfg.Database.ConnMaxIdleTime)

	log.Printf(
		"Database connected successfully (driver=%s, max_open=%d, max_idle=%d)",
		driver,
		cfg.Database.MaxOpenConns,
		cfg.Database.MaxIdleConns,
	)
	return db, nil
}
