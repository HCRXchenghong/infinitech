package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/apiresponse"
)

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		writeErrorEnvelope(c, http.StatusInternalServerError, apiresponse.CodeInternalError, "Internal Server Error", nil)
		c.Abort()
	})
}
