package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type ProductHandler struct {
	service *service.ProductService
}

func NewProductHandler(service *service.ProductService) *ProductHandler {
	return &ProductHandler{service: service}
}

func respondProductError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondProductInvalidRequest(c *gin.Context, message string) {
	respondProductError(c, http.StatusBadRequest, message)
}

func respondProductMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func respondProductPaginated(c *gin.Context, message, listKey string, items interface{}, total int64) {
	limit := int(total)
	if limit < 0 {
		limit = 0
	}
	respondPaginatedEnvelope(c, responseCodeOK, message, listKey, items, total, 1, limit)
}

func writeProductServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrInvalidArgument) {
		respondProductError(c, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, service.ErrUnauthorized) {
		respondProductError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondProductError(c, http.StatusForbidden, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(strings.ToLower(err.Error()), "not found") {
		respondProductError(c, http.StatusNotFound, err.Error())
		return
	}
	if strings.Contains(strings.ToLower(err.Error()), "invalid") {
		respondProductError(c, http.StatusBadRequest, err.Error())
		return
	}
	respondProductError(c, fallbackStatus, err.Error())
}

func countProductItems(items interface{}) int64 {
	switch typed := items.(type) {
	case []map[string]interface{}:
		return int64(len(typed))
	case []interface{}:
		return int64(len(typed))
	case []string:
		return int64(len(typed))
	default:
		return 0
	}
}

// GetCategories 获取分类列表
func (h *ProductHandler) GetCategories(c *gin.Context) {
	shopID := c.Query("shopId")
	categories, err := h.service.GetCategories(c.Request.Context(), shopID)
	if err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondProductPaginated(c, "分类列表加载成功", "categories", categories, countProductItems(categories))
}

// GetProducts 获取商品列表
func (h *ProductHandler) GetProducts(c *gin.Context) {
	shopID := c.Query("shopId")
	categoryID := c.Query("categoryId")

	products, err := h.service.GetProducts(c.Request.Context(), shopID, categoryID)
	if err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondProductPaginated(c, "商品列表加载成功", "products", products, countProductItems(products))
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
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondProductMirroredSuccess(c, "今日推荐商品加载成功", gin.H{"products": products})
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
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}
	if product == nil {
		respondProductError(c, http.StatusNotFound, "product not found")
		return
	}
	respondProductMirroredSuccess(c, "商品详情加载成功", product)
}

// GetBanners 获取轮播图列表
func (h *ProductHandler) GetBanners(c *gin.Context) {
	shopID := c.Query("shopId")
	banners, err := h.service.GetBanners(c.Request.Context(), shopID)
	if err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondProductPaginated(c, "轮播图列表加载成功", "banners", banners, countProductItems(banners))
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
		respondProductInvalidRequest(c, err.Error())
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

	respondCreatedEnvelope(c, responseCodeOK, "分类创建成功", category, gin.H{"id": category.UID})
}

// UpdateCategory updates a category
func (h *ProductHandler) UpdateCategory(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondProductInvalidRequest(c, "invalid category id")
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondProductInvalidRequest(c, err.Error())
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

	respondProductMirroredSuccess(c, "分类更新成功", gin.H{"id": id, "updated": true})
}

// DeleteCategory deletes a category
func (h *ProductHandler) DeleteCategory(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondProductInvalidRequest(c, "invalid category id")
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))

	if err := h.service.DeleteCategory(c.Request.Context(), id, shopID); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondProductMirroredSuccess(c, "分类删除成功", gin.H{"id": id, "deleted": true})
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
		respondProductInvalidRequest(c, err.Error())
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

	respondCreatedEnvelope(c, responseCodeOK, "商品创建成功", product, gin.H{"id": product.UID})
}

// UpdateProduct updates a product
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondProductInvalidRequest(c, "invalid product id")
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondProductInvalidRequest(c, err.Error())
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

	respondProductMirroredSuccess(c, "商品更新成功", gin.H{"id": id, "updated": true})
}

// DeleteProduct deletes a product
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondProductInvalidRequest(c, "invalid product id")
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))
	categoryID := strings.TrimSpace(c.Query("categoryId"))

	if err := h.service.DeleteProduct(c.Request.Context(), id, shopID, categoryID); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondProductMirroredSuccess(c, "商品删除成功", gin.H{"id": id, "deleted": true})
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
		respondProductInvalidRequest(c, err.Error())
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

	respondCreatedEnvelope(c, responseCodeOK, "轮播图创建成功", banner, gin.H{"id": banner.UID})
}

// UpdateBanner updates a banner
func (h *ProductHandler) UpdateBanner(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondProductInvalidRequest(c, "invalid banner id")
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondProductInvalidRequest(c, err.Error())
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

	respondProductMirroredSuccess(c, "轮播图更新成功", gin.H{"id": id, "updated": true})
}

// DeleteBanner deletes a banner
func (h *ProductHandler) DeleteBanner(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondProductInvalidRequest(c, "invalid banner id")
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))

	if err := h.service.DeleteBanner(c.Request.Context(), id, shopID); err != nil {
		writeProductServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondProductMirroredSuccess(c, "轮播图删除成功", gin.H{"id": id, "deleted": true})
}
