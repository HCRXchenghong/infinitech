package handler

import (
	"net/http"
	"strings"

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

func respondPointsError(c *gin.Context, status int, message string, legacy gin.H) {
	respondEnvelope(c, status, couponResponseCodeForStatus(status), message, gin.H{}, legacy)
}

func respondPointsInvalidRequest(c *gin.Context, message string, legacy gin.H) {
	respondPointsError(c, http.StatusBadRequest, message, legacy)
}

func respondPointsInternalError(c *gin.Context, err error) {
	if err == nil {
		respondPointsError(c, http.StatusInternalServerError, "internal error", nil)
		return
	}
	respondPointsError(c, http.StatusInternalServerError, err.Error(), nil)
}

func respondPointsMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func respondPointsPaginated(c *gin.Context, message string, records interface{}, total int64, page, limit int) {
	respondPaginatedEnvelope(c, responseCodeOK, message, "records", records, total, page, limit)
}

func (h *PointsHandler) GetBalance(c *gin.Context) {
	userID := strings.TrimSpace(c.Query("userId"))
	if userID == "" {
		userID = strings.TrimSpace(c.Query("user_id"))
	}
	balance, err := h.service.GetBalance(c.Request.Context(), userID)
	if err != nil {
		respondPointsInvalidRequest(c, err.Error(), nil)
		return
	}
	respondPointsMirroredSuccess(c, "积分余额加载成功", gin.H{"userId": userID, "balance": balance})
}

func (h *PointsHandler) ListGoods(c *gin.Context) {
	includeInactive := c.Query("all") == "1"
	goods, err := h.service.ListGoods(c.Request.Context(), includeInactive)
	if err != nil {
		respondPointsInternalError(c, err)
		return
	}
	respondSuccessEnvelope(c, "积分商品列表加载成功", goods, nil)
}

func (h *PointsHandler) CreateGood(c *gin.Context) {
	var payload repository.PointsGood
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondPointsInvalidRequest(c, "invalid request", nil)
		return
	}
	if payload.Name == "" || payload.Points <= 0 {
		respondPointsInvalidRequest(c, "name and points required", nil)
		return
	}
	if err := h.service.CreateGood(c.Request.Context(), &payload); err != nil {
		respondPointsInternalError(c, err)
		return
	}
	respondPointsMirroredSuccess(c, "积分商品创建成功", payload)
}

func (h *PointsHandler) UpdateGood(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondPointsInvalidRequest(c, "invalid id", nil)
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondPointsInvalidRequest(c, "invalid request", nil)
		return
	}
	delete(payload, "id")
	delete(payload, "created_at")
	delete(payload, "createdAt")
	if err := h.service.UpdateGood(c.Request.Context(), id, payload); err != nil {
		respondPointsInternalError(c, err)
		return
	}
	respondPointsMirroredSuccess(c, "积分商品更新成功", gin.H{"id": id, "updated": true})
}

func (h *PointsHandler) DeleteGood(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondPointsInvalidRequest(c, "invalid id", nil)
		return
	}
	if err := h.service.DeleteGood(c.Request.Context(), id); err != nil {
		respondPointsInternalError(c, err)
		return
	}
	respondPointsMirroredSuccess(c, "积分商品删除成功", gin.H{"id": id, "deleted": true})
}

func (h *PointsHandler) Redeem(c *gin.Context) {
	var payload struct {
		UserID string `json:"userId"`
		Phone  string `json:"phone"`
		GoodID uint   `json:"goodId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondPointsInvalidRequest(c, "invalid request", nil)
		return
	}
	redemption, balance, err := h.service.RedeemPoints(c.Request.Context(), payload.UserID, payload.Phone, payload.GoodID)
	if err != nil {
		respondPointsInvalidRequest(c, err.Error(), gin.H{"balance": balance})
		return
	}
	respondPointsMirroredSuccess(c, "积分兑换成功", gin.H{"redemption": redemption, "balance": balance, "success": true})
}

func (h *PointsHandler) Earn(c *gin.Context) {
	var payload struct {
		UserID     string  `json:"userId"`
		OrderID    string  `json:"orderId"`
		Amount     float64 `json:"amount"`
		Multiplier int     `json:"multiplier"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondPointsInvalidRequest(c, "invalid request", nil)
		return
	}
	balance, earned, err := h.service.EarnPoints(c.Request.Context(), payload.UserID, payload.OrderID, payload.Amount, payload.Multiplier)
	if err != nil {
		respondPointsInvalidRequest(c, err.Error(), nil)
		return
	}
	respondPointsMirroredSuccess(c, "积分发放成功", gin.H{"balance": balance, "earned": earned, "success": true})
}

func (h *PointsHandler) Refund(c *gin.Context) {
	var payload struct {
		UserID  string `json:"userId"`
		OrderID string `json:"orderId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondPointsInvalidRequest(c, "invalid request", nil)
		return
	}
	balance, refunded, err := h.service.RefundPoints(c.Request.Context(), payload.UserID, payload.OrderID)
	if err != nil {
		respondPointsInvalidRequest(c, err.Error(), nil)
		return
	}
	respondPointsMirroredSuccess(c, "积分退回成功", gin.H{"balance": balance, "refunded": refunded, "success": true})
}

func (h *PointsHandler) ListRedemptions(c *gin.Context) {
	page := parsePositiveInt(c.Query("page"), 1)
	limit := parsePositiveInt(c.Query("limit"), 20)
	offset := (page - 1) * limit
	status := strings.TrimSpace(c.Query("status"))

	records, total, err := h.service.ListRedemptions(c.Request.Context(), service.PointsRedemptionListParams{
		Status: status,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		respondPointsInternalError(c, err)
		return
	}
	respondPointsPaginated(c, "积分兑换记录加载成功", records, total, page, limit)
}

func (h *PointsHandler) UpdateRedemption(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondPointsInvalidRequest(c, "invalid id", nil)
		return
	}
	var payload struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondPointsInvalidRequest(c, "invalid request", nil)
		return
	}
	if err := h.service.UpdateRedemptionStatus(c.Request.Context(), id, payload.Status); err != nil {
		respondPointsInternalError(c, err)
		return
	}
	respondPointsMirroredSuccess(c, "积分兑换状态更新成功", gin.H{"id": id, "updated": true, "status": payload.Status})
}
