package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
	"github.com/yuexiang/go-api/internal/utils"
)

// AdminSettingsHandler handles settings and content endpoints.
type AdminSettingsHandler struct {
	admin      *service.AdminService
	mobilePush *service.MobilePushService
}

const maxPackageUploadSize = 300 * 1024 * 1024 // 300MB

const (
	defaultWeatherAPIBaseURL = "https://uapis.cn/api/v1/misc/weather"
	defaultWeatherLang       = "zh"
	defaultWeatherTimeoutMS  = 8000
	defaultWeatherRefreshMin = 10
)

var weatherNumberMatcher = regexp.MustCompile(`\d+(\.\d+)?`)

type weatherCacheEntry struct {
	Payload   map[string]interface{}
	ExpiresAt time.Time
}

var (
	weatherCacheMu   sync.RWMutex
	weatherRespCache = map[string]weatherCacheEntry{}
)

type weatherConfig struct {
	APIBaseURL string
	APIKey     string
	City       string
	Adcode     string
	Lang       string
	Extended   bool
	Forecast   bool
	Hourly     bool
	Minutely   bool
	Indices    bool
	TimeoutMS  int
	RefreshMin int
}

func NewAdminSettingsHandler(admin *service.AdminService, mobilePush *service.MobilePushService) *AdminSettingsHandler {
	return &AdminSettingsHandler{admin: admin, mobilePush: mobilePush}
}

func respondAdminSettingsInvalidRequest(c *gin.Context, message string) {
	respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, message, nil)
}

func respondAdminSettingsInternalError(c *gin.Context, err error) {
	if err == nil {
		respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, "internal error", nil)
		return
	}
	respondErrorEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), nil)
}

func respondAdminSettingsStatusError(c *gin.Context, status int, message string) {
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

func respondAdminSettingsSuccess(c *gin.Context, message string, data interface{}) {
	respondSuccessEnvelope(c, message, data, nil)
}

func respondAdminSettingsMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

// Debug mode
func (h *AdminSettingsHandler) GetDebugMode(c *gin.Context) {
	data := map[string]interface{}{
		"enabled":    false,
		"delivery":   false,
		"phone_film": false,
		"massage":    false,
		"coffee":     false,
	}
	_ = h.admin.GetSetting(c.Request.Context(), "debug_mode", &data)
	respondAdminSettingsSuccess(c, "调试模式配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateDebugMode(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "debug_mode", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "调试模式配置保存成功", data)
}

// SMS config
func (h *AdminSettingsHandler) GetSMSConfig(c *gin.Context) {
	raw := map[string]interface{}{}
	_ = h.admin.GetSetting(c.Request.Context(), "sms_config", &raw)
	cfg := service.NormalizeSMSProviderConfigMap(raw)
	respondAdminSettingsSuccess(c, "短信配置加载成功", service.BuildSMSProviderConfigAdminView(cfg))
}

func (h *AdminSettingsHandler) UpdateSMSConfig(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	existingRaw := map[string]interface{}{}
	_ = h.admin.GetSetting(c.Request.Context(), "sms_config", &existingRaw)

	existing := service.NormalizeSMSProviderConfigMap(existingRaw)
	incoming := service.NormalizeSMSProviderConfigMap(data)
	merged := service.MergeSMSProviderConfig(incoming, existing, data)
	if err := service.ValidateSMSProviderConfig(merged); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}

	if err := h.admin.SaveSetting(c.Request.Context(), "sms_config", service.SerializeSMSProviderConfigForStorage(merged)); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "短信配置保存成功", service.BuildSMSProviderConfigAdminView(merged))
}

// Weather config
func (h *AdminSettingsHandler) GetWeatherConfig(c *gin.Context) {
	data := map[string]interface{}{}
	_ = h.admin.GetSetting(c.Request.Context(), "weather_config", &data)
	cfg, _ := buildWeatherConfig(data)
	respondAdminSettingsSuccess(c, "天气配置加载成功", serializeWeatherConfig(cfg))
}

func (h *AdminSettingsHandler) UpdateWeatherConfig(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}

	cfg, err := buildWeatherConfig(data)
	if err != nil {
		respondEnvelope(c, http.StatusBadRequest, "INVALID_PARAMETER", err.Error(), gin.H{}, nil)
		return
	}

	if err := h.admin.SaveSetting(c.Request.Context(), "weather_config", serializeWeatherConfig(cfg)); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	clearWeatherResponseCache()
	respondAdminSettingsSuccess(c, "天气配置保存成功", serializeWeatherConfig(cfg))
}

// Service settings
func (h *AdminSettingsHandler) GetServiceSettings(c *gin.Context) {
	data := service.DefaultServiceSettings()
	_ = h.admin.GetSetting(c.Request.Context(), "service_settings", &data)
	data = service.NormalizeServiceSettings(data)
	respondAdminSettingsMirroredSuccess(c, "服务配置加载成功", data)
}

func (h *AdminSettingsHandler) GetPublicRuntimeSettings(c *gin.Context) {
	data := service.DefaultServiceSettings()
	_ = h.admin.GetSetting(c.Request.Context(), "service_settings", &data)
	data = service.NormalizeServiceSettings(data)
	payload := service.BuildPublicPlatformRuntimeSettings(data, h.loadPlatformRuntimeBundle(c))
	respondAdminSettingsMirroredSuccess(c, "公共运行时配置加载成功", payload)
}

