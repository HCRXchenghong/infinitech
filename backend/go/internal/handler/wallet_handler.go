package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type WalletHandler struct {
	wallet *service.WalletService
}

func NewWalletHandler(wallet *service.WalletService) *WalletHandler {
	return &WalletHandler{wallet: wallet}
}

func respondWalletInvalidRequest(c *gin.Context, message string) {
	respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, message, nil)
}

func respondWalletMirroredSuccess(c *gin.Context, message string, data interface{}) {
	respondMirroredSuccessEnvelope(c, message, data)
}

func (h *WalletHandler) GetBalance(c *gin.Context) {
	userID := strings.TrimSpace(c.Query("userId"))
	if userID == "" {
		userID = strings.TrimSpace(c.Query("user_id"))
	}
	userType := strings.TrimSpace(c.Query("userType"))
	if userType == "" {
		userType = strings.TrimSpace(c.Query("user_type"))
	}

	result, err := h.wallet.GetBalance(c.Request.Context(), userID, userType)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "钱包余额加载成功", result)
}

func (h *WalletHandler) PayOrder(c *gin.Context) {
	var req service.PayOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWalletInvalidRequest(c, "invalid request")
		return
	}
	req.IdempotencyKey = resolveIdempotencyKey(req.IdempotencyKey, c.GetHeader("Idempotency-Key"))

	result, err := h.wallet.PayOrder(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "订单支付发起成功", result)
}

// Payment is the user-facing wallet payment endpoint (alias for PayOrder).
func (h *WalletHandler) Payment(c *gin.Context) {
	h.PayOrder(c)
}

func (h *WalletHandler) Recharge(c *gin.Context) {
	var req service.RechargeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWalletInvalidRequest(c, "invalid request")
		return
	}
	req.IdempotencyKey = resolveIdempotencyKey(req.IdempotencyKey, c.GetHeader("Idempotency-Key"))

	result, err := h.wallet.Recharge(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "余额充值发起成功", result)
}

func (h *WalletHandler) GetPaymentOptions(c *gin.Context) {
	result, err := h.wallet.GetPaymentOptions(
		c.Request.Context(),
		firstNonEmptyQuery(c, "userType", "user_type"),
		firstNonEmptyQuery(c, "platform"),
		firstNonEmptyQuery(c, "scene"),
	)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "支付方式加载成功", result)
}

func (h *WalletHandler) GetWithdrawOptions(c *gin.Context) {
	result, err := h.wallet.GetEnhancedWithdrawOptions(
		c.Request.Context(),
		firstNonEmptyQuery(c, "userType", "user_type"),
		firstNonEmptyQuery(c, "platform"),
	)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "提现方式加载成功", result)
}

func (h *WalletHandler) PreviewWithdrawFee(c *gin.Context) {
	var req service.WithdrawFeePreviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWalletInvalidRequest(c, "invalid request")
		return
	}
	result, err := h.wallet.PreviewWithdrawFee(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "提现手续费试算成功", result)
}

func (h *WalletHandler) Withdraw(c *gin.Context) {
	var req service.WithdrawRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWalletInvalidRequest(c, "invalid request")
		return
	}
	req.IdempotencyKey = resolveIdempotencyKey(req.IdempotencyKey, c.GetHeader("Idempotency-Key"))

	result, err := h.wallet.WithdrawValidated(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "提现申请提交成功", result)
}

func (h *WalletHandler) GetRiderDepositStatus(c *gin.Context) {
	riderID := firstNonEmptyQuery(c, "riderId", "rider_id", "userId", "user_id")
	result, err := h.wallet.GetRiderDepositStatus(c.Request.Context(), riderID)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "骑手保证金状态加载成功", result)
}

func (h *WalletHandler) CreateRiderDepositPayIntent(c *gin.Context) {
	var req service.RiderDepositPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWalletInvalidRequest(c, "invalid request")
		return
	}
	req.IdempotencyKey = resolveIdempotencyKey(req.IdempotencyKey, c.GetHeader("Idempotency-Key"))
	result, err := h.wallet.CreateRiderDepositPayIntent(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "骑手保证金支付发起成功", result)
}

func (h *WalletHandler) WithdrawRiderDeposit(c *gin.Context) {
	var req service.RiderDepositWithdrawRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWalletInvalidRequest(c, "invalid request")
		return
	}
	req.IdempotencyKey = resolveIdempotencyKey(req.IdempotencyKey, c.GetHeader("Idempotency-Key"))
	result, err := h.wallet.WithdrawRiderDeposit(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "骑手保证金提现提交成功", result)
}

func (h *WalletHandler) ListTransactions(c *gin.Context) {
	page := parsePositiveInt(c.Query("page"), 1)
	limit := parsePositiveInt(c.Query("limit"), 20)
	userID := firstNonEmptyQuery(c, "userId", "user_id")
	userType := firstNonEmptyQuery(c, "userType", "user_type")

	startAt, err := parseOptionalTimeQuery(c, false, "startTime", "start_time", "startDate", "start_date")
	if err != nil {
		writeWalletServiceError(c, fmt.Errorf("%w: %v", service.ErrInvalidArgument, err))
		return
	}
	endAt, err := parseOptionalTimeQuery(c, true, "endTime", "end_time", "endDate", "end_date")
	if err != nil {
		writeWalletServiceError(c, fmt.Errorf("%w: %v", service.ErrInvalidArgument, err))
		return
	}

	result, err := h.wallet.ListTransactions(c.Request.Context(), service.WalletTransactionQuery{
		UserID:   userID,
		UserType: userType,
		Type:     strings.TrimSpace(c.Query("type")),
		Status:   strings.TrimSpace(c.Query("status")),
		Page:     page,
		Limit:    limit,
		StartAt:  startAt,
		EndAt:    endAt,
	})
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "钱包流水加载成功", result)
}

