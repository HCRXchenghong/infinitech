package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/ridercert"
	svc "github.com/yuexiang/go-api/internal/service"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type RiderHandler struct {
	db    *gorm.DB
	redis *redis.Client
	auth  *svc.AuthService
}

func NewRiderHandler(db *gorm.DB, redis *redis.Client, auth *svc.AuthService) *RiderHandler {
	return &RiderHandler{
		db:    db,
		redis: redis,
		auth:  auth,
	}
}

func respondRiderError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondRiderInvalidRequest(c *gin.Context, message string) {
	respondRiderError(c, http.StatusBadRequest, message)
}

func respondRiderNotFound(c *gin.Context, message string) {
	respondRiderError(c, http.StatusNotFound, message)
}

func respondRiderInternalError(c *gin.Context, message string) {
	respondRiderError(c, http.StatusInternalServerError, message)
}

func respondRiderMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func (h *RiderHandler) loadRiderByID(riderID uint, fields ...string) (*repository.Rider, error) {
	query := h.db
	if len(fields) > 0 {
		query = query.Select(fields)
	}

	var rider repository.Rider
	if err := query.Where("id = ?", riderID).First(&rider).Error; err != nil {
		return nil, err
	}
	return &rider, nil
}

func riderTruthy(value interface{}) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		normalized := strings.TrimSpace(strings.ToLower(typed))
		return normalized == "1" || normalized == "true" || normalized == "yes" || normalized == "on"
	case int:
		return typed != 0
	case int64:
		return typed != 0
	case float64:
		return typed != 0
	default:
		return false
	}
}

func riderVerificationFieldValue(updates map[string]interface{}, key, fallback string) string {
	if updates != nil {
		if value, ok := updates[key]; ok {
			return strings.TrimSpace(fmt.Sprint(value))
		}
	}
	return strings.TrimSpace(fallback)
}

func riderVerificationReady(current *repository.Rider, updates map[string]interface{}) bool {
	if current == nil {
		return false
	}

	realName := riderVerificationFieldValue(updates, "real_name", current.RealName)
	idCardNumber := riderVerificationFieldValue(updates, "id_card_number", current.IDCardNumber)
	idCardFront := riderVerificationFieldValue(updates, "id_card_front", current.IDCardFront)
	idCardBack := riderVerificationFieldValue(updates, "id_card_back", current.IDCardBack)

	return realName != "" && idCardNumber != "" && idCardFront != "" && idCardBack != ""
}

func (h *RiderHandler) resolveRiderID(raw string) (uint, error) {
	idText := strings.TrimSpace(raw)
	if idText == "" {
		return 0, fmt.Errorf("invalid rider id")
	}
	if parsed, err := strconv.ParseUint(idText, 10, 64); err == nil && parsed > 0 {
		return uint(parsed), nil
	}

	query := h.db.Model(&repository.Rider{}).Select("id")
	switch {
	case idkit.UIDPattern.MatchString(idText):
		query = query.Where("uid = ?", idText)
	case idkit.TSIDPattern.MatchString(idText):
		query = query.Where("tsid = ?", idText)
	default:
		return 0, fmt.Errorf("invalid rider id")
	}

	var rider repository.Rider
	if err := query.First(&rider).Error; err != nil {
		return 0, err
	}
	return rider.ID, nil
}

// UpdateAvatar 更新头像
func (h *RiderHandler) UpdateAvatar(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "无效骑手ID")
		return
	}
	if _, err := h.loadRiderByID(riderID, "id"); err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}
	var req struct {
		Avatar string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondRiderInvalidRequest(c, "参数错误")
		return
	}

	update := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Update("avatar", req.Avatar)
	if update.Error != nil {
		respondRiderInternalError(c, "更新失败")
		return
	}

	respondRiderMirroredSuccess(c, "骑手头像更新成功", gin.H{
		"updated": true,
		"avatar":  strings.TrimSpace(req.Avatar),
	})
}