func (h *AdminSettingsHandler) UpdateServiceSettings(c *gin.Context) {
	data := service.DefaultServiceSettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	data = service.NormalizeServiceSettings(data)
	if err := service.ValidateServiceSettings(data); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "service_settings", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsMirroredSuccess(c, "服务配置保存成功", data)
}

func (h *AdminSettingsHandler) GetCharitySettings(c *gin.Context) {
	data := service.DefaultCharitySettings()
	_ = h.admin.GetSetting(c.Request.Context(), "charity_settings", &data)
	data = service.NormalizeCharitySettings(data)
	respondAdminSettingsSuccess(c, "公益配置加载成功", data)
}

func (h *AdminSettingsHandler) GetVIPSettings(c *gin.Context) {
	data := service.DefaultVIPSettings()
	_ = h.admin.GetSetting(c.Request.Context(), "vip_settings", &data)
	data = service.NormalizeVIPSettings(data)
	respondAdminSettingsSuccess(c, "会员配置加载成功", data)
}

func (h *AdminSettingsHandler) GetPublicCharitySettings(c *gin.Context) {
	data := service.DefaultCharitySettings()
	_ = h.admin.GetSetting(c.Request.Context(), "charity_settings", &data)
	data = service.NormalizeCharitySettings(data)
	payload := service.BuildPublicCharitySettings(data)
	respondAdminSettingsMirroredSuccess(c, "公益公开配置加载成功", payload)
}

func (h *AdminSettingsHandler) GetPublicVIPSettings(c *gin.Context) {
	data := service.DefaultVIPSettings()
	_ = h.admin.GetSetting(c.Request.Context(), "vip_settings", &data)
	data = service.NormalizeVIPSettings(data)
	payload := service.BuildPublicVIPSettings(data)
	respondAdminSettingsMirroredSuccess(c, "会员公开配置加载成功", payload)
}

func (h *AdminSettingsHandler) UpdateCharitySettings(c *gin.Context) {
	data := service.DefaultCharitySettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	data = service.NormalizeCharitySettings(data)
	if err := service.ValidateCharitySettings(data); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "charity_settings", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "公益配置保存成功", data)
}

func (h *AdminSettingsHandler) UpdateVIPSettings(c *gin.Context) {
	data := service.DefaultVIPSettings()
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	data = service.NormalizeVIPSettings(data)
	if err := service.ValidateVIPSettings(data); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "vip_settings", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "会员配置保存成功", data)
}

// Payment notices
func (h *AdminSettingsHandler) GetPaymentNotices(c *gin.Context) {
	data := map[string]interface{}{"delivery": "", "phone_film": "", "massage": "", "coffee": ""}
	_ = h.admin.GetSetting(c.Request.Context(), "payment_notices", &data)
	respondAdminSettingsMirroredSuccess(c, "支付提示文案加载成功", data)
}

func (h *AdminSettingsHandler) UpdatePaymentNotices(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "payment_notices", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsMirroredSuccess(c, "支付提示文案保存成功", data)
}

// Carousel settings
func (h *AdminSettingsHandler) GetCarouselSettings(c *gin.Context) {
	data := map[string]interface{}{"auto_play_seconds": 5}
	_ = h.admin.GetSetting(c.Request.Context(), "carousel_settings", &data)
	respondAdminSettingsMirroredSuccess(c, "轮播配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateCarouselSettings(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "carousel_settings", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsMirroredSuccess(c, "轮播配置保存成功", data)
}

// Carousel CRUD
func (h *AdminSettingsHandler) GetCarousel(c *gin.Context) {
	items, err := h.admin.ListCarousel(c.Request.Context())
	if err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondSuccessEnvelope(c, "轮播图列表加载成功", items, nil)
}

func (h *AdminSettingsHandler) CreateCarousel(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	item := repository.Carousel{
		Title:     parseString(req["title"]),
		ImageURL:  parseString(req["image_url"]),
		LinkURL:   parseString(req["link_url"]),
		LinkType:  parseString(req["link_type"]),
		SortOrder: int(parseInt64(req["sort_order"])),
		IsActive:  parseBool(req["is_active"]),
	}
	if err := h.admin.CreateCarousel(c.Request.Context(), &item); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "轮播图创建成功", item, nil)
}

func (h *AdminSettingsHandler) UpdateCarousel(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminSettingsInvalidRequest(c, "无效ID")
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	updates := map[string]interface{}{}
	if v, ok := req["title"]; ok {
		updates["title"] = v
	}
	if v, ok := req["image_url"]; ok {
		updates["image_url"] = v
	}
	if v, ok := req["link_url"]; ok {
		updates["link_url"] = v
	}
	if v, ok := req["link_type"]; ok {
		updates["link_type"] = v
	}
	if v, ok := req["sort_order"]; ok {
		updates["sort_order"] = v
	}
	if v, ok := req["is_active"]; ok {
		updates["is_active"] = parseBool(v)
	}
	if err := h.admin.UpdateCarousel(c.Request.Context(), id, updates); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "轮播图更新成功", gin.H{"id": id, "updated": true}, nil)
}

