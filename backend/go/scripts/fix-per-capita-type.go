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

	// SQLite不支持直接修改列类型，需要重建表
	log.Println("Fixing per_capita column type...")

	// 1. 创建临时表
	createTempTableSQL := `
	CREATE TABLE shops_temp AS SELECT * FROM shops;
	`
	if err := db.Exec(createTempTableSQL).Error; err != nil {
		log.Fatalf("Failed to create temp table: %v", err)
	}
	log.Println("Created temporary table")

	// 2. 删除原表
	if err := db.Exec("DROP TABLE shops").Error; err != nil {
		log.Fatalf("Failed to drop original table: %v", err)
	}
	log.Println("Dropped original table")

	// 3. 创建新表（per_capita改为DECIMAL类型）
	createNewTableSQL := `
	CREATE TABLE shops (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		merchant_id INTEGER,
		name TEXT NOT NULL,
		category TEXT DEFAULT '美食',
		cover_image TEXT,
		logo TEXT,
		rating DECIMAL(3,2) DEFAULT 5,
		monthly_sales INTEGER DEFAULT 0,
		per_capita DECIMAL(10,2) DEFAULT 0,
		announcement TEXT,
		address TEXT,
		phone TEXT,
		business_hours TEXT DEFAULT '09:00-22:00',
		tags TEXT,
		discounts TEXT,
		is_brand NUMERIC DEFAULT false,
		is_active NUMERIC DEFAULT true,
		min_price DECIMAL(10,2) DEFAULT 0,
		delivery_price DECIMAL(10,2) DEFAULT 0,
		delivery_time TEXT DEFAULT '30分钟',
		distance TEXT,
		created_at DATETIME,
		updated_at DATETIME,
		order_type VARCHAR(20) DEFAULT '外卖类',
		business_category VARCHAR(50) DEFAULT '美食',
		background_image VARCHAR(500) DEFAULT '',
		is_franchise INTEGER DEFAULT 0
	);
	`
	if err := db.Exec(createNewTableSQL).Error; err != nil {
		log.Fatalf("Failed to create new table: %v", err)
	}
	log.Println("Created new table with correct per_capita type")

	// 4. 从临时表复制数据
	copyDataSQL := `
	INSERT INTO shops SELECT * FROM shops_temp;
	`
	if err := db.Exec(copyDataSQL).Error; err != nil {
		log.Fatalf("Failed to copy data: %v", err)
	}
	log.Println("Copied data from temporary table")

	// 5. 删除临时表
	if err := db.Exec("DROP TABLE shops_temp").Error; err != nil {
		log.Printf("Warning: Failed to drop temp table: %v", err)
	} else {
		log.Println("Dropped temporary table")
	}

	// 6. 重建索引
	db.Exec("CREATE INDEX IF NOT EXISTS idx_shops_merchant_id ON shops(merchant_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_shops_business_category ON shops(business_category)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_shops_is_active ON shops(is_active)")
	log.Println("Recreated indexes")

	log.Println("Per_capita column type fixed successfully!")
}