// GetProfile 获取骑手资料
func (h *RiderHandler) GetProfile(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "无效骑手ID")
		return
	}
	var rider repository.Rider

	if err := h.db.Where("id = ?", riderID).First(&rider).Error; err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	payload := gin.H{}
	if encoded, err := json.Marshal(rider); err == nil {
		_ = json.Unmarshal(encoded, &payload)
	}
	payload["id_card_front_preview_url"] = buildRiderCertPreviewURL(rider.ID, "id_card_front", rider.IDCardFront)
	payload["id_card_back_preview_url"] = buildRiderCertPreviewURL(rider.ID, "id_card_back", rider.IDCardBack)
	payload["health_cert_preview_url"] = buildRiderCertPreviewURL(rider.ID, "health_cert", rider.HealthCert)

	respondRiderMirroredSuccess(c, "骑手资料加载成功", payload)
}

// UpdateProfile 更新骑手资料
func (h *RiderHandler) UpdateProfile(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "无效骑手ID")
		return
	}

	currentRider, err := h.loadRiderByID(riderID, "id", "real_name", "id_card_number", "id_card_front", "id_card_back", "is_verified")
	if err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	var req map[string]interface{}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondRiderInvalidRequest(c, "参数错误")
		return
	}

	// 允许更新的字段
	allowedFields := []string{"nickname", "real_name", "id_card_number",
		"id_card_front", "id_card_back", "health_cert", "health_cert_expiry"}

	updates := make(map[string]interface{})
	for _, field := range allowedFields {
		if val, ok := req[field]; ok {
			if _, certField := ridercert.NormalizeField(field); certField {
				normalized := strings.TrimSpace(fmt.Sprint(val))
				if normalized == "" {
					updates[field] = ""
					continue
				}
				nextRef, normalizeErr := ridercert.NormalizeOwnedUpdateReference(riderID, field, normalized, riderVerificationFieldValue(updates, field, currentRiderValueByField(currentRider, field)))
				if normalizeErr != nil {
					respondRiderInvalidRequest(c, normalizeErr.Error())
					return
				}
				updates[field] = nextRef
				continue
			}
			updates[field] = val
		}
	}

	fullVerificationPayload := req["real_name"] != nil &&
		req["id_card_number"] != nil &&
		req["id_card_front"] != nil &&
		req["id_card_back"] != nil
	verifyRequested := riderTruthy(req["is_verified"])

	if verifyRequested && !riderVerificationReady(currentRider, updates) {
		respondRiderInvalidRequest(c, "请先完善实名认证资料")
		return
	}

	if verifyRequested || (fullVerificationPayload && riderVerificationReady(currentRider, updates)) {
		updates["is_verified"] = true
	}

	if len(updates) == 0 {
		respondRiderMirroredSuccess(c, "骑手资料已是最新状态", gin.H{
			"updated": false,
		})
		return
	}

	if err := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Updates(updates).Error; err != nil {
		respondRiderInternalError(c, "更新失败")
		return
	}

	respondRiderMirroredSuccess(c, "骑手资料更新成功", gin.H{
		"updated": true,
		"fields":  updates,
	})
}

func currentRiderValueByField(rider *repository.Rider, field string) string {
	if rider == nil {
		return ""
	}
	switch field {
	case "id_card_front":
		return rider.IDCardFront
	case "id_card_back":
		return rider.IDCardBack
	case "health_cert":
		return rider.HealthCert
	default:
		return ""
	}
}

// DownloadCert 鉴权下载骑手私有证件
func (h *RiderHandler) DownloadCert(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "无效骑手ID")
		return
	}
	field, ok := normalizeRiderCertField(c.Query("field"))
	if !ok {
		respondRiderInvalidRequest(c, "不支持的证件字段")
		return
	}

	var rider repository.Rider
	if err := h.db.Select("id", "id_card_front", "id_card_back", "health_cert").Where("id = ?", riderID).First(&rider).Error; err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	storedValue := ""
	switch field {
	case "id_card_front":
		storedValue = rider.IDCardFront
	case "id_card_back":
		storedValue = rider.IDCardBack
	case "health_cert":
		storedValue = rider.HealthCert
	}

	ref, absPath, contentType, changed, resolveErr := resolveStoredRiderCertFile(riderID, field, storedValue)
	if resolveErr != nil {
		respondRiderNotFound(c, resolveErr.Error())
		return
	}
	if changed {
		_ = h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Update(field, ref).Error
	}

	c.Header("Cache-Control", "no-store")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Content-Type", contentType)
	c.File(absPath)
}

