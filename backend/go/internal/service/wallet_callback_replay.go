package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

type PaymentCallbackReplayRequest struct {
	Remark string `json:"remark"`
}

func (s *WalletService) ReplayPaymentCallback(ctx context.Context, callbackID string, actor AdminWalletActor, req PaymentCallbackReplayRequest) (map[string]interface{}, error) {
	if s == nil || s.walletRepo == nil || s.walletRepo.DB() == nil {
		return nil, fmt.Errorf("%w: wallet repository is unavailable", ErrInvalidArgument)
	}
	if s.paymentSvc == nil {
		return nil, fmt.Errorf("%w: payment callback service is unavailable", ErrInvalidArgument)
	}

	callbackID = strings.TrimSpace(callbackID)
	if callbackID == "" {
		return nil, fmt.Errorf("%w: callbackId is required", ErrInvalidArgument)
	}

	var record repository.PaymentCallback
	if err := s.walletRepo.DB().WithContext(ctx).
		Where("callback_id = ? OR callback_id_raw = ?", callbackID, callbackID).
		First(&record).Error; err != nil {
		return nil, err
	}
	if !record.Verified {
		return nil, fmt.Errorf("%w: only verified callbacks can be replayed", ErrInvalidArgument)
	}

	headers := stringifyHeaderMap(parseWalletResponsePayload(record.RequestHeaders))
	replayAt := time.Now()
	replayNonce := fmt.Sprintf("admin-replay:%s:%d", firstTrimmed(record.CallbackID, callbackID), replayAt.UnixNano())
	replayRemark := firstTrimmed(strings.TrimSpace(req.Remark), "后台重放已验签回调")
	headers["X-Admin-Replay"] = "true"
	headers["X-Admin-Replay-Of"] = firstTrimmed(record.CallbackID, callbackID)
	if strings.TrimSpace(actor.AdminID) != "" {
		headers["X-Admin-ID"] = strings.TrimSpace(actor.AdminID)
	}
	if strings.TrimSpace(actor.AdminName) != "" {
		headers["X-Admin-Name"] = strings.TrimSpace(actor.AdminName)
	}

	result, err := s.paymentSvc.RecordCallback(ctx, PaymentCallbackRequest{
		Channel:   record.Channel,
		EventType: record.EventType,
		Signature: firstTrimmed(record.Signature, fmt.Sprintf("admin-replay:%s", callbackID)),
		Nonce:     replayNonce,
		// Historical callback rows may keep the business/request id in the raw field.
		TransactionID:     firstTrimmed(record.TransactionIDRaw, record.TransactionID),
		ThirdPartyOrderID: record.ThirdPartyOrderID,
		Headers:           headers,
		RawBody:           record.RequestBody,
		Verified:          true,
		Response:          replayRemark,
	})
	if err != nil {
		return nil, err
	}

	result["replayed"] = true
	result["replayedFromCallbackId"] = firstTrimmed(record.CallbackID, callbackID)
	result["remark"] = replayRemark
	return result, nil
}

func stringifyHeaderMap(value interface{}) map[string]string {
	result := map[string]string{}
	parsed, ok := value.(map[string]interface{})
	if !ok {
		return result
	}
	for key, raw := range parsed {
		if normalized := strings.TrimSpace(fmt.Sprint(raw)); normalized != "" {
			result[key] = normalized
		}
	}
	return result
}