func (h *AdminSettingsHandler) DeleteCarousel(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminSettingsInvalidRequest(c, "无效ID")
		return
	}
	if err := h.admin.DeleteCarousel(c.Request.Context(), id); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "轮播图删除成功", gin.H{"id": id, "deleted": true}, nil)
}

// Push messages
func (h *AdminSettingsHandler) GetPushMessages(c *gin.Context) {
	items, err := h.admin.ListPushMessages(c.Request.Context())
	if err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondSuccessEnvelope(c, "推送消息列表加载成功", items, nil)
}

func (h *AdminSettingsHandler) CreatePushMessage(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	item := repository.PushMessage{
		Title:              parseString(req["title"]),
		Content:            parseString(req["content"]),
		ImageURL:           parseString(req["image_url"]),
		CompressImage:      parseBool(req["compress_image"]),
		IsActive:           parseBool(req["is_active"]),
		ScheduledStartTime: parseString(req["scheduled_start_time"]),
		ScheduledEndTime:   parseString(req["scheduled_end_time"]),
	}
	if err := h.admin.CreatePushMessage(c.Request.Context(), &item); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "推送消息创建成功", item, nil)
}

func (h *AdminSettingsHandler) GetPushMessageStats(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminSettingsInvalidRequest(c, "无效ID")
		return
	}

	stats, err := h.admin.GetPushMessageStats(c.Request.Context(), id)
	if err != nil {
		status := http.StatusInternalServerError
		lower := strings.ToLower(err.Error())
		if strings.Contains(lower, "record not found") || strings.Contains(lower, "invalid id") {
			status = http.StatusNotFound
		}
		respondAdminSettingsStatusError(c, status, err.Error())
		return
	}

	respondAdminSettingsMirroredSuccess(c, "推送消息统计加载成功", stats)
}

func (h *AdminSettingsHandler) GetPushMessageDeliveries(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminSettingsInvalidRequest(c, "无效ID")
		return
	}

	limit, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("limit", "50")))
	if err != nil {
		limit = 50
	}

	deliveries, listErr := h.admin.ListPushMessageDeliveries(c.Request.Context(), id, limit)
	if listErr != nil {
		status := http.StatusInternalServerError
		lower := strings.ToLower(listErr.Error())
		if strings.Contains(lower, "record not found") || strings.Contains(lower, "invalid id") {
			status = http.StatusNotFound
		}
		respondAdminSettingsStatusError(c, status, listErr.Error())
		return
	}

	respondSuccessEnvelope(c, "推送投递记录加载成功", deliveries, nil)
}

func (h *AdminSettingsHandler) UpdatePushMessage(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminSettingsInvalidRequest(c, "无效ID")
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	updates := map[string]interface{}{}
	for _, key := range []string{"title", "content", "image_url", "compress_image", "is_active", "scheduled_start_time", "scheduled_end_time"} {
		if v, ok := req[key]; ok {
			if key == "compress_image" || key == "is_active" {
				updates[key] = parseBool(v)
			} else {
				updates[key] = v
			}
		}
	}
	if err := h.admin.UpdatePushMessage(c.Request.Context(), id, updates); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "推送消息更新成功", gin.H{"id": id, "updated": true}, nil)
}

func (h *AdminSettingsHandler) DeletePushMessage(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminSettingsInvalidRequest(c, "无效ID")
		return
	}
	if err := h.admin.DeletePushMessage(c.Request.Context(), id); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "推送消息删除成功", gin.H{"id": id, "deleted": true}, nil)
}

func (h *AdminSettingsHandler) RunPushDispatchCycle(c *gin.Context) {
	if h.mobilePush == nil {
		respondAdminSettingsStatusError(c, http.StatusServiceUnavailable, "push service unavailable")
		return
	}

	limit := int(parseInt64(c.Query("limit")))
	if c.Request.ContentLength > 0 {
		var req map[string]interface{}
		if err := c.ShouldBindJSON(&req); err != nil {
			respondAdminSettingsInvalidRequest(c, "请求参数错误")
			return
		}
		if raw, ok := req["limit"]; ok {
			limit = int(parseInt64(raw))
		}
	}

	worker := h.mobilePush.WorkerStatusSnapshot(c.Request.Context())
	processed, err := h.mobilePush.RunDispatchCycle(c.Request.Context(), limit)
	if err != nil {
		respondEnvelope(c, http.StatusInternalServerError, responseCodeInternalError, err.Error(), gin.H{}, gin.H{
			"worker": worker,
		})
		return
	}

	respondAdminSettingsMirroredSuccess(c, "推送派发轮询执行成功", gin.H{
		"processed": processed,
		"worker":    worker,
	})
}

// Public APIs
func (h *AdminSettingsHandler) GetPublicAPIs(c *gin.Context) {
	items, err := h.admin.ListPublicAPIs(c.Request.Context())
	if err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondSuccessEnvelope(c, "开放 API 列表加载成功", items, nil)
}

