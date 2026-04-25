package apiresponse

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	CodeOK                  = "OK"
	CodeInvalidArgument     = "INVALID_ARGUMENT"
	CodeUnauthorized        = "UNAUTHORIZED"
	CodeForbidden           = "FORBIDDEN"
	CodeNotFound            = "NOT_FOUND"
	CodeMethodNotAllowed    = "METHOD_NOT_ALLOWED"
	CodeConflict            = "CONFLICT"
	CodeGone                = "GONE"
	CodePayloadTooLarge     = "PAYLOAD_TOO_LARGE"
	CodeTooManyRequests     = "TOO_MANY_REQUESTS"
	CodeUpstreamUnavailable = "UPSTREAM_UNAVAILABLE"
	CodeUpstreamTimeout     = "UPSTREAM_TIMEOUT"
	CodeInternalError       = "INTERNAL_ERROR"
	CodeRequestFailed       = "REQUEST_FAILED"
)

func CurrentRequestID(c *gin.Context) string {
	if c == nil {
		return ""
	}

	requestID := strings.TrimSpace(c.GetString("request_id"))
	if requestID != "" {
		return requestID
	}
	return strings.TrimSpace(c.GetHeader("X-Request-ID"))
}

func NormalizeData(data interface{}) interface{} {
	if data == nil {
		return gin.H{}
	}
	return data
}

func NormalizeMessage(message string, status int) string {
	message = strings.TrimSpace(message)
	if message != "" {
		return message
	}
	if status >= 200 && status < 400 {
		return "ok"
	}
	return "request failed"
}

func NormalizeCode(code string, status int) string {
	code = strings.TrimSpace(code)
	if code != "" {
		return code
	}

	switch status {
	case http.StatusBadRequest:
		return CodeInvalidArgument
	case http.StatusUnauthorized:
		return CodeUnauthorized
	case http.StatusForbidden:
		return CodeForbidden
	case http.StatusNotFound:
		return CodeNotFound
	case http.StatusMethodNotAllowed:
		return CodeMethodNotAllowed
	case http.StatusConflict:
		return CodeConflict
	case http.StatusGone:
		return CodeGone
	case http.StatusRequestEntityTooLarge:
		return CodePayloadTooLarge
	case http.StatusTooManyRequests:
		return CodeTooManyRequests
	case http.StatusBadGateway, http.StatusServiceUnavailable:
		return CodeUpstreamUnavailable
	case http.StatusGatewayTimeout:
		return CodeUpstreamTimeout
	default:
		if status >= 200 && status < 400 {
			return CodeOK
		}
		if status >= 500 {
			return CodeInternalError
		}
		return CodeRequestFailed
	}
}

func BuildPayload(c *gin.Context, status int, code, message string, data interface{}, legacy gin.H) gin.H {
	payload := gin.H{
		"request_id": CurrentRequestID(c),
		"code":       NormalizeCode(code, status),
		"message":    NormalizeMessage(message, status),
		"data":       NormalizeData(data),
		"success":    status >= 200 && status < 400,
	}

	if status >= http.StatusBadRequest {
		payload["error"] = payload["message"]
	}

	for key, value := range legacy {
		if _, exists := payload[key]; exists {
			continue
		}
		payload[key] = value
	}

	return payload
}

func WriteJSON(c *gin.Context, status int, code, message string, data interface{}, legacy gin.H) {
	if c == nil {
		return
	}
	c.JSON(status, BuildPayload(c, status, code, message, data, legacy))
}
