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

func Logger() gin.HandlerFunc {
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

		// 记录请求信息
		log.Printf("📥 [请求] %s %s from %s request_id=%s log_tsid=%s id_version=unified_v1", method, path, c.ClientIP(), requestID, logTSID)

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		legacyHitValue, _ := c.Get("legacy_hit")
		legacyHit, _ := legacyHitValue.(bool)
		entityUID := contextString(c, "entity_uid")
		entityTSID := contextString(c, "entity_tsid")

		// 记录响应信息
		if status >= 400 {
			log.Printf("❌ [响应] %s %s %d %v (错误) request_id=%s log_tsid=%s entity_uid=%s entity_tsid=%s legacy_hit=%v id_version=unified_v1",
				method, path, status, latency, requestID, logTSID, entityUID, entityTSID, legacyHit)
		} else {
			log.Printf("✅ [响应] %s %s %d %v request_id=%s log_tsid=%s entity_uid=%s entity_tsid=%s legacy_hit=%v id_version=unified_v1",
				method, path, status, latency, requestID, logTSID, entityUID, entityTSID, legacyHit)
		}
	}
}
