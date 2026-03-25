package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
)

type PointsHandler struct {
	service *service.PointsService
}

func NewPointsHandler(service *service.PointsService) *PointsHandler {
	return &PointsHandler{service: service}
}

func (h *PointsHandler) GetBalance(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		userID = c.Query("user_id")
	}
	balance, err := h.service.GetBalance(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"userId": userID, "balance": balance})
}

func (h *PointsHandler) ListGoods(c *gin.Context) {
	includeInactive := c.Query("all") == "1"
	goods, err := h.service.ListGoods(c.Request.Context(), includeInactive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, goods)
}

func (h *PointsHandler) CreateGood(c *gin.Context) {
	var payload repository.PointsGood
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if payload.Name == "" || payload.Points <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and points required"})
		return
	}
	if err := h.service.CreateGood(c.Request.Context(), &payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payload)
}

func (h *PointsHandler) UpdateGood(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	delete(payload, "id")
	delete(payload, "created_at")
	delete(payload, "createdAt")
	if err := h.service.UpdateGood(c.Request.Context(), id, payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PointsHandler) DeleteGood(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.service.DeleteGood(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PointsHandler) Redeem(c *gin.Context) {
	var payload struct {
		UserID string `json:"userId"`
		Phone  string `json:"phone"`
		GoodID uint   `json:"goodId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	redemption, balance, err := h.service.RedeemPoints(c.Request.Context(), payload.UserID, payload.Phone, payload.GoodID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "balance": balance})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "redemption": redemption, "balance": balance})
}

func (h *PointsHandler) Earn(c *gin.Context) {
	var payload struct {
		UserID     string  `json:"userId"`
		OrderID    string  `json:"orderId"`
		Amount     float64 `json:"amount"`
		Multiplier int     `json:"multiplier"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	balance, earned, err := h.service.EarnPoints(c.Request.Context(), payload.UserID, payload.OrderID, payload.Amount, payload.Multiplier)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "balance": balance, "earned": earned})
}

func (h *PointsHandler) Refund(c *gin.Context) {
	var payload struct {
		UserID  string `json:"userId"`
		OrderID string `json:"orderId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	balance, refunded, err := h.service.RefundPoints(c.Request.Context(), payload.UserID, payload.OrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "balance": balance, "refunded": refunded})
}

func (h *PointsHandler) ListRedemptions(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit
	status := c.Query("status")

	records, total, err := h.service.ListRedemptions(c.Request.Context(), service.PointsRedemptionListParams{
		Status: status,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": records, "total": total})
}

func (h *PointsHandler) UpdateRedemption(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var payload struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := h.service.UpdateRedemptionStatus(c.Request.Context(), id, payload.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
