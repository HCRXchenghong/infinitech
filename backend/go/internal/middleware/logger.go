package middleware

import (
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/idkit"
)

func contextString(c *gin.Context, key string) string {
	if c == nil {
		return ""
	}
	value, ok := c.Get(key)
	if !ok {
		return ""
	}
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(text)
}

func Logger(slowWarnThreshold time.Duration) gin.HandlerFunc {
	if slowWarnThreshold <= 0 {
		slowWarnThreshold = 1500 * time.Millisecond
	}

	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method
		logTSID := idkit.NextLogTSID("98")
		c.Set("log_tsid", logTSID)

		requestID := contextString(c, "request_id")
		if requestID == "" {
			requestID = strings.TrimSpace(c.GetHeader("X-Request-ID"))
		}

		log.Printf(
			"[INFO] request.start method=%s path=%s ip=%s request_id=%s log_tsid=%s id_version=unified_v1",
			method,
			path,
			c.ClientIP(),
			requestID,
			logTSID,
		)

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		legacyHitValue, _ := c.Get("legacy_hit")
		legacyHit, _ := legacyHitValue.(bool)
		entityUID := contextString(c, "entity_uid")
		entityTSID := contextString(c, "entity_tsid")
		slowRequest := latency >= slowWarnThreshold

		level := "INFO"
		switch {
		case status >= 500:
			level = "ERROR"
		case status >= 400 || slowRequest:
			level = "WARN"
		}

		log.Printf(
			"[%s] request.finish method=%s path=%s status=%d latency_ms=%d slow=%t slow_threshold_ms=%d request_id=%s log_tsid=%s entity_uid=%s entity_tsid=%s legacy_hit=%t id_version=unified_v1",
			level,
			method,
			path,
			status,
			latency.Milliseconds(),
			slowRequest,
			slowWarnThreshold.Milliseconds(),
			requestID,
			logTSID,
			entityUID,
			entityTSID,
			legacyHit,
		)
	}
}
