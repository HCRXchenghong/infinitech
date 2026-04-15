package middleware

import (
	"net"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
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
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENV")))
	if env == "" {
		env = strings.ToLower(strings.TrimSpace(os.Getenv("NODE_ENV")))
	}
	productionLike := env == "production" || env == "prod" || env == "staging"

	resolveAllowedOrigin := func(origin string) string {
		origin = strings.TrimSpace(origin)
		if origin == "" {
			return ""
		}
		if len(allowedOrigins) > 0 {
			for _, candidate := range allowedOrigins {
				if candidate == origin {
					return origin
				}
			}
			return ""
		}
		if productionLike {
			return ""
		}

		parsed, err := url.Parse(origin)
		if err != nil {
			return ""
		}
		host := strings.TrimSpace(parsed.Hostname())
		if host == "" {
			return ""
		}
		if strings.EqualFold(host, "localhost") {
			return origin
		}
		ip := net.ParseIP(host)
		if ip != nil && ip.IsLoopback() {
			return origin
		}
		return ""
	}

	return func(c *gin.Context) {
		origin := strings.TrimSpace(c.GetHeader("Origin"))
		allowOrigin := resolveAllowedOrigin(origin)

		if allowOrigin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			if origin != "" && allowOrigin == "" {
				c.AbortWithStatus(403)
				return
			}
			c.AbortWithStatus(204)
			return
		}
		if origin != "" && allowOrigin == "" {
			c.AbortWithStatusJSON(403, gin.H{"error": "origin not allowed"})
			return
		}

		c.Next()
	}
}
