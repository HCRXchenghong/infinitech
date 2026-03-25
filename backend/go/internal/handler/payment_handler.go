package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type PaymentHandler struct {
	payment *service.PaymentService
}

func NewPaymentHandler(payment *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{payment: payment}
}

func (h *PaymentHandler) PayOrder(c *gin.Context) {
	var req service.PayOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid request"})
		return
	}
	req.IdempotencyKey = resolveIdempotencyKey(req.IdempotencyKey, c.GetHeader("Idempotency-Key"))

	result, err := h.payment.PayOrder(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *PaymentHandler) RefundOrder(c *gin.Context) {
	var req service.RefundOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid request"})
		return
	}
	req.IdempotencyKey = resolveIdempotencyKey(req.IdempotencyKey, c.GetHeader("Idempotency-Key"))

	result, err := h.payment.RefundOrder(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *PaymentHandler) WechatCallback(c *gin.Context) {
	h.handleCallback(c, "wechat")
}

func (h *PaymentHandler) AlipayCallback(c *gin.Context) {
	h.handleCallback(c, "alipay")
}

func (h *PaymentHandler) handleCallback(c *gin.Context, channel string) {
	rawBody, _ := c.GetRawData()
	headers := make(map[string]string)
	for k, v := range c.Request.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	req := service.PaymentCallbackRequest{
		Channel:           channel,
		EventType:         strings.TrimSpace(c.Query("event")),
		Signature:         c.GetHeader("Wechatpay-Signature"),
		Nonce:             c.GetHeader("Wechatpay-Nonce"),
		ThirdPartyOrderID: strings.TrimSpace(c.Query("out_trade_no")),
		Headers:           headers,
		RawBody:           string(rawBody),
		Verified:          false,
		Response:          "ok",
	}

	result, err := h.payment.RecordCallback(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
