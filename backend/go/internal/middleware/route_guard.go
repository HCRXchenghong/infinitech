package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type guardKind int

const (
	guardAdminOnly guardKind = iota
	guardMerchantOrAdmin
	guardMerchantSelfOrAdmin
	guardRiderOrAdmin
	guardRiderSelfOrAdmin
	guardUserOrAdmin
	guardUserSelfOrAdmin
	guardAnyAuth
)

type routeGuardRule struct {
	methods map[string]struct{}
	path    string
	prefix  bool
	guard   guardKind
	idParam string
}

func methods(vals ...string) map[string]struct{} {
	result := make(map[string]struct{}, len(vals))
	for _, m := range vals {
		normalized := strings.ToUpper(strings.TrimSpace(m))
		if normalized == "" {
			continue
		}
		result[normalized] = struct{}{}
	}
	return result
}

func adminDebugModeSettingsEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("ENABLE_ADMIN_DEBUG_MODE_SETTINGS")), "true")
}

func (r routeGuardRule) match(method, fullPath string) bool {
	if len(r.methods) > 0 {
		if _, ok := r.methods[strings.ToUpper(method)]; !ok {
			return false
		}
	}
	if r.prefix {
		return fullPath == r.path || strings.HasPrefix(fullPath, r.path+"/")
	}
	return fullPath == r.path
}

