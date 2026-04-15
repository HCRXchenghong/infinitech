package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

// AdminHandler handles admin auth and data.
type AdminHandler struct {
	admin *service.AdminService
	sms   *service.SMSService
}

func NewAdminHandler(admin *service.AdminService, sms *service.SMSService) *AdminHandler {
	return &AdminHandler{admin: admin, sms: sms}
}

func writeSensitiveResponseHeaders(c *gin.Context) {
	headers := c.Writer.Header()
	headers.Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
	headers.Set("Pragma", "no-cache")
	headers.Set("Expires", "0")
	headers.Set("X-Content-Type-Options", "nosniff")
}

func buildTemporaryCredentialPayload(password string) gin.H {
	return gin.H{
		"temporaryPassword": strings.TrimSpace(password),
		"deliveryMode":      "operator_receipt",
	}
}

func respondAdminStatusError(c *gin.Context, status int, message string) {
	code := responseCodeInternalError
	switch status {
	case http.StatusBadRequest:
		code = responseCodeInvalidArgument
	case http.StatusUnauthorized:
		code = responseCodeUnauthorized
	case http.StatusForbidden:
		code = responseCodeForbidden
	case http.StatusNotFound:
		code = responseCodeNotFound
	case http.StatusConflict:
		code = responseCodeConflict
	case http.StatusGone:
		code = responseCodeGone
	}
	respondErrorEnvelope(c, status, code, message, nil)
}

func respondAdminInvalidRequest(c *gin.Context, message string) {
	respondAdminStatusError(c, http.StatusBadRequest, message)
}

func respondAdminSuccess(c *gin.Context, message string, data interface{}) {
	respondSuccessEnvelope(c, message, data, nil)
}

func respondAdminMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func (h *AdminHandler) Login(c *gin.Context) {
	var req service.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}

	resp, code, err := h.admin.Login(c.Request.Context(), req)
	if err != nil {
		c.JSON(code, resp)
		return
	}
	c.JSON(code, resp)
}

func (h *AdminHandler) SendAdminSMSCode(c *gin.Context) {
	var req service.RequestCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	if req.Scene == "" {
		req.Scene = "login"
	}
	resp, err := h.sms.RequestCode(c.Request.Context(), &req)
	if err != nil {
		msg := "发送失败"
		if resp != nil && resp.Message != "" {
			msg = resp.Message
		}
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": msg})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// Admin accounts
func (h *AdminHandler) GetAdmins(c *gin.Context) {
	admins, err := h.admin.ListAdmins(c.Request.Context())
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "加载管理员账号失败", gin.H{"error": err.Error()})
		return
	}
	respondAdminSuccess(c, "管理员账号列表加载成功", admins)
}

func (h *AdminHandler) CreateAdmin(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Name     string `json:"name"`
		Password string `json:"password"`
		Type     string `json:"type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	if err := h.admin.CreateAdmin(c.Request.Context(), req.Phone, req.Name, req.Password, req.Type); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "管理员账号创建成功", nil)
}

func (h *AdminHandler) UpdateAdmin(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminInvalidRequest(c, "请求参数错误")
		return
	}
	updates := map[string]interface{}{}
	if v, ok := req["phone"]; ok {
		updates["phone"] = v
	}
	if v, ok := req["name"]; ok {
		updates["name"] = v
	}
	if v, ok := req["type"]; ok {
		updates["type"] = v
	}
	if err := h.admin.UpdateAdmin(c.Request.Context(), id, updates); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "管理员账号更新成功", gin.H{"id": id, "updated": true})
}

func (h *AdminHandler) DeleteAdmin(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	if err := h.admin.DeleteAdmin(c.Request.Context(), id); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "管理员账号删除成功", gin.H{"id": id, "deleted": true})
}

func (h *AdminHandler) ResetAdminPassword(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "无效ID"})
		return
	}
	newPassword, err := h.admin.ResetAdminPassword(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	temporaryCredential := buildTemporaryCredentialPayload(newPassword)
	respondSensitiveEnvelope(c, http.StatusOK, responseCodeOK, "管理员密码已重置", gin.H{
		"newPassword":         newPassword,
		"temporaryCredential": temporaryCredential,
	}, gin.H{
		"newPassword":         newPassword,
		"temporaryCredential": temporaryCredential,
	})
}

func (h *AdminHandler) CompleteBootstrapSetup(c *gin.Context) {
	adminID := parseContextUint(c.Get("admin_id"))
	if adminID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "登录状态已失效，请重新登录"})
		return
	}

	var req struct {
		Phone           string `json:"phone"`
		Name            string `json:"name"`
		NewPassword     string `json:"newPassword"`
		ConfirmPassword string `json:"confirmPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	if strings.TrimSpace(req.NewPassword) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请输入新的管理员密码"})
		return
	}
	if strings.TrimSpace(req.ConfirmPassword) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请再次确认新的管理员密码"})
		return
	}
	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "两次输入的新密码不一致"})
		return
	}

	resp, code, err := h.admin.CompleteBootstrapSetup(
		c.Request.Context(),
		adminID,
		req.Phone,
		req.Name,
		req.NewPassword,
	)
	if err != nil {
		c.JSON(code, resp)
		return
	}
	c.JSON(code, resp)
}

