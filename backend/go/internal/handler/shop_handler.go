package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type ShopHandler struct {
	service *service.ShopService
}

func NewShopHandler(service *service.ShopService) *ShopHandler {
	return &ShopHandler{service: service}
}

// GetShopCategories 获取商家分类列表
func (h *ShopHandler) GetShopCategories(c *gin.Context) {
	categories, err := h.service.GetShopCategories(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}

// GetShops 获取商家列表
// @Summary 获取商家列表
// @Tags 商家
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /shops [get]
func (h *ShopHandler) GetShops(c *gin.Context) {
	category := c.Query("category")
	todayRecommended := parseQueryBool(c.Query("todayRecommended"))

	var (
		shops interface{}
		err   error
	)
	if todayRecommended {
		shops, err = h.service.GetTodayRecommendedShops(c.Request.Context())
	} else {
		shops, err = h.service.GetShops(c.Request.Context(), category)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, shops)
}

// GetTodayRecommendedShops 获取今日推荐商户列表
func (h *ShopHandler) GetTodayRecommendedShops(c *gin.Context) {
	shops, err := h.service.GetTodayRecommendedShops(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, shops)
}

// GetShopDetail 获取商家详情
func (h *ShopHandler) GetShopDetail(c *gin.Context) {
	id := c.Param("id")
	shop, err := h.service.GetShopDetail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, shop)
}

// GetShopMenu 获取商家菜单
func (h *ShopHandler) GetShopMenu(c *gin.Context) {
	id := c.Param("id")
	menu, err := h.service.GetShopMenu(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, menu)
}

// GetShopReviews 获取商家评价列表
func (h *ShopHandler) GetShopReviews(c *gin.Context) {
	shopID := c.Param("id")
	page := 1
	pageSize := 10

	// 从查询参数获取分页信息
	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	reviews, err := h.service.GetShopReviews(c.Request.Context(), shopID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reviews)
}

// GetMerchantShops 获取商户的店铺列表
func (h *ShopHandler) GetMerchantShops(c *gin.Context) {
	merchantID := c.Param("merchantId")
	shops, err := h.service.GetMerchantShops(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"shops": shops})
}

// CreateShop 创建店铺
func (h *ShopHandler) CreateShop(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	shop, err := h.service.CreateShop(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err, http.StatusInternalServerError)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "shop": shop})
}

// UpdateShop 更新店铺
func (h *ShopHandler) UpdateShop(c *gin.Context) {
	shopID := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	err := h.service.UpdateShop(c.Request.Context(), shopID, req)
	if err != nil {
		writeServiceError(c, err, http.StatusInternalServerError)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// MoveTodayRecommendPosition 调整今日推荐商户排名
func (h *ShopHandler) MoveTodayRecommendPosition(c *gin.Context) {
	shopID := c.Param("id")

	var req struct {
		Direction string `json:"direction" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.service.MoveTodayRecommendPosition(c.Request.Context(), shopID, req.Direction); err != nil {
		writeServiceError(c, err, http.StatusBadRequest)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DeleteShop 删除店铺
func (h *ShopHandler) DeleteShop(c *gin.Context) {
	shopID := c.Param("id")
	err := h.service.DeleteShop(c.Request.Context(), shopID)
	if err != nil {
		writeServiceError(c, err, http.StatusInternalServerError)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// CreateReview 创建评价
func (h *ShopHandler) CreateReview(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	review, err := h.service.CreateReview(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "review": review})
}

// UpdateReview 更新评价
func (h *ShopHandler) UpdateReview(c *gin.Context) {
	reviewID := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	err := h.service.UpdateReview(c.Request.Context(), reviewID, req)
	if err != nil {
		writeServiceError(c, err, http.StatusInternalServerError)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DeleteReview 删除评价
func (h *ShopHandler) DeleteReview(c *gin.Context) {
	reviewID := c.Param("id")
	err := h.service.DeleteReview(c.Request.Context(), reviewID)
	if err != nil {
		writeServiceError(c, err, http.StatusInternalServerError)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetUserFavorites 获取用户收藏店铺列表
func (h *ShopHandler) GetUserFavorites(c *gin.Context) {
	userID := c.Param("id")
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	result, err := h.service.GetUserFavorites(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// AddUserFavorite 添加用户收藏
func (h *ShopHandler) AddUserFavorite(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		ShopID      string `json:"shopId"`
		ShopIDSnake string `json:"shop_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	shopID := strings.TrimSpace(req.ShopID)
	if shopID == "" {
		shopID = strings.TrimSpace(req.ShopIDSnake)
	}
	if shopID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "shop_id 不能为空"})
		return
	}

	favorite, err := h.service.AddUserFavorite(c.Request.Context(), userID, shopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "favorite": favorite})
}

// DeleteUserFavorite 取消用户收藏
func (h *ShopHandler) DeleteUserFavorite(c *gin.Context) {
	userID := c.Param("id")
	shopID := c.Param("shopId")

	if err := h.service.DeleteUserFavorite(c.Request.Context(), userID, shopID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetUserFavoriteStatus 获取用户收藏状态
func (h *ShopHandler) GetUserFavoriteStatus(c *gin.Context) {
	userID := c.Param("id")
	shopID := c.Param("shopId")

	status, err := h.service.GetUserFavoriteStatus(c.Request.Context(), userID, shopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// GetUserReviews 获取用户评价列表
func (h *ShopHandler) GetUserReviews(c *gin.Context) {
	userID := c.Param("id")
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	reviews, err := h.service.GetUserReviews(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reviews)
}

func parseQueryBool(raw string) bool {
	value := strings.ToLower(strings.TrimSpace(raw))
	return value == "1" || value == "true" || value == "yes" || value == "y"
}

func writeServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrUnauthorized) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	c.JSON(fallbackStatus, gin.H{"error": err.Error()})
}