var routeGuardRules = []routeGuardRule{
	// 管理端登录接口公开
	// 商户按自身 ID 访问（需放在 /api/merchants 管理员前缀规则之前）
	{path: "/api/merchants/:merchantId/shops", methods: methods("GET"), guard: guardMerchantSelfOrAdmin, idParam: "merchantId"},
	// 商户团购专用路由（需放在 /api/merchant 管理员前缀规则之前）
	{path: "/api/merchant/groupbuy/vouchers/redeem-by-scan", methods: methods("POST"), guard: guardMerchantOrAdmin},
	{path: "/api/merchant/groupbuy/refunds", methods: methods("POST"), guard: guardMerchantOrAdmin},

	// 管理员端核心数据操作：必须管理员鉴权
	{path: "/api/admins", prefix: true, guard: guardAdminOnly},
	{path: "/api/users", prefix: true, guard: guardAdminOnly},
	{path: "/api/merchants", prefix: true, guard: guardAdminOnly},
	{path: "/api/merchant", prefix: true, guard: guardAdminOnly},
	{path: "/api/reorganize-role-ids", prefix: true, guard: guardAdminOnly},
	{path: "/api/stats", guard: guardAdminOnly},
	{path: "/api/user-ranks", guard: guardAdminOnly},
	{path: "/api/rider-ranks", guard: guardAdminOnly},
	{path: "/api/sms-config", guard: guardAdminOnly},
	{path: "/api/sms/codes", methods: methods("GET"), guard: guardAdminOnly},
	{path: "/api/weather-config", guard: guardAdminOnly},
	{path: "/api/wechat-login-config", guard: guardAdminOnly},
	{path: "/api/service-settings", guard: guardAdminOnly},
	{path: "/api/charity-settings", guard: guardAdminOnly},
	{path: "/api/vip-settings", guard: guardAdminOnly},
	{path: "/api/coin-ratio", guard: guardAdminOnly},
	{path: "/api/pay-config", prefix: true, guard: guardAdminOnly},
	{path: "/api/carousel-settings", guard: guardAdminOnly},
	{path: "/api/carousel", prefix: true, guard: guardAdminOnly},
	{path: "/api/push-messages", prefix: true, guard: guardAdminOnly},
	{path: "/api/public-apis", prefix: true, guard: guardAdminOnly},
	{path: "/api/data-exports", prefix: true, guard: guardAdminOnly},
	{path: "/api/data-imports", prefix: true, guard: guardAdminOnly},
	{path: "/api/upload-image", guard: guardAdminOnly},
	{path: "/api/app-download-config", methods: methods("POST"), guard: guardAdminOnly},
	{path: "/api/upload/package", methods: methods("POST"), guard: guardAdminOnly},
	{path: "/api/system-logs", prefix: true, guard: guardAdminOnly},
	{path: "/api/recharge", guard: guardAdminOnly},
	{path: "/api/notifications/admin", prefix: true, guard: guardAdminOnly},
	{path: "/api/featured-products", methods: methods("POST"), guard: guardAdminOnly},
	{path: "/api/featured-products/:id", methods: methods("DELETE"), guard: guardAdminOnly},
	{path: "/api/featured-products/:id/position", methods: methods("PUT"), guard: guardAdminOnly},
	{path: "/api/home-campaigns", methods: methods("GET", "POST"), guard: guardAdminOnly},
	{path: "/api/home-campaigns/:id", methods: methods("PUT"), guard: guardAdminOnly},
	{path: "/api/home-campaigns/:id/:action", methods: methods("POST"), guard: guardAdminOnly},
	{path: "/api/home-slots", methods: methods("GET", "PUT"), guard: guardAdminOnly},
	{path: "/api/admin/onboarding/invites", prefix: true, guard: guardAdminOnly},
	{path: "/api/admin/coupons", prefix: true, guard: guardAdminOnly},
	{path: "/api/admin/financial", prefix: true, guard: guardAdminOnly},
	{path: "/api/admin/official-site", prefix: true, guard: guardAdminOnly},
	{path: "/api/admin/contact-phone-audits", prefix: true, guard: guardAdminOnly},
	{path: "/api/admin/rtc-call-audits", prefix: true, guard: guardAdminOnly},
	{path: "/api/admin/wallet", prefix: true, guard: guardAdminOnly},
	{path: "/api/admin/clear-all-data", methods: methods("POST"), guard: guardAdminOnly},
	{path: "/api/after-sales/clear", methods: methods("POST"), guard: guardAdminOnly},
	{path: "/api/orders", methods: methods("GET"), guard: guardMerchantOrAdmin},
	{path: "/api/orders/export", guard: guardAdminOnly},
	{path: "/api/orders/import", guard: guardAdminOnly},
	{path: "/api/orders/delete-all", guard: guardAdminOnly},
	{path: "/api/riders", methods: methods("GET", "POST"), guard: guardAdminOnly},
	{path: "/api/riders/:id", methods: methods("GET", "PUT", "DELETE"), guard: guardAdminOnly},
	{path: "/api/riders/:id/status", guard: guardAdminOnly},
	{path: "/api/riders/:id/stats", methods: methods("GET"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/earnings", methods: methods("GET"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/orders", methods: methods("GET"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/orders/available", methods: methods("GET"), guard: guardRiderOrAdmin},
	{path: "/api/rider-reviews", methods: methods("POST"), guard: guardAdminOnly},
	{path: "/api/rider-reviews/:id", methods: methods("PUT", "DELETE"), guard: guardAdminOnly},
	{path: "/api/riders/:id/reviews", methods: methods("GET"), guard: guardAdminOnly},
	{path: "/api/riders/:id/reset-password", guard: guardAdminOnly},
	{path: "/api/riders/:id/delete-orders", guard: guardAdminOnly},
	{path: "/api/riders/delete-all", guard: guardAdminOnly},
	{path: "/api/riders/export", guard: guardAdminOnly},
	{path: "/api/riders/import", guard: guardAdminOnly},
	{path: "/api/cooperations", methods: methods("GET", "PUT"), guard: guardAdminOnly},

	// 商户写操作
	{path: "/api/shops", methods: methods("POST"), guard: guardMerchantOrAdmin},
	{path: "/api/shops/:id", methods: methods("PUT", "DELETE"), guard: guardMerchantOrAdmin},
	{path: "/api/shops/:id/today-recommend/move", methods: methods("POST"), guard: guardMerchantOrAdmin},
	{path: "/api/coupons", methods: methods("POST"), guard: guardMerchantOrAdmin},
	{path: "/api/coupons/:id", methods: methods("PUT", "DELETE"), guard: guardMerchantOrAdmin},
	{path: "/api/categories", methods: methods("POST"), guard: guardMerchantOrAdmin},
	{path: "/api/categories/:id", methods: methods("PUT", "DELETE"), guard: guardMerchantOrAdmin},
	{path: "/api/products", methods: methods("POST"), guard: guardMerchantOrAdmin},
	{path: "/api/products/:id", methods: methods("PUT", "DELETE"), guard: guardMerchantOrAdmin},
	{path: "/api/banners", methods: methods("POST"), guard: guardMerchantOrAdmin},
	{path: "/api/banners/:id", methods: methods("PUT", "DELETE"), guard: guardMerchantOrAdmin},
	{path: "/api/reviews/:id", methods: methods("PUT", "DELETE"), guard: guardMerchantOrAdmin},
	{path: "/api/orders/:id/dispatch", methods: methods("POST"), guard: guardMerchantOrAdmin},
	{path: "/api/after-sales", methods: methods("GET"), guard: guardMerchantOrAdmin},
	{path: "/api/after-sales/:id/status", methods: methods("PUT"), guard: guardMerchantOrAdmin},
	{path: "/api/upload", methods: methods("POST"), guard: guardAnyAuth},
	{path: "/api/upload/image", methods: methods("POST"), guard: guardMerchantOrAdmin},

	// 骑手写操作
	{path: "/api/orders/:id/accept", methods: methods("POST"), guard: guardRiderOrAdmin},
	{path: "/api/orders/:id/pickup", methods: methods("POST"), guard: guardRiderOrAdmin},
	{path: "/api/orders/:id/deliver", methods: methods("POST"), guard: guardRiderOrAdmin},
	{path: "/api/orders/:id/exception-report", methods: methods("POST"), guard: guardRiderOrAdmin},

	// 骑手按自身 ID 访问
	{path: "/api/riders/:id/avatar", methods: methods("PUT"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/profile", methods: methods("GET", "PUT"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/cert", methods: methods("GET", "POST"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/change-phone", methods: methods("POST"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/change-password", methods: methods("POST"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/rank", methods: methods("GET"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/online-status", methods: methods("PUT"), guard: guardRiderSelfOrAdmin, idParam: "id"},
	{path: "/api/riders/:id/heartbeat", methods: methods("POST"), guard: guardRiderSelfOrAdmin, idParam: "id"},

	// 用户操作
	{path: "/api/orders", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/orders/:id/reviewed", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/orders/:id", methods: methods("GET"), guard: guardAnyAuth},
	{path: "/api/after-sales", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/groupbuy/vouchers", methods: methods("GET"), guard: guardUserOrAdmin},
	{path: "/api/groupbuy/vouchers/:id/qrcode", methods: methods("GET"), guard: guardUserOrAdmin},
	{path: "/api/notifications", methods: methods("GET"), guard: guardAnyAuth},
	{path: "/api/notifications/:id", methods: methods("GET"), guard: guardAnyAuth},
	{path: "/api/notifications/:id/read", methods: methods("POST"), guard: guardAnyAuth},
	{path: "/api/notifications/read-all", methods: methods("POST"), guard: guardAnyAuth},
	{path: "/api/op-notifications", methods: methods("GET"), guard: guardAnyAuth},
	{path: "/api/op-notifications/:id/read", methods: methods("POST"), guard: guardAnyAuth},
	{path: "/api/coupons/:couponId/receive", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/coupons/user", methods: methods("GET"), guard: guardUserOrAdmin},
	{path: "/api/coupons/available", methods: methods("GET"), guard: guardUserOrAdmin},
	{path: "/api/reviews", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/rider-reviews/submit", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/points/balance", methods: methods("GET"), guard: guardUserOrAdmin},
	{path: "/api/points/redeem", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/points/earn", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/points/refund", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/dining-buddy", prefix: true, guard: guardUserOrAdmin},
	{path: "/api/medicine", prefix: true, guard: guardUserOrAdmin},
	{path: "/api/points/redemptions", methods: methods("GET"), guard: guardAdminOnly},
	{path: "/api/invite/code", methods: methods("GET"), guard: guardUserOrAdmin},
	{path: "/api/invite/share", methods: methods("POST"), guard: guardUserOrAdmin},
	{path: "/api/invite/codes", methods: methods("GET"), guard: guardAdminOnly},
	{path: "/api/invite/records", methods: methods("GET"), guard: guardAdminOnly},
	{path: "/api/messages", prefix: true, guard: guardAnyAuth},
	{path: "/api/rtc/calls", methods: methods("POST"), guard: guardAnyAuth},
	{path: "/api/rtc/calls/history", methods: methods("GET"), guard: guardAnyAuth},
	{path: "/api/rtc/calls/:callId", methods: methods("GET"), guard: guardAnyAuth},
	{path: "/api/rtc/calls/:callId/status", methods: methods("POST"), guard: guardAnyAuth},
	{path: "/api/contact/phone-clicks", methods: methods("POST"), guard: guardAnyAuth},
	{path: "/api/mobile/push", prefix: true, guard: guardAnyAuth},
	{path: "/api/wallet", prefix: true, guard: guardAnyAuth},

	// 用户按自身 ID 访问
	{path: "/api/user/:id", methods: methods("GET", "PUT"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/change-phone", methods: methods("POST"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/addresses", methods: methods("GET", "POST"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/addresses/default", methods: methods("GET"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/addresses/:addressId", methods: methods("PUT", "DELETE"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/addresses/:addressId/default", methods: methods("POST"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/favorites", methods: methods("GET", "POST"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/favorites/:shopId", methods: methods("DELETE"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/favorites/:shopId/status", methods: methods("GET"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/user/:id/reviews", methods: methods("GET"), guard: guardUserSelfOrAdmin, idParam: "id"},
	{path: "/api/orders/user/:userId", methods: methods("GET"), guard: guardUserSelfOrAdmin, idParam: "userId"},
	{path: "/api/after-sales/user/:userId", methods: methods("GET"), guard: guardUserSelfOrAdmin, idParam: "userId"},

	// 管理积分处理
	{path: "/api/points/goods", methods: methods("POST"), guard: guardAdminOnly},
	{path: "/api/points/goods/:id", methods: methods("PUT", "DELETE"), guard: guardAdminOnly},
	{path: "/api/points/redemptions/:id", methods: methods("PUT"), guard: guardAdminOnly},
}

func init() {
	if adminDebugModeSettingsEnabled() {
		routeGuardRules = append(routeGuardRules, routeGuardRule{
			path:  "/api/debug-mode",
			guard: guardAdminOnly,
		})
	}
}

// RequireRouteGuards 为敏感路由提供统一鉴权保护，避免遗漏。
func RequireRouteGuards(authService *service.AuthService, adminService *service.AdminService) gin.HandlerFunc {
	return func(c *gin.Context) {
		fullPath := strings.TrimSpace(c.FullPath())
		if fullPath == "" {
			c.Next()
			return
		}

		method := strings.ToUpper(strings.TrimSpace(c.Request.Method))
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))

		for _, rule := range routeGuardRules {
			if !rule.match(method, fullPath) {
				continue
			}
			enforceRule(c, rule, authHeader, authService, adminService)
			return
		}

		c.Next()
	}
}

func enforceRule(c *gin.Context, rule routeGuardRule, authHeader string, authService *service.AuthService, adminService *service.AdminService) {
	switch rule.guard {
	case guardAdminOnly:
		if tryAdmin(c, authHeader, adminService) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		abortUnauthorized(c, "管理员鉴权失败")
		return

	case guardMerchantOrAdmin:
		if tryMerchant(c, authHeader, authService, "") {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryAdmin(c, authHeader, adminService) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		abortUnauthorized(c, "商户鉴权失败或账号已删除")
		return

	case guardMerchantSelfOrAdmin:
		if tryMerchant(c, authHeader, authService, rule.idParam) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryAdmin(c, authHeader, adminService) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		abortUnauthorized(c, "商户鉴权失败或账号已删除")
		return

	case guardRiderOrAdmin:
		if tryRider(c, authHeader, authService, "") {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryAdmin(c, authHeader, adminService) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		abortUnauthorized(c, "骑手鉴权失败或账号已删除")
		return

	case guardRiderSelfOrAdmin:
		if tryRider(c, authHeader, authService, rule.idParam) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryAdmin(c, authHeader, adminService) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		abortUnauthorized(c, "骑手鉴权失败或账号已删除")
		return

	case guardUserOrAdmin:
		if tryUser(c, authHeader, authService, "") {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryAdmin(c, authHeader, adminService) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		abortUnauthorized(c, "用户鉴权失败或账号已删除")
		return

	case guardUserSelfOrAdmin:
		if tryUser(c, authHeader, authService, rule.idParam) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryAdmin(c, authHeader, adminService) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		abortUnauthorized(c, "用户鉴权失败或账号已删除")
		return

	case guardAnyAuth:
		if tryAdmin(c, authHeader, adminService) {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryMerchant(c, authHeader, authService, "") {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryRider(c, authHeader, authService, "") {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		if tryUser(c, authHeader, authService, "") {
			c.Next()
			return
		}
		if c.IsAborted() {
			return
		}
		abortUnauthorized(c, "鉴权失败")
		return

	default:
		c.Next()
	}
}

func tryAdmin(c *gin.Context, authHeader string, adminService *service.AdminService) bool {
	if strings.TrimSpace(authHeader) == "" || adminService == nil {
		return false
	}
	admin, err := adminService.VerifyToken(c.Request.Context(), authHeader)
	if err != nil || admin == nil {
		return false
	}
	c.Set("admin_id", admin.ID)
	c.Set("admin_name", admin.Name)
	c.Set("operator_role", "admin")
	setRequestContextValue(c, "admin_id", admin.ID)
	setRequestContextValue(c, "admin_name", admin.Name)
	setRequestContextValue(c, "operator_role", "admin")
	return true
}

func tryMerchant(c *gin.Context, authHeader string, authService *service.AuthService, idParam string) bool {
	if strings.TrimSpace(authHeader) == "" || authService == nil {
		return false
	}
	valid, phone, merchantID, err := authService.VerifyMerchantToken(authHeader)
	if err != nil || !valid {
		return false
	}
	if ok := checkSelfParam(c, idParam, merchantID, authService, "merchant"); !ok {
		return false
	}
	if ok := checkIdentityFields(c, []string{"merchantId", "merchant_id"}, merchantID, phone); !ok {
		return false
	}
	if ok := checkWalletIdentity(c, merchantID, phone, "merchant"); !ok {
		return false
	}
	c.Set("merchant_id", merchantID)
	c.Set("merchant_phone", phone)
	c.Set("operator_role", "merchant")
	setRequestContextValue(c, "merchant_id", merchantID)
	setRequestContextValue(c, "merchant_phone", phone)
	setRequestContextValue(c, "operator_role", "merchant")
	return true
}

func tryRider(c *gin.Context, authHeader string, authService *service.AuthService, idParam string) bool {
	if strings.TrimSpace(authHeader) == "" || authService == nil {
		return false
	}
	valid, phone, riderID, err := authService.VerifyRiderToken(authHeader)
	if err != nil || !valid {
		return false
	}
	if ok := checkSelfParam(c, idParam, riderID, authService, "rider"); !ok {
		return false
	}
	if ok := checkIdentityFields(c, []string{"riderId", "rider_id"}, riderID, phone); !ok {
		return false
	}
	if ok := checkWalletIdentity(c, riderID, phone, "rider"); !ok {
		return false
	}
	c.Set("rider_id", riderID)
	c.Set("rider_phone", phone)
	c.Set("operator_role", "rider")
	setRequestContextValue(c, "rider_id", riderID)
	setRequestContextValue(c, "rider_phone", phone)
	setRequestContextValue(c, "operator_role", "rider")
	return true
}

func tryUser(c *gin.Context, authHeader string, authService *service.AuthService, idParam string) bool {
	if strings.TrimSpace(authHeader) == "" || authService == nil {
		return false
	}
	valid, phone, userID, err := authService.VerifyUserToken(authHeader)
	if err != nil || !valid {
		return false
	}
	if ok := checkSelfParam(c, idParam, userID, authService, "user"); !ok {
		return false
	}
	if ok := checkIdentityFields(c, []string{"userId", "user_id"}, userID, phone); !ok {
		return false
	}
	if ok := checkWalletIdentity(c, userID, phone, "customer"); !ok {
		return false
	}
	c.Set("user_id", userID)
	c.Set("user_phone", phone)
	c.Set("operator_role", "user")
	setRequestContextValue(c, "user_id", userID)
	setRequestContextValue(c, "user_phone", phone)
	setRequestContextValue(c, "operator_role", "user")
	return true
}

func setRequestContextValue(c *gin.Context, key string, value interface{}) {
	if c == nil || c.Request == nil || strings.TrimSpace(key) == "" {
		return
	}
	nextCtx := context.WithValue(c.Request.Context(), key, value)
	c.Request = c.Request.WithContext(nextCtx)
}

func checkSelfParam(c *gin.Context, param string, expectedID int64, authService *service.AuthService, entityType string) bool {
	if strings.TrimSpace(param) == "" {
		return true
	}
	raw := strings.TrimSpace(c.Param(param))
	if raw == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数缺失",
		})
		return false
	}
	if targetID, err := strconv.ParseInt(raw, 10, 64); err == nil && targetID > 0 {
		if targetID == expectedID {
			return true
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "无权访问该账号数据",
		})
		return false
	}

	if authService != nil && authService.MatchEntityIdentifier(c.Request.Context(), entityType, expectedID, raw) {
		return true
	}

	c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
		"success": false,
		"error":   "请求参数非法",
	})
	return false
}

func checkIdentityFields(c *gin.Context, keys []string, expectedID int64, expectedPhone string) bool {
	if len(keys) == 0 || expectedID <= 0 {
		return true
	}

	values := collectIdentityValues(c, keys)
	if len(values) == 0 {
		return true
	}

	for _, raw := range values {
		if identityMatches(raw, expectedID, expectedPhone) {
			continue
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "请求中的账号标识与登录身份不一致",
		})
		return false
	}

	return true
}

func checkWalletIdentity(c *gin.Context, expectedID int64, expectedPhone string, allowedTypes ...string) bool {
	fullPath := strings.TrimSpace(c.FullPath())
	if !strings.HasPrefix(fullPath, "/api/wallet") {
		return true
	}

	userValues := collectIdentityValues(c, []string{"userId", "user_id"})
	if len(userValues) == 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "wallet 请求缺少 userId",
		})
		return false
	}
	for _, raw := range userValues {
		if identityMatches(raw, expectedID, expectedPhone) {
			continue
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "wallet 请求中的账号标识与登录身份不一致",
		})
		return false
	}

	typeSet := make(map[string]struct{}, len(allowedTypes))
	for _, item := range allowedTypes {
		normalized := normalizeWalletUserType(item)
		if normalized == "" {
			continue
		}
		typeSet[normalized] = struct{}{}
	}
	if len(typeSet) == 0 {
		return true
	}

	typeValues := collectIdentityValues(c, []string{"userType", "user_type"})
	for _, raw := range typeValues {
		normalized := normalizeWalletUserType(raw)
		if normalized == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "wallet 请求中的账号类型非法",
			})
			return false
		}
		if _, ok := typeSet[normalized]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "wallet 请求中的账号类型与登录身份不一致",
			})
			return false
		}
	}

	return true
}

func normalizeWalletUserType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "user", "customer":
		return "customer"
	case "rider", "merchant":
		return value
	default:
		return ""
	}
}

