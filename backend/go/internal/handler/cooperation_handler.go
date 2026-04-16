package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
)

type CooperationHandler struct {
	service *service.CooperationService
}

func NewCooperationHandler(service *service.CooperationService) *CooperationHandler {
	return &CooperationHandler{service: service}
}

func respondCooperationInvalidRequest(c *gin.Context, message string) {
	respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, message, nil)
}

func respondCooperationInternalError(c *gin.Context, err error) {
	if err == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "internal error", nil)
		return
	}
	respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
}

func respondCooperationMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func respondCooperationPaginated(c *gin.Context, message string, records interface{}, total int64, page, limit int) {
	respondPaginatedEnvelope(c, responseCodeOK, message, "records", records, total, page, limit)
}

func (h *CooperationHandler) Create(c *gin.Context) {
	var payload repository.CooperationRequest
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondCooperationInvalidRequest(c, "invalid request")
		return
	}
	if err := h.service.Create(c.Request.Context(), &payload); err != nil {
		respondCooperationInvalidRequest(c, err.Error())
		return
	}
	respondCooperationMirroredSuccess(c, "反馈与合作提交成功", payload)
}

func (h *CooperationHandler) List(c *gin.Context) {
	page := parsePositiveInt(c.Query("page"), 1)
	limit := parsePositiveInt(c.Query("limit"), 20)
	offset := (page - 1) * limit

	status := strings.TrimSpace(c.Query("status"))
	list, total, err := h.service.List(c.Request.Context(), service.CooperationListParams{
		Status: status,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		respondCooperationInternalError(c, err)
		return
	}
	respondCooperationPaginated(c, "反馈与合作列表加载成功", list, total, page, limit)
}

func (h *CooperationHandler) Update(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondCooperationInvalidRequest(c, "invalid id")
		return
	}
	var payload struct {
		Status string `json:"status"`
		Remark string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondCooperationInvalidRequest(c, "invalid request")
		return
	}
	if err := h.service.UpdateStatus(c.Request.Context(), id, payload.Status, payload.Remark); err != nil {
		respondCooperationInternalError(c, err)
		return
	}
	respondCooperationMirroredSuccess(c, "反馈与合作状态更新成功", gin.H{"id": id, "updated": true, "status": payload.Status})
}
