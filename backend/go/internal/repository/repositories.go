package repository

import (
	"github.com/go-redis/redis/v8"
	"gorm.io/gorm"
)

type Repositories struct {
	DB    *gorm.DB
	Redis *redis.Client

	// 各业务仓库
	Shop            ShopRepository
	Order           OrderRepository
	AfterSales      AfterSalesRepository
	User            UserRepository
	Notification    NotificationRepository
	Product         ProductRepository
	FeaturedProduct FeaturedProductRepository
	Wallet          WalletRepository
}

func NewRepositories(db *gorm.DB, rdb *redis.Client) *Repositories {
	return &Repositories{
		DB:              db,
		Redis:           rdb,
		Shop:            NewShopRepository(db),
		Order:           NewOrderRepository(db),
		AfterSales:      NewAfterSalesRepository(db),
		User:            NewUserRepository(db),
		Notification:    NewNotificationRepository(db),
		Product:         NewProductRepository(db),
		FeaturedProduct: NewFeaturedProductRepository(db),
		Wallet:          NewWalletRepository(db),
	}
}
