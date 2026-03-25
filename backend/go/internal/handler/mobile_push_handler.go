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
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "message": err.Error()})
		return
	}

	record, err := h.service.RegisterDevice(c.Request.Context(), req)
	if err != nil {
		h.abortByError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    record,
	})
}

func (h *MobilePushHandler) UnregisterDevice(c *gin.Context) {
	var req service.PushUnregisterInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "message": err.Error()})
		return
	}

	if err := h.service.UnregisterDevice(c.Request.Context(), req); err != nil {
		h.abortByError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *MobilePushHandler) Ack(c *gin.Context) {
	var req service.PushAckInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "message": err.Error()})
		return
	}

	if err := h.service.AckDelivery(c.Request.Context(), req); err != nil {
		h.abortByError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *MobilePushHandler) abortByError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, service.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}
