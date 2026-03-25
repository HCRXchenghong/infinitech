package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
)

type ProductHandler struct {
	service *service.ProductService
}

func NewProductHandler(service *service.ProductService) *ProductHandler {
	return &ProductHandler{service: service}
}

// GetCategories 获取分类列表
func (h *ProductHandler) GetCategories(c *gin.Context) {
	shopID := c.Query("shopId")
	categories, err := h.service.GetCategories(c.Request.Context(), shopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}

// GetProducts 获取商品列表
func (h *ProductHandler) GetProducts(c *gin.Context) {
	shopID := c.Query("shopId")
	categoryID := c.Query("categoryId")

	products, err := h.service.GetProducts(c.Request.Context(), shopID, categoryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, products)
}

// GetFeaturedProducts 获取今日推荐商品
// @Summary 获取今日推荐商品
// @Tags 商品
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /products/featured [get]
func (h *ProductHandler) GetFeaturedProducts(c *gin.Context) {
	products, err := h.service.GetFeaturedProducts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, products)
}

// GetProductDetail 获取商品详情
// @Summary 获取商品详情
// @Tags 商品
// @Produce json
// @Param id path string true "商品ID"
// @Success 200 {object} map[string]interface{}
// @Router /products/{id} [get]
func (h *ProductHandler) GetProductDetail(c *gin.Context) {
	productID := c.Param("id")
	product, err := h.service.GetProductDetail(c.Request.Context(), productID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if product == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}
	c.JSON(http.StatusOK, product)
}

// GetBanners 获取轮播图列表
func (h *ProductHandler) GetBanners(c *gin.Context) {
	shopID := c.Query("shopId")
	banners, err := h.service.GetBanners(c.Request.Context(), shopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, banners)
}

// CreateCategory creates a new category
func (h *ProductHandler) CreateCategory(c *gin.Context) {
	var req struct {
		ShopID    uint   `json:"shopId" binding:"required"`
		Name      string `json:"name" binding:"required"`
		SortOrder int    `json:"sortOrder"`
		IsActive  *bool  `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	category := &repository.Category{
		ShopID:    req.ShopID,
		Name:      req.Name,
		SortOrder: req.SortOrder,
		IsActive:  isActive,
	}

	if err := h.service.CreateCategory(c.Request.Context(), category); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": category.UID, "message": "Category created successfully"})
}

// UpdateCategory updates a category
func (h *ProductHandler) UpdateCategory(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))
	if shopID == "" {
		if sid, ok := req["shopId"]; ok {
			shopID = strings.TrimSpace(fmt.Sprintf("%v", sid))
		}
	}

	if err := h.service.UpdateCategory(c.Request.Context(), id, shopID, req); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category updated successfully"})
}

// DeleteCategory deletes a category
func (h *ProductHandler) DeleteCategory(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))

	if err := h.service.DeleteCategory(c.Request.Context(), id, shopID); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

// CreateProduct creates a new product
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req struct {
		ShopID        uint    `json:"shopId" binding:"required"`
		CategoryID    uint    `json:"categoryId" binding:"required"`
		Name          string  `json:"name" binding:"required"`
		Description   string  `json:"description"`
		Image         string  `json:"image"`
		Images        string  `json:"images"`
		Price         float64 `json:"price" binding:"required"`
		OriginalPrice float64 `json:"originalPrice"`
		MonthlySales  int     `json:"monthlySales"`
		Rating        float64 `json:"rating"`
		Stock         int     `json:"stock"`
		Unit          string  `json:"unit"`
		Nutrition     string  `json:"nutrition"`
		Tags          string  `json:"tags"`
		IsRecommend   *bool   `json:"isRecommend"`
		IsActive      *bool   `json:"isActive"`
		SortOrder     int     `json:"sortOrder"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isRecommend := false
	if req.IsRecommend != nil {
		isRecommend = *req.IsRecommend
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	product := &repository.Product{
		ShopID:        req.ShopID,
		CategoryID:    req.CategoryID,
		Name:          req.Name,
		Description:   req.Description,
		Image:         req.Image,
		Images:        req.Images,
		Price:         req.Price,
		OriginalPrice: req.OriginalPrice,
		MonthlySales:  req.MonthlySales,
		Rating:        req.Rating,
		Stock:         req.Stock,
		Unit:          req.Unit,
		Nutrition:     req.Nutrition,
		Tags:          req.Tags,
		IsRecommend:   isRecommend,
		IsActive:      isActive,
		SortOrder:     req.SortOrder,
	}

	if err := h.service.CreateProduct(c.Request.Context(), product); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": product.UID, "message": "Product created successfully"})
}

// UpdateProduct updates a product
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))
	if shopID == "" {
		if sid, ok := req["shopId"]; ok {
			shopID = strings.TrimSpace(fmt.Sprintf("%v", sid))
		}
	}

	categoryID := strings.TrimSpace(c.Query("categoryId"))
	if categoryID == "" {
		if cid, ok := req["categoryId"]; ok {
			categoryID = strings.TrimSpace(fmt.Sprintf("%v", cid))
		}
	}

	if err := h.service.UpdateProduct(c.Request.Context(), id, shopID, categoryID, req); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product updated successfully"})
}

// DeleteProduct deletes a product
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))
	categoryID := strings.TrimSpace(c.Query("categoryId"))

	if err := h.service.DeleteProduct(c.Request.Context(), id, shopID, categoryID); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

// CreateBanner creates a new banner
func (h *ProductHandler) CreateBanner(c *gin.Context) {
	var req struct {
		ShopID    uint   `json:"shopId" binding:"required"`
		Title     string `json:"title"`
		ImageURL  string `json:"imageUrl" binding:"required"`
		LinkType  string `json:"linkType"`
		LinkValue string `json:"linkValue"`
		SortOrder int    `json:"sortOrder"`
		IsActive  *bool  `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	banner := &repository.Banner{
		ShopID:    req.ShopID,
		Title:     req.Title,
		ImageURL:  req.ImageURL,
		LinkType:  req.LinkType,
		LinkValue: req.LinkValue,
		SortOrder: req.SortOrder,
		IsActive:  isActive,
	}

	if err := h.service.CreateBanner(c.Request.Context(), banner); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": banner.UID, "message": "Banner created successfully"})
}

// UpdateBanner updates a banner
func (h *ProductHandler) UpdateBanner(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid banner ID"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))
	if shopID == "" {
		if sid, ok := req["shopId"]; ok {
			shopID = strings.TrimSpace(fmt.Sprintf("%v", sid))
		}
	}

	if err := h.service.UpdateBanner(c.Request.Context(), id, shopID, req); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Banner updated successfully"})
}

// DeleteBanner deletes a banner
func (h *ProductHandler) DeleteBanner(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid banner ID"})
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))

	if err := h.service.DeleteBanner(c.Request.Context(), id, shopID); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Banner deleted successfully"})
}

func writeProductServiceError(c *gin.Context, err error, fallbackStatus int) {
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