func (h *AdminSettingsHandler) CreatePublicAPI(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	permissions := parseStringArray(req["permissions"])
	if err := h.admin.CreatePublicAPI(c.Request.Context(), parseString(req["name"]), parseString(req["path"]), permissions, parseString(req["api_key"]), parseString(req["description"]), parseBool(req["is_active"])); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "开放 API 创建成功", gin.H{
		"name":        parseString(req["name"]),
		"path":        parseString(req["path"]),
		"permissions": permissions,
	}, nil)
}

func (h *AdminSettingsHandler) UpdatePublicAPI(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminSettingsInvalidRequest(c, "无效ID")
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	updates := map[string]interface{}{}
	for _, key := range []string{"name", "path", "api_key", "description", "is_active"} {
		if v, ok := req[key]; ok {
			if key == "is_active" {
				updates[key] = parseBool(v)
			} else {
				updates[key] = v
			}
		}
	}
	if v, ok := req["permissions"]; ok {
		updates["permissions"] = parseStringArray(v)
	}
	if err := h.admin.UpdatePublicAPI(c.Request.Context(), id, updates); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "开放 API 更新成功", gin.H{"id": id, "updated": true}, nil)
}

func (h *AdminSettingsHandler) DeletePublicAPI(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondAdminSettingsInvalidRequest(c, "无效ID")
		return
	}
	if err := h.admin.DeletePublicAPI(c.Request.Context(), id); err != nil {
		respondAdminSettingsInvalidRequest(c, err.Error())
		return
	}
	respondSuccessEnvelope(c, "开放 API 删除成功", gin.H{"id": id, "deleted": true}, nil)
}

// Upload image
func (h *AdminSettingsHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		respondAdminSettingsInvalidRequest(c, "未找到图片")
		return
	}

	// 验证文件类型（支持常见图片格式 + HEIC/HEIF）
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
		".webp": true, ".bmp": true, ".heic": true, ".heif": true,
	}
	if !allowedExts[ext] {
		respondAdminSettingsInvalidRequest(c, "不支持的图片格式")
		return
	}

	uploadDir := filepath.Join("data", "uploads")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		respondAdminSettingsStatusError(c, http.StatusInternalServerError, "创建目录失败")
		return
	}

	filename := strconv.FormatInt(time.Now().UnixNano(), 10) + "_" + filepath.Base(file.Filename)
	savePath := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		respondAdminSettingsStatusError(c, http.StatusInternalServerError, "保存失败")
		return
	}

	// 压缩图片到500KB以下，返回最终文件名（可能格式已转换）
	finalFilename, err := utils.CompressImage(savePath, 500*1024)
	if err != nil {
		os.Remove(savePath)
		respondAdminSettingsStatusError(c, http.StatusInternalServerError, "图片处理失败")
		return
	}

	imageURL := "/uploads/" + finalFilename
	payload := buildPublicAssetPayload(imageURL, finalFilename, "admin_settings_image", file.Size)
	payload["imageUrl"] = imageURL
	payload["url"] = imageURL
	respondAdminSettingsMirroredSuccess(c, "图片上传成功", payload)
}

func (h *AdminSettingsHandler) GetAppDownloadConfig(c *gin.Context) {
	data := map[string]interface{}{
		"ios_url":             "",
		"android_url":         "",
		"ios_version":         "",
		"android_version":     "",
		"latest_version":      "",
		"updated_at":          "",
		"mini_program_qr_url": "",
	}
	_ = h.admin.GetSetting(c.Request.Context(), "app_download_config", &data)
	if parseString(data["updated_at"]) == "" {
		data["updated_at"] = time.Now().Format("2006-01-02")
	}
	respondAdminSettingsSuccess(c, "APP 下载配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateAppDownloadConfig(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}

	iosURL, err := sanitizeDownloadURL(parseString(req["ios_url"]))
	if err != nil {
		respondAdminSettingsInvalidRequest(c, "iOS 下载链接不合法")
		return
	}
	androidURL, err := sanitizeDownloadURL(parseString(req["android_url"]))
	if err != nil {
		respondAdminSettingsInvalidRequest(c, "安卓下载链接不合法")
		return
	}
	miniProgramQrURL, err := sanitizeDownloadURL(parseString(req["mini_program_qr_url"]))
	if err != nil {
		respondAdminSettingsInvalidRequest(c, "小程序二维码地址不合法")
		return
	}

	updatedAt := strings.TrimSpace(parseString(req["updated_at"]))
	if updatedAt == "" {
		updatedAt = time.Now().Format("2006-01-02")
	}
	if len(updatedAt) > 32 {
		respondAdminSettingsInvalidRequest(c, "更新时间格式错误")
		return
	}

	data := map[string]interface{}{
		"ios_url":             iosURL,
		"android_url":         androidURL,
		"ios_version":         strings.TrimSpace(parseString(req["ios_version"])),
		"android_version":     strings.TrimSpace(parseString(req["android_version"])),
		"latest_version":      strings.TrimSpace(parseString(req["latest_version"])),
		"updated_at":          updatedAt,
		"mini_program_qr_url": miniProgramQrURL,
	}
	if data["latest_version"] == "" {
		data["latest_version"] = firstNonEmptyString(data["android_version"], data["ios_version"])
	}

	if err := h.admin.SaveSetting(c.Request.Context(), "app_download_config", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "APP 下载配置保存成功", data)
}

func (h *AdminSettingsHandler) UploadPackage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		respondAdminSettingsInvalidRequest(c, "未找到安装包文件")
		return
	}
	if file.Size <= 0 {
		respondAdminSettingsInvalidRequest(c, "文件为空")
		return
	}
	if file.Size > maxPackageUploadSize {
		respondAdminSettingsInvalidRequest(c, "安装包大小不能超过300MB")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".ipa": true,
		".apk": true,
		".aab": true,
	}
	if !allowedExts[ext] {
		respondAdminSettingsInvalidRequest(c, "仅支持 .ipa / .apk / .aab 安装包")
		return
	}

	uploadDir := filepath.Join("data", "uploads", "packages")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		respondAdminSettingsStatusError(c, http.StatusInternalServerError, "创建安装包目录失败")
		return
	}

	filename := strconv.FormatInt(time.Now().UnixNano(), 10) + ext
	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		respondAdminSettingsStatusError(c, http.StatusInternalServerError, "安装包保存失败")
		return
	}

	packageURL := "/uploads/packages/" + filename
	payload := buildPublicAssetPayload(packageURL, filename, "app_package", file.Size)
	payload["url"] = packageURL
	payload["original_name"] = filepath.Base(file.Filename)
	respondAdminSettingsMirroredSuccess(c, "安装包上传成功", payload)
}

