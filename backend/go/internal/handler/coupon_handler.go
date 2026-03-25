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

// CreateCoupon 创建优惠券（商户/管理员）
func (h *CouponHandler) CreateCoupon(c *gin.Context) {
	var req service.CreateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.couponService.CreateCoupon(c.Request.Context(), &req)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "优惠券创建成功",
		"data":    result,
	})
}

// AdminListCoupons 管理端优惠券列表
func (h *CouponHandler) AdminListCoupons(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}

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

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// AdminListCouponIssueLogs 管理端优惠券发放日志
func (h *CouponHandler) AdminListCouponIssueLogs(c *gin.Context) {
	couponID := strings.TrimSpace(c.Param("couponId"))
	if couponID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的优惠券ID"})
		return
	}
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}

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

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateCoupon 更新优惠券
func (h *CouponHandler) UpdateCoupon(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的优惠券ID"})
		return
	}

	var req service.UpdateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.couponService.UpdateCoupon(c.Request.Context(), id, &req); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "优惠券更新成功"})
}

// DeleteCoupon 删除优惠券
func (h *CouponHandler) DeleteCoupon(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的优惠券ID"})
		return
	}

	if err := h.couponService.DeleteCoupon(c.Request.Context(), id); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "优惠券删除成功"})
}

// GetCouponByID 获取优惠券详情
func (h *CouponHandler) GetCouponByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的优惠券ID"})
		return
	}

	coupon, err := h.couponService.GetCouponByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "优惠券不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": coupon})
}

// GetShopCoupons 获取店铺优惠券列表
func (h *CouponHandler) GetShopCoupons(c *gin.Context) {
	shopID := strings.TrimSpace(c.Param("id"))
	if shopID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的店铺ID"})
		return
	}

	coupons, err := h.couponService.GetShopCoupons(c.Request.Context(), shopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": coupons})
}

// GetActiveCoupons 获取店铺活动中的优惠券
func (h *CouponHandler) GetActiveCoupons(c *gin.Context) {
	shopID := strings.TrimSpace(c.Param("id"))
	if shopID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的店铺ID"})
		return
	}

	coupons, err := h.couponService.GetActiveCoupons(c.Request.Context(), shopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": coupons})
}

// ReceiveCoupon 用户领取优惠券
func (h *CouponHandler) ReceiveCoupon(c *gin.Context) {
	couponID := strings.TrimSpace(c.Param("couponId"))
	if couponID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的优惠券ID"})
		return
	}

	userID := strings.TrimSpace(c.Query("userId"))
	if userID == "" {
		var req couponReceiveRequest
		if bindErr := c.ShouldBindJSON(&req); bindErr == nil {
			userID = strings.TrimSpace(req.UserID)
			if userID == "" {
				userID = strings.TrimSpace(req.Phone)
			}
		} else if !errors.Is(bindErr, io.EOF) {
			c.JSON(http.StatusBadRequest, gin.H{"error": bindErr.Error()})
			return
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
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户ID不能为空"})
		return
	}

	if err := h.couponService.ReceiveCoupon(c.Request.Context(), userID, couponID); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "领取成功"})
}

// GetUserCoupons 获取用户优惠券列表
func (h *CouponHandler) GetUserCoupons(c *gin.Context) {
	userID := strings.TrimSpace(c.Query("userId"))
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
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户ID不能为空"})
		return
	}

	status := strings.TrimSpace(c.Query("status")) // unused, used, expired
	coupons, err := h.couponService.GetUserCoupons(c.Request.Context(), userID, status)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": coupons})
}

// GetAvailableCoupons 获取用户可用优惠券
func (h *CouponHandler) GetAvailableCoupons(c *gin.Context) {
	userID := strings.TrimSpace(c.Query("userId"))
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
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户ID不能为空"})
		return
	}

	shopID := strings.TrimSpace(c.Query("shopId"))
	if shopID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的店铺ID"})
		return
	}

	orderAmount, err := strconv.ParseFloat(c.Query("orderAmount"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的订单金额"})
		return
	}

	coupons, err := h.couponService.GetAvailableCoupons(c.Request.Context(), userID, shopID, orderAmount)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": coupons})
}

// AdminIssueCouponToPhone 客服按手机号发券
func (h *CouponHandler) AdminIssueCouponToPhone(c *gin.Context) {
	couponID := strings.TrimSpace(c.Param("couponId"))
	if couponID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的优惠券ID"})
		return
	}

	var req couponIssueToPhoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.couponService.IssueCouponToPhone(c.Request.Context(), couponID, req.Phone, req.Channel); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "发券成功"})
}

// PublicGetCouponByToken 1788链接页查询优惠券信息
func (h *CouponHandler) PublicGetCouponByToken(c *gin.Context) {
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "领券链接无效"})
		return
	}

	coupon, err := h.couponService.GetCouponByClaimToken(c.Request.Context(), token)
	if err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"coupon": coupon,
	})
}

// PublicClaimCouponByToken 1788链接页手机号领取
func (h *CouponHandler) PublicClaimCouponByToken(c *gin.Context) {
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "领券链接无效"})
		return
	}

	var req couponClaimByPhoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.couponService.ClaimCouponByToken(c.Request.Context(), token, req.Phone); err != nil {
		writeCouponServiceError(c, err, http.StatusBadRequest)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "领取成功，已放入卡包"})
}

func writeCouponServiceError(c *gin.Context, err error, fallbackStatus int) {
	if errors.Is(err, service.ErrUnauthorized) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}
	c.JSON(fallbackStatus, gin.H{"error": err.Error()})
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