func (h *AdminHandler) ChangeOwnPassword(c *gin.Context) {
	adminID := parseContextUint(c.Get("admin_id"))
	if adminID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "登录状态已失效，请重新登录"})
		return
	}

	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
		ConfirmPassword string `json:"confirmPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	if strings.TrimSpace(req.CurrentPassword) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请输入当前密码"})
		return
	}
	if strings.TrimSpace(req.NewPassword) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请输入新密码"})
		return
	}
	if req.ConfirmPassword != "" && req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "两次输入的新密码不一致"})
		return
	}

	if err := h.admin.ChangeOwnPassword(c.Request.Context(), adminID, req.CurrentPassword, req.NewPassword); err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "登录状态已失效，请重新登录"})
			return
		}
		if strings.Contains(err.Error(), "密码") {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "修改密码失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Users
func (h *AdminHandler) GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 15
	}
	offset := (page - 1) * limit

	users, total, err := h.admin.ListUsers(c.Request.Context(), c.Query("search"), c.Query("type"), limit, offset)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "加载用户列表失败", gin.H{"error": err.Error()})
		return
	}
	respondPaginatedEnvelope(c, "ADMIN_USER_LISTED", "用户列表加载成功", "users", users, total, page, limit)
}

func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Name     string `json:"name"`
		Password string `json:"password"`
		Type     string `json:"type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	if err := h.admin.CreateUser(c.Request.Context(), req.Phone, req.Name, req.Password, req.Type); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "用户创建成功", nil)
}

func (h *AdminHandler) ResetUserPassword(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	newPassword, err := h.admin.ResetUserPassword(c.Request.Context(), id)
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	temporaryCredential := buildTemporaryCredentialPayload(newPassword)
	respondSensitiveEnvelope(c, http.StatusOK, responseCodeOK, "用户密码已重置", gin.H{
		"newPassword":         newPassword,
		"temporaryCredential": temporaryCredential,
	}, gin.H{
		"newPassword":         newPassword,
		"temporaryCredential": temporaryCredential,
	})
}

func (h *AdminHandler) DeleteUserOrders(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	deleted, err := h.admin.DeleteUserOrders(c.Request.Context(), id)
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminMirroredSuccess(c, "用户订单清理成功", gin.H{"deleted": deleted})
}

func (h *AdminHandler) DeleteUser(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	if err := h.admin.DeleteUser(c.Request.Context(), id); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "用户删除成功", gin.H{"id": id, "deleted": true})
}

func (h *AdminHandler) DeleteAllUsers(c *gin.Context) {
	deleted, err := h.admin.DeleteAllUsers(c.Request.Context())
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminMirroredSuccess(c, "用户清空成功", gin.H{"deleted": deleted})
}

func (h *AdminHandler) ReorganizeUserRoleIDs(c *gin.Context) {
	if err := h.admin.ReorganizeUserRoleIDs(c.Request.Context()); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "ID重组成功", gin.H{"completed": true})
}

// Riders
func (h *AdminHandler) GetRiders(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 15
	}
	offset := (page - 1) * limit

	riders, total, err := h.admin.ListRiders(c.Request.Context(), c.Query("search"), limit, offset)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "加载骑手列表失败", gin.H{"error": err.Error()})
		return
	}
	respondPaginatedEnvelope(c, "ADMIN_RIDER_LISTED", "骑手列表加载成功", "riders", riders, total, page, limit)
}

func (h *AdminHandler) GetRiderByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	rider, err := h.admin.GetRider(c.Request.Context(), id)
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "骑手详情加载成功", rider)
}

func (h *AdminHandler) CreateRider(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone"`
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	if err := h.admin.CreateRider(c.Request.Context(), req.Phone, req.Name, req.Password); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "骑手创建成功", nil)
}