func collectIdentityValues(c *gin.Context, keys []string) []string {
	values := make([]string, 0, len(keys))

	for _, key := range keys {
		if raw := strings.TrimSpace(c.Query(key)); raw != "" {
			values = append(values, raw)
		}
	}

	body := readJSONBodyMap(c)
	for _, key := range keys {
		if body == nil {
			break
		}
		raw := identityValueToString(body[key])
		if raw == "" {
			continue
		}
		values = append(values, raw)
	}

	return values
}

func readJSONBodyMap(c *gin.Context) map[string]interface{} {
	const cacheKey = "__route_guard_json_body"

	if cached, ok := c.Get(cacheKey); ok {
		body, _ := cached.(map[string]interface{})
		return body
	}

	contentType := strings.ToLower(strings.TrimSpace(c.GetHeader("Content-Type")))
	if !strings.Contains(contentType, "application/json") {
		c.Set(cacheKey, map[string]interface{}{})
		return nil
	}

	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Request.Body = io.NopCloser(bytes.NewReader(nil))
		c.Set(cacheKey, map[string]interface{}{})
		return nil
	}
	c.Request.Body = io.NopCloser(bytes.NewReader(raw))

	if len(raw) == 0 {
		c.Set(cacheKey, map[string]interface{}{})
		return nil
	}

	payload := map[string]interface{}{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		c.Set(cacheKey, map[string]interface{}{})
		return nil
	}

	c.Set(cacheKey, payload)
	return payload
}