// UploadCert 上传证件照片
func (h *RiderHandler) UploadCert(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "无效骑手ID")
		return
	}
	field, ok := normalizeRiderCertField(c.PostForm("field"))
	if !ok {
		respondRiderInvalidRequest(c, "不支持的证件字段")
		return
	}

	file, err := c.FormFile("image")
	if err != nil {
		respondRiderInvalidRequest(c, "未找到图片")
		return
	}

	currentRider, err := h.loadRiderByID(riderID, "id", "id_card_front", "id_card_back", "health_cert")
	if err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	nextRef, filename, contentType, saveErr := saveUploadedRiderCert(c, file, riderID, field)
	if saveErr != nil {
		status := http.StatusBadRequest
		if strings.Contains(saveErr.Error(), "目录失败") ||
			strings.Contains(saveErr.Error(), "保存证件失败") ||
			strings.Contains(saveErr.Error(), "图片处理失败") {
			status = http.StatusInternalServerError
		}
		respondRiderError(c, status, saveErr.Error())
		return
	}

	if err := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Update(field, nextRef).Error; err != nil {
		cleanupRiderCertReference(riderID, field, nextRef)
		respondRiderInternalError(c, "更新失败")
		return
	}

	switch field {
	case "id_card_front":
		cleanupRiderCertReference(riderID, field, currentRider.IDCardFront)
	case "id_card_back":
		cleanupRiderCertReference(riderID, field, currentRider.IDCardBack)
	case "health_cert":
		cleanupRiderCertReference(riderID, field, currentRider.HealthCert)
	}

	previewURL := buildRiderCertPreviewURL(riderID, field, nextRef)
	respondRiderMirroredSuccess(c, "骑手证件上传成功", gin.H{
		"asset_id":      nextRef,
		"asset_url":     previewURL,
		"access_policy": "private",
		"content_type":  contentType,
		"owner_scope":   fmt.Sprintf("rider:%d:%s", riderID, field),
		"filename":      filename,
		"imageUrl":      nextRef,
		"assetRef":      nextRef,
		"previewUrl":    previewURL,
	})
}

