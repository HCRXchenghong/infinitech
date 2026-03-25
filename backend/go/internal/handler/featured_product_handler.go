package handler

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type FeaturedProductHandler struct {
	service service.FeaturedProductService
}

func NewFeaturedProductHandler(service service.FeaturedProductService) *FeaturedProductHandler {
	return &FeaturedProductHandler{service: service}
}

// GetFeaturedProducts 获取今日推荐商品列表
func (h *FeaturedProductHandler) GetFeaturedProducts(c *gin.Context) {
	ctx := c.Request.Context()

	products, err := h.service.GetFeaturedProducts(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get featured products",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
	})
}

// AddFeaturedProduct 添加今日推荐商品
func (h *FeaturedProductHandler) AddFeaturedProduct(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		ProductID interface{} `json:"product_id" binding:"required"`
		Position  int         `json:"position"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	productID := strings.TrimSpace(fmt.Sprintf("%v", req.ProductID))
	if productID == "" || productID == "<nil>" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid product ID",
		})
		return
	}

	if err := h.service.AddFeaturedProduct(ctx, productID, req.Position); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to add featured product",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Featured product added successfully",
	})
}

// RemoveFeaturedProduct 删除今日推荐商品
func (h *FeaturedProductHandler) RemoveFeaturedProduct(c *gin.Context) {
	ctx := c.Request.Context()

	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ID",
		})
		return
	}

	if err := h.service.RemoveFeaturedProduct(ctx, idStr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to remove featured product",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Featured product removed successfully",
	})
}

// UpdateFeaturedProductPosition 更新推荐位置
func (h *FeaturedProductHandler) UpdateFeaturedProductPosition(c *gin.Context) {
	ctx := c.Request.Context()

	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ID",
		})
		return
	}

	var req struct {
		Position int `json:"position" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	if err := h.service.UpdateFeaturedProductPosition(ctx, idStr, req.Position); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update position",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Position updated successfully",
	})
}
