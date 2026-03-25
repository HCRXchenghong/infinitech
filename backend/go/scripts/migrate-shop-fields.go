//go:build script
// +build script

package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(".env"); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// 获取数据库路径
	dbPath := os.Getenv("DB_DSN")
	if dbPath == "" {
		dbPath = "data/yuexiang.db"
	}

	log.Printf("Connecting to database: %s", dbPath)

	// 连接数据库
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Connected to database successfully")

	// 1. 修改shops表结构
	log.Println("Migrating shops table...")

	// SQLite不支持IF NOT EXISTS，需要先检查列是否存在
	// 添加新字段
	db.Exec("ALTER TABLE shops ADD COLUMN order_type VARCHAR(20) DEFAULT '外卖类'")
	db.Exec("ALTER TABLE shops ADD COLUMN business_category VARCHAR(50) DEFAULT '美食'")
	db.Exec("ALTER TABLE shops ADD COLUMN background_image VARCHAR(500) DEFAULT ''")
	db.Exec("ALTER TABLE shops ADD COLUMN is_franchise INTEGER DEFAULT 0")
	db.Exec("ALTER TABLE shops ADD COLUMN employee_name VARCHAR(100) DEFAULT ''")
	db.Exec("ALTER TABLE shops ADD COLUMN employee_age INTEGER DEFAULT 0")
	db.Exec("ALTER TABLE shops ADD COLUMN employee_position VARCHAR(100) DEFAULT ''")
	db.Exec("ALTER TABLE shops ADD COLUMN id_card_front_image VARCHAR(500) DEFAULT ''")
	db.Exec("ALTER TABLE shops ADD COLUMN id_card_back_image VARCHAR(500) DEFAULT ''")
	db.Exec("ALTER TABLE shops ADD COLUMN id_card_expire_at DATETIME")
	db.Exec("ALTER TABLE shops ADD COLUMN health_cert_front_image VARCHAR(500) DEFAULT ''")
	db.Exec("ALTER TABLE shops ADD COLUMN health_cert_back_image VARCHAR(500) DEFAULT ''")
	db.Exec("ALTER TABLE shops ADD COLUMN health_cert_expire_at DATETIME")
	db.Exec("ALTER TABLE shops ADD COLUMN employment_start_at DATETIME")
	db.Exec("ALTER TABLE shops ADD COLUMN employment_end_at DATETIME")

	// 将旧的category字段数据迁移到business_category（如果存在）
	db.Exec("UPDATE shops SET business_category = category WHERE business_category = '美食' OR business_category IS NULL")

	log.Println("Shops table migration completed")

	// 2. 修改products表结构
	log.Println("Migrating products table...")

	db.Exec("ALTER TABLE products ADD COLUMN total_reviews INTEGER DEFAULT 0")

	log.Println("Products table migration completed")

	// 3. 创建featured_products表
	log.Println("Creating featured_products table...")

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS featured_products (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		product_id INTEGER NOT NULL,
		position INTEGER DEFAULT 0,
		is_active INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	if err := db.Exec(createTableSQL).Error; err != nil {
		log.Printf("Warning: Failed to create featured_products table: %v", err)
	} else {
		log.Println("Featured_products table created successfully")
	}

	// 创建索引
	db.Exec("CREATE INDEX IF NOT EXISTS idx_featured_products_product_id ON featured_products(product_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_featured_products_position ON featured_products(position)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_featured_products_is_active ON featured_products(is_active)")

	log.Println("All migrations completed successfully!")
}
