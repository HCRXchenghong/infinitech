package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type HomeFeedHandler struct {
	service *service.HomeFeedService
}

func NewHomeFeedHandler(service *service.HomeFeedService) *HomeFeedHandler {
	return &HomeFeedHandler{service: service}
}

func (h *HomeFeedHandler) GetHomeFeed(c *gin.Context) {
	data, err := h.service.GetHomeFeed(c.Request.Context(), service.HomeFeedQuery{
		City:             strings.TrimSpace(c.Query("city")),
		BusinessCategory: strings.TrimSpace(c.Query("businessCategory")),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *HomeFeedHandler) ListCampaigns(c *gin.Context) {
	data, err := h.service.ListCampaigns(c.Request.Context(), service.HomePromotionListQuery{
		Status:     strings.TrimSpace(c.Query("status")),
		ObjectType: strings.TrimSpace(c.Query("objectType")),
		City:       strings.TrimSpace(c.Query("city")),
		Category:   strings.TrimSpace(c.Query("businessCategory")),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *HomeFeedHandler) CreateCampaign(c *gin.Context) {
	var payload service.HomePromotionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	campaign, err := h.service.CreateCampaign(c.Request.Context(), payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}

func (h *HomeFeedHandler) UpdateCampaign(c *gin.Context) {
	var payload service.HomePromotionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	campaign, err := h.service.UpdateCampaign(c.Request.Context(), strings.TrimSpace(c.Param("id")), payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}

func (h *HomeFeedHandler) ChangeCampaignStatus(c *gin.Context) {
	campaign, err := h.service.ChangeCampaignStatus(c.Request.Context(), strings.TrimSpace(c.Param("id")), strings.TrimSpace(c.Param("action")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}

func (h *HomeFeedHandler) GetHomeSlots(c *gin.Context) {
	data, err := h.service.GetHomeSlots(c.Request.Context(), service.HomeFeedQuery{
		City:             strings.TrimSpace(c.Query("city")),
		BusinessCategory: strings.TrimSpace(c.Query("businessCategory")),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *HomeFeedHandler) UpsertLockedSlot(c *gin.Context) {
	var payload service.HomePromotionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	campaign, err := h.service.UpsertLockedSlot(c.Request.Context(), payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}
