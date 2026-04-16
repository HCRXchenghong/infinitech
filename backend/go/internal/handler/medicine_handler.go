package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type MedicineHandler struct {
	service *service.MedicineService
}

func NewMedicineHandler(service *service.MedicineService) *MedicineHandler {
	return &MedicineHandler{service: service}
}

func (h *MedicineHandler) Consult(c *gin.Context) {
	var req service.MedicineConsultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "invalid request", nil)
		return
	}

	result, err := h.service.Consult(req)
	if err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
		return
	}

	respondMirroredSuccessEnvelope(c, "问药咨询结果加载成功", result)
}
