package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type AuthHandler struct {
	service *service.AuthService
}

func NewAuthHandler(service *service.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ [Auth Handler] 参数绑定失败: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	log.Printf("📱 [Auth Handler] 收到登录请求: phone=%s, hasCode=%v, hasPassword=%v",
		req.Phone, req.Code != "", req.Password != "")

	result, err := h.service.Login(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("❌ [Auth Handler] 登录失败: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	log.Printf("✅ [Auth Handler] 登录成功: phone=%s", req.Phone)
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) RiderLogin(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ [Rider Auth] 参数绑定失败: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	log.Printf("📱 [Rider Auth] 收到骑手登录请求: phone=%s, hasCode=%v, hasPassword=%v",
		req.Phone, req.Code != "", req.Password != "")

	result, err := h.service.RiderLogin(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("❌ [Rider Auth] 骑手登录失败: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	log.Printf("✅ [Rider Auth] 骑手登录成功: phone=%s", req.Phone)
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) MerchantLogin(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ [Merchant Auth] 参数绑定失败: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	log.Printf("📱 [Merchant Auth] 收到商户登录请求: phone=%s, hasCode=%v, hasPassword=%v",
		req.Phone, req.Code != "", req.Password != "")

	result, err := h.service.MerchantLogin(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("❌ [Merchant Auth] 商户登录失败: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	log.Printf("✅ [Merchant Auth] 商户登录成功: phone=%s", req.Phone)
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) SetNewPassword(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	result, err := h.service.SetNewPassword(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, result)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) RiderSetNewPassword(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	result, err := h.service.RiderSetNewPassword(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, result)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) MerchantSetNewPassword(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	result, err := h.service.MerchantSetNewPassword(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, result)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) VerifyToken(c *gin.Context) {
	// 从 Authorization header 获取 token
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "missing authorization header",
		})
		return
	}

	// 移除 "Bearer " 前缀
	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	// 验证 token
	valid, phone, userId, err := h.service.VerifyToken(token)
	if err != nil || !valid {
		log.Printf("❌ [Auth Handler] Token验证失败: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "invalid or expired token",
		})
		return
	}

	log.Printf("✅ [Auth Handler] Token验证成功: phone=%s, userId=%d", phone, userId)
	c.JSON(http.StatusOK, gin.H{
		"valid":  true,
		"phone":  phone,
		"userId": userId,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ [Auth Handler] 刷新Token参数错误: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
		})
		return
	}

	if req.RefreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "refresh token is required",
		})
		return
	}

	log.Printf("🔄 [Auth Handler] 收到刷新Token请求")

	result, err := h.service.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		log.Printf("❌ [Auth Handler] 刷新Token失败: %v", err)
		c.JSON(http.StatusUnauthorized, result)
		return
	}

	log.Printf("✅ [Auth Handler] Token刷新成功")
	c.JSON(http.StatusOK, result)
}