func (h *AdminSettingsHandler) GetWeather(c *gin.Context) {
	respondWeatherError := func(status int, code, message string, legacy gin.H) {
		respondEnvelope(c, status, code, message, gin.H{}, legacy)
	}

	settingData := map[string]interface{}{}
	_ = h.admin.GetSetting(c.Request.Context(), "weather_config", &settingData)
	cfg, err := buildWeatherConfig(settingData)
	if err != nil {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "天气配置无效，请先在管理端修正天气配置", nil)
		return
	}

	lang := strings.TrimSpace(c.Query("lang"))
	if lang == "" {
		lang = cfg.Lang
	}
	if lang != "zh" && lang != "en" {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "lang 仅支持 zh/en", nil)
		return
	}

	adcode := strings.TrimSpace(cfg.Adcode)
	city := strings.TrimSpace(cfg.City)
	if adcode == "" && city == "" {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "请先在管理端配置天气城市或行政区编码", nil)
		return
	}
	if adcode != "" && !isValidAdcode(adcode) {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "adcode 格式非法", nil)
		return
	}

	extended, err := parseQueryBoolWithDefault(c, "extended", cfg.Extended)
	if err != nil {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "extended 参数无效", nil)
		return
	}
	forecast, err := parseQueryBoolWithDefault(c, "forecast", cfg.Forecast)
	if err != nil {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "forecast 参数无效", nil)
		return
	}
	hourly, err := parseQueryBoolWithDefault(c, "hourly", cfg.Hourly)
	if err != nil {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "hourly 参数无效", nil)
		return
	}
	minutely, err := parseQueryBoolWithDefault(c, "minutely", cfg.Minutely)
	if err != nil {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "minutely 参数无效", nil)
		return
	}
	indices, err := parseQueryBoolWithDefault(c, "indices", cfg.Indices)
	if err != nil {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "indices 参数无效", nil)
		return
	}

	upstreamURL, err := url.Parse(cfg.APIBaseURL)
	if err != nil {
		respondWeatherError(http.StatusBadRequest, "INVALID_PARAMETER", "天气配置中的 API 地址无效", nil)
		return
	}

	query := upstreamURL.Query()
	if adcode != "" {
		query.Set("adcode", adcode)
	} else if city != "" {
		query.Set("city", city)
	}
	query.Set("lang", lang)
	if extended {
		query.Set("extended", "true")
	}
	if forecast {
		query.Set("forecast", "true")
	}
	if hourly {
		query.Set("hourly", "true")
	}
	if minutely {
		query.Set("minutely", "true")
	}
	if indices {
		query.Set("indices", "true")
	}
	upstreamURL.RawQuery = query.Encode()
	cacheKey := buildWeatherCacheKey(upstreamURL.String())
	if cfg.RefreshMin > 0 {
		if cached, ok := getCachedWeatherResponse(cacheKey); ok {
			cached["cache_hit"] = true
			cached["refresh_interval_minutes"] = cfg.RefreshMin
			respondAdminSettingsMirroredSuccess(c, "天气信息加载成功", cached)
			return
		}
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, upstreamURL.String(), nil)
	if err != nil {
		respondWeatherError(http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "构建天气请求失败", nil)
		return
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "yuexiang-go-api/weather-bridge")
	if cfg.APIKey != "" {
		if strings.HasPrefix(strings.ToLower(cfg.APIKey), "bearer ") {
			req.Header.Set("Authorization", cfg.APIKey)
		} else {
			req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
		}
		req.Header.Set("X-API-Key", cfg.APIKey)
	}

	client := &http.Client{Timeout: time.Duration(cfg.TimeoutMS) * time.Millisecond}
	resp, err := client.Do(req)
	if err != nil {
		respondWeatherError(http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "天气服务暂时不可用", nil)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		respondWeatherError(http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "天气服务读取失败", nil)
		return
	}

	payload := map[string]interface{}{}
	if len(body) > 0 {
		if err := json.Unmarshal(body, &payload); err != nil {
			payload = map[string]interface{}{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "天气服务返回格式异常",
			}
		}
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if len(payload) == 0 {
			payload = map[string]interface{}{
				"code":    "SERVICE_UNAVAILABLE",
				"message": "天气服务暂时不可用",
			}
		}
		if _, ok := payload["code"]; !ok {
			payload["code"] = "SERVICE_UNAVAILABLE"
		}
		if _, ok := payload["message"]; !ok {
			payload["message"] = "天气服务暂时不可用"
		}
		status := resp.StatusCode
		if status < 400 || status > 599 {
			status = http.StatusServiceUnavailable
		}
		respondWeatherError(status, parseString(payload["code"]), parseString(payload["message"]), gin.H(payload))
		return
	}

	normalized := normalizeWeatherPayload(payload)
	normalized["cache_hit"] = false
	normalized["refresh_interval_minutes"] = cfg.RefreshMin
	if cfg.RefreshMin > 0 {
		cacheExpiresAt := time.Now().Add(time.Duration(cfg.RefreshMin) * time.Minute)
		normalized["cache_expires_at"] = cacheExpiresAt.Format(time.RFC3339)
		setCachedWeatherResponse(cacheKey, normalized, cacheExpiresAt)
	}
	respondAdminSettingsMirroredSuccess(c, "天气信息加载成功", normalized)
}