// ChangePhone 修改手机号
func (h *RiderHandler) ChangePhone(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "无效骑手ID")
		return
	}

	rider, err := h.loadRiderByID(riderID, "id", "uid", "name", "nickname", "phone")
	if err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	var req struct {
		OldPhone string `json:"oldPhone"`
		OldCode  string `json:"oldCode"`
		NewPhone string `json:"newPhone"`
		NewCode  string `json:"newCode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondRiderInvalidRequest(c, "参数错误")
		return
	}

	req.OldPhone = strings.TrimSpace(req.OldPhone)
	req.OldCode = strings.TrimSpace(req.OldCode)
	req.NewPhone = strings.TrimSpace(req.NewPhone)
	req.NewCode = strings.TrimSpace(req.NewCode)

	ctx := c.Request.Context()

	if req.OldPhone == "" || req.OldCode == "" || req.NewPhone == "" || req.NewCode == "" {
		respondRiderInvalidRequest(c, "请完整填写换绑信息")
		return
	}
	if req.OldPhone == req.NewPhone {
		respondRiderInvalidRequest(c, "新手机号不能与原手机号相同")
		return
	}
	if strings.TrimSpace(rider.Phone) != req.OldPhone {
		respondRiderInvalidRequest(c, "原手机号与当前账号不匹配")
		return
	}

	// 验证原手机号验证码
	oldOK, err := svc.VerifySMSCodeWithFallback(ctx, h.db, h.redis, "change_phone_verify", req.OldPhone, req.OldCode, true)
	if err != nil {
		respondRiderInternalError(c, "验证码服务异常，请稍后重试")
		return
	}
	if !oldOK {
		respondRiderInvalidRequest(c, "原手机号验证码错误或已过期")
		return
	}

	// 验证新手机号验证码
	newOK, err := svc.VerifySMSCodeWithFallback(ctx, h.db, h.redis, "change_phone_new", req.NewPhone, req.NewCode, true)
	if err != nil {
		respondRiderInternalError(c, "验证码服务异常，请稍后重试")
		return
	}
	if !newOK {
		respondRiderInvalidRequest(c, "新手机号验证码错误或已过期")
		return
	}

	// 检查新手机号是否已被使用
	var count int64
	if err := h.db.Model(&repository.Rider{}).Where("phone = ? AND id != ?", req.NewPhone, riderID).Count(&count).Error; err != nil {
		respondRiderInternalError(c, "手机号校验失败")
		return
	}
	if count > 0 {
		respondRiderInvalidRequest(c, "该手机号已被使用")
		return
	}

	// 更新手机号
	if err := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Update("phone", req.NewPhone).Error; err != nil {
		respondRiderInternalError(c, "更新失败")
		return
	}

	response := gin.H{
		"updated": true,
		"phone":   req.NewPhone,
		"user": gin.H{
			"id":       rider.UID,
			"phone":    req.NewPhone,
			"name":     rider.Name,
			"nickname": rider.Nickname,
		},
	}
	if h.auth != nil {
		if token, tokenErr := h.auth.IssueAccessToken(req.NewPhone, int64(riderID)); tokenErr == nil && strings.TrimSpace(token) != "" {
			response["token"] = token
		}
	}

	respondRiderMirroredSuccess(c, "手机号修改成功", response)
}

// ChangePassword 修改密码
func (h *RiderHandler) ChangePassword(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "无效骑手ID")
		return
	}

	var req struct {
		VerifyType  string `json:"verifyType"`  // password 或 code
		OldPassword string `json:"oldPassword"` // 原密码验证
		Phone       string `json:"phone"`       // 验证码验证
		Code        string `json:"code"`        // 验证码验证
		NewPassword string `json:"newPassword"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondRiderInvalidRequest(c, "参数错误")
		return
	}

	// 验证新密码长度
	if len(req.NewPassword) < 6 {
		respondRiderInvalidRequest(c, "密码至少6位")
		return
	}

	var rider repository.Rider
	if err := h.db.Where("id = ?", riderID).First(&rider).Error; err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	// 验证身份
	if req.VerifyType == "password" {
		// 原密码验证
		if err := bcrypt.CompareHashAndPassword([]byte(rider.PasswordHash), []byte(req.OldPassword)); err != nil {
			respondRiderInvalidRequest(c, "原密码错误")
			return
		}
	} else if req.VerifyType == "code" {
		// 验证码验证
		ok, err := svc.VerifySMSCodeWithFallback(c.Request.Context(), h.db, h.redis, "rider_change_password", req.Phone, req.Code, true)
		if err != nil {
			respondRiderInternalError(c, "验证码服务异常，请稍后重试")
			return
		}
		if !ok {
			respondRiderInvalidRequest(c, "验证码错误或已过期")
			return
		}
	} else {
		respondRiderInvalidRequest(c, "验证方式错误")
		return
	}

	// 加密新密码
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		respondRiderInternalError(c, "密码处理失败")
		return
	}

	// 更新密码
	if err := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Update("password_hash", string(hash)).Error; err != nil {
		respondRiderInternalError(c, "密码更新失败")
		return
	}

	respondRiderMirroredSuccess(c, "密码修改成功", gin.H{
		"updated": true,
	})
}