func (h *AdminHandler) UpdateRider(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	var req struct {
		Phone                 string `json:"phone"`
		Name                  string `json:"name"`
		IDCardFront           string `json:"id_card_front"`
		IDCardImage           string `json:"id_card_image"`
		EmergencyContactName  string `json:"emergency_contact_name"`
		EmergencyContactPhone string `json:"emergency_contact_phone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}

	idCardFront := req.IDCardFront
	if idCardFront == "" {
		idCardFront = req.IDCardImage
	}

	if err := h.admin.UpdateRider(
		c.Request.Context(),
		id,
		req.Phone,
		req.Name,
		idCardFront,
		req.EmergencyContactName,
		req.EmergencyContactPhone,
	); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}

	respondAdminSuccess(c, "骑手资料更新成功", gin.H{"id": id, "updated": true})
}

func (h *AdminHandler) ResetRiderPassword(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	newPassword, err := h.admin.ResetRiderPassword(c.Request.Context(), id)
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	temporaryCredential := buildTemporaryCredentialPayload(newPassword)
	respondSensitiveEnvelope(c, http.StatusOK, responseCodeOK, "骑手密码已重置", gin.H{
		"newPassword":         newPassword,
		"temporaryCredential": temporaryCredential,
	}, gin.H{
		"newPassword":         newPassword,
		"temporaryCredential": temporaryCredential,
	})
}

func (h *AdminHandler) DeleteRiderOrders(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	deleted, err := h.admin.DeleteRiderOrders(c.Request.Context(), id)
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminMirroredSuccess(c, "骑手订单清理成功", gin.H{"deleted": deleted})
}

func (h *AdminHandler) DeleteRider(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	if err := h.admin.DeleteRider(c.Request.Context(), id); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "骑手删除成功", gin.H{"id": id, "deleted": true})
}

func (h *AdminHandler) DeleteAllRiders(c *gin.Context) {
	deleted, err := h.admin.DeleteAllRiders(c.Request.Context())
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminMirroredSuccess(c, "骑手清空成功", gin.H{"deleted": deleted})
}

func (h *AdminHandler) ReorganizeRiderRoleIDs(c *gin.Context) {
	if err := h.admin.ReorganizeRiderRoleIDs(c.Request.Context()); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "ID重组成功", gin.H{"completed": true})
}

// Merchants
func (h *AdminHandler) GetMerchants(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 15
	}
	offset := (page - 1) * limit

	merchants, total, err := h.admin.ListMerchants(c.Request.Context(), c.Query("search"), limit, offset)
	if err != nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "加载商户列表失败", gin.H{"error": err.Error()})
		return
	}
	respondPaginatedEnvelope(c, "ADMIN_MERCHANT_LISTED", "商户列表加载成功", "merchants", merchants, total, page, limit)
}

func (h *AdminHandler) GetMerchant(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	merchant, err := h.admin.GetMerchant(c.Request.Context(), id)
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "商户详情加载成功", merchant)
}

func (h *AdminHandler) CreateMerchant(c *gin.Context) {
	var req struct {
		Phone     string `json:"phone"`
		Name      string `json:"name"`
		OwnerName string `json:"owner_name"`
		Password  string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	if err := h.admin.CreateMerchant(c.Request.Context(), req.Phone, req.Name, req.OwnerName, req.Password); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "商户创建成功", nil)
}

func (h *AdminHandler) UpdateMerchant(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	var req struct {
		Phone                string `json:"phone"`
		Name                 string `json:"name"`
		OwnerName            string `json:"owner_name"`
		BusinessLicenseImage string `json:"business_license_image"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数错误"})
		return
	}
	if err := h.admin.UpdateMerchant(c.Request.Context(), id, req.Phone, req.Name, req.OwnerName, req.BusinessLicenseImage); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "商户资料更新成功", gin.H{"id": id, "updated": true})
}

func (h *AdminHandler) ResetMerchantPassword(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	newPassword, err := h.admin.ResetMerchantPassword(c.Request.Context(), id)
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	temporaryCredential := buildTemporaryCredentialPayload(newPassword)
	respondSensitiveEnvelope(c, http.StatusOK, responseCodeOK, "商户密码已重置", gin.H{
		"newPassword":         newPassword,
		"temporaryCredential": temporaryCredential,
	}, gin.H{
		"newPassword":         newPassword,
		"temporaryCredential": temporaryCredential,
	})
}

func (h *AdminHandler) DeleteMerchant(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminInvalidRequest(c, "无效ID")
		return
	}
	if err := h.admin.DeleteMerchant(c.Request.Context(), id); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "商户删除成功", gin.H{"id": id, "deleted": true})
}

func (h *AdminHandler) DeleteAllMerchants(c *gin.Context) {
	deleted, err := h.admin.DeleteAllMerchants(c.Request.Context())
	if err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminMirroredSuccess(c, "商户清空成功", gin.H{"deleted": deleted})
}

func (h *AdminHandler) ReorganizeMerchantRoleIDs(c *gin.Context) {
	if err := h.admin.ReorganizeMerchantRoleIDs(c.Request.Context()); err != nil {
		respondAdminInvalidRequest(c, err.Error())
		return
	}
	respondAdminSuccess(c, "ID重组成功", gin.H{"completed": true})
}