func identityValueToString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	case float64:
		return strconv.FormatInt(int64(v), 10)
	case float32:
		return strconv.FormatInt(int64(v), 10)
	case int:
		return strconv.FormatInt(int64(v), 10)
	case int8:
		return strconv.FormatInt(int64(v), 10)
	case int16:
		return strconv.FormatInt(int64(v), 10)
	case int32:
		return strconv.FormatInt(int64(v), 10)
	case int64:
		return strconv.FormatInt(v, 10)
	case uint:
		return strconv.FormatUint(uint64(v), 10)
	case uint8:
		return strconv.FormatUint(uint64(v), 10)
	case uint16:
		return strconv.FormatUint(uint64(v), 10)
	case uint32:
		return strconv.FormatUint(uint64(v), 10)
	case uint64:
		return strconv.FormatUint(v, 10)
	case json.Number:
		return strings.TrimSpace(v.String())
	default:
		return ""
	}
}

func identityMatches(raw string, expectedID int64, expectedPhone string) bool {
	value := strings.TrimSpace(raw)
	if value == "" {
		return true
	}

	if expectedPhone != "" && value == strings.TrimSpace(expectedPhone) {
		return true
	}

	targetID, err := strconv.ParseInt(value, 10, 64)
	if err != nil || targetID <= 0 {
		return false
	}

	return targetID == expectedID
}

func abortUnauthorized(c *gin.Context, message string) {
	if strings.TrimSpace(message) == "" {
		message = "鉴权失败"
	}
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"success": false,
		"error":   message,
	})
}
