//go:build script
// +build script

package main

import (
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Category struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	ShopID    uint   `gorm:"index;not null" json:"shop_id"`
	Name      string `gorm:"size:50;not null" json:"name"`
	SortOrder int    `gorm:"default:0" json:"sort_order"`
	IsActive  bool   `gorm:"default:true" json:"is_active"`
}

func (Category) TableName() string {
	return "categories"
}

type Banner struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	ShopID    uint   `gorm:"index;not null" json:"shop_id"`
	Title     string `gorm:"size:100" json:"title"`
	ImageURL  string `gorm:"size:500;not null" json:"image_url"`
	LinkType  string `gorm:"size:20" json:"link_type"`
	LinkValue string `gorm:"size:200" json:"link_value"`
	SortOrder int    `gorm:"default:0" json:"sort_order"`
	IsActive  bool   `gorm:"default:true" json:"is_active"`
}

func (Banner) TableName() string {
	return "banners"
}

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

	// 清空现有数据
	db.Exec("DELETE FROM categories")
	db.Exec("DELETE FROM banners")
	db.Exec("DELETE FROM products WHERE is_featured = 0")

	// 创建分类数据（隆江猪脚饭 - ShopID: 1）
	categories := []Category{
		{ID: 1, ShopID: 1, Name: "招牌套餐", SortOrder: 1, IsActive: true},
		{ID: 2, ShopID: 1, Name: "单点主食", SortOrder: 2, IsActive: true},
		{ID: 3, ShopID: 1, Name: "配菜小食", SortOrder: 3, IsActive: true},
		{ID: 4, ShopID: 1, Name: "饮品", SortOrder: 4, IsActive: true},
		// 肯德基 - ShopID: 2
		{ID: 5, ShopID: 2, Name: "超值套餐", SortOrder: 1, IsActive: true},
		{ID: 6, ShopID: 2, Name: "炸鸡系列", SortOrder: 2, IsActive: true},
		{ID: 7, ShopID: 2, Name: "汉堡系列", SortOrder: 3, IsActive: true},
		{ID: 8, ShopID: 2, Name: "小食饮品", SortOrder: 4, IsActive: true},
		// 茶百道 - ShopID: 3
		{ID: 9, ShopID: 3, Name: "人气推荐", SortOrder: 1, IsActive: true},
		{ID: 10, ShopID: 3, Name: "奶茶系列", SortOrder: 2, IsActive: true},
		{ID: 11, ShopID: 3, Name: "果茶系列", SortOrder: 3, IsActive: true},
		{ID: 12, ShopID: 3, Name: "纯茶系列", SortOrder: 4, IsActive: true},
	}

	for _, cat := range categories {
		if err := db.Create(&cat).Error; err != nil {
			log.Printf("Failed to create category %s: %v", cat.Name, err)
		} else {
			fmt.Printf("✅ Created category: %s\n", cat.Name)
		}
	}

	// 创建轮播图数据
	banners := []Banner{
		// 隆江猪脚饭
		{ID: 1, ShopID: 1, Title: "招牌猪脚饭套餐", ImageURL: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop", LinkType: "product", LinkValue: "203", SortOrder: 1, IsActive: true},
		{ID: 2, ShopID: 1, Title: "新品上市", ImageURL: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=400&fit=crop", LinkType: "category", LinkValue: "1", SortOrder: 2, IsActive: true},
		// 肯德基
		{ID: 3, ShopID: 2, Title: "超值炸鸡桶", ImageURL: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&h=400&fit=crop", LinkType: "product", LinkValue: "201", SortOrder: 1, IsActive: true},
		{ID: 4, ShopID: 2, Title: "汉堡买一送一", ImageURL: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop", LinkType: "category", LinkValue: "7", SortOrder: 2, IsActive: true},
		// 茶百道
		{ID: 5, ShopID: 3, Title: "杨枝甘露", ImageURL: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800&h=400&fit=crop", LinkType: "product", LinkValue: "202", SortOrder: 1, IsActive: true},
		{ID: 6, ShopID: 3, Title: "夏日特饮", ImageURL: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=400&fit=crop", LinkType: "category", LinkValue: "11", SortOrder: 2, IsActive: true},
	}

	for _, banner := range banners {
		if err := db.Create(&banner).Error; err != nil {
			log.Printf("Failed to create banner %s: %v", banner.Title, err)
		} else {
			fmt.Printf("✅ Created banner: %s\n", banner.Title)
		}
	}

	// 创建商品数据（隆江猪脚饭）
	products := []Product{
		// 招牌套餐
		{ID: 301, ShopID: 1, CategoryID: 1, Name: "招牌猪脚饭套餐", Description: "招牌猪脚饭+卤蛋+时令青菜", Image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop", Price: 25.9, OriginalPrice: 35, MonthlySales: 1800, Rating: 4.8, GoodReviews: 1746, Stock: 999, Unit: "份", Tags: `["店长推荐","招牌菜","营养均衡"]`, IsRecommend: true, IsActive: true, SortOrder: 1},
		{ID: 302, ShopID: 1, CategoryID: 1, Name: "双拼套餐", Description: "猪脚+烧鸭双拼+米饭+青菜", Image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop", Price: 32.9, OriginalPrice: 42, MonthlySales: 980, Rating: 4.7, GoodReviews: 931, Stock: 999, Unit: "份", Tags: `["超值","双拼"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		{ID: 303, ShopID: 1, CategoryID: 1, Name: "三宝饭套餐", Description: "猪脚+烧鸭+叉烧+米饭", Image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=400&fit=crop", Price: 38.9, OriginalPrice: 48, MonthlySales: 650, Rating: 4.9, GoodReviews: 637, Stock: 999, Unit: "份", Tags: `["豪华","三宝"]`, IsRecommend: false, IsActive: true, SortOrder: 3},
		// 单点主食
		{ID: 304, ShopID: 1, CategoryID: 2, Name: "招牌猪脚饭", Description: "精选猪脚，卤制入味", Image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop", Price: 22, OriginalPrice: 0, MonthlySales: 2200, Rating: 4.8, GoodReviews: 2156, Stock: 999, Unit: "份", Tags: `["招牌"]`, IsRecommend: true, IsActive: true, SortOrder: 1},
		{ID: 305, ShopID: 1, CategoryID: 2, Name: "烧鸭饭", Description: "广式烧鸭，皮脆肉嫩", Image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop", Price: 20, OriginalPrice: 0, MonthlySales: 1500, Rating: 4.7, GoodReviews: 1455, Stock: 999, Unit: "份", Tags: `["经典"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		{ID: 306, ShopID: 1, CategoryID: 2, Name: "叉烧饭", Description: "蜜汁叉烧，香甜可口", Image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=400&fit=crop", Price: 18, OriginalPrice: 0, MonthlySales: 1200, Rating: 4.6, GoodReviews: 1152, Stock: 999, Unit: "份", Tags: `["经典"]`, IsRecommend: false, IsActive: true, SortOrder: 3},
		// 配菜小食
		{ID: 307, ShopID: 1, CategoryID: 3, Name: "卤蛋", Description: "精选鸡蛋，卤制入味", Image: "https://images.unsplash.com/photo-1587486937736-e8c6a2f7e8f5?w=400&h=400&fit=crop", Price: 3, OriginalPrice: 0, MonthlySales: 3500, Rating: 4.9, GoodReviews: 3465, Stock: 999, Unit: "个", Tags: `["配菜"]`, IsRecommend: false, IsActive: true, SortOrder: 1},
		{ID: 308, ShopID: 1, CategoryID: 3, Name: "时令青菜", Description: "新鲜蔬菜，清淡健康", Image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop", Price: 5, OriginalPrice: 0, MonthlySales: 2800, Rating: 4.7, GoodReviews: 2716, Stock: 999, Unit: "份", Tags: `["健康"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		// 饮品
		{ID: 309, ShopID: 1, CategoryID: 4, Name: "凉茶", Description: "清热解暑，降火去燥", Image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop", Price: 6, OriginalPrice: 0, MonthlySales: 1800, Rating: 4.6, GoodReviews: 1728, Stock: 999, Unit: "杯", Tags: `["饮品"]`, IsRecommend: false, IsActive: true, SortOrder: 1},
		{ID: 310, ShopID: 1, CategoryID: 4, Name: "酸梅汤", Description: "酸甜可口，生津止渴", Image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop", Price: 8, OriginalPrice: 0, MonthlySales: 1500, Rating: 4.8, GoodReviews: 1470, Stock: 999, Unit: "杯", Tags: `["饮品","解暑"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
	}

	// 肯德基商品
	kfcProducts := []Product{
		// 超值套餐
		{ID: 311, ShopID: 2, CategoryID: 5, Name: "超值炸鸡桶", Description: "6块原味鸡+薯条+可乐", Image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=400&fit=crop", Price: 59.9, OriginalPrice: 89, MonthlySales: 2000, Rating: 4.9, GoodReviews: 1980, Stock: 999, Unit: "份", Tags: `["限时特惠","家庭分享","超值"]`, IsRecommend: true, IsActive: true, SortOrder: 1},
		{ID: 312, ShopID: 2, CategoryID: 5, Name: "双人套餐", Description: "2个汉堡+2份薯条+2杯可乐", Image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop", Price: 49.9, OriginalPrice: 68, MonthlySales: 1500, Rating: 4.8, GoodReviews: 1470, Stock: 999, Unit: "份", Tags: `["双人","超值"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		// 炸鸡系列
		{ID: 313, ShopID: 2, CategoryID: 6, Name: "原味鸡", Description: "经典原味，外酥里嫩", Image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=400&fit=crop", Price: 12, OriginalPrice: 0, MonthlySales: 3500, Rating: 4.9, GoodReviews: 3465, Stock: 999, Unit: "块", Tags: `["经典","招牌"]`, IsRecommend: true, IsActive: true, SortOrder: 1},
		{ID: 314, ShopID: 2, CategoryID: 6, Name: "香辣鸡翅", Description: "香辣可口，回味无穷", Image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=400&fit=crop", Price: 15, OriginalPrice: 0, MonthlySales: 2800, Rating: 4.8, GoodReviews: 2744, Stock: 999, Unit: "对", Tags: `["香辣","人气"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		// 汉堡系列
		{ID: 315, ShopID: 2, CategoryID: 7, Name: "香辣鸡腿堡", Description: "香辣鸡腿+生菜+沙拉酱", Image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop", Price: 18, OriginalPrice: 0, MonthlySales: 2500, Rating: 4.8, GoodReviews: 2450, Stock: 999, Unit: "个", Tags: `["汉堡","香辣"]`, IsRecommend: true, IsActive: true, SortOrder: 1},
		{ID: 316, ShopID: 2, CategoryID: 7, Name: "老北京鸡肉卷", Description: "老北京风味，酱香浓郁", Image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=400&fit=crop", Price: 16, OriginalPrice: 0, MonthlySales: 2200, Rating: 4.7, GoodReviews: 2134, Stock: 999, Unit: "个", Tags: `["经典","老北京"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		// 小食饮品
		{ID: 317, ShopID: 2, CategoryID: 8, Name: "黄金薯条", Description: "金黄酥脆，外焦里嫩", Image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop", Price: 10, OriginalPrice: 0, MonthlySales: 4000, Rating: 4.9, GoodReviews: 3960, Stock: 999, Unit: "份", Tags: `["小食","经典"]`, IsRecommend: false, IsActive: true, SortOrder: 1},
		{ID: 318, ShopID: 2, CategoryID: 8, Name: "可乐", Description: "冰爽可乐，清凉解渴", Image: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop", Price: 8, OriginalPrice: 0, MonthlySales: 3500, Rating: 4.8, GoodReviews: 3430, Stock: 999, Unit: "杯", Tags: `["饮品"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
	}

	products = append(products, kfcProducts...)

	// 茶百道商品
	teaProducts := []Product{
		// 人气推荐
		{ID: 319, ShopID: 3, CategoryID: 9, Name: "杨枝甘露大杯", Description: "新鲜芒果+西柚粒+椰浆", Image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=400&fit=crop", Price: 15.9, OriginalPrice: 22, MonthlySales: 3500, Rating: 4.8, GoodReviews: 3430, Stock: 999, Unit: "杯", Tags: `["爆款推荐","夏日特饮","新鲜水果"]`, IsRecommend: true, IsActive: true, SortOrder: 1},
		{ID: 320, ShopID: 3, CategoryID: 9, Name: "芋泥波波奶茶", Description: "香浓芋泥+Q弹珍珠", Image: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400&h=400&fit=crop", Price: 14.9, OriginalPrice: 19, MonthlySales: 3200, Rating: 4.9, GoodReviews: 3168, Stock: 999, Unit: "杯", Tags: `["人气","芋泥"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		// 奶茶系列
		{ID: 321, ShopID: 3, CategoryID: 10, Name: "珍珠奶茶", Description: "经典珍珠奶茶，Q弹珍珠", Image: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=400&h=400&fit=crop", Price: 12, OriginalPrice: 0, MonthlySales: 2800, Rating: 4.7, GoodReviews: 2716, Stock: 999, Unit: "杯", Tags: `["经典","奶茶"]`, IsRecommend: true, IsActive: true, SortOrder: 1},
		{ID: 322, ShopID: 3, CategoryID: 10, Name: "布蕾奶茶", Description: "焦糖布蕾+醇香奶茶", Image: "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&h=400&fit=crop", Price: 13.9, OriginalPrice: 0, MonthlySales: 2500, Rating: 4.8, GoodReviews: 2450, Stock: 999, Unit: "杯", Tags: `["奶茶","布蕾"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		// 果茶系列
		{ID: 323, ShopID: 3, CategoryID: 11, Name: "满杯红柚", Description: "新鲜红柚+茉莉绿茶", Image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop", Price: 14, OriginalPrice: 0, MonthlySales: 2200, Rating: 4.8, GoodReviews: 2156, Stock: 999, Unit: "杯", Tags: `["果茶","清爽"]`, IsRecommend: true, IsActive: true, SortOrder: 1},
		{ID: 324, ShopID: 3, CategoryID: 11, Name: "多肉葡萄", Description: "新鲜葡萄+茉莉绿茶", Image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop", Price: 13, OriginalPrice: 0, MonthlySales: 2000, Rating: 4.7, GoodReviews: 1940, Stock: 999, Unit: "杯", Tags: `["果茶","葡萄"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
		// 纯茶系列
		{ID: 325, ShopID: 3, CategoryID: 12, Name: "茉莉绿茶", Description: "清香茉莉，清爽解渴", Image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop", Price: 8, OriginalPrice: 0, MonthlySales: 1500, Rating: 4.6, GoodReviews: 1440, Stock: 999, Unit: "杯", Tags: `["纯茶","清爽"]`, IsRecommend: false, IsActive: true, SortOrder: 1},
		{ID: 326, ShopID: 3, CategoryID: 12, Name: "四季春茶", Description: "清香四季春，回甘悠长", Image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop", Price: 9, OriginalPrice: 0, MonthlySales: 1200, Rating: 4.7, GoodReviews: 1164, Stock: 999, Unit: "杯", Tags: `["纯茶","春茶"]`, IsRecommend: false, IsActive: true, SortOrder: 2},
	}

	products = append(products, teaProducts...)

	// 插入所有商品
	for _, product := range products {
		if err := db.Create(&product).Error; err != nil {
			log.Printf("Failed to create product %s: %v", product.Name, err)
		} else {
			fmt.Printf("✅ Created product: %s\n", product.Name)
		}
	}

	fmt.Println("\n🎉 分类、轮播图和商品数据初始化完成！")
	fmt.Printf("   - 创建了 %d 个分类\n", len(categories))
	fmt.Printf("   - 创建了 %d 个轮播图\n", len(banners))
	fmt.Printf("   - 创建了 %d 个商品\n", len(products))
}
