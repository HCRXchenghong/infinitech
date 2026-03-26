package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/idkit"
)

const requestIDHeader = "X-Request-ID"

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := strings.TrimSpace(c.GetHeader(requestIDHeader))
		if requestID == "" {
			requestID = idkit.NextLogTSID("97")
		}

		c.Set("request_id", requestID)
		c.Header(requestIDHeader, requestID)
		c.Next()
	}
}
