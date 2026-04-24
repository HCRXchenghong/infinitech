package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

// RequireMerchantOrAdmin enforces merchant/admin token auth on protected routes.
func RequireMerchantOrAdmin(authService *service.AuthService, adminService *service.AdminService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authHeader == "" {
			abortUnauthorized(c, "缺少鉴权信息")
			return
		}

		if adminService != nil {
			if admin, err := adminService.VerifyToken(c.Request.Context(), authHeader); err == nil && admin != nil {
				c.Set("admin_id", admin.ID)
				c.Set("admin_name", admin.Name)
				c.Set("operator_role", "admin")
				c.Next()
				return
			}
		}

		if authService != nil {
			if valid, phone, merchantID, err := authService.VerifyMerchantToken(authHeader); err == nil && valid {
				c.Set("merchant_id", merchantID)
				c.Set("merchant_phone", phone)
				c.Set("operator_role", "merchant")
				c.Next()
				return
			}
		}

		abortUnauthorized(c, "商户鉴权失败或账号已删除")
	}
}
