package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type InviteHandler struct {
	service *service.InviteService
}

func NewInviteHandler(service *service.InviteService) *InviteHandler {
	return &InviteHandler{service: service}
}

func (h *InviteHandler) GetCode(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		userID = c.Query("user_id")
	}
	phone := c.Query("phone")
	if phone == "" {
		phone = c.Query("mobile")
	}
	code, err := h.service.GetOrCreateCode(c.Request.Context(), userID, phone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": code.Code, "userId": code.UserID})
}

func (h *InviteHandler) Share(c *gin.Context) {
	var payload struct {
		UserID string `json:"userId"`
		Phone  string `json:"phone"`
		Code   string `json:"code"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := h.service.RecordShare(c.Request.Context(), payload.UserID, payload.Phone, payload.Code); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *InviteHandler) ListCodes(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit
	list, total, err := h.service.ListCodes(c.Request.Context(), service.InviteListParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": list, "total": total})
}

func (h *InviteHandler) ListRecords(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit
	list, total, err := h.service.ListRecords(c.Request.Context(), service.InviteListParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": list, "total": total})
}