// GetRank 获取骑手段位信息
func (h *RiderHandler) GetRank(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "无效骑手ID")
		return
	}
	var rider repository.Rider

	if err := h.db.Where("id = ?", riderID).First(&rider).Error; err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}
	rating := rider.Rating
	if rider.RatingCount == 0 && rating <= 0 {
		rating = 5
	}

	totalOrders := rider.TotalOrders
	if count, err := h.countCompletedOrders(rider.ID, rider.Phone, nil); err == nil {
		totalOrders = int(count)
	}

	weekStart := startOfCurrentWeek(time.Now())
	weekOrders := rider.WeekOrders
	if count, err := h.countCompletedOrders(rider.ID, rider.Phone, &weekStart); err == nil {
		weekOrders = int(count)
	}

	respondRiderMirroredSuccess(c, "骑手段位信息加载成功", gin.H{
		"level":            rider.Level,
		"totalOrders":      totalOrders,
		"weekOrders":       weekOrders,
		"consecutiveWeeks": rider.ConsecutiveWeeks,
		"rating":           rating,
		"ratingCount":      rider.RatingCount,
		"rating_count":     rider.RatingCount,
	})
}

// GetRankList 获取排行榜
func (h *RiderHandler) GetRankList(c *gin.Context) {
	rankType := strings.ToLower(strings.TrimSpace(c.Query("type"))) // day, week, month
	periodStart := startOfRankPeriod(time.Now(), rankType)

	var riders []struct {
		ID       string  `json:"id"`
		Name     string  `json:"name"`
		Avatar   string  `json:"avatar"`
		Level    int     `json:"level"`
		Orders   int     `json:"orders"`
		Rating   float64 `json:"rating"`
		Phone    string  `json:"phone,omitempty"`
		IsOnline bool    `json:"is_online,omitempty"`
	}
	query := h.db.Model(&repository.Rider{}).Select(
		`uid as id, name, avatar, level,
COALESCE((
	SELECT COUNT(1)
	FROM orders o
	WHERE o.status = ? AND o.updated_at >= ?
	  AND (o.rider_id = CAST(riders.id AS CHAR)
	    OR (riders.phone IS NOT NULL AND riders.phone <> '' AND o.rider_id = riders.phone))
), 0) AS orders,
rating, phone, is_online`,
		"completed", periodStart,
	)

	if err := query.Order("orders DESC").Order("rating DESC").Order("id ASC").Limit(50).Find(&riders).Error; err != nil {
		respondRiderInternalError(c, "查询失败")
		return
	}
	for i := range riders {
		if riders[i].Rating <= 0 {
			riders[i].Rating = 5
		}
	}

	respondRiderMirroredSuccess(c, "骑手排行榜加载成功", gin.H{
		"items": riders,
		"list":  riders,
		"type":  firstNonEmptyText(rankType, "month"),
	})
}

func startOfRankPeriod(now time.Time, rankType string) time.Time {
	switch rankType {
	case "day":
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	case "week":
		return startOfCurrentWeek(now)
	default:
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	}
}

func startOfCurrentWeek(now time.Time) time.Time {
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	weekStart := now.AddDate(0, 0, -(weekday - 1))
	return time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, weekStart.Location())
}

func (h *RiderHandler) countCompletedOrders(riderID uint, riderPhone string, startAt *time.Time) (int64, error) {
	riderIDStr := strconv.FormatUint(uint64(riderID), 10)
	query := h.db.Model(&repository.Order{}).Where("status = ?", "completed").Where(
		"(rider_id = ? OR (? <> '' AND rider_id = ?))",
		riderIDStr,
		riderPhone,
		riderPhone,
	)
	if startAt != nil {
		query = query.Where("updated_at >= ?", *startAt)
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// CreateReview 创建骑手评价
func (h *RiderHandler) CreateReview(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondRiderInvalidRequest(c, "参数错误")
		return
	}

	riderID := uint(toIntValue(pickFirstValue(req, "rider_id", "riderId")))
	if riderID == 0 {
		respondRiderInvalidRequest(c, "rider_id 不能为空")
		return
	}

	rating := clampRiderRating(toFloatValue(pickFirstValue(req, "rating")))
	if rating <= 0 {
		rating = 5
	}

	review := &repository.RiderReview{
		RiderID:    riderID,
		UserID:     uint(toIntValue(pickFirstValue(req, "user_id", "userId"))),
		OrderID:    uint(toIntValue(pickFirstValue(req, "order_id", "orderId"))),
		Rating:     rating,
		Content:    toStringValue(pickFirstValue(req, "content")),
		Images:     normalizeRiderReviewImages(pickFirstValue(req, "images")),
		UserName:   toStringValue(pickFirstValue(req, "user_name", "userName")),
		UserAvatar: toStringValue(pickFirstValue(req, "user_avatar", "userAvatar")),
	}
	if review.Images == "" {
		review.Images = "[]"
	}
	if strings.TrimSpace(review.UserName) == "" {
		review.UserName = "匿名用户"
	}

	var rider repository.Rider
	if err := h.db.First(&rider, riderID).Error; err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(review).Error; err != nil {
			return err
		}
		return h.syncRiderRating(tx, riderID)
	}); err != nil {
		respondRiderInternalError(c, "创建评价失败")
		return
	}

	respondRiderMirroredSuccess(c, "骑手评论创建成功", gin.H{
		"review": riderReviewToMap(review),
	})
}

