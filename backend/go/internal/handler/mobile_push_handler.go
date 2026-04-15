package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type MobilePushHandler struct {
	service *service.MobilePushService
}

func NewMobilePushHandler(svc *service.MobilePushService) *MobilePushHandler {
	return &MobilePushHandler{service: svc}
}

func (h *MobilePushHandler) RegisterDevice(c *gin.Context) {
	var req service.PushRegistrationInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", gin.H{
			"validation_error": err.Error(),
		})
		return
	}

	record, err := h.service.RegisterDevice(c.Request.Context(), req)
	if err != nil {
		h.abortByError(c, err)
		return
	}

	respondSuccessEnvelope(c, "推送设备注册成功", record, nil)
}

func (h *MobilePushHandler) UnregisterDevice(c *gin.Context) {
	var req service.PushUnregisterInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", gin.H{
			"validation_error": err.Error(),
		})
		return
	}

	if err := h.service.UnregisterDevice(c.Request.Context(), req); err != nil {
		h.abortByError(c, err)
		return
	}

	respondSuccessEnvelope(c, "推送设备注销成功", nil, nil)
}

func (h *MobilePushHandler) Ack(c *gin.Context) {
	var req service.PushAckInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "请求参数错误", gin.H{
			"validation_error": err.Error(),
		})
		return
	}

	if err := h.service.AckDelivery(c.Request.Context(), req); err != nil {
		h.abortByError(c, err)
		return
	}

	respondSuccessEnvelope(c, "推送消息确认成功", nil, nil)
}

func (h *MobilePushHandler) abortByError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrUnauthorized):
		respondErrorEnvelope(c, http.StatusUnauthorized, responseCodeUnauthorized, err.Error(), nil)
	case errors.Is(err, service.ErrForbidden):
		respondErrorEnvelope(c, http.StatusForbidden, responseCodeForbidden, err.Error(), nil)
	default:
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, err.Error(), nil)
	}
}
