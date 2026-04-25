package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/apiresponse"
)

func abortErrorEnvelope(c *gin.Context, status int, code, message string, legacy gin.H) {
	if c == nil {
		return
	}
	c.Abort()
	apiresponse.WriteJSON(c, status, code, message, gin.H{}, legacy)
}

func writeErrorEnvelope(c *gin.Context, status int, code, message string, legacy gin.H) {
	apiresponse.WriteJSON(c, status, code, message, gin.H{}, legacy)
}

func abortInvalidArgument(c *gin.Context, message string, legacy gin.H) {
	abortErrorEnvelope(c, http.StatusBadRequest, apiresponse.CodeInvalidArgument, message, legacy)
}

func abortUnauthorized(c *gin.Context, message string) {
	if strings.TrimSpace(message) == "" {
		message = "鉴权失败"
	}
	abortErrorEnvelope(c, http.StatusUnauthorized, apiresponse.CodeUnauthorized, message, nil)
}

func abortForbidden(c *gin.Context, message string, legacy gin.H) {
	abortErrorEnvelope(c, http.StatusForbidden, apiresponse.CodeForbidden, message, legacy)
}

func abortPayloadTooLarge(c *gin.Context, message string, legacy gin.H) {
	abortErrorEnvelope(c, http.StatusRequestEntityTooLarge, apiresponse.CodePayloadTooLarge, message, legacy)
}

func abortRateLimited(c *gin.Context, message string, legacy gin.H) {
	abortErrorEnvelope(c, http.StatusTooManyRequests, apiresponse.CodeTooManyRequests, message, legacy)
}
