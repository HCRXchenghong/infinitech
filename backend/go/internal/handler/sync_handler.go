package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type SyncHandler struct {
	service *service.SyncService
}

func NewSyncHandler(service *service.SyncService) *SyncHandler {
	return &SyncHandler{service: service}
}

func respondSyncError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

// GetSyncState 获取同步状态（各数据集版本号）
// @Summary 获取同步状态
// @Tags 同步
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /sync/state [get]
func (h *SyncHandler) GetSyncState(c *gin.Context) {
	state, err := h.service.GetSyncState(c.Request.Context())
	if err != nil {
		respondSyncError(c, http.StatusInternalServerError, err.Error())
		return
	}
	respondMirroredSuccessEnvelope(c, "同步状态加载成功", state)
}

// GetSyncData 获取增量同步数据
// @Summary 获取增量同步数据
// @Tags 同步
// @Produce json
// @Param dataset path string true "数据集名称" Enums(shops, products, orders)
// @Param since query string false "版本号"
// @Success 200 {object} map[string]interface{}
// @Router /sync/{dataset} [get]
func (h *SyncHandler) GetSyncData(c *gin.Context) {
	dataset := c.Param("dataset")
	since := c.Query("since")

	data, err := h.service.GetSyncData(c.Request.Context(), dataset, since)
	if err != nil {
		if errors.Is(err, service.ErrInvalidSyncDataset) || errors.Is(err, service.ErrInvalidSince) {
			respondSyncError(c, http.StatusBadRequest, err.Error())
			return
		}
		respondSyncError(c, http.StatusInternalServerError, err.Error())
		return
	}
	respondMirroredSuccessEnvelope(c, "增量同步数据加载成功", data)
}
