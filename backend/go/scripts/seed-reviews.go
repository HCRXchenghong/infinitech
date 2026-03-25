//go:build script
// +build script

package main

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Review struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	ShopID     uint       `gorm:"index;not null" json:"shop_id"`
	UserID     uint       `gorm:"index;not null" json:"user_id"`
	OrderID    uint       `gorm:"index" json:"order_id"`
	Rating     float64    `gorm:"type:decimal(3,2);not null" json:"rating"`
	Content    string     `gorm:"type:text" json:"content"`
	Images     string     `gorm:"type:text" json:"images"`
	Reply      string     `gorm:"type:text" json:"reply"`
	ReplyTime  *time.Time `gorm:"type:datetime" json:"reply_time"`
	UserName   string     `gorm:"size:50" json:"user_name"`
	UserAvatar string     `gorm:"size:500" json:"user_avatar"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

func (Review) TableName() string {
	return "reviews"
}

func main() {
	db, err := gorm.Open(sqlite.Open("data/yuexiang.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	db.AutoMigrate(&Review{})

	now := time.Now()
	replyTime := now.Add(-24 * time.Hour)

	reviews := []Review{
		// 隆江猪脚饭 (shop_id=1) - 8条评价: 6好评, 1中评, 1差评
		{ID: 1, ShopID: 1, UserID: 1, OrderID: 1, Rating: 5, Content: "猪脚很软烂，入味，配上青菜很解腻，下次还会回购！", Images: `["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"]`, Reply: "谢谢您的喜欢，期待再次光临！", ReplyTime: &replyTime, UserName: "食客***8", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", CreatedAt: now.Add(-2 * 24 * time.Hour)},
		{ID: 2, ShopID: 1, UserID: 2, OrderID: 2, Rating: 5, Content: "份量足，味道正宗，送餐速度也很快", Images: `[]`, Reply: "", UserName: "美食家小王", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka", CreatedAt: now.Add(-3 * 24 * time.Hour)},
		{ID: 3, ShopID: 1, UserID: 3, OrderID: 3, Rating: 4, Content: "整体不错，就是配送稍微慢了点", Images: `[]`, Reply: "感谢您的反馈，我们会优化配送效率", ReplyTime: &replyTime, UserName: "吃货本货", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob", CreatedAt: now.Add(-5 * 24 * time.Hour)},
		{ID: 4, ShopID: 1, UserID: 4, OrderID: 4, Rating: 5, Content: "猪脚饭真的绝了！肉质软糯，酱汁浓郁，米饭也很香", Images: `[]`, Reply: "", UserName: "深圳吃货", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna", CreatedAt: now.Add(-7 * 24 * time.Hour)},
		{ID: 5, ShopID: 1, UserID: 5, OrderID: 5, Rating: 5, Content: "性价比很高，套餐很划算", Images: `[]`, Reply: "", UserName: "小明同学", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max", CreatedAt: now.Add(-10 * 24 * time.Hour)},
		{ID: 6, ShopID: 1, UserID: 6, OrderID: 6, Rating: 5, Content: "每周必点，味道一直很稳定", Images: `["https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop"]`, Reply: "感谢老顾客的支持！", ReplyTime: &replyTime, UserName: "回头客", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Coco", CreatedAt: now.Add(-12 * 24 * time.Hour)},
		{ID: 7, ShopID: 1, UserID: 7, OrderID: 7, Rating: 3, Content: "味道还行，但今天的饭有点硬", Images: `[]`, Reply: "非常抱歉给您带来不好的体验，我们会加强品控", ReplyTime: &replyTime, UserName: "路人甲", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe", CreatedAt: now.Add(-15 * 24 * time.Hour)},
		{ID: 8, ShopID: 1, UserID: 8, OrderID: 8, Rating: 2, Content: "等了快一个小时才送到，饭菜都凉了", Images: `[]`, Reply: "非常抱歉，我们会改进配送时效", ReplyTime: &replyTime, UserName: "匿名用户", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam", CreatedAt: now.Add(-20 * 24 * time.Hour)},

		// 肯德基 KFC (shop_id=2) - 6条评价: 5好评, 1差评
		{ID: 9, ShopID: 2, UserID: 1, OrderID: 9, Rating: 5, Content: "炸鸡桶超值！鸡肉很嫩很入味", Images: `["https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200&h=200&fit=crop"]`, Reply: "", UserName: "炸鸡爱好者", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom", CreatedAt: now.Add(-1 * 24 * time.Hour)},
		{ID: 10, ShopID: 2, UserID: 2, OrderID: 10, Rating: 5, Content: "薯条很脆，可乐冰爽，完美搭配", Images: `[]`, Reply: "", UserName: "快餐达人", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amy", CreatedAt: now.Add(-4 * 24 * time.Hour)},
		{ID: 11, ShopID: 2, UserID: 3, OrderID: 11, Rating: 4, Content: "老北京鸡肉卷味道不错，就是有点小", Images: `[]`, Reply: "", UserName: "小李", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo", CreatedAt: now.Add(-6 * 24 * time.Hour)},
		{ID: 12, ShopID: 2, UserID: 4, OrderID: 12, Rating: 5, Content: "KFC永远的神！出品稳定", Images: `[]`, Reply: "", UserName: "肯德基粉丝", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia", CreatedAt: now.Add(-8 * 24 * time.Hour)},
		{ID: 13, ShopID: 2, UserID: 5, OrderID: 13, Rating: 5, Content: "双人套餐很划算，两个人吃刚好", Images: `[]`, Reply: "", UserName: "情侣档", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Duo", CreatedAt: now.Add(-11 * 24 * time.Hour)},
		{ID: 14, ShopID: 2, UserID: 6, OrderID: 14, Rating: 1, Content: "汉堡里的生菜都蔫了，不新鲜", Images: `[]`, Reply: "非常抱歉，我们会加强食材管理", ReplyTime: &replyTime, UserName: "差评侠", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ned", CreatedAt: now.Add(-18 * 24 * time.Hour)},

		// 茶百道 (shop_id=3) - 5条评价: 4好评, 1中评
		{ID: 15, ShopID: 3, UserID: 1, OrderID: 15, Rating: 5, Content: "杨枝甘露太好喝了！芒果很新鲜", Images: `["https://images.unsplash.com/photo-1541167760496-1628856ab772?w=200&h=200&fit=crop"]`, Reply: "谢谢支持～", ReplyTime: &replyTime, UserName: "奶茶控", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tea", CreatedAt: now.Add(-1 * 24 * time.Hour)},
		{ID: 16, ShopID: 3, UserID: 2, OrderID: 16, Rating: 5, Content: "芋泥波波超级好喝，芋泥很细腻", Images: `[]`, Reply: "", UserName: "甜品少女", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily", CreatedAt: now.Add(-3 * 24 * time.Hour)},
		{ID: 17, ShopID: 3, UserID: 3, OrderID: 17, Rating: 4, Content: "珍珠奶茶不错，珍珠很Q弹", Images: `[]`, Reply: "", UserName: "珍珠控", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pearl", CreatedAt: now.Add(-6 * 24 * time.Hour)},
		{ID: 18, ShopID: 3, UserID: 4, OrderID: 18, Rating: 5, Content: "满杯红柚清爽解渴，夏天必备", Images: `[]`, Reply: "", UserName: "果茶爱好者", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ruby", CreatedAt: now.Add(-9 * 24 * time.Hour)},
		{ID: 19, ShopID: 3, UserID: 5, OrderID: 19, Rating: 3, Content: "今天的奶茶偏甜了，希望可以少糖", Images: `[]`, Reply: "下次可以备注少糖哦，我们会按您的口味调整", ReplyTime: &replyTime, UserName: "养生达人", UserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sage", CreatedAt: now.Add(-14 * 24 * time.Hour)},
	}

	for _, review := range reviews {
		if err := db.Create(&review).Error; err != nil {
			log.Printf("Failed to create review %d: %v", review.ID, err)
		} else {
			fmt.Printf("✅ Created review: #%d for shop %d\n", review.ID, review.ShopID)
		}
	}

	fmt.Printf("\n🎉 评价数据初始化完成！共创建 %d 条评价\n", len(reviews))
}
