package handler

import (
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type AfterSalesHandler struct {
	service *service.AfterSalesService
}

func NewAfterSalesHandler(service *service.AfterSalesService) *AfterSalesHandler {
	return &AfterSalesHandler{service: service}
}

func respondAfterSalesError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondAfterSalesInvalidRequest(c *gin.Context, message string) {
	respondAfterSalesError(c, http.StatusBadRequest, message)
}

func respondAfterSalesMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func writeAfterSalesServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrUnauthorized) {
		respondAfterSalesError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondAfterSalesError(c, http.StatusForbidden, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(strings.ToLower(err.Error()), "not found") {
		respondAfterSalesError(c, http.StatusNotFound, err.Error())
		return
	}
	respondAfterSalesError(c, fallbackStatus, err.Error())
}

func (h *AfterSalesHandler) Create(c *gin.Context) {
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAfterSalesInvalidRequest(c, err.Error())
		return
	}

	result, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		writeAfterSalesServiceError(c, err, http.StatusBadRequest)
		return
	}
	respondAfterSalesMirroredSuccess(c, "售后申请提交成功", result)
}

func (h *AfterSalesHandler) CreateMerchantGroupbuyRefund(c *gin.Context) {
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAfterSalesInvalidRequest(c, err.Error())
		return
	}

	result, err := h.service.CreateMerchantGroupbuyRefund(c.Request.Context(), req)
	if err != nil {
		writeAfterSalesServiceError(c, err, http.StatusBadRequest)
		return
	}
	respondAfterSalesMirroredSuccess(c, "商户团购退款申请提交成功", result)
}

func (h *AfterSalesHandler) List(c *gin.Context) {
	page := parsePositiveInt(c.DefaultQuery("page", "1"), 1)
	limit := parsePositiveInt(c.DefaultQuery("limit", "20"), 20)
	status := c.Query("status")
	search := c.Query("search")

	result, err := h.service.List(c.Request.Context(), page, limit, status, search)
	if err != nil {
		writeAfterSalesServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondAfterSalesMirroredSuccess(c, "售后列表加载成功", result)
}

func (h *AfterSalesHandler) ListByUserID(c *gin.Context) {
	userID := c.Param("userId")
	result, err := h.service.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		writeAfterSalesServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondSuccessEnvelope(c, "用户售后列表加载成功", result, nil)
}

func (h *AfterSalesHandler) Clear(c *gin.Context) {
	var req interface{} = map[string]interface{}{}
	if err := c.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
		respondAfterSalesInvalidRequest(c, err.Error())
		return
	}

	result, err := h.service.Clear(c.Request.Context(), req)
	if err != nil {
		writeAfterSalesServiceError(c, err, http.StatusBadRequest)
		return
	}
	respondAfterSalesMirroredSuccess(c, "售后记录清理成功", result)
}

func (h *AfterSalesHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAfterSalesInvalidRequest(c, err.Error())
		return
	}

	result, err := h.service.UpdateStatus(c.Request.Context(), id, req)
	if err != nil {
		writeAfterSalesServiceError(c, err, http.StatusBadRequest)
		return
	}
	respondAfterSalesMirroredSuccess(c, "售后状态更新成功", result)
}
