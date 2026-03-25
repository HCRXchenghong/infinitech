package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	// 从环境变量读取白名单，多个用逗号分隔；未配置时允许所有（开发环境兼容）
	allowedRaw := os.Getenv("ALLOWED_ORIGINS")
	var allowedOrigins []string
	if allowedRaw != "" {
		for _, o := range strings.Split(allowedRaw, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				allowedOrigins = append(allowedOrigins, o)
			}
		}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowOrigin := "*"
		if len(allowedOrigins) > 0 {
			allowOrigin = allowedOrigins[0]
			for _, o := range allowedOrigins {
				if o == origin {
					allowOrigin = origin
					break
				}
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