// UpdateReview 更新骑手评价
func (h *RiderHandler) UpdateReview(c *gin.Context) {
	reviewID := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondRiderInvalidRequest(c, "参数错误")
		return
	}

	var review repository.RiderReview
	if err := h.db.Where("id = ?", reviewID).First(&review).Error; err != nil {
		respondRiderNotFound(c, "评价不存在")
		return
	}

	updates := map[string]interface{}{}
	for key, value := range req {
		switch key {
		case "rating":
			nextRating := clampRiderRating(toFloatValue(value))
			if nextRating > 0 {
				updates["rating"] = nextRating
			}
		case "content":
			updates["content"] = toStringValue(value)
		case "images":
			updates["images"] = normalizeRiderReviewImages(value)
		case "user_name", "userName":
			updates["user_name"] = toStringValue(value)
		case "user_avatar", "userAvatar":
			updates["user_avatar"] = toStringValue(value)
		case "order_id", "orderId":
			updates["order_id"] = toIntValue(value)
		case "user_id", "userId":
			updates["user_id"] = toIntValue(value)
		}
	}

	if len(updates) == 0 {
		respondRiderMirroredSuccess(c, "骑手评论已是最新状态", gin.H{
			"updated": false,
		})
		return
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&repository.RiderReview{}).Where("id = ?", reviewID).Updates(updates).Error; err != nil {
			return err
		}
		return h.syncRiderRating(tx, review.RiderID)
	}); err != nil {
		respondRiderInternalError(c, "更新评价失败")
		return
	}

	respondRiderMirroredSuccess(c, "骑手评论更新成功", gin.H{
		"updated": true,
	})
}

// DeleteReview 删除骑手评价
func (h *RiderHandler) DeleteReview(c *gin.Context) {
	reviewID := c.Param("id")
	var review repository.RiderReview
	if err := h.db.Where("id = ?", reviewID).First(&review).Error; err != nil {
		respondRiderNotFound(c, "评价不存在")
		return
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ?", reviewID).Delete(&repository.RiderReview{}).Error; err != nil {
			return err
		}
		return h.syncRiderRating(tx, review.RiderID)
	}); err != nil {
		respondRiderInternalError(c, "删除评价失败")
		return
	}

	respondRiderMirroredSuccess(c, "骑手评论删除成功", gin.H{
		"deleted": true,
	})
}

