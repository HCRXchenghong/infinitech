package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
)

type PaymentCallbackListQuery struct {
	Channel           string
	EventType         string
	Status            string
	Verified          string
	ThirdPartyOrderID string
	TransactionID     string
	Page              int
	Limit             int
}

func (s *WalletService) ListPaymentCallbacks(ctx context.Context, query PaymentCallbackListQuery) (map[string]interface{}, error) {
	if s == nil || s.walletRepo == nil || s.walletRepo.DB() == nil {
		return nil, fmt.Errorf("%w: wallet repository is unavailable", ErrInvalidArgument)
	}

	page := query.Page
	if page <= 0 {
		page = 1
	}
	limit := query.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	db := s.walletRepo.DB().WithContext(ctx).Model(&repository.PaymentCallback{})
	if channel := strings.ToLower(strings.TrimSpace(query.Channel)); channel != "" {
		db = db.Where("LOWER(channel) = ?", channel)
	}
	if eventType := strings.ToLower(strings.TrimSpace(query.EventType)); eventType != "" {
		db = db.Where("LOWER(event_type) = ?", eventType)
	}
	if status := strings.ToLower(strings.TrimSpace(query.Status)); status != "" {
		db = db.Where("LOWER(status) = ?", status)
	}
	if verified := strings.TrimSpace(query.Verified); verified != "" {
		if parsed, ok := boolStringValue(verified); ok {
			db = db.Where("verified = ?", parsed)
		}
	}
	if thirdPartyOrderID := strings.TrimSpace(query.ThirdPartyOrderID); thirdPartyOrderID != "" {
		db = db.Where("third_party_order_id LIKE ?", "%"+thirdPartyOrderID+"%")
	}
	if transactionID := strings.TrimSpace(query.TransactionID); transactionID != "" {
		db = db.Where("(transaction_id = ? OR transaction_id_raw = ? OR transaction_id LIKE ?)", transactionID, transactionID, "%"+transactionID+"%")
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, err
	}

	records := make([]repository.PaymentCallback, 0, limit)
	if err := db.Order("created_at DESC, id DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&records).Error; err != nil {
		return nil, err
	}

	items, err := s.buildPaymentCallbackItems(ctx, records)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"items": items,
		"page":  page,
		"limit": limit,
		"total": total,
	}, nil
}

func (s *WalletService) GetPaymentCallbackDetail(ctx context.Context, callbackID string) (map[string]interface{}, error) {
	if s == nil || s.walletRepo == nil || s.walletRepo.DB() == nil {
		return nil, fmt.Errorf("%w: wallet repository is unavailable", ErrInvalidArgument)
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

	items, err := s.buildPaymentCallbackItems(ctx, []repository.PaymentCallback{record})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("%w: callback not found", ErrInvalidArgument)
	}

	item := items[0]
	item["request_headers"] = parseWalletResponsePayload(record.RequestHeaders)
	item["request_body"] = parseWalletResponsePayload(record.RequestBody)
	item["response_body"] = parseWalletResponsePayload(record.ResponseBody)
	item["request_headers_raw"] = strings.TrimSpace(record.RequestHeaders)
	item["request_body_raw"] = strings.TrimSpace(record.RequestBody)
	item["response_body_raw"] = strings.TrimSpace(record.ResponseBody)
	return item, nil
}

