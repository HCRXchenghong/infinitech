package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type OfficialSiteHandler struct {
	service *service.OfficialSiteService
}

func NewOfficialSiteHandler(service *service.OfficialSiteService) *OfficialSiteHandler {
	return &OfficialSiteHandler{service: service}
}

func (h *OfficialSiteHandler) CreateExposure(c *gin.Context) {
	var payload struct {
		Content      string   `json:"content"`
		Amount       float64  `json:"amount"`
		Appeal       string   `json:"appeal"`
		ContactPhone string   `json:"contact_phone"`
		PhotoURLs    []string `json:"photo_urls"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	record, err := h.service.CreateExposure(c.Request.Context(), service.OfficialSiteExposureCreateInput{
		Content:      payload.Content,
		Amount:       payload.Amount,
		Appeal:       payload.Appeal,
		ContactPhone: payload.ContactPhone,
		PhotoURLs:    payload.PhotoURLs,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":            record.UID,
			"review_status": record.ReviewStatus,
		},
	})
}

func (h *OfficialSiteHandler) ListPublicExposures(c *gin.Context) {
	records, err := h.service.ListPublicExposures(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": records, "total": len(records)})
}

func (h *OfficialSiteHandler) GetPublicExposureDetail(c *gin.Context) {
	record, err := h.service.GetPublicExposureDetail(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": record})
}

func (h *OfficialSiteHandler) ListPublicNews(c *gin.Context) {
	page, limit, offset := parseOfficialSitePage(c)
	records, total, err := h.service.ListPublicNews(c.Request.Context(), service.OfficialSiteNewsListParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": records, "total": total, "page": page, "limit": limit})
}

func (h *OfficialSiteHandler) GetPublicNewsDetail(c *gin.Context) {
	record, err := h.service.GetPublicNewsDetail(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": record})
}

func (h *OfficialSiteHandler) ListAdminExposures(c *gin.Context) {
	page, limit, offset := parseOfficialSitePage(c)
	records, total, err := h.service.ListAdminExposures(c.Request.Context(), service.OfficialSiteExposureListParams{
		ReviewStatus:  strings.TrimSpace(c.Query("review_status")),
		ProcessStatus: strings.TrimSpace(c.Query("process_status")),
		Limit:         limit,
		Offset:        offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": records, "total": total, "page": page, "limit": limit})
}

func (h *OfficialSiteHandler) UpdateExposure(c *gin.Context) {
	var payload struct {
		ReviewStatus  string `json:"review_status"`
		ReviewRemark  string `json:"review_remark"`
		ProcessStatus string `json:"process_status"`
		ProcessRemark string `json:"process_remark"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	adminID, adminName := officialSiteAdminContext(c)
	record, err := h.service.UpdateExposure(c.Request.Context(), c.Param("id"), service.OfficialSiteExposureUpdateInput{
		ReviewStatus:  payload.ReviewStatus,
		ReviewRemark:  payload.ReviewRemark,
		ProcessStatus: payload.ProcessStatus,
		ProcessRemark: payload.ProcessRemark,
		AdminID:       adminID,
		AdminName:     adminName,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": record})
}

func (h *OfficialSiteHandler) CreateCooperation(c *gin.Context) {
	var payload struct {
		Nickname  string `json:"nickname"`
		Contact   string `json:"contact"`
		Direction string `json:"direction"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	record, err := h.service.CreateOfficialSiteCooperation(c.Request.Context(), payload.Nickname, payload.Contact, payload.Direction)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": record})
}

func (h *OfficialSiteHandler) ListAdminCooperations(c *gin.Context) {
	page, limit, offset := parseOfficialSitePage(c)
	records, total, err := h.service.ListOfficialSiteCooperations(c.Request.Context(), service.CooperationListParams{
		Status: strings.TrimSpace(c.Query("status")),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": records, "total": total, "page": page, "limit": limit})
}

func (h *OfficialSiteHandler) UpdateCooperation(c *gin.Context) {
	var payload struct {
		Status string `json:"status"`
		Remark string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := h.service.UpdateOfficialSiteCooperation(c.Request.Context(), c.Param("id"), payload.Status, payload.Remark); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OfficialSiteHandler) CreateSupportSession(c *gin.Context) {
	var payload struct {
		Nickname       string `json:"nickname"`
		Contact        string `json:"contact"`
		InitialMessage string `json:"initial_message"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	session, messages, err := h.service.CreateSupportSession(c.Request.Context(), service.OfficialSiteSupportCreateInput{
		Nickname:       payload.Nickname,
		Contact:        payload.Contact,
		InitialMessage: payload.InitialMessage,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "session": session, "messages": messages})
}

func (h *OfficialSiteHandler) GetSupportSessionByToken(c *gin.Context) {
	session, err := h.service.GetSupportSessionByToken(c.Request.Context(), c.Param("token"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": session})
}

func (h *OfficialSiteHandler) ListSupportSessionMessagesByToken(c *gin.Context) {
	session, messages, err := h.service.GetSupportSessionMessagesByToken(c.Request.Context(), c.Param("token"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "session": session, "messages": messages})
}

func (h *OfficialSiteHandler) AppendVisitorSupportMessage(c *gin.Context) {
	var payload struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	message, err := h.service.AppendVisitorSupportMessage(c.Request.Context(), c.Param("token"), service.OfficialSiteSupportMessageInput{
		Content: payload.Content,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": message})
}

func (h *OfficialSiteHandler) ListAdminSupportSessions(c *gin.Context) {
	page, limit, offset := parseOfficialSitePage(c)
	records, total, err := h.service.ListAdminSupportSessions(c.Request.Context(), service.OfficialSiteSupportSessionListParams{
		Status: strings.TrimSpace(c.Query("status")),
		Search: strings.TrimSpace(c.Query("search")),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": records, "total": total, "page": page, "limit": limit})
}

func (h *OfficialSiteHandler) GetAdminSupportMessages(c *gin.Context) {
	session, messages, err := h.service.GetAdminSupportSessionMessages(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "session": session, "messages": messages})
}

func (h *OfficialSiteHandler) AppendAdminSupportMessage(c *gin.Context) {
	var payload struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	_, adminName := officialSiteAdminContext(c)
	message, err := h.service.AppendAdminSupportMessage(c.Request.Context(), c.Param("id"), service.OfficialSiteSupportMessageInput{
		Content: payload.Content,
	}, adminName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": message})
}

func (h *OfficialSiteHandler) UpdateSupportSession(c *gin.Context) {
	var payload struct {
		Status      string `json:"status"`
		AdminRemark string `json:"admin_remark"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	session, err := h.service.UpdateSupportSession(c.Request.Context(), c.Param("id"), service.OfficialSiteSupportSessionUpdateInput{
		Status:      payload.Status,
		AdminRemark: payload.AdminRemark,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": session})
}

func parseOfficialSitePage(c *gin.Context) (int, int, int) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	return page, limit, (page - 1) * limit
}

func officialSiteAdminContext(c *gin.Context) (string, string) {
	adminID := strings.TrimSpace(c.GetString("admin_id"))
	if adminID == "" {
		if numericID := parseContextUint(c.Get("admin_id")); numericID > 0 {
			adminID = strconv.FormatUint(uint64(numericID), 10)
		}
	}
	adminName := strings.TrimSpace(c.GetString("admin_name"))
	if adminName == "" {
		if value, ok := c.Get("admin_phone"); ok {
			adminName = strings.TrimSpace(value.(string))
		}
	}
	return adminID, adminName
}
