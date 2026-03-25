package repository

import (
	"context"
	"fmt"
	"log"

	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/config"
)

var ctx = context.Background()

func InitRedis(cfg *config.Config) (*redis.Client, error) {
	if !cfg.Redis.Enabled {
		if cfg.Redis.Required {
			return nil, fmt.Errorf("Redis is required but disabled")
		}
		log.Println("Redis is disabled (REDIS_ENABLED=false)")
		return nil, nil
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	if _, err := rdb.Ping(ctx).Result(); err != nil {
		if cfg.Redis.Required {
			return nil, fmt.Errorf("Redis connection failed: %w", err)
		}
		log.Printf("Redis connection failed, continuing without cache: %v", err)
		return nil, nil
	}

	log.Println("Redis connected successfully")
	return rdb, nil
}
