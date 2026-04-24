package handler

import (
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/apiresponse"
	"github.com/yuexiang/go-api/internal/service"
)

type OfficialSiteHandler struct {
	service *service.OfficialSiteService
}

func NewOfficialSiteHandler(service *service.OfficialSiteService) *OfficialSiteHandler {
	return &OfficialSiteHandler{service: service}
}

func respondOfficialSiteInvalidRequest(c *gin.Context, message string) {
	respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, message, nil)
}

func respondOfficialSiteNotFound(c *gin.Context, message string) {
	respondErrorEnvelope(c, http.StatusNotFound, responseCodeNotFound, message, nil)
}

func respondOfficialSiteInternalError(c *gin.Context, err error) {
	if err == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "internal error", nil)
		return
	}
	respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
}

func respondOfficialSiteMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func respondOfficialSitePaginated(c *gin.Context, message string, records interface{}, total int64, page, limit int) {
	respondPaginatedEnvelope(c, responseCodeOK, message, "records", records, total, page, limit)
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
		respondOfficialSiteInvalidRequest(c, "invalid request")
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
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}

	respondOfficialSiteMirroredSuccess(c, "官网曝光提交成功", gin.H{
		"id":            record.UID,
		"review_status": record.ReviewStatus,
	})
}

func (h *OfficialSiteHandler) UploadExposureAsset(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		respondOfficialSiteInvalidRequest(c, "没有找到上传文件")
		return
	}

	dateDir := time.Now().Format("2006-01-02")
	finalFilename, url, err := saveUploadFile(
		c,
		file,
		5*1024*1024,
		publicImageUploadAllowedExts,
		"official-site",
		"exposures",
		filepath.Clean(dateDir),
	)
	if err != nil {
		status := http.StatusBadRequest
		if isUploadInternalError(err) {
			status = http.StatusInternalServerError
		}
		respondErrorEnvelope(c, status, apiresponse.NormalizeCode("", status), err.Error(), nil)
		return
	}

	payload := buildPublicAssetPayload(url, finalFilename, "official_site_exposure_asset", file.Size)
	payload["url"] = url
	respondOfficialSiteMirroredSuccess(c, "官网曝光素材上传成功", payload)
}

func (h *OfficialSiteHandler) ListPublicExposures(c *gin.Context) {
	records, err := h.service.ListPublicExposures(c.Request.Context())
	if err != nil {
		respondOfficialSiteInternalError(c, err)
		return
	}
	respondOfficialSitePaginated(c, "官网曝光列表加载成功", records, int64(len(records)), 1, len(records))
}

