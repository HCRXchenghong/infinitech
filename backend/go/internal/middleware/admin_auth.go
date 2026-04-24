package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

// RequireAdmin enforces admin token auth on protected routes.
func RequireAdmin(adminService *service.AdminService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authHeader == "" {
			abortUnauthorized(c, "缺少管理员鉴权信息")
			return
		}

		admin, err := adminService.VerifyToken(c.Request.Context(), authHeader)
		if err != nil {
			abortUnauthorized(c, "管理员鉴权失败")
			return
		}

		c.Set("admin_id", admin.ID)
		c.Set("admin_name", admin.Name)
		c.Next()
	}
}
