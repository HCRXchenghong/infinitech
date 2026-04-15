package handler

import (
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type CouponHandler struct {
	couponService service.CouponService
}

func NewCouponHandler(couponService service.CouponService) *CouponHandler {
	return &CouponHandler{
		couponService: couponService,
	}
}

type couponIssueToPhoneRequest struct {
	Phone   string `json:"phone"`
	Channel string `json:"channel"`
}

type couponClaimByPhoneRequest struct {
	Phone string `json:"phone"`
}

type couponReceiveRequest struct {
	UserID string `json:"userId"`
	Phone  string `json:"phone"`
}

func respondCouponError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondCouponInvalidRequest(c *gin.Context, message string) {
	respondCouponError(c, http.StatusBadRequest, message)
}

func respondCouponNotFound(c *gin.Context, message string) {
	respondCouponError(c, http.StatusNotFound, message)
}

func respondCouponMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func respondCouponPaginated(c *gin.Context, message string, items interface{}, total int64, page, limit int) {
	respondPaginatedEnvelope(c, responseCodeOK, message, "items", items, total, page, limit)
}

func couponResponseCodeForStatus(status int) string {
	switch status {
	case http.StatusBadRequest:
		return responseCodeInvalidArgument
	case http.StatusUnauthorized:
		return responseCodeUnauthorized
	case http.StatusForbidden:
		return responseCodeForbidden
	case http.StatusNotFound:
		return responseCodeNotFound
	case http.StatusConflict:
		return responseCodeConflict
	case http.StatusGone:
		return responseCodeGone
	default:
		if status >= http.StatusInternalServerError {
			return responseCodeInternalError
		}
		return responseCodeInvalidArgument
	}
}

func parseCouponPage(c *gin.Context) (int, int) {
	return parsePositiveInt(c.Query("page"), 1), parsePositiveInt(c.Query("limit"), 20)
}

func resolveCouponUserID(c *gin.Context, allowBody bool) (string, error) {
	userID := strings.TrimSpace(c.Query("userId"))
	if userID != "" {
		return userID, nil
	}

	if allowBody {
		var req couponReceiveRequest
		if bindErr := c.ShouldBindJSON(&req); bindErr == nil {
			userID = strings.TrimSpace(req.UserID)
			if userID == "" {
				userID = strings.TrimSpace(req.Phone)
			}
		} else if !errors.Is(bindErr, io.EOF) {
			return "", bindErr
		}
	}

	if userID == "" {
		if rawPhone, ok := c.Get("user_phone"); ok {
			userID = strings.TrimSpace(toString(rawPhone))
		}
	}
	if userID == "" {
		if rawID, ok := c.Get("user_id"); ok {
			userID = strings.TrimSpace(toString(rawID))
		}
	}

	return userID, nil
}

// CreateCoupon 创建优惠券（商户/管理员）
func (h *CouponHandler) CreateCoupon(c *gin.Context) {
	var req service.CreateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondCouponInvalidRequest(c, err.Error())
		return
	}

	result, err := h.couponService.CreateCoupon(c.Request.Context(), &req)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondCouponMirroredSuccess(c, "优惠券创建成功", result)
}

