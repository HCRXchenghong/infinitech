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

func respondFeaturedProductError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondFeaturedProductInvalidRequest(c *gin.Context, message string) {
	respondFeaturedProductError(c, http.StatusBadRequest, message)
}

func respondFeaturedProductSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

// GetFeaturedProducts 获取今日推荐商品列表
func (h *FeaturedProductHandler) GetFeaturedProducts(c *gin.Context) {
	ctx := c.Request.Context()

	products, err := h.service.GetFeaturedProducts(ctx)
	if err != nil {
		respondFeaturedProductError(c, http.StatusInternalServerError, "今日推荐商品加载失败")
		return
	}

	respondFeaturedProductSuccess(c, "今日推荐商品加载成功", gin.H{"products": products})
}

// AddFeaturedProduct 添加今日推荐商品
func (h *FeaturedProductHandler) AddFeaturedProduct(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		ProductID interface{} `json:"product_id" binding:"required"`
		Position  int         `json:"position"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondFeaturedProductInvalidRequest(c, "invalid request body")
		return
	}

	productID := strings.TrimSpace(fmt.Sprintf("%v", req.ProductID))
	if productID == "" || productID == "<nil>" {
		respondFeaturedProductInvalidRequest(c, "invalid product id")
		return
	}

	if err := h.service.AddFeaturedProduct(ctx, productID, req.Position); err != nil {
		respondFeaturedProductError(c, http.StatusInternalServerError, "今日推荐商品添加失败")
		return
	}

	respondFeaturedProductSuccess(c, "今日推荐商品添加成功", gin.H{"product_id": productID, "added": true})
}

// RemoveFeaturedProduct 删除今日推荐商品
func (h *FeaturedProductHandler) RemoveFeaturedProduct(c *gin.Context) {
	ctx := c.Request.Context()

	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		respondFeaturedProductInvalidRequest(c, "invalid id")
		return
	}

	if err := h.service.RemoveFeaturedProduct(ctx, idStr); err != nil {
		respondFeaturedProductError(c, http.StatusInternalServerError, "今日推荐商品删除失败")
		return
	}

	respondFeaturedProductSuccess(c, "今日推荐商品删除成功", gin.H{"id": idStr, "deleted": true})
}

// UpdateFeaturedProductPosition 更新推荐位置
func (h *FeaturedProductHandler) UpdateFeaturedProductPosition(c *gin.Context) {
	ctx := c.Request.Context()

	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		respondFeaturedProductInvalidRequest(c, "invalid id")
		return
	}

	var req struct {
		Position int `json:"position" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondFeaturedProductInvalidRequest(c, "invalid request body")
		return
	}

	if err := h.service.UpdateFeaturedProductPosition(ctx, idStr, req.Position); err != nil {
		respondFeaturedProductError(c, http.StatusInternalServerError, "今日推荐商品位置更新失败")
		return
	}

	respondFeaturedProductSuccess(c, "今日推荐商品位置更新成功", gin.H{"id": idStr, "position": req.Position, "updated": true})
}
