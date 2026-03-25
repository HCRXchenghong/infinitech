//go:build script
// +build script

package main

import (
	"encoding/json"
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Product struct {
	ID            uint    `gorm:"primaryKey" json:"id"`
	ShopID        uint    `gorm:"index;not null" json:"shop_id"`
	CategoryID    uint    `gorm:"index;not null" json:"category_id"`
	Name          string  `gorm:"size:100;not null" json:"name"`
	Description   string  `gorm:"type:text" json:"description"`
	Image         string  `gorm:"size:500" json:"image"`
	Images        string  `gorm:"type:text" json:"images"`
	Price         float64 `gorm:"type:decimal(10,2);not null" json:"price"`
	OriginalPrice float64 `gorm:"type:decimal(10,2)" json:"original_price"`
	MonthlySales  int     `gorm:"default:0" json:"monthly_sales"`
	Rating        float64 `gorm:"type:decimal(3,2);default:5" json:"rating"`
	GoodReviews   int     `gorm:"default:0" json:"good_reviews"`
	Stock         int     `gorm:"default:999" json:"stock"`
	Unit          string  `gorm:"size:20;default:'份'" json:"unit"`
	Nutrition     string  `gorm:"type:text" json:"nutrition"`
	Tags          string  `gorm:"type:text" json:"tags"`
	IsRecommend   bool    `gorm:"default:false" json:"is_recommend"`
	IsFeatured    bool    `gorm:"default:false" json:"is_featured"`
	IsActive      bool    `gorm:"default:true" json:"is_active"`
	SortOrder     int     `gorm:"default:0" json:"sort_order"`
}

func (Product) TableName() string {
	return "products"
}

func main() {
	// 连接数据库
	db, err := gorm.Open(sqlite.Open("data/yuexiang.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// 清空现有商品数据
	db.Exec("DELETE FROM products")

	// 准备示例商品数据（今日推荐）
	products := []Product{
		{
			ID:            201,
			ShopID:        2, // 肯德基
			CategoryID:    1,
			Name:          "超值炸鸡桶",
			Description:   "6块原味鸡+薯条+可乐，超值家庭分享装",
			Image:         "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=400&fit=crop",
			Price:         59.9,
			OriginalPrice: 89,
			MonthlySales:  2000,
			Rating:        4.9,
			GoodReviews:   1980,
			Stock:         999,
			Unit:          "份",
			Nutrition:     mustMarshal(map[string]interface{}{"calories": 1200, "protein": 65, "fat": 72, "carbs": 85}),
			Tags:          mustMarshal([]string{"限时特惠", "家庭分享", "超值"}),
			IsRecommend:   true,
			IsFeatured:    true,
			IsActive:      true,
			SortOrder:     1,
		},
		{
			ID:            202,
			ShopID:        3, // 茶百道
			CategoryID:    1,
			Name:          "杨枝甘露大杯",
			Description:   "新鲜芒果+西柚粒+椰浆，夏日清凉首选",
			Image:         "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=400&fit=crop",
			Price:         15.9,
			OriginalPrice: 22,
			MonthlySales:  3500,
			Rating:        4.8,
			GoodReviews:   3430,
			Stock:         999,
			Unit:          "杯",
			Nutrition:     mustMarshal(map[string]interface{}{"calories": 320, "protein": 4, "fat": 8, "carbs": 58}),
			Tags:          mustMarshal([]string{"爆款推荐", "夏日特饮", "新鲜水果"}),
			IsRecommend:   true,
			IsFeatured:    true,
			IsActive:      true,
			SortOrder:     2,
		},
		{
			ID:            203,
			ShopID:        1, // 隆江猪脚饭
			CategoryID:    1,
			Name:          "招牌猪脚饭套餐",
			Description:   "招牌猪脚饭+卤蛋+时令青菜，经典搭配",
			Image:         "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
			Price:         25.9,
			OriginalPrice: 35,
			MonthlySales:  1800,
			Rating:        4.8,
			GoodReviews:   1746,
			Stock:         999,
			Unit:          "份",
			Nutrition:     mustMarshal(map[string]interface{}{"calories": 680, "protein": 38, "fat": 30, "carbs": 68}),
			Tags:          mustMarshal([]string{"店长推荐", "招牌菜", "营养均衡"}),
			IsRecommend:   true,
			IsFeatured:    true,
			IsActive:      true,
			SortOrder:     3,
		},
	}

	// 插入数据
	for _, product := range products {
		if err := db.Create(&product).Error; err != nil {
			log.Printf("Failed to create product %s: %v", product.Name, err)
		} else {
			fmt.Printf("✅ Created product: %s\n", product.Name)
		}
	}

	fmt.Println("\n🎉 商品数据初始化完成！")
}

func mustMarshal(v interface{}) string {
	data, err := json.Marshal(v)
	if err != nil {
		log.Fatal(err)
	}
	return string(data)
}