func (h *OfficialSiteHandler) GetPublicExposureDetail(c *gin.Context) {
	record, err := h.service.GetPublicExposureDetail(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondOfficialSiteNotFound(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网曝光详情加载成功", record)
}

func (h *OfficialSiteHandler) ListPublicNews(c *gin.Context) {
	page, limit, offset := parseOfficialSitePage(c)
	records, total, err := h.service.ListPublicNews(c.Request.Context(), service.OfficialSiteNewsListParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		respondOfficialSiteInternalError(c, err)
		return
	}
	respondOfficialSitePaginated(c, "官网资讯列表加载成功", records, total, page, limit)
}

func (h *OfficialSiteHandler) GetPublicNewsDetail(c *gin.Context) {
	record, err := h.service.GetPublicNewsDetail(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondOfficialSiteNotFound(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网资讯详情加载成功", record)
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
		respondOfficialSiteInternalError(c, err)
		return
	}
	respondOfficialSitePaginated(c, "官网曝光审核列表加载成功", records, total, page, limit)
}

func (h *OfficialSiteHandler) UpdateExposure(c *gin.Context) {
	var payload struct {
		ReviewStatus  string `json:"review_status"`
		ReviewRemark  string `json:"review_remark"`
		ProcessStatus string `json:"process_status"`
		ProcessRemark string `json:"process_remark"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondOfficialSiteInvalidRequest(c, "invalid request")
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
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网曝光处理结果保存成功", record)
}

func (h *OfficialSiteHandler) CreateCooperation(c *gin.Context) {
	var payload struct {
		Nickname  string `json:"nickname"`
		Contact   string `json:"contact"`
		Direction string `json:"direction"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondOfficialSiteInvalidRequest(c, "invalid request")
		return
	}

	record, err := h.service.CreateOfficialSiteCooperation(c.Request.Context(), payload.Nickname, payload.Contact, payload.Direction)
	if err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网商务合作线索提交成功", record)
}

func (h *OfficialSiteHandler) ListAdminCooperations(c *gin.Context) {
	page, limit, offset := parseOfficialSitePage(c)
	records, total, err := h.service.ListOfficialSiteCooperations(c.Request.Context(), service.CooperationListParams{
		Status: strings.TrimSpace(c.Query("status")),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		respondOfficialSiteInternalError(c, err)
		return
	}
	respondOfficialSitePaginated(c, "官网商务合作线索加载成功", records, total, page, limit)
}

func (h *OfficialSiteHandler) UpdateCooperation(c *gin.Context) {
	var payload struct {
		Status string `json:"status"`
		Remark string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondOfficialSiteInvalidRequest(c, "invalid request")
		return
	}
	if err := h.service.UpdateOfficialSiteCooperation(c.Request.Context(), c.Param("id"), payload.Status, payload.Remark); err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网商务合作状态更新成功", gin.H{
		"id":      c.Param("id"),
		"updated": true,
		"status":  payload.Status,
	})
}

func (h *OfficialSiteHandler) CreateSupportSession(c *gin.Context) {
	var payload struct {
		Nickname       string `json:"nickname"`
		Contact        string `json:"contact"`
		InitialMessage string `json:"initial_message"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondOfficialSiteInvalidRequest(c, "invalid request")
		return
	}

	session, messages, err := h.service.CreateSupportSession(c.Request.Context(), service.OfficialSiteSupportCreateInput{
		Nickname:       payload.Nickname,
		Contact:        payload.Contact,
		InitialMessage: payload.InitialMessage,
	})
	if err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网客服会话创建成功", gin.H{
		"session":  session,
		"messages": messages,
	})
}

func (h *OfficialSiteHandler) GetSupportSessionByToken(c *gin.Context) {
	session, err := h.service.GetSupportSessionByToken(c.Request.Context(), c.Param("token"))
	if err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网客服会话加载成功", session)
}

func (h *OfficialSiteHandler) ListSupportSessionMessagesByToken(c *gin.Context) {
	session, messages, err := h.service.GetSupportSessionMessagesByToken(c.Request.Context(), c.Param("token"))
	if err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网客服消息加载成功", gin.H{
		"session":  session,
		"messages": messages,
	})
}

func (h *OfficialSiteHandler) AppendVisitorSupportMessage(c *gin.Context) {
	var payload struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondOfficialSiteInvalidRequest(c, "invalid request")
		return
	}

	message, err := h.service.AppendVisitorSupportMessage(c.Request.Context(), c.Param("token"), service.OfficialSiteSupportMessageInput{
		Content: payload.Content,
	})
	if err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网访客消息发送成功", message)
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
		respondOfficialSiteInternalError(c, err)
		return
	}
	respondOfficialSitePaginated(c, "官网客服会话列表加载成功", records, total, page, limit)
}

func (h *OfficialSiteHandler) GetAdminSupportMessages(c *gin.Context) {
	session, messages, err := h.service.GetAdminSupportSessionMessages(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网客服会话消息加载成功", gin.H{
		"session":  session,
		"messages": messages,
	})
}

func (h *OfficialSiteHandler) AppendAdminSupportMessage(c *gin.Context) {
	var payload struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondOfficialSiteInvalidRequest(c, "invalid request")
		return
	}

	_, adminName := officialSiteAdminContext(c)
	message, err := h.service.AppendAdminSupportMessage(c.Request.Context(), c.Param("id"), service.OfficialSiteSupportMessageInput{
		Content: payload.Content,
	}, adminName)
	if err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网客服回复发送成功", message)
}

func (h *OfficialSiteHandler) UpdateSupportSession(c *gin.Context) {
	var payload struct {
		Status      string `json:"status"`
		AdminRemark string `json:"admin_remark"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		respondOfficialSiteInvalidRequest(c, "invalid request")
		return
	}

	session, err := h.service.UpdateSupportSession(c.Request.Context(), c.Param("id"), service.OfficialSiteSupportSessionUpdateInput{
		Status:      payload.Status,
		AdminRemark: payload.AdminRemark,
	})
	if err != nil {
		respondOfficialSiteInvalidRequest(c, err.Error())
		return
	}
	respondOfficialSiteMirroredSuccess(c, "官网客服会话状态更新成功", session)
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
