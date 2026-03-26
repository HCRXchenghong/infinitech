package middleware

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
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
