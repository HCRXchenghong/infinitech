package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type MobileMapHandler struct {
	service *service.MobileMapService
}

func NewMobileMapHandler(svc *service.MobileMapService) *MobileMapHandler {
	return &MobileMapHandler{service: svc}
}

func (h *MobileMapHandler) Search(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	result, err := h.service.Search(c.Request.Context(), service.MapSearchInput{
		Keyword:  strings.TrimSpace(c.Query("keyword")),
		City:     strings.TrimSpace(c.Query("city")),
		Lat:      strings.TrimSpace(c.Query("lat")),
		Lng:      strings.TrimSpace(c.Query("lng")),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *MobileMapHandler) ReverseGeocode(c *gin.Context) {
	result, err := h.service.ReverseGeocode(c.Request.Context(), service.MapReverseInput{
		Lat: strings.TrimSpace(c.Query("lat")),
		Lng: strings.TrimSpace(c.Query("lng")),
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