// Orders list (admin)
func (h *AdminHandler) GetOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 15
	}
	offset := (page - 1) * limit

	role := c.GetString("operator_role")
	merchantID := c.GetInt64("merchant_id")
	merchantPhone := c.GetString("merchant_phone")

	orders, total, err := h.admin.ListOrders(
		c.Request.Context(),
		c.Query("search"),
		c.Query("status"),
		func() string {
			v := strings.TrimSpace(c.Query("bizType"))
			if v == "" {
				v = strings.TrimSpace(c.Query("biz_type"))
			}
			return v
		}(),
		limit,
		offset,
		role,
		merchantID,
		merchantPhone,
	)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders, "total": total})
}

func (h *AdminHandler) DeleteAllOrders(c *gin.Context) {
	deleted, err := h.admin.DeleteAllOrders(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "deleted": deleted})
}

func (h *AdminHandler) ClearAllData(c *gin.Context) {
	result, err := h.admin.ClearAllBusinessData(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "result": result})
}

// Stats & ranks
func (h *AdminHandler) GetStats(c *gin.Context) {
	stats, err := h.admin.GetStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *AdminHandler) GetUserRanks(c *gin.Context) {
	period := c.Query("period")
	rankType := c.Query("type")
	ranks, err := h.admin.GetUserRanks(c.Request.Context(), period, rankType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ranks)
}

func (h *AdminHandler) GetRiderRanks(c *gin.Context) {
	period := c.Query("period")
	ranks, err := h.admin.GetRiderRanks(c.Request.Context(), period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ranks)
}

// Export / Import
func (h *AdminHandler) ExportUsers(c *gin.Context) {
	data, err := h.admin.ExportUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AdminHandler) ExportRiders(c *gin.Context) {
	data, err := h.admin.ExportRiders(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AdminHandler) ExportMerchants(c *gin.Context) {
	data, err := h.admin.ExportMerchants(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AdminHandler) ExportOrders(c *gin.Context) {
	data, err := h.admin.ExportOrders(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AdminHandler) ImportUsers(c *gin.Context) {
	items := parseItems(c, "users")
	successCount, errorCount := h.admin.ImportUsers(c.Request.Context(), items)
	c.JSON(http.StatusOK, gin.H{"success": true, "successCount": successCount, "errorCount": errorCount})
}

func (h *AdminHandler) ImportRiders(c *gin.Context) {
	items := parseItems(c, "riders")
	successCount, errorCount := h.admin.ImportRiders(c.Request.Context(), items)
	c.JSON(http.StatusOK, gin.H{"success": true, "successCount": successCount, "errorCount": errorCount})
}

func (h *AdminHandler) ImportMerchants(c *gin.Context) {
	items := parseItems(c, "merchants")
	successCount, errorCount := h.admin.ImportMerchants(c.Request.Context(), items)
	c.JSON(http.StatusOK, gin.H{"success": true, "successCount": successCount, "errorCount": errorCount})
}

func (h *AdminHandler) ImportOrders(c *gin.Context) {
	items := parseItems(c, "orders")
	successCount, errorCount := h.admin.ImportOrders(c.Request.Context(), items)
	c.JSON(http.StatusOK, gin.H{"success": true, "successCount": successCount, "errorCount": errorCount})
}

func parseItems(c *gin.Context, key string) []map[string]interface{} {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		return []map[string]interface{}{}
	}
	raw := payload[key]
	if raw == nil {
		return []map[string]interface{}{}
	}

	items := []map[string]interface{}{}
	switch v := raw.(type) {
	case []interface{}:
		for _, item := range v {
			if m, ok := item.(map[string]interface{}); ok {
				items = append(items, m)
			}
		}
	case []map[string]interface{}:
		items = append(items, v...)
	}
	return items
}

func parseContextUint(value interface{}, exists bool) uint {
	if !exists {
		return 0
	}
	switch v := value.(type) {
	case uint:
		return v
	case uint64:
		return uint(v)
	case int:
		if v > 0 {
			return uint(v)
		}
	case int64:
		if v > 0 {
			return uint(v)
		}
	case float64:
		if v > 0 {
			return uint(v)
		}
	case string:
		parsed, err := strconv.ParseUint(strings.TrimSpace(v), 10, 64)
		if err == nil && parsed > 0 {
			return uint(parsed)
		}
	}
	return 0
}

// ReorganizeRoleIds 重组角色 ID
func (h *AdminHandler) ReorganizeRoleIds(c *gin.Context) {
	userType := c.Param("type")
	if err := h.admin.ReorganizeRoleIds(c.Request.Context(), userType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "ID重组成功"})
}
