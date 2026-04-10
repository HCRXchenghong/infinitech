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
		log.Printf("[Auth Handler] login bind failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	log.Printf("[Auth Handler] login request: phone=%s hasCode=%v hasPassword=%v", maskPhoneForLog(req.Phone), req.Code != "", req.Password != "")

	result, err := h.service.Login(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("[Auth Handler] login failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	log.Printf("[Auth Handler] login success: phone=%s", maskPhoneForLog(req.Phone))
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	result, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
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
		log.Printf("[Rider Auth] bind failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	log.Printf("[Rider Auth] login request: phone=%s hasCode=%v hasPassword=%v", maskPhoneForLog(req.Phone), req.Code != "", req.Password != "")

	result, err := h.service.RiderLogin(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("[Rider Auth] login failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	log.Printf("[Rider Auth] login success: phone=%s", maskPhoneForLog(req.Phone))
	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) MerchantLogin(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[Merchant Auth] bind failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数错误",
			"message": err.Error(),
		})
		return
	}

	log.Printf("[Merchant Auth] login request: phone=%s hasCode=%v hasPassword=%v", maskPhoneForLog(req.Phone), req.Code != "", req.Password != "")

	result, err := h.service.MerchantLogin(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		log.Printf("[Merchant Auth] login failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	log.Printf("[Merchant Auth] login success: phone=%s", maskPhoneForLog(req.Phone))
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
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "missing authorization header",
		})
		return
	}

	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	valid, phone, userID, err := h.service.VerifyToken(token)
	if err != nil || !valid {
		log.Printf("[Auth Handler] token verify failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"valid": false,
			"error": "invalid or expired token",
		})
		return
	}

	log.Printf("[Auth Handler] token verify success: phone=%s userId=%d", maskPhoneForLog(phone), userID)
	c.JSON(http.StatusOK, gin.H{
		"valid":  true,
		"phone":  phone,
		"userId": userID,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[Auth Handler] refresh token bind failed: %v", err)
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

	log.Printf("[Auth Handler] refresh token request")
	result, err := h.service.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		log.Printf("[Auth Handler] refresh token failed: %v", err)
		c.JSON(http.StatusUnauthorized, result)
		return
	}

	log.Printf("[Auth Handler] refresh token success")
	c.JSON(http.StatusOK, result)
}
