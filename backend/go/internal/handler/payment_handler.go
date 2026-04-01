package handler

import (
	"bytes"
	"io"
	"net/http"
	"net/url"
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
	c.Request.Body = io.NopCloser(bytes.NewBuffer(rawBody))
	headers := make(map[string]string)
	for k, v := range c.Request.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}
	params := make(map[string]string)
	for key, values := range c.Request.URL.Query() {
		if len(values) > 0 {
			params[key] = strings.TrimSpace(values[0])
		}
	}
	if channel == "alipay" {
		if formValues, err := url.ParseQuery(string(rawBody)); err == nil {
			for key, values := range formValues {
				if len(values) > 0 && strings.TrimSpace(values[0]) != "" {
					params[key] = strings.TrimSpace(values[0])
				}
			}
		}
	}

	req := service.PaymentCallbackRequest{
		Channel:           channel,
		EventType:         strings.TrimSpace(firstNonEmptyText(c.Query("event"), params["trade_status"], params["status"], params["order_status"], params["trans_status"])),
		Signature:         firstNonEmptyText(firstNonEmptyHeader(c, "Wechatpay-Signature", "Alipay-Signature", "X-Signature"), params["sign"]),
		Nonce:             c.GetHeader("Wechatpay-Nonce"),
		TransactionID:     strings.TrimSpace(firstNonEmptyText(firstNonEmptyQueryValue(c, "transactionId", "transaction_id"), params["out_trade_no"], params["out_refund_no"], params["out_batch_no"], params["out_detail_no"], params["out_biz_no"])),
		ThirdPartyOrderID: strings.TrimSpace(firstNonEmptyText(firstNonEmptyQueryValue(c, "thirdPartyOrderId", "third_party_order_id"), params["transaction_id"], params["refund_id"], params["batch_id"], params["detail_id"], params["trade_no"], params["pay_fund_order_id"], params["order_id"])),
		Headers:           headers,
		Params:            params,
		RawBody:           string(rawBody),
		Verified:          parseBoolLike(c.Query("verified")) || parseBoolLike(c.GetHeader("X-Debug-Verified")),
		Response:          "ok",
		HTTPRequest:       c.Request.Clone(c.Request.Context()),
	}

	result, err := h.payment.RecordCallback(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func firstNonEmptyQueryValue(c *gin.Context, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(c.Query(key)); value != "" {
			return value
		}
	}
	return ""
}

func firstNonEmptyHeader(c *gin.Context, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(c.GetHeader(key)); value != "" {
			return value
		}
	}
	return ""
}

func parseBoolLike(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "y", "ok":
		return true
	default:
		return false
	}
}

func firstNonEmptyText(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