func defaultWeatherConfig() weatherConfig {
	return weatherConfig{
		APIBaseURL: defaultWeatherAPIBaseURL,
		APIKey:     "",
		City:       "",
		Adcode:     "",
		Lang:       defaultWeatherLang,
		Extended:   true,
		Forecast:   true,
		Hourly:     true,
		Minutely:   true,
		Indices:    true,
		TimeoutMS:  defaultWeatherTimeoutMS,
		RefreshMin: defaultWeatherRefreshMin,
	}
}

func buildWeatherConfig(raw map[string]interface{}) (weatherConfig, error) {
	cfg := defaultWeatherConfig()

	cfg.APIBaseURL = strings.TrimSpace(parseString(raw["api_base_url"]))
	if cfg.APIBaseURL == "" {
		cfg.APIBaseURL = defaultWeatherAPIBaseURL
	}
	parsedURL, err := url.ParseRequestURI(cfg.APIBaseURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") || strings.TrimSpace(parsedURL.Host) == "" {
		return cfg, fmt.Errorf("天气 API 地址无效")
	}

	cfg.APIKey = strings.TrimSpace(parseString(raw["api_key"]))
	cfg.Adcode = strings.TrimSpace(parseString(raw["adcode"]))

	legacyLocation := strings.TrimSpace(parseString(raw["location"]))
	cfg.City = strings.TrimSpace(parseString(raw["city"]))
	if cfg.City == "" {
		cfg.City = legacyLocation
	}

	if cfg.Adcode != "" && !isValidAdcode(cfg.Adcode) {
		return cfg, fmt.Errorf("adcode 格式非法")
	}
	if cfg.Adcode == "" && cfg.City == "" {
		return cfg, fmt.Errorf("请至少配置 city 或 adcode")
	}
	if len(cfg.City) > 120 {
		return cfg, fmt.Errorf("city 参数过长")
	}

	cfg.Lang = strings.ToLower(strings.TrimSpace(parseString(raw["lang"])))
	if cfg.Lang == "" {
		cfg.Lang = defaultWeatherLang
	}
	if cfg.Lang != "zh" && cfg.Lang != "en" {
		return cfg, fmt.Errorf("lang 仅支持 zh/en")
	}

	if _, ok := raw["extended"]; ok {
		cfg.Extended = parseBool(raw["extended"])
	}
	if _, ok := raw["forecast"]; ok {
		cfg.Forecast = parseBool(raw["forecast"])
	}
	if _, ok := raw["hourly"]; ok {
		cfg.Hourly = parseBool(raw["hourly"])
	}
	if _, ok := raw["minutely"]; ok {
		cfg.Minutely = parseBool(raw["minutely"])
	}
	if _, ok := raw["indices"]; ok {
		cfg.Indices = parseBool(raw["indices"])
	}

	if v := parseInt64(raw["timeout_ms"]); v > 0 {
		cfg.TimeoutMS = int(v)
	}
	if cfg.TimeoutMS < 1000 || cfg.TimeoutMS > 30000 {
		return cfg, fmt.Errorf("timeout_ms 需在 1000-30000 之间")
	}

	if v := parseInt64(raw["refresh_interval_minutes"]); v > 0 {
		cfg.RefreshMin = int(v)
	}
	if cfg.RefreshMin < 1 || cfg.RefreshMin > 1440 {
		return cfg, fmt.Errorf("refresh_interval_minutes 需在 1-1440 之间")
	}

	return cfg, nil
}

