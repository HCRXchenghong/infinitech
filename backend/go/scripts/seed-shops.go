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

type Shop struct {
	ID            uint    `gorm:"primaryKey" json:"id"`
	MerchantID    uint    `gorm:"index" json:"merchant_id"`
	Name          string  `gorm:"size:100;not null" json:"name"`
	Category      string  `gorm:"size:50;default:'美食'" json:"category"`
	CoverImage    string  `gorm:"size:500" json:"coverImage"`
	Logo          string  `gorm:"size:500" json:"logo"`
	Rating        float64 `gorm:"type:decimal(3,2);default:5.0" json:"rating"`
	MonthlySales  int     `gorm:"default:0" json:"monthlySales"`
	PerCapita     int     `gorm:"default:0" json:"perCapita"`
	Announcement  string  `gorm:"type:text" json:"announcement"`
	Address       string  `gorm:"size:200" json:"address"`
	Phone         string  `gorm:"size:20" json:"phone"`
	BusinessHours string  `gorm:"size:100;default:'09:00-22:00'" json:"businessHours"`
	Tags          string  `gorm:"type:text" json:"tags"`
	Discounts     string  `gorm:"type:text" json:"discounts"`
	IsBrand       bool    `gorm:"default:false" json:"isBrand"`
	IsActive      bool    `gorm:"default:true" json:"isActive"`
	MinPrice      float64 `gorm:"type:decimal(10,2);default:0" json:"minPrice"`
	DeliveryPrice float64 `gorm:"type:decimal(10,2);default:0" json:"deliveryPrice"`
	DeliveryTime  string  `gorm:"size:50;default:'30分钟'" json:"deliveryTime"`
	Distance      string  `gorm:"size:50" json:"distance"`
}

func (Shop) TableName() string {
	return "shops"
}

func main() {
	// 连接数据库
	db, err := gorm.Open(sqlite.Open("data/yuexiang.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// 清空现有商铺数据
	db.Exec("DELETE FROM shops")

	// 准备示例商铺数据
	shops := []Shop{
		{
			ID:            1,
			MerchantID:    1,
			Name:          "隆江猪脚饭（科技园店）",
			Category:      "美食",
			CoverImage:    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
			Logo:          "",
			Rating:        4.8,
			MonthlySales:  9999,
			PerCapita:     28,
			Announcement:  "本店春节期间照常营业，欢迎新老顾客光临！",
			Address:       "深圳市南山区科技园科苑路8号",
			Phone:         "0755-12345678",
			BusinessHours: "10:00-22:00",
			Tags:          mustMarshal([]string{"点评高分店铺", "回头客多", "美食", "中餐"}),
			Discounts:     mustMarshal([]string{"25减12", "40减18", "新客立减3"}),
			IsBrand:       false,
			IsActive:      true,
			MinPrice:      20,
			DeliveryPrice: 0,
			DeliveryTime:  "30分钟",
			Distance:      "1.2km",
		},
		{
			ID:            2,
			MerchantID:    2,
			Name:          "肯德基 KFC（万象天地店）",
			Category:      "美食",
			CoverImage:    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
			Logo:          "",
			Rating:        4.9,
			MonthlySales:  5600,
			PerCapita:     45,
			Announcement:  "新品上市！尝鲜价限时优惠",
			Address:       "深圳市南山区万象天地B1层",
			Phone:         "0755-87654321",
			BusinessHours: "09:00-23:00",
			Tags:          mustMarshal([]string{"美式炸鸡", "汉堡", "汉堡披萨", "快餐"}),
			Discounts:     mustMarshal([]string{"满39免配送费", "会员享88折"}),
			IsBrand:       true,
			IsActive:      true,
			MinPrice:      0,
			DeliveryPrice: 3.5,
			DeliveryTime:  "25分钟",
			Distance:      "800m",
		},
		{
			ID:            3,
			MerchantID:    3,
			Name:          "茶百道（大冲国际店）",
			Category:      "甜点饮品",
			CoverImage:    "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800&q=80",
			Logo:          "",
			Rating:        4.7,
			MonthlySales:  3241,
			PerCapita:     18,
			Announcement:  "杨枝甘露季节限定，错过等一年",
			Address:       "深圳市南山区大冲国际中心1层",
			Phone:         "0755-11112222",
			BusinessHours: "10:00-22:30",
			Tags:          mustMarshal([]string{"鲜果茶", "奶茶", "甜点饮品"}),
			Discounts:     mustMarshal([]string{"15减3", "25减5"}),
			IsBrand:       true,
			IsActive:      true,
			MinPrice:      15,
			DeliveryPrice: 2,
			DeliveryTime:  "45分钟",
			Distance:      "2.5km",
		},
	}

	// 插入数据
	for _, shop := range shops {
		if err := db.Create(&shop).Error; err != nil {
			log.Printf("Failed to create shop %s: %v", shop.Name, err)
		} else {
			fmt.Printf("✅ Created shop: %s\n", shop.Name)
		}
	}

	fmt.Println("\n🎉 商铺数据初始化完成！")
}

func mustMarshal(v interface{}) string {
	data, err := json.Marshal(v)
	if err != nil {
		log.Fatal(err)
	}
	return string(data)
}
