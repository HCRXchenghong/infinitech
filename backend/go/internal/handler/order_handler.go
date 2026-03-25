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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.service.CreateOrder(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	setOrderEntityContext(c, result)
	c.JSON(http.StatusOK, result)
}

func (h *OrderHandler) GetOrderDetail(c *gin.Context) {
	id := c.Param("id")
	result, err := h.service.GetOrderDetail(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	setOrderEntityContext(c, result)
	c.JSON(http.StatusOK, result)
}

func (h *OrderHandler) GetUserOrders(c *gin.Context) {
	userId := c.Param("userId")
	result, err := h.service.GetUserOrders(c.Request.Context(), userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	setOrderEntityContext(c, result)
	c.JSON(http.StatusOK, result)
}

func (h *OrderHandler) MarkOrderReviewed(c *gin.Context) {
	id := c.Param("id")
	result, err := h.service.MarkOrderReviewed(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *OrderHandler) ReportOrderException(c *gin.Context) {
	id := c.Param("id")

	var req service.OrderExceptionReportPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	result, err := h.service.ReportOrderException(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		if strings.Contains(err.Error(), "required") || strings.Contains(err.Error(), "too long") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
