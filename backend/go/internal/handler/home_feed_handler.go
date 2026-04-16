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

func respondHomeFeedInvalidRequest(c *gin.Context, message string) {
	respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, message, nil)
}

func respondHomeFeedInternalError(c *gin.Context, err error) {
	if err == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "internal error", nil)
		return
	}
	respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
}

func respondHomeFeedMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func (h *HomeFeedHandler) GetHomeFeed(c *gin.Context) {
	data, err := h.service.GetHomeFeed(c.Request.Context(), service.HomeFeedQuery{
		City:             strings.TrimSpace(c.Query("city")),
		BusinessCategory: strings.TrimSpace(c.Query("businessCategory")),
	})
	if err != nil {
		respondHomeFeedInternalError(c, err)
		return
	}
	respondHomeFeedMirroredSuccess(c, "首页信息流加载成功", data)
}

func (h *HomeFeedHandler) ListCampaigns(c *gin.Context) {
	data, err := h.service.ListCampaigns(c.Request.Context(), service.HomePromotionListQuery{
		Status:     strings.TrimSpace(c.Query("status")),
		ObjectType: strings.TrimSpace(c.Query("objectType")),
		City:       strings.TrimSpace(c.Query("city")),
		Category:   strings.TrimSpace(c.Query("businessCategory")),
	})
	if err != nil {
		respondHomeFeedInternalError(c, err)
		return
	}
	respondHomeFeedMirroredSuccess(c, "首页推广计划加载成功", data)
}

func (h *HomeFeedHandler) CreateCampaign(c *gin.Context) {
	var payload service.HomePromotionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondHomeFeedInvalidRequest(c, err.Error())
		return
	}

	campaign, err := h.service.CreateCampaign(c.Request.Context(), payload)
	if err != nil {
		respondHomeFeedInvalidRequest(c, err.Error())
		return
	}
	respondHomeFeedMirroredSuccess(c, "首页推广计划创建成功", gin.H{"campaign": campaign})
}

func (h *HomeFeedHandler) UpdateCampaign(c *gin.Context) {
	var payload service.HomePromotionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondHomeFeedInvalidRequest(c, err.Error())
		return
	}

	campaign, err := h.service.UpdateCampaign(c.Request.Context(), strings.TrimSpace(c.Param("id")), payload)
	if err != nil {
		respondHomeFeedInvalidRequest(c, err.Error())
		return
	}
	respondHomeFeedMirroredSuccess(c, "首页推广计划更新成功", gin.H{"campaign": campaign})
}

func (h *HomeFeedHandler) ChangeCampaignStatus(c *gin.Context) {
	campaign, err := h.service.ChangeCampaignStatus(c.Request.Context(), strings.TrimSpace(c.Param("id")), strings.TrimSpace(c.Param("action")))
	if err != nil {
		respondHomeFeedInvalidRequest(c, err.Error())
		return
	}
	respondHomeFeedMirroredSuccess(c, "首页推广计划状态更新成功", gin.H{"campaign": campaign})
}

func (h *HomeFeedHandler) GetHomeSlots(c *gin.Context) {
	data, err := h.service.GetHomeSlots(c.Request.Context(), service.HomeFeedQuery{
		City:             strings.TrimSpace(c.Query("city")),
		BusinessCategory: strings.TrimSpace(c.Query("businessCategory")),
	})
	if err != nil {
		respondHomeFeedInternalError(c, err)
		return
	}
	respondHomeFeedMirroredSuccess(c, "首页固定坑位加载成功", data)
}

func (h *HomeFeedHandler) UpsertLockedSlot(c *gin.Context) {
	var payload service.HomePromotionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondHomeFeedInvalidRequest(c, err.Error())
		return
	}

	campaign, err := h.service.UpsertLockedSlot(c.Request.Context(), payload)
	if err != nil {
		respondHomeFeedInvalidRequest(c, err.Error())
		return
	}
	respondHomeFeedMirroredSuccess(c, "首页固定坑位保存成功", gin.H{"campaign": campaign})
}
