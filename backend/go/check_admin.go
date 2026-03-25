package main

import (
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Admin struct {
	ID           uint   `gorm:"primaryKey"`
	Phone        string `gorm:"size:20;uniqueIndex"`
	Name         string `gorm:"size:50"`
	Type         string `gorm:"size:20"`
	PasswordHash string `gorm:"size:255"`
}

func main() {
	db, err := gorm.Open(sqlite.Open("data/yuexiang.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("连接数据库失败:", err)
	}

	var admins []Admin
	result := db.Find(&admins)
	if result.Error != nil {
		log.Fatal("查询失败:", result.Error)
	}

	fmt.Printf("数据库中共有 %d 个管理员:\n", len(admins))
	for _, admin := range admins {
		fmt.Printf("ID: %d, 手机号: %s, 姓名: %s, 类型: %s\n", admin.ID, admin.Phone, admin.Name, admin.Type)
	}
}
