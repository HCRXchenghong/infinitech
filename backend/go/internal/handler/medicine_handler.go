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
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	result, err := h.service.Consult(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
