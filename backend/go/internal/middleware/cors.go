package middleware

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type corsRuntimeConfig struct {
	allowedOrigins []string
	productionLike bool
}

func normalizeOrigin(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return ""
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return ""
	}
	if strings.TrimSpace(parsed.Host) == "" {
		return ""
	}

	return parsed.Scheme + "://" + parsed.Host
}

func appendUniqueOrigins(target []string, values ...string) []string {
	for _, value := range values {
		normalized := normalizeOrigin(value)
		if normalized == "" {
			continue
		}

		exists := false
		for _, current := range target {
			if current == normalized {
				exists = true
				break
			}
		}
		if !exists {
			target = append(target, normalized)
		}
	}
	return target
}

func isProductionLikeEnvironment(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "production", "prod", "staging":
		return true
	default:
		return false
	}
}

func resolveCORSRuntimeConfig(getEnv func(string) string) (corsRuntimeConfig, error) {
	if getEnv == nil {
		getEnv = os.Getenv
	}

	configuredOrigins := []string{}
	for _, item := range strings.Split(getEnv("ALLOWED_ORIGINS"), ",") {
		configuredOrigins = appendUniqueOrigins(configuredOrigins, item)
	}

	configuredOrigins = appendUniqueOrigins(
		configuredOrigins,
		getEnv("ADMIN_WEB_BASE_URL"),
		getEnv("SITE_WEB_BASE_URL"),
	)

	env := strings.TrimSpace(getEnv("ENV"))
	if env == "" {
		env = strings.TrimSpace(getEnv("NODE_ENV"))
	}

	config := corsRuntimeConfig{
		allowedOrigins: configuredOrigins,
		productionLike: isProductionLikeEnvironment(env),
	}
	if config.productionLike && len(config.allowedOrigins) == 0 {
		return corsRuntimeConfig{}, fmt.Errorf(
			"GO API requires ALLOWED_ORIGINS or explicit ADMIN_WEB_BASE_URL/SITE_WEB_BASE_URL in production-like environments",
		)
	}

	return config, nil
}

func isLoopbackOrigin(origin string) bool {
	parsed, err := url.Parse(strings.TrimSpace(origin))
	if err != nil {
		return false
	}

	host := strings.TrimSpace(parsed.Hostname())
	if host == "" {
		return false
	}
	if strings.EqualFold(host, "localhost") {
		return true
	}

	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func resolveAllowedOrigin(config corsRuntimeConfig, origin string) string {
	normalizedOrigin := normalizeOrigin(origin)
	if normalizedOrigin == "" {
		return ""
	}

	if len(config.allowedOrigins) > 0 {
		for _, candidate := range config.allowedOrigins {
			if candidate == normalizedOrigin {
				return normalizedOrigin
			}
		}
		return ""
	}

	if !config.productionLike && isLoopbackOrigin(normalizedOrigin) {
		return normalizedOrigin
	}

	return ""
}

func CORS() gin.HandlerFunc {
	config, err := resolveCORSRuntimeConfig(os.Getenv)
	if err != nil {
		panic(err)
	}

	return func(c *gin.Context) {
		origin := strings.TrimSpace(c.GetHeader("Origin"))
		allowOrigin := resolveAllowedOrigin(config, origin)

		if allowOrigin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == http.MethodOptions {
			if origin != "" && allowOrigin == "" {
				abortForbidden(c, "origin not allowed", nil)
				return
			}
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		if origin != "" && allowOrigin == "" {
			abortForbidden(c, "origin not allowed", nil)
			return
		}

		c.Next()
	}
}
