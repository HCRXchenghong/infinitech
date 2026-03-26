package middleware

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

type fixedWindowRecord struct {
	windowStart time.Time
	count       int
}

type fixedWindowLimiter struct {
	mu          sync.Mutex
	records     map[string]fixedWindowRecord
	window      time.Duration
	maxRequests int
	lastCleanup time.Time
}

func newFixedWindowLimiter(window time.Duration, maxRequests int) *fixedWindowLimiter {
	return &fixedWindowLimiter{
		records:     map[string]fixedWindowRecord{},
		window:      window,
		maxRequests: maxRequests,
		lastCleanup: time.Now(),
	}
}

func (l *fixedWindowLimiter) allow(key string, now time.Time) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if now.Sub(l.lastCleanup) >= l.window*2 {
		for recordKey, record := range l.records {
			if now.Sub(record.windowStart) >= l.window*2 {
				delete(l.records, recordKey)
			}
		}
		l.lastCleanup = now
	}

	record := l.records[key]
	if record.windowStart.IsZero() || now.Sub(record.windowStart) >= l.window {
		record = fixedWindowRecord{
			windowStart: now,
			count:       1,
		}
		l.records[key] = record
		return true, 0
	}

	if record.count >= l.maxRequests {
		retryAfter := l.window - now.Sub(record.windowStart)
		if retryAfter < 0 {
			retryAfter = 0
		}
		return false, retryAfter
	}

	record.count += 1
	l.records[key] = record
	return true, 0
}

func shouldSkipProtection(path string) bool {
	normalized := strings.TrimSpace(path)
	return normalized == "/health" || normalized == "/ready" || normalized == "/api/health" || normalized == "/api/ready"
}

func isUploadPath(path string) bool {
	normalized := strings.TrimSpace(path)
	return normalized == "/upload" || normalized == "/api/upload"
}

func RequestBodyLimit(defaultMaxBytes, uploadMaxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if shouldSkipProtection(c.Request.URL.Path) {
			c.Next()
			return
		}

		maxBytes := defaultMaxBytes
		if isUploadPath(c.Request.URL.Path) {
			maxBytes = uploadMaxBytes
		}
		if maxBytes <= 0 || c.Request.Body == nil {
			c.Next()
			return
		}

		if c.Request.ContentLength > maxBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": fmt.Sprintf("request body too large (max %d bytes)", maxBytes),
			})
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

func GlobalRateLimit(window time.Duration, maxRequests int) gin.HandlerFunc {
	limiter := newFixedWindowLimiter(window, maxRequests)

	return func(c *gin.Context) {
		if shouldSkipProtection(c.Request.URL.Path) || strings.EqualFold(c.Request.Method, http.MethodOptions) {
			c.Next()
			return
		}

		clientIP := strings.TrimSpace(c.ClientIP())
		if clientIP == "" {
			clientIP = "unknown"
		}

		allowed, retryAfter := limiter.allow(clientIP, time.Now())
		if !allowed {
			c.Header("Retry-After", strconv.Itoa(int(math.Ceil(retryAfter.Seconds()))))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please retry later",
			})
			return
		}

		c.Next()
	}
}

func RedisBackedRateLimit(rdb *redis.Client, prefix string, window time.Duration, maxRequests int) gin.HandlerFunc {
	fallbackLimiter := newFixedWindowLimiter(window, maxRequests)
	normalizedPrefix := strings.TrimSpace(prefix)
	if normalizedPrefix == "" {
		normalizedPrefix = "ratelimit:http"
	}

	return func(c *gin.Context) {
		if shouldSkipProtection(c.Request.URL.Path) || strings.EqualFold(c.Request.Method, http.MethodOptions) {
			c.Next()
			return
		}

		clientIP := strings.TrimSpace(c.ClientIP())
		if clientIP == "" {
			clientIP = "unknown"
		}

		allowed, retryAfter, err := allowWithRedis(c.Request.Context(), rdb, normalizedPrefix, clientIP, window, maxRequests, time.Now())
		if err != nil {
			allowed, retryAfter = fallbackLimiter.allow(clientIP, time.Now())
		}
		if !allowed {
			c.Header("Retry-After", strconv.Itoa(int(math.Ceil(retryAfter.Seconds()))))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please retry later",
			})
			return
		}

		c.Next()
	}
}

func allowWithRedis(parent context.Context, rdb *redis.Client, prefix, key string, window time.Duration, maxRequests int, now time.Time) (bool, time.Duration, error) {
	if rdb == nil {
		return false, 0, fmt.Errorf("redis rate limiter requires redis client")
	}

	windowMs := window.Milliseconds()
	if windowMs <= 0 {
		windowMs = 1000
	}
	bucket := now.UnixMilli() / windowMs
	redisKey := fmt.Sprintf("%s:%d:%s", prefix, bucket, key)

	ctx, cancel := context.WithTimeout(parent, 250*time.Millisecond)
	defer cancel()

	count, err := rdb.Incr(ctx, redisKey).Result()
	if err != nil {
		return false, 0, err
	}
	if count == 1 {
		if err := rdb.PExpire(ctx, redisKey, window+time.Second).Err(); err != nil {
			return false, 0, err
		}
	}
	if int(count) <= maxRequests {
		return true, 0, nil
	}

	ttl, err := rdb.PTTL(ctx, redisKey).Result()
	if err != nil {
		return false, 0, err
	}
	if ttl < 0 {
		ttl = window
	}

	return false, ttl, nil
}
