//go:build script
// +build script

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// 连接数据库
	dsn := "root:@tcp(192.168.0.103:3306)/yuexiang?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("连接数据库失败:", err)
	}

	// 清空现有订单数据
	if err := db.Exec("DELETE FROM orders").Error; err != nil {
		log.Fatal("清空订单表失败:", err)
	}
	fmt.Println("✅ 已清空订单表")

	// 准备测试订单数据
	now := time.Now()
	orders := []repository.Order{
		// 订单1: 配送中
		{
			DailyOrderID:     fmt.Sprintf("%s%04d", now.Format("20060102"), 1001),
			DailyOrderNumber: 1001,
			UserID:           "user_001",
			CustomerName:     "张三",
			CustomerPhone:    "13800138001",
			RiderID:          "rider_001",
			RiderName:        "李师傅",
			RiderPhone:       "13900139001",
			ShopID:           "1",
			ShopName:         "隆江猪脚饭",
			Status:           "accepted",
			Items: toJSON([]map[string]interface{}{
				{
					"id":    1,
					"name":  "招牌猪脚饭",
					"price": 28.0,
					"count": 1,
					"image": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop",
				},
				{
					"id":    2,
					"name":  "例汤",
					"price": 5.0,
					"count": 1,
					"image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=200&h=200&fit=crop",
				},
			}),
			Address:      "深圳市南山区科技园科苑路8号 A2-307",
			TotalPrice:   33.0,
			ProductPrice: 33.0,
			DeliveryFee:  0,
			CreatedAt:    now.Add(-30 * time.Minute),
			UpdatedAt:    now.Add(-30 * time.Minute),
		},
		// 订单2: 已完成
		{
			DailyOrderID:     fmt.Sprintf("%s%04d", now.Add(-24*time.Hour).Format("20060102"), 2001),
			DailyOrderNumber: 2001,
			UserID:           "user_001",
			CustomerName:     "张三",
			CustomerPhone:    "13800138001",
			RiderID:          "rider_002",
			RiderName:        "王师傅",
			RiderPhone:       "13900139002",
			ShopID:           "2",
			ShopName:         "肯德基 KFC",
			Status:           "completed",
			Items: toJSON([]map[string]interface{}{
				{
					"id":    3,
					"name":  "香辣鸡腿堡套餐",
					"price": 35.0,
					"count": 1,
					"image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=200&h=200&fit=crop",
					"spec":  "大份薯条+可乐",
				},
				{
					"id":    4,
					"name":  "黄金鸡块",
					"price": 15.0,
					"count": 1,
					"image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=200&h=200&fit=crop",
				},
			}),
			Address:      "深圳市南山区科技园科苑路8号 A2-307",
			TotalPrice:   50.0,
			ProductPrice: 50.0,
			DeliveryFee:  0,
			CreatedAt:    now.Add(-24 * time.Hour),
			UpdatedAt:    now.Add(-24 * time.Hour),
			CompletedAt:  timePtr(now.Add(-23 * time.Hour)),
			PaidAt:       timePtr(now.Add(-24 * time.Hour)),
		},
		// 订单3: 待接单
		{
			DailyOrderID:     fmt.Sprintf("%s%04d", now.Format("20060102"), 3001),
			DailyOrderNumber: 3001,
			UserID:           "user_001",
			CustomerName:     "张三",
			CustomerPhone:    "13800138001",
			ShopID:           "3",
			ShopName:         "茶百道",
			Status:           "pending",
			Items: toJSON([]map[string]interface{}{
				{
					"id":    5,
					"name":  "杨枝甘露",
					"price": 18.0,
					"count": 2,
					"image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200&h=200&fit=crop",
					"spec":  "少冰少糖",
				},
			}),
			Address:      "深圳市南山区科技园科苑路8号 A2-307",
			TotalPrice:   36.0,
			ProductPrice: 36.0,
			DeliveryFee:  0,
			CreatedAt:    now.Add(-5 * time.Minute),
			UpdatedAt:    now.Add(-5 * time.Minute),
		},
		// 订单4: 已取消
		{
			DailyOrderID:     fmt.Sprintf("%s%04d", now.Add(-48*time.Hour).Format("20060102"), 4001),
			DailyOrderNumber: 4001,
			UserID:           "user_001",
			CustomerName:     "张三",
			CustomerPhone:    "13800138001",
			ShopID:           "1",
			ShopName:         "隆江猪脚饭",
			Status:           "cancelled",
			Items: toJSON([]map[string]interface{}{
				{
					"id":    1,
					"name":  "招牌猪脚饭",
					"price": 28.0,
					"count": 1,
					"image": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop",
				},
			}),
			Address:      "深圳市南山区科技园科苑路8号 A2-307",
			TotalPrice:   28.0,
			ProductPrice: 28.0,
			DeliveryFee:  0,
			CreatedAt:    now.Add(-48 * time.Hour),
			UpdatedAt:    now.Add(-48 * time.Hour),
		},
	}

	// 插入订单数据
	for i, order := range orders {
		if err := db.Create(&order).Error; err != nil {
			log.Printf("❌ 插入订单 %d 失败: %v", i+1, err)
		} else {
			fmt.Printf("✅ 已插入订单 %d: %s (状态: %s)\n", i+1, order.ShopName, order.Status)
		}
	}

	fmt.Println("\n🎉 订单数据填充完成！")
	fmt.Println("📊 共插入", len(orders), "条订单记录")
}

func toJSON(data interface{}) string {
	b, _ := json.Marshal(data)
	return string(b)
}

func timePtr(t time.Time) *time.Time {
	return &t
}

func init() {
	rand.Seed(time.Now().UnixNano())
}