func serializeWeatherConfig(cfg weatherConfig) map[string]interface{} {
	return map[string]interface{}{
		"api_base_url":             cfg.APIBaseURL,
		"api_key":                  cfg.APIKey,
		"city":                     cfg.City,
		"adcode":                   cfg.Adcode,
		"lang":                     cfg.Lang,
		"extended":                 cfg.Extended,
		"forecast":                 cfg.Forecast,
		"hourly":                   cfg.Hourly,
		"minutely":                 cfg.Minutely,
		"indices":                  cfg.Indices,
		"timeout_ms":               cfg.TimeoutMS,
		"refresh_interval_minutes": cfg.RefreshMin,
		// 兼容历史前端字段
		"location": cfg.City,
	}
}

func buildWeatherCacheKey(upstreamURL string) string {
	return strings.TrimSpace(upstreamURL)
}

func clearWeatherResponseCache() {
	weatherCacheMu.Lock()
	weatherRespCache = map[string]weatherCacheEntry{}
	weatherCacheMu.Unlock()
}

func getCachedWeatherResponse(key string) (map[string]interface{}, bool) {
	weatherCacheMu.RLock()
	entry, ok := weatherRespCache[key]
	weatherCacheMu.RUnlock()
	if !ok {
		return nil, false
	}
	if time.Now().After(entry.ExpiresAt) {
		weatherCacheMu.Lock()
		delete(weatherRespCache, key)
		weatherCacheMu.Unlock()
		return nil, false
	}
	return deepCopyMap(entry.Payload), true
}

func setCachedWeatherResponse(key string, payload map[string]interface{}, expiresAt time.Time) {
	if key == "" || payload == nil {
		return
	}
	weatherCacheMu.Lock()
	weatherRespCache[key] = weatherCacheEntry{
		Payload:   deepCopyMap(payload),
		ExpiresAt: expiresAt,
	}
	weatherCacheMu.Unlock()
}

func deepCopyMap(source map[string]interface{}) map[string]interface{} {
	if source == nil {
		return map[string]interface{}{}
	}
	raw, err := json.Marshal(source)
	if err != nil {
		result := make(map[string]interface{}, len(source))
		for key, value := range source {
			result[key] = value
		}
		return result
	}
	result := map[string]interface{}{}
	if err := json.Unmarshal(raw, &result); err != nil {
		fallback := make(map[string]interface{}, len(source))
		for key, value := range source {
			fallback[key] = value
		}
		return fallback
	}
	return result
}

func parseQueryBoolWithDefault(c *gin.Context, key string, fallback bool) (bool, error) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return fallback, nil
	}
	switch strings.ToLower(raw) {
	case "1", "true", "yes", "on":
		return true, nil
	case "0", "false", "no", "off":
		return false, nil
	default:
		return false, fmt.Errorf("invalid bool")
	}
}

func isValidAdcode(adcode string) bool {
	value := strings.TrimSpace(adcode)
	if value == "" {
		return false
	}
	if len(value) < 2 || len(value) > 12 {
		return false
	}
	for _, ch := range value {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return true
}

func normalizeWeatherPayload(payload map[string]interface{}) map[string]interface{} {
	if payload == nil {
		payload = map[string]interface{}{}
	}
	if nested, ok := payload["data"].(map[string]interface{}); ok {
		if nested["weather"] != nil || nested["temperature"] != nil {
			payload = nested
		}
	}

	weatherText := strings.TrimSpace(parseString(payload["weather"]))
	weatherCode := strings.TrimSpace(parseString(payload["weather_code"]))
	province := strings.TrimSpace(parseString(payload["province"]))
	city := strings.TrimSpace(parseString(payload["city"]))
	if city == "" {
		city = province
	}

	reportTime := normalizeWeatherTime(parseString(payload["report_time"]))
	aqiText := strings.TrimSpace(parseString(payload["aqi_category"]))
	if aqiText == "" {
		if aqiNum, ok := parseNumericValue(payload["aqi"]); ok {
			switch {
			case aqiNum <= 50:
				aqiText = "优"
			case aqiNum <= 100:
				aqiText = "良"
			case aqiNum <= 150:
				aqiText = "轻度污染"
			case aqiNum <= 200:
				aqiText = "中度污染"
			default:
				aqiText = "重度污染"
			}
		}
	}

	payload["available"] = weatherText != "" || payload["temperature"] != nil
	payload["city_name"] = city
	payload["weather_main"] = weatherText
	payload["weather_icon"] = mapWeatherIcon(weatherText, weatherCode)
	payload["wind_direct"] = strings.TrimSpace(parseString(payload["wind_direction"]))
	payload["wind_speed"] = extractWindLevel(parseString(payload["wind_power"]))
	payload["updated_at"] = reportTime
	payload["air_quality"] = aqiText

	return payload
}

func normalizeWeatherTime(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
	}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return t.Format(time.RFC3339)
		}
	}
	return value
}

func extractWindLevel(raw string) string {
	match := weatherNumberMatcher.FindString(strings.TrimSpace(raw))
	return strings.TrimSpace(match)
}

func parseNumericValue(v interface{}) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	case int32:
		return float64(t), true
	case string:
		value := strings.TrimSpace(t)
		if value == "" {
			return 0, false
		}
		parsed, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