// AdminListCoupons 管理端优惠券列表
func (h *CouponHandler) AdminListCoupons(c *gin.Context) {
	page, limit := parseCouponPage(c)

	items, total, err := h.couponService.ListCoupons(c.Request.Context(), service.CouponListQuery{
		ShopID:  strings.TrimSpace(c.Query("shopId")),
		Source:  strings.TrimSpace(c.Query("source")),
		Status:  strings.TrimSpace(c.Query("status")),
		Keyword: strings.TrimSpace(c.Query("keyword")),
		Page:    page,
		Limit:   limit,
	})
	if err != nil {
		writeCouponServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondCouponPaginated(c, "优惠券列表加载成功", items, total, page, limit)
}

// AdminListCouponIssueLogs 管理端优惠券发放日志
func (h *CouponHandler) AdminListCouponIssueLogs(c *gin.Context) {
	couponID := strings.TrimSpace(c.Param("couponId"))
	if couponID == "" {
		respondCouponInvalidRequest(c, "无效的优惠券ID")
		return
	}
	page, limit := parseCouponPage(c)

	items, total, err := h.couponService.ListCouponIssueLogs(c.Request.Context(), couponID, service.CouponIssueLogListQuery{
		Status:  strings.TrimSpace(c.Query("status")),
		Keyword: strings.TrimSpace(c.Query("keyword")),
		Page:    page,
		Limit:   limit,
	})
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondCouponPaginated(c, "优惠券发放日志加载成功", items, total, page, limit)
}

// UpdateCoupon 更新优惠券
func (h *CouponHandler) UpdateCoupon(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondCouponInvalidRequest(c, "无效的优惠券ID")
		return
	}

	var req service.UpdateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondCouponInvalidRequest(c, err.Error())
		return
	}

	if err := h.couponService.UpdateCoupon(c.Request.Context(), id, &req); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondCouponMirroredSuccess(c, "优惠券更新成功", gin.H{
		"id":      id,
		"updated": true,
	})
}

// DeleteCoupon 删除优惠券
func (h *CouponHandler) DeleteCoupon(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondCouponInvalidRequest(c, "无效的优惠券ID")
		return
	}

	if err := h.couponService.DeleteCoupon(c.Request.Context(), id); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondCouponMirroredSuccess(c, "优惠券删除成功", gin.H{
		"id":      id,
		"deleted": true,
	})
}

// GetCouponByID 获取优惠券详情
func (h *CouponHandler) GetCouponByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		respondCouponInvalidRequest(c, "无效的优惠券ID")
		return
	}

	coupon, err := h.couponService.GetCouponByID(c.Request.Context(), id)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusNotFound)
		return
	}

	respondCouponMirroredSuccess(c, "优惠券详情加载成功", coupon)
}

// GetShopCoupons 获取店铺优惠券列表
func (h *CouponHandler) GetShopCoupons(c *gin.Context) {
	shopID := strings.TrimSpace(c.Param("id"))
	if shopID == "" {
		respondCouponInvalidRequest(c, "无效的店铺ID")
		return
	}

	coupons, err := h.couponService.GetShopCoupons(c.Request.Context(), shopID)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondSuccessEnvelope(c, "店铺优惠券列表加载成功", coupons, nil)
}

// GetActiveCoupons 获取店铺活动中的优惠券
func (h *CouponHandler) GetActiveCoupons(c *gin.Context) {
	shopID := strings.TrimSpace(c.Param("id"))
	if shopID == "" {
		respondCouponInvalidRequest(c, "无效的店铺ID")
		return
	}

	coupons, err := h.couponService.GetActiveCoupons(c.Request.Context(), shopID)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondSuccessEnvelope(c, "活动优惠券列表加载成功", coupons, nil)
}

// ReceiveCoupon 用户领取优惠券
func (h *CouponHandler) ReceiveCoupon(c *gin.Context) {
	couponID := strings.TrimSpace(c.Param("couponId"))
	if couponID == "" {
		respondCouponInvalidRequest(c, "无效的优惠券ID")
		return
	}

	userID, err := resolveCouponUserID(c, true)
	if err != nil {
		respondCouponInvalidRequest(c, err.Error())
		return
	}
	if userID == "" {
		respondCouponInvalidRequest(c, "用户ID不能为空")
		return
	}

	if err := h.couponService.ReceiveCoupon(c.Request.Context(), userID, couponID); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondCouponMirroredSuccess(c, "领取成功", gin.H{
		"couponId": couponID,
		"received": true,
		"userId":   userID,
	})
}

