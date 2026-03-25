package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type GroupbuyHandler struct {
	service *service.GroupbuyService
}

func NewGroupbuyHandler(service *service.GroupbuyService) *GroupbuyHandler {
	return &GroupbuyHandler{service: service}
}

func (h *GroupbuyHandler) ListUserVouchers(c *gin.Context) {
	status := c.Query("status")
	orderIDRaw := c.Query("orderId")
	if orderIDRaw == "" {
		orderIDRaw = c.Query("order_id")
	}
	result, err := h.service.ListUserVouchers(c.Request.Context(), status, strings.TrimSpace(orderIDRaw))
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *GroupbuyHandler) GetVoucherQRCode(c *gin.Context) {
	idRaw := strings.TrimSpace(c.Param("id"))
	if idRaw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid voucher id"})
		return
	}

	result, svcErr := h.service.GetVoucherQRCode(c.Request.Context(), idRaw)
	if svcErr != nil {
		if errors.Is(svcErr, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": svcErr.Error()})
			return
		}
		if errors.Is(svcErr, service.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *GroupbuyHandler) RedeemByScan(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	result, svcErr := h.service.RedeemByScan(c.Request.Context(), req)
	if svcErr != nil {
		if errors.Is(svcErr, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": svcErr.Error()})
			return
		}
		if errors.Is(svcErr, service.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
