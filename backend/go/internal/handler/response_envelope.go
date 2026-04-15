package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	responseCodeOK              = "OK"
	responseCodeInvalidArgument = "INVALID_ARGUMENT"
	responseCodeUnauthorized    = "UNAUTHORIZED"
	responseCodeForbidden       = "FORBIDDEN"
	responseCodeNotFound        = "NOT_FOUND"
	responseCodeConflict        = "CONFLICT"
	responseCodeGone            = "GONE"
	responseCodeInternalError   = "INTERNAL_ERROR"
)

func currentRequestID(c *gin.Context) string {
	if c == nil {
		return ""
	}

	requestID := strings.TrimSpace(c.GetString("request_id"))
	if requestID != "" {
		return requestID
	}
	return strings.TrimSpace(c.GetHeader("X-Request-ID"))
}

func normalizeResponseData(data interface{}) interface{} {
	if data == nil {
		return gin.H{}
	}
	return data
}

func legacyEnvelopeFields(data interface{}) gin.H {
	switch typed := data.(type) {
	case gin.H:
		return typed
	case map[string]interface{}:
		return gin.H(typed)
	default:
		return nil
	}
}

func mirroredEnvelopeFields(data interface{}) gin.H {
	if legacy := legacyEnvelopeFields(data); legacy != nil {
		return legacy
	}
	if data == nil {
		return nil
	}

	raw, err := json.Marshal(data)
	if err != nil {
		return nil
	}

	legacy := map[string]interface{}{}
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return nil
	}
	return gin.H(legacy)
}

func normalizeResponseMessage(message string, status int) string {
	message = strings.TrimSpace(message)
	if message != "" {
		return message
	}
	if status >= 200 && status < 400 {
		return "ok"
	}
	return "request failed"
}

func normalizeResponseCode(code string, status int) string {
	code = strings.TrimSpace(code)
	if code != "" {
		return code
	}
	if status >= 200 && status < 400 {
		return responseCodeOK
	}
	return responseCodeInternalError
}

func buildEnvelopePayload(c *gin.Context, status int, code, message string, data interface{}, legacy gin.H) gin.H {
	payload := gin.H{
		"request_id": currentRequestID(c),
		"code":       normalizeResponseCode(code, status),
		"message":    normalizeResponseMessage(message, status),
		"data":       normalizeResponseData(data),
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

func respondEnvelope(c *gin.Context, status int, code, message string, data interface{}, legacy gin.H) {
	c.JSON(status, buildEnvelopePayload(c, status, code, message, data, legacy))
}

func respondSuccessEnvelope(c *gin.Context, message string, data interface{}, legacy gin.H) {
	respondEnvelope(c, http.StatusOK, responseCodeOK, message, data, legacy)
}

func respondMirroredSuccessEnvelope(c *gin.Context, message string, data interface{}) {
	respondSuccessEnvelope(c, message, data, mirroredEnvelopeFields(data))
}

func respondPaginatedEnvelope(c *gin.Context, code, message, listKey string, items interface{}, total int64, page, limit int) {
	data := gin.H{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	}
	legacy := gin.H{
		listKey: items,
		"total": total,
		"page":  page,
		"limit": limit,
	}
	respondEnvelope(c, http.StatusOK, code, message, data, legacy)
}

func respondCreatedEnvelope(c *gin.Context, code, message string, data interface{}, legacy gin.H) {
	respondEnvelope(c, http.StatusCreated, code, message, data, legacy)
}

func respondErrorEnvelope(c *gin.Context, status int, code, message string, legacy gin.H) {
	respondEnvelope(c, status, code, message, gin.H{}, legacy)
}

func respondSensitiveEnvelope(c *gin.Context, status int, code, message string, data interface{}, legacy gin.H) {
	writeSensitiveResponseHeaders(c)
	c.JSON(status, buildEnvelopePayload(c, status, code, message, data, legacy))
}
