package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type OrderHandler struct {
	service *service.OrderService
}

func NewOrderHandler(service *service.OrderService) *OrderHandler {
	return &OrderHandler{service: service}
}

func respondOrderError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondOrderInvalidRequest(c *gin.Context, message string) {
	respondOrderError(c, http.StatusBadRequest, message)
}

func respondOrderMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func writeOrderServiceError(c *gin.Context, err error, fallbackStatus int) {
	normalizedError := strings.ToLower(err.Error())

	if errors.Is(err, service.ErrUnauthorized) {
		respondOrderError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondOrderError(c, http.StatusForbidden, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(normalizedError, "not found") {
		respondOrderError(c, http.StatusNotFound, err.Error())
		return
	}
	if strings.Contains(normalizedError, "required") ||
		strings.Contains(normalizedError, "too long") ||
		strings.Contains(normalizedError, "invalid") {
		respondOrderInvalidRequest(c, err.Error())
		return
	}
	respondOrderError(c, fallbackStatus, err.Error())
}

func setOrderEntityContext(c *gin.Context, payload interface{}) {
	result, ok := payload.(map[string]interface{})
	if !ok {
		return
	}

	if rawID, exists := result["id"]; exists {
		text := strings.TrimSpace(fmt.Sprint(rawID))
		if idkit.UIDPattern.MatchString(text) {
			c.Set("entity_uid", text)
		}
	}
	if rawTSID, exists := result["tsid"]; exists {
		text := strings.TrimSpace(fmt.Sprint(rawTSID))
		if idkit.TSIDPattern.MatchString(text) {
			c.Set("entity_tsid", text)
		}
	}
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondOrderInvalidRequest(c, err.Error())
		return
	}

	result, err := h.service.CreateOrder(c.Request.Context(), req)
	if err != nil {
		writeOrderServiceError(c, err, http.StatusInternalServerError)
		return
	}
	setOrderEntityContext(c, result)
	respondOrderMirroredSuccess(c, "订单创建成功", result)
}

func (h *OrderHandler) GetOrderDetail(c *gin.Context) {
	id := c.Param("id")
	result, err := h.service.GetOrderDetail(c.Request.Context(), id)
	if err != nil {
		writeOrderServiceError(c, err, http.StatusInternalServerError)
		return
	}
	setOrderEntityContext(c, result)
	respondOrderMirroredSuccess(c, "订单详情加载成功", result)
}

func (h *OrderHandler) GetUserOrders(c *gin.Context) {
	userId := c.Param("userId")
	result, err := h.service.GetUserOrders(c.Request.Context(), userId)
	if err != nil {
		writeOrderServiceError(c, err, http.StatusInternalServerError)
		return
	}
	items, _ := result.([]map[string]interface{})
	respondPaginatedEnvelope(c, responseCodeOK, "用户订单列表加载成功", "orders", result, int64(len(items)), 1, len(items))
}

func (h *OrderHandler) MarkOrderReviewed(c *gin.Context) {
	id := c.Param("id")
	result, err := h.service.MarkOrderReviewed(c.Request.Context(), id)
	if err != nil {
		writeOrderServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondOrderMirroredSuccess(c, "订单评价状态更新成功", result)
}

func (h *OrderHandler) ReportOrderException(c *gin.Context) {
	id := c.Param("id")

	var req service.OrderExceptionReportPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		respondOrderInvalidRequest(c, "invalid request payload")
		return
	}

	result, err := h.service.ReportOrderException(c.Request.Context(), id, req)
	if err != nil {
		writeOrderServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondOrderMirroredSuccess(c, "订单异常已上报", result)
}
