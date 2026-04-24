package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/apiresponse"
)

const (
	responseCodeOK              = apiresponse.CodeOK
	responseCodeInvalidArgument = apiresponse.CodeInvalidArgument
	responseCodeUnauthorized    = apiresponse.CodeUnauthorized
	responseCodeForbidden       = apiresponse.CodeForbidden
	responseCodeNotFound        = apiresponse.CodeNotFound
	responseCodeConflict        = apiresponse.CodeConflict
	responseCodeGone            = apiresponse.CodeGone
	responseCodeInternalError   = apiresponse.CodeInternalError
)

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

func buildEnvelopePayload(c *gin.Context, status int, code, message string, data interface{}, legacy gin.H) gin.H {
	return apiresponse.BuildPayload(c, status, code, message, data, legacy)
}

func respondEnvelope(c *gin.Context, status int, code, message string, data interface{}, legacy gin.H) {
	apiresponse.WriteJSON(c, status, code, message, data, legacy)
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
	apiresponse.WriteJSON(c, status, code, message, data, legacy)
}