func (s *WalletService) buildPaymentCallbackItems(ctx context.Context, records []repository.PaymentCallback) ([]map[string]interface{}, error) {
	if len(records) == 0 {
		return []map[string]interface{}{}, nil
	}

	transactionMap := make(map[string]*repository.WalletTransaction)
	withdrawMap := make(map[string]*repository.WithdrawRequest)
	rechargeMap := make(map[string]*repository.RechargeOrder)

	transactionIDs := make([]string, 0, len(records))
	for i := range records {
		if transactionID := strings.TrimSpace(records[i].TransactionID); transactionID != "" {
			transactionIDs = append(transactionIDs, transactionID)
		}
	}
	if len(transactionIDs) > 0 {
		var transactions []repository.WalletTransaction
		if err := s.walletRepo.DB().WithContext(ctx).
			Where("transaction_id IN ? OR transaction_id_raw IN ?", transactionIDs, transactionIDs).
			Find(&transactions).Error; err != nil {
			return nil, err
		}
		withdrawIDs := make([]string, 0, len(transactions))
		rechargeIDs := make([]string, 0, len(transactions))
		for i := range transactions {
			tx := transactions[i]
			txCopy := tx
			if strings.TrimSpace(tx.TransactionID) != "" {
				transactionMap[strings.TrimSpace(tx.TransactionID)] = &txCopy
			}
			if strings.TrimSpace(tx.TransactionIDRaw) != "" {
				transactionMap[strings.TrimSpace(tx.TransactionIDRaw)] = &txCopy
			}
			switch strings.TrimSpace(tx.BusinessType) {
			case "withdraw_request":
				if businessID := strings.TrimSpace(tx.BusinessID); businessID != "" {
					withdrawIDs = append(withdrawIDs, businessID)
				}
			case "wallet_recharge", "rider_deposit":
				if businessID := strings.TrimSpace(tx.BusinessID); businessID != "" {
					rechargeIDs = append(rechargeIDs, businessID)
				}
			}
		}
		if len(withdrawIDs) > 0 {
			var withdrawRequests []repository.WithdrawRequest
			if err := s.walletRepo.DB().WithContext(ctx).
				Where("request_id IN ? OR request_id_raw IN ?", withdrawIDs, withdrawIDs).
				Find(&withdrawRequests).Error; err != nil {
				return nil, err
			}
			for i := range withdrawRequests {
				record := withdrawRequests[i]
				recordCopy := record
				withdrawMap[strings.TrimSpace(record.RequestID)] = &recordCopy
				if rawID := strings.TrimSpace(record.RequestIDRaw); rawID != "" {
					withdrawMap[rawID] = &recordCopy
				}
			}
		}
		if len(rechargeIDs) > 0 {
			var rechargeOrders []repository.RechargeOrder
			if err := s.walletRepo.DB().WithContext(ctx).
				Where("order_id IN ?", rechargeIDs).
				Find(&rechargeOrders).Error; err != nil {
				return nil, err
			}
			for i := range rechargeOrders {
				order := rechargeOrders[i]
				orderCopy := order
				rechargeMap[strings.TrimSpace(order.OrderID)] = &orderCopy
			}
		}
	}

	items := make([]map[string]interface{}, 0, len(records))
	for i := range records {
		record := records[i]
		item := map[string]interface{}{
			"callback_id":           record.CallbackID,
			"channel":               record.Channel,
			"event_type":            record.EventType,
			"status":                record.Status,
			"verified":              record.Verified,
			"third_party_order_id":  record.ThirdPartyOrderID,
			"transaction_id":        record.TransactionID,
			"nonce":                 record.Nonce,
			"replay_fingerprint":    record.ReplayFingerprint,
			"processed_at":          record.ProcessedAt,
			"created_at":            record.CreatedAt,
			"updated_at":            record.UpdatedAt,
			"request_body_preview":  previewLongText(record.RequestBody, 180),
			"response_body_preview": previewLongText(record.ResponseBody, 180),
		}

		if signature := strings.TrimSpace(record.Signature); signature != "" {
			item["signature_preview"] = previewLongText(signature, 80)
		}
		if transaction := transactionMap[strings.TrimSpace(record.TransactionID)]; transaction != nil {
			item["transaction"] = map[string]interface{}{
				"transaction_id":       transaction.TransactionID,
				"type":                 transaction.Type,
				"business_type":        transaction.BusinessType,
				"business_id":          transaction.BusinessID,
				"status":               transaction.Status,
				"payment_method":       transaction.PaymentMethod,
				"payment_channel":      transaction.PaymentChannel,
				"third_party_order_id": transaction.ThirdPartyOrderID,
				"third_party_txn_id":   transaction.ThirdPartyTransactionID,
				"amount":               transaction.Amount,
				"user_id":              transaction.UserID,
				"user_type":            transaction.UserType,
				"updated_at":           transaction.UpdatedAt,
				"completed_at":         transaction.CompletedAt,
			}
			if withdrawRequest := withdrawMap[strings.TrimSpace(transaction.BusinessID)]; withdrawRequest != nil {
				item["withdraw"] = map[string]interface{}{
					"request_id":       withdrawRequest.RequestID,
					"user_id":          withdrawRequest.UserID,
					"user_type":        withdrawRequest.UserType,
					"status":           withdrawRequest.Status,
					"withdraw_method":  withdrawRequest.WithdrawMethod,
					"withdraw_account": withdrawRequest.WithdrawAccount,
					"actual_amount":    withdrawRequest.ActualAmount,
					"fee":              withdrawRequest.Fee,
					"transfer_result":  withdrawRequest.TransferResult,
					"reviewer_name":    withdrawRequest.ReviewerName,
					"reject_reason":    withdrawRequest.RejectReason,
					"updated_at":       withdrawRequest.UpdatedAt,
					"completed_at":     withdrawRequest.CompletedAt,
				}
			}
			if rechargeOrder := rechargeMap[strings.TrimSpace(transaction.BusinessID)]; rechargeOrder != nil {
				item["recharge"] = map[string]interface{}{
					"order_id":             rechargeOrder.OrderID,
					"user_id":              rechargeOrder.UserID,
					"user_type":            rechargeOrder.UserType,
					"status":               rechargeOrder.Status,
					"amount":               rechargeOrder.Amount,
					"actual_amount":        rechargeOrder.ActualAmount,
					"payment_method":       rechargeOrder.PaymentMethod,
					"third_party_order_id": rechargeOrder.ThirdPartyOrderID,
					"updated_at":           rechargeOrder.UpdatedAt,
					"paid_at":              rechargeOrder.PaidAt,
				}
			}
		}

		items = append(items, item)
	}

	return items, nil
}

func previewLongText(value string, limit int) string {
	text := strings.TrimSpace(value)
	if text == "" {
		return ""
	}
	if limit <= 0 || len(text) <= limit {
		return text
	}
	return text[:limit] + "..."
}