// GetReviews 获取骑手评价（管理端）
func (h *RiderHandler) GetReviews(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil || riderID == 0 {
		respondRiderInvalidRequest(c, "骑手ID无效")
		return
	}

	page := 1
	pageSize := 20
	if value := c.Query("page"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if value := c.Query("pageSize"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
			if parsed > 100 {
				parsed = 100
			}
			pageSize = parsed
		}
	}
	offset := (page - 1) * pageSize

	var reviews []repository.RiderReview
	if err := h.db.Where("rider_id = ?", riderID).Order("created_at DESC").Limit(pageSize).Offset(offset).Find(&reviews).Error; err != nil {
		respondRiderInternalError(c, "查询评价失败")
		return
	}

	var total int64
	h.db.Model(&repository.RiderReview{}).Where("rider_id = ?", riderID).Count(&total)

	list := make([]map[string]interface{}, 0, len(reviews))
	for _, item := range reviews {
		itemCopy := item
		list = append(list, riderReviewToMap(&itemCopy))
	}

	var rider repository.Rider
	if err := h.db.Select("id, rating, rating_count").First(&rider, riderID).Error; err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}
	rating := rider.Rating
	if rider.RatingCount == 0 && rating <= 0 {
		rating = 5
	}

	respondEnvelope(c, http.StatusOK, "RIDER_REVIEW_LISTED", "骑手评论加载成功", gin.H{
		"items":    list,
		"total":    total,
		"page":     page,
		"limit":    pageSize,
		"pageSize": pageSize,
		"summary": gin.H{
			"rating":       rating,
			"rating_count": rider.RatingCount,
		},
	}, gin.H{
		"list":         list,
		"total":        total,
		"page":         page,
		"pageSize":     pageSize,
		"rating":       rating,
		"rating_count": rider.RatingCount,
		"ratingCount":  rider.RatingCount,
	})
}

// GetRating 获取骑手评分摘要（对外）
func (h *RiderHandler) GetRating(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "骑手ID无效")
		return
	}
	var rider repository.Rider
	if err := h.db.Select("id, rating, rating_count").Where("id = ?", riderID).First(&rider).Error; err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}
	rating := rider.Rating
	if rider.RatingCount == 0 && rating <= 0 {
		rating = 5
	}

	respondRiderMirroredSuccess(c, "骑手评分摘要加载成功", gin.H{
		"riderId":      rider.ID,
		"rider_id":     rider.ID,
		"rating":       rating,
		"ratingCount":  rider.RatingCount,
		"rating_count": rider.RatingCount,
	})
}