func (h *WalletHandler) GetTransactionStatus(c *gin.Context) {
	result, err := h.wallet.GetTransactionStatus(
		c.Request.Context(),
		firstNonEmptyQuery(c, "userId", "user_id"),
		firstNonEmptyQuery(c, "userType", "user_type"),
		strings.TrimSpace(c.Param("transactionId")),
	)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "交易状态加载成功", result)
}

func (h *WalletHandler) GetRechargeStatus(c *gin.Context) {
	result, err := h.wallet.GetRechargeStatus(
		c.Request.Context(),
		firstNonEmptyQuery(c, "userId", "user_id"),
		firstNonEmptyQuery(c, "userType", "user_type"),
		firstNonEmptyQuery(c, "rechargeOrderId", "recharge_order_id"),
		firstNonEmptyQuery(c, "transactionId", "transaction_id"),
	)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "充值状态加载成功", result)
}

func (h *WalletHandler) GetWithdrawStatus(c *gin.Context) {
	result, err := h.wallet.GetWithdrawStatus(
		c.Request.Context(),
		firstNonEmptyQuery(c, "userId", "user_id"),
		firstNonEmptyQuery(c, "userType", "user_type"),
		firstNonEmptyQuery(c, "requestId", "request_id", "withdrawRequestId", "withdraw_request_id"),
		firstNonEmptyQuery(c, "transactionId", "transaction_id"),
	)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "提现状态加载成功", result)
}

func resolveIdempotencyKey(bodyKey, headerKey string) string {
	if strings.TrimSpace(bodyKey) != "" {
		return strings.TrimSpace(bodyKey)
	}
	return strings.TrimSpace(headerKey)
}

func parsePositiveInt(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func firstNonEmptyQuery(c *gin.Context, keys ...string) string {
	for _, key := range keys {
		value := strings.TrimSpace(c.Query(key))
		if value != "" {
			return value
		}
	}
	return ""
}

func parseOptionalTimeQuery(c *gin.Context, isEnd bool, keys ...string) (*time.Time, error) {
	raw := firstNonEmptyQuery(c, keys...)
	if raw == "" {
		return nil, nil
	}
	value, dateOnly, err := parseFlexibleTime(raw)
	if err != nil {
		return nil, err
	}
	if isEnd && dateOnly {
		value = time.Date(value.Year(), value.Month(), value.Day(), 23, 59, 59, int(time.Second-time.Nanosecond), value.Location())
	}
	return &value, nil
}

func parseFlexibleTime(raw string) (time.Time, bool, error) {
	text := strings.TrimSpace(raw)
	if text == "" {
		return time.Time{}, false, fmt.Errorf("time is empty")
	}

	// Support unix timestamps in seconds/milliseconds for easier integration.
	if digitsOnly(text) {
		if unix, err := strconv.ParseInt(text, 10, 64); err == nil {
			switch len(text) {
			case 13:
				return time.UnixMilli(unix), false, nil
			case 10:
				return time.Unix(unix, 0), false, nil
			}
		}
	}

	layouts := []struct {
		layout   string
		dateOnly bool
	}{
		{time.RFC3339, false},
		{"2006-01-02 15:04:05", false},
		{"2006-01-02 15:04", false},
		{"2006/01/02 15:04:05", false},
		{"2006/01/02 15:04", false},
		{"2006-01-02", true},
		{"2006/01/02", true},
	}
	for _, item := range layouts {
		if value, err := time.ParseInLocation(item.layout, text, time.Local); err == nil {
			return value, item.dateOnly, nil
		}
	}
	return time.Time{}, false, fmt.Errorf("invalid time format: %s", text)
}

func digitsOnly(text string) bool {
	for _, ch := range text {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return text != ""
}

func writeWalletServiceError(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	code := responseCodeInternalError
	switch {
	case errors.Is(err, service.ErrInvalidArgument):
		status = http.StatusBadRequest
		code = responseCodeInvalidArgument
	case errors.Is(err, service.ErrRiskControl):
		status = http.StatusForbidden
		code = responseCodeForbidden
	case errors.Is(err, service.ErrInsufficientBalance):
		status = http.StatusConflict
		code = responseCodeConflict
	case errors.Is(err, service.ErrConcurrentBalanceUpdate):
		status = http.StatusConflict
		code = responseCodeConflict
	}
	respondErrorEnvelope(c, status, code, err.Error(), nil)
}

func (h *WalletHandler) ListWithdrawRecords(c *gin.Context) {
	userID := firstNonEmptyQuery(c, "userId", "user_id")
	if userID == "" {
		writeWalletServiceError(c, fmt.Errorf("%w: userId is required", service.ErrInvalidArgument))
		return
	}

	result, err := h.wallet.ListWithdrawRecords(
		c.Request.Context(),
		userID,
		firstNonEmptyQuery(c, "userType", "user_type"),
		strings.TrimSpace(c.Query("status")),
		parsePositiveInt(c.Query("page"), 1),
		parsePositiveInt(c.Query("limit"), 20),
	)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondWalletMirroredSuccess(c, "提现记录加载成功", result)
}
