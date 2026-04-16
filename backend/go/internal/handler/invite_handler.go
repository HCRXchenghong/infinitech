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

func respondInviteError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondInviteInvalidRequest(c *gin.Context, message string) {
	respondInviteError(c, http.StatusBadRequest, message)
}

func respondInviteSuccess(c *gin.Context, message string, data interface{}, legacy gin.H) {
	respondSuccessEnvelope(c, message, data, legacy)
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
		respondInviteInvalidRequest(c, err.Error())
		return
	}
	payload := gin.H{"code": code.Code, "userId": code.UserID}
	respondInviteSuccess(c, "邀请码加载成功", payload, gin.H{"inviteCode": code.Code, "userId": code.UserID})
}

func (h *InviteHandler) Share(c *gin.Context) {
	var payload struct {
		UserID string `json:"userId"`
		Phone  string `json:"phone"`
		Code   string `json:"code"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondInviteInvalidRequest(c, "invalid request")
		return
	}
	if err := h.service.RecordShare(c.Request.Context(), payload.UserID, payload.Phone, payload.Code); err != nil {
		respondInviteInvalidRequest(c, err.Error())
		return
	}
	respondInviteSuccess(c, "邀请分享记录成功", gin.H{"recorded": true}, gin.H{"recorded": true})
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
		respondInviteError(c, http.StatusInternalServerError, err.Error())
		return
	}
	respondPaginatedEnvelope(c, responseCodeOK, "邀请代码列表加载成功", "records", list, total, page, limit)
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
		respondInviteError(c, http.StatusInternalServerError, err.Error())
		return
	}
	respondPaginatedEnvelope(c, responseCodeOK, "邀请记录列表加载成功", "records", list, total, page, limit)
}