// GetUserCoupons 获取用户优惠券列表
func (h *CouponHandler) GetUserCoupons(c *gin.Context) {
	userID, err := resolveCouponUserID(c, false)
	if err != nil {
		respondCouponInvalidRequest(c, err.Error())
		return
	}
	if userID == "" {
		respondCouponInvalidRequest(c, "用户ID不能为空")
		return
	}

	status := strings.TrimSpace(c.Query("status")) // unused, used, expired
	coupons, err := h.couponService.GetUserCoupons(c.Request.Context(), userID, status)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondSuccessEnvelope(c, "用户优惠券列表加载成功", coupons, nil)
}

// GetAvailableCoupons 获取用户可用优惠券
func (h *CouponHandler) GetAvailableCoupons(c *gin.Context) {
	userID, err := resolveCouponUserID(c, false)
	if err != nil {
		respondCouponInvalidRequest(c, err.Error())
		return
	}
	if userID == "" {
		respondCouponInvalidRequest(c, "用户ID不能为空")
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))
	if shopID == "" {
		respondCouponInvalidRequest(c, "无效的店铺ID")
		return
	}

	orderAmount, err := strconv.ParseFloat(c.Query("orderAmount"), 64)
	if err != nil {
		respondCouponInvalidRequest(c, "无效的订单金额")
		return
	}

	coupons, err := h.couponService.GetAvailableCoupons(c.Request.Context(), userID, shopID, orderAmount)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondSuccessEnvelope(c, "可用优惠券列表加载成功", coupons, nil)
}

// AdminIssueCouponToPhone 客服按手机号发券
func (h *CouponHandler) AdminIssueCouponToPhone(c *gin.Context) {
	couponID := strings.TrimSpace(c.Param("couponId"))
	if couponID == "" {
		respondCouponInvalidRequest(c, "无效的优惠券ID")
		return
	}

	var req couponIssueToPhoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondCouponInvalidRequest(c, err.Error())
		return
	}

	if err := h.couponService.IssueCouponToPhone(c.Request.Context(), couponID, req.Phone, req.Channel); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondCouponMirroredSuccess(c, "发券成功", gin.H{
		"channel":  strings.TrimSpace(req.Channel),
		"couponId": couponID,
		"issued":   true,
		"phone":    strings.TrimSpace(req.Phone),
	})
}

// PublicGetCouponByToken 1788链接页查询优惠券信息
func (h *CouponHandler) PublicGetCouponByToken(c *gin.Context) {
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		respondCouponInvalidRequest(c, "领券链接无效")
		return
	}

	coupon, err := h.couponService.GetCouponByClaimToken(c.Request.Context(), token)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondCouponMirroredSuccess(c, "领券链接信息加载成功", gin.H{
		"coupon": coupon,
	})
}

// PublicClaimCouponByToken 1788链接页手机号领取
func (h *CouponHandler) PublicClaimCouponByToken(c *gin.Context) {
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		respondCouponInvalidRequest(c, "领券链接无效")
		return
	}

	var req couponClaimByPhoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondCouponInvalidRequest(c, err.Error())
		return
	}

	if err := h.couponService.ClaimCouponByToken(c.Request.Context(), token, req.Phone); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondCouponMirroredSuccess(c, "领取成功，已放入卡包", gin.H{
		"claimed": true,
		"phone":   strings.TrimSpace(req.Phone),
		"token":   token,
	})
}

func writeCouponServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrUnauthorized) {
		respondCouponError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondCouponError(c, http.StatusForbidden, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		respondCouponNotFound(c, "记录不存在")
		return
	}
	respondCouponError(c, fallbackStatus, err.Error())
}

func toString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case int:
		return strconv.Itoa(v)
	case int32:
		return strconv.FormatInt(int64(v), 10)
	case int64:
		return strconv.FormatInt(v, 10)
	case uint:
		return strconv.FormatUint(uint64(v), 10)
	case uint32:
		return strconv.FormatUint(uint64(v), 10)
	case uint64:
		return strconv.FormatUint(v, 10)
	case float64:
		return strconv.FormatInt(int64(v), 10)
	case float32:
		return strconv.FormatInt(int64(v), 10)
	default:
		return ""
	}
}