// UpdateOnlineStatus 更新骑手在线状态
func (h *RiderHandler) UpdateOnlineStatus(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "骑手ID无效")
		return
	}
	var req struct {
		IsOnline bool `json:"is_online"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondRiderInvalidRequest(c, "参数错误")
		return
	}

	var rider repository.Rider
	if err := h.db.Where("id = ?", riderID).First(&rider).Error; err != nil {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	now := time.Now()
	today := now.Format("2006-01-02")
	updates := map[string]interface{}{"is_online": req.IsOnline}

	// 检查是否需要重置（新的一天）
	if rider.LastOnlineDate != today {
		updates["today_online_minutes"] = 0
		updates["last_online_date"] = today
	}

	if req.IsOnline {
		// 开工：记录开始时间
		updates["online_start_time"] = now
	} else {
		// 停工：计算并累加在线时长
		if rider.OnlineStartTime != nil {
			duration := int(now.Sub(*rider.OnlineStartTime).Minutes())
			if duration > 0 {
				currentMinutes := rider.TodayOnlineMinutes
				if rider.LastOnlineDate != today {
					currentMinutes = 0
				}
				updates["today_online_minutes"] = currentMinutes + duration
			}
		}
		updates["online_start_time"] = nil
	}

	if err := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Updates(updates).Error; err != nil {
		respondRiderInternalError(c, "更新失败")
		return
	}

	respondRiderMirroredSuccess(c, "骑手在线状态更新成功", gin.H{
		"updated":   true,
		"is_online": req.IsOnline,
		"isOnline":  req.IsOnline,
	})
}

// Heartbeat 更新骑手在线心跳（仅在线骑手）
func (h *RiderHandler) Heartbeat(c *gin.Context) {
	riderID, err := h.resolveRiderID(c.Param("id"))
	if err != nil {
		respondRiderInvalidRequest(c, "骑手ID无效")
		return
	}

	var exists int64
	if err := h.db.Model(&repository.Rider{}).Where("id = ?", riderID).Count(&exists).Error; err != nil {
		respondRiderInternalError(c, "查询失败")
		return
	}
	if exists == 0 {
		respondRiderNotFound(c, "骑手不存在")
		return
	}

	now := time.Now()
	if err := h.db.Model(&repository.Rider{}).
		Where("id = ? AND is_online = ?", riderID, true).
		UpdateColumn("updated_at", now).Error; err != nil {
		respondRiderInternalError(c, "心跳更新失败")
		return
	}

	respondRiderMirroredSuccess(c, "骑手心跳更新成功", gin.H{
		"updated":      true,
		"heartbeatAt":  now,
		"heartbeat_at": now,
	})
}

func (h *RiderHandler) syncRiderRating(tx *gorm.DB, riderID uint) error {
	var summary struct {
		Count int64
		Avg   float64
	}
	if err := tx.Model(&repository.RiderReview{}).
		Select("COUNT(*) as count, COALESCE(AVG(rating), 0) as avg").
		Where("rider_id = ?", riderID).
		Scan(&summary).Error; err != nil {
		return err
	}

	nextRating := 5.0
	if summary.Count > 0 {
		nextRating = clampRiderRating(summary.Avg)
	}
	return tx.Model(&repository.Rider{}).Where("id = ?", riderID).Updates(map[string]interface{}{
		"rating":       nextRating,
		"rating_count": int(summary.Count),
	}).Error
}

func riderReviewToMap(review *repository.RiderReview) map[string]interface{} {
	images := []string{}
	if strings.TrimSpace(review.Images) != "" {
		_ = json.Unmarshal([]byte(review.Images), &images)
	}
	return map[string]interface{}{
		"id":          review.UID,
		"riderId":     review.RiderID,
		"rider_id":    review.RiderID,
		"userId":      review.UserID,
		"user_id":     review.UserID,
		"orderId":     review.OrderID,
		"order_id":    review.OrderID,
		"rating":      review.Rating,
		"content":     review.Content,
		"images":      images,
		"userName":    review.UserName,
		"user_name":   review.UserName,
		"userAvatar":  review.UserAvatar,
		"user_avatar": review.UserAvatar,
		"createdAt":   review.CreatedAt,
		"created_at":  review.CreatedAt,
		"updatedAt":   review.UpdatedAt,
		"updated_at":  review.UpdatedAt,
	}
}

func normalizeRiderReviewImages(v interface{}) string {
	if v == nil {
		return "[]"
	}
	if raw, ok := v.(string); ok {
		text := strings.TrimSpace(raw)
		if text == "" {
			return "[]"
		}
		var arr []string
		if err := json.Unmarshal([]byte(text), &arr); err == nil {
			out, _ := json.Marshal(arr)
			return string(out)
		}
		segments := strings.FieldsFunc(text, func(r rune) bool {
			return r == ',' || r == '，' || r == '\n' || r == '\r'
		})
		result := make([]string, 0, len(segments))
		for _, segment := range segments {
			item := strings.TrimSpace(segment)
			if item != "" {
				result = append(result, item)
			}
		}
		out, _ := json.Marshal(result)
		return string(out)
	}
	out, err := json.Marshal(v)
	if err != nil {
		return "[]"
	}
	text := strings.TrimSpace(string(out))
	if text == "" {
		return "[]"
	}
	return text
}

func pickFirstValue(data map[string]interface{}, keys ...string) interface{} {
	for _, key := range keys {
		if value, ok := data[key]; ok && value != nil {
			return value
		}
	}
	return nil
}

func toStringValue(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", val)
	}
}

func toIntValue(v interface{}) int {
	switch val := v.(type) {
	case int:
		return val
	case int32:
		return int(val)
	case int64:
		return int(val)
	case float64:
		return int(val)
	case float32:
		return int(val)
	case string:
		num, err := strconv.Atoi(strings.TrimSpace(val))
		if err != nil {
			return 0
		}
		return num
	default:
		return 0
	}
}

func toFloatValue(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		num, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
		if err != nil {
			return 0
		}
		return num
	default:
		return 0
	}
}

func clampRiderRating(rating float64) float64 {
	if rating < 0 {
		return 0
	}
	if rating > 5 {
		return 5
	}
	return rating
}
