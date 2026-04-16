package service

import "strings"

type PaymentCallbackAcknowledgement struct {
	ContentType string
	Body        string
}

const (
	paymentCallbackJSONContentType = "application/json; charset=utf-8"
	paymentCallbackTextContentType = "text/plain; charset=utf-8"
)

func BuildPaymentCallbackAcknowledgement(channel string, verified bool) PaymentCallbackAcknowledgement {
	normalizedChannel := strings.ToLower(strings.TrimSpace(channel))
	switch normalizedChannel {
	case "wechat":
		if verified {
			return PaymentCallbackAcknowledgement{
				ContentType: paymentCallbackJSONContentType,
				Body:        `{"code":"SUCCESS","message":"成功"}`,
			}
		}
		return PaymentCallbackAcknowledgement{
			ContentType: paymentCallbackJSONContentType,
			Body:        `{"code":"FAIL","message":"失败"}`,
		}
	case "alipay":
		if verified {
			return PaymentCallbackAcknowledgement{
				ContentType: paymentCallbackTextContentType,
				Body:        "success",
			}
		}
		return PaymentCallbackAcknowledgement{
			ContentType: paymentCallbackTextContentType,
			Body:        "fail",
		}
	case "bank_card":
		if verified {
			return PaymentCallbackAcknowledgement{
				ContentType: paymentCallbackTextContentType,
				Body:        "ok",
			}
		}
		return PaymentCallbackAcknowledgement{
			ContentType: paymentCallbackTextContentType,
			Body:        "fail",
		}
	default:
		if verified {
			return PaymentCallbackAcknowledgement{
				ContentType: paymentCallbackTextContentType,
				Body:        "ok",
			}
		}
		return PaymentCallbackAcknowledgement{
			ContentType: paymentCallbackTextContentType,
			Body:        "fail",
		}
	}
}

func paymentCallbackInitialStatus(verified bool) string {
	if verified {
		return "processing"
	}
	return "failed"
}

func paymentCallbackCompletedStatus() string {
	return "success"
}

func paymentCallbackDuplicateEligibleStatus() string {
	return "success"
}