func mapWeatherIcon(weatherText, weatherCode string) string {
	code := strings.TrimSpace(weatherCode)
	switch code {
	case "00", "0", "100", "sunny", "clear":
		return "00"
	case "01", "1", "101", "partly_cloudy", "partly-cloudy":
		return "01"
	case "02", "2", "103", "cloudy", "overcast":
		return "02"
	case "03", "04", "3", "4", "thunder":
		return "04"
	case "07", "08", "09", "10", "11", "12", "300", "301", "302":
		return "08"
	case "13", "14", "15", "16", "17", "400", "401", "402":
		return "13"
	case "18", "500", "501", "502", "503":
		return "18"
	}

	text := strings.ToLower(strings.TrimSpace(weatherText))
	switch {
	case containsAny(text, "雷", "thunder"):
		return "04"
	case containsAny(text, "雪", "sleet", "hail"):
		return "13"
	case containsAny(text, "雨", "rain", "drizzle", "shower"):
		return "08"
	case containsAny(text, "雾", "霾", "沙", "fog", "haze", "mist", "dust", "smog"):
		return "18"
	case containsAny(text, "晴", "sun", "clear"):
		return "00"
	case containsAny(text, "阴", "overcast"):
		return "02"
	case containsAny(text, "多云", "cloud"):
		return "01"
	default:
		return "02"
	}
}

func containsAny(value string, keys ...string) bool {
	for _, key := range keys {
		if key != "" && strings.Contains(value, strings.ToLower(key)) {
			return true
		}
	}
	return false
}

func parseStringArray(v interface{}) []string {
	result := []string{}
	switch t := v.(type) {
	case []interface{}:
		for _, item := range t {
			if str, ok := item.(string); ok {
				result = append(result, str)
			}
		}
	case []string:
		result = append(result, t...)
	}
	return result
}

func sanitizeDownloadURL(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}
	if len(value) > 1000 {
		return "", fmt.Errorf("url too long")
	}
	if strings.HasPrefix(value, "/uploads/") {
		return value, nil
	}

	parsed, err := url.ParseRequestURI(value)
	if err != nil {
		return "", err
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("unsupported scheme")
	}
	if strings.TrimSpace(parsed.Host) == "" {
		return "", fmt.Errorf("missing host")
	}
	return value, nil
}

func firstNonEmptyString(values ...interface{}) string {
	for _, value := range values {
		if parsed := strings.TrimSpace(parseString(value)); parsed != "" {
			return parsed
		}
	}
	return ""
}

func parseString(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case []byte:
		return string(t)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	default:
		return ""
	}
}

func parseInt64(v interface{}) int64 {
	switch t := v.(type) {
	case int64:
		return t
	case int:
		return int64(t)
	case float64:
		return int64(t)
	case string:
		val, _ := strconv.ParseInt(t, 10, 64)
		return val
	default:
		return 0
	}
}

// Pay config mode
func (h *AdminSettingsHandler) GetPayMode(c *gin.Context) {
	data := map[string]interface{}{"isProd": false}
	_ = h.admin.GetSetting(c.Request.Context(), "pay_mode", &data)
	respondAdminSettingsSuccess(c, "支付模式配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdatePayMode(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "pay_mode", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "支付模式配置保存成功", data)
}

// Wxpay config
func (h *AdminSettingsHandler) GetWxpayConfig(c *gin.Context) {
	data := map[string]interface{}{"appId": "", "mchId": "", "apiKey": "", "apiV3Key": "", "serialNo": "", "notifyUrl": ""}
	_ = h.admin.GetSetting(c.Request.Context(), "wxpay_config", &data)
	respondAdminSettingsSuccess(c, "微信支付配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateWxpayConfig(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "wxpay_config", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "微信支付配置保存成功", data)
}

// Alipay config
func (h *AdminSettingsHandler) GetAlipayConfig(c *gin.Context) {
	data := map[string]interface{}{"appId": "", "privateKey": "", "alipayPublicKey": "", "notifyUrl": "", "sandbox": true}
	_ = h.admin.GetSetting(c.Request.Context(), "alipay_config", &data)
	respondAdminSettingsSuccess(c, "支付宝配置加载成功", data)
}

func (h *AdminSettingsHandler) UpdateAlipayConfig(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "alipay_config", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "支付宝配置保存成功", data)
}

func parseBool(v interface{}) bool {
	switch t := v.(type) {
	case bool:
		return t
	case int:
		return t != 0
	case int64:
		return t != 0
	case float64:
		return t != 0
	case string:
		return t == "1" || t == "true" || t == "TRUE"
	default:
		return false
	}
}

// Coin ratio config
func (h *AdminSettingsHandler) GetCoinRatio(c *gin.Context) {
	data := map[string]interface{}{"ratio": 1}
	_ = h.admin.GetSetting(c.Request.Context(), "coin_ratio", &data)
	respondAdminSettingsSuccess(c, "虚拟币比例加载成功", data)
}

func (h *AdminSettingsHandler) UpdateCoinRatio(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		respondAdminSettingsInvalidRequest(c, "请求参数错误")
		return
	}
	if err := h.admin.SaveSetting(c.Request.Context(), "coin_ratio", data); err != nil {
		respondAdminSettingsInternalError(c, err)
		return
	}
	respondAdminSettingsSuccess(c, "虚拟币比例保存成功", data)
}
