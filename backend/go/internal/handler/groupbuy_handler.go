package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type GroupbuyHandler struct {
	service *service.GroupbuyService
}

func NewGroupbuyHandler(service *service.GroupbuyService) *GroupbuyHandler {
	return &GroupbuyHandler{service: service}
}

func respondGroupbuyError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondGroupbuyInvalidRequest(c *gin.Context, message string) {
	respondGroupbuyError(c, http.StatusBadRequest, message)
}

func respondGroupbuyMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func writeGroupbuyServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrUnauthorized) {
		respondGroupbuyError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondGroupbuyError(c, http.StatusForbidden, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(strings.ToLower(err.Error()), "not found") {
		respondGroupbuyError(c, http.StatusNotFound, err.Error())
		return
	}
	respondGroupbuyError(c, fallbackStatus, err.Error())
}

func (h *GroupbuyHandler) ListUserVouchers(c *gin.Context) {
	status := c.Query("status")
	orderIDRaw := c.Query("orderId")
	if orderIDRaw == "" {
		orderIDRaw = c.Query("order_id")
	}
	result, err := h.service.ListUserVouchers(c.Request.Context(), status, strings.TrimSpace(orderIDRaw))
	if err != nil {
		writeGroupbuyServiceError(c, err, http.StatusBadRequest)
		return
	}
	respondSuccessEnvelope(c, "团购券列表加载成功", result, nil)
}

func (h *GroupbuyHandler) GetVoucherQRCode(c *gin.Context) {
	idRaw := strings.TrimSpace(c.Param("id"))
	if idRaw == "" {
		respondGroupbuyInvalidRequest(c, "invalid voucher id")
		return
	}

	result, svcErr := h.service.GetVoucherQRCode(c.Request.Context(), idRaw)
	if svcErr != nil {
		writeGroupbuyServiceError(c, svcErr, http.StatusBadRequest)
		return
	}
	respondGroupbuyMirroredSuccess(c, "团购券核销码加载成功", result)
}

func (h *GroupbuyHandler) RedeemByScan(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondGroupbuyInvalidRequest(c, "invalid request payload")
		return
	}

	result, svcErr := h.service.RedeemByScan(c.Request.Context(), req)
	if svcErr != nil {
		writeGroupbuyServiceError(c, svcErr, http.StatusBadRequest)
		return
	}
	respondGroupbuyMirroredSuccess(c, "团购券核销成功", result)
}
