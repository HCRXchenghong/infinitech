package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func (s *WalletService) GetOrderSettlement(ctx context.Context, rawOrderID string) (map[string]interface{}, error) {
	orderLookupKey := strings.TrimSpace(rawOrderID)
	if orderLookupKey == "" {
		return nil, fmt.Errorf("%w: order id is required", ErrInvalidArgument)
	}

	db := s.walletRepo.DB().WithContext(ctx)

	order, err := s.lookupSettlementOrder(ctx, orderLookupKey)
	if err != nil {
		return nil, err
	}

	orderRef := orderLookupKey
	orderSummary := map[string]interface{}{}
	if order != nil {
		orderRef = settlementOrderRef(order)
		orderSummary = map[string]interface{}{
			"id":                  order.ID,
			"uid":                 order.UID,
			"tsid":                order.TSID,
			"daily_order_id":      order.DailyOrderID,
			"status":              order.Status,
			"payment_status":      order.PaymentStatus,
			"biz_type":            order.BizType,
			"shop_name":           order.ShopName,
			"merchant_id":         order.MerchantID,
			"user_id":             order.UserID,
			"rider_id":            order.RiderID,
			"total_price":         order.TotalPrice,
			"platform_commission": order.PlatformCommission,
			"rider_income":        order.RiderIncome,
			"merchant_income":     order.MerchantIncome,
			"paid_at":             order.PaidAt,
			"completed_at":        order.CompletedAt,
			"created_at":          order.CreatedAt,
			"updated_at":          order.UpdatedAt,
		}
	}

	var snapshot repository.OrderSettlementSnapshot
	snapshotResult := db.
		Where("order_id = ?", orderRef).
		Order("created_at DESC, id DESC").
		First(&snapshot)
	if snapshotResult.Error != nil && snapshotResult.Error != gorm.ErrRecordNotFound {
		return nil, snapshotResult.Error
	}

	entries := make([]repository.SettlementLedgerEntry, 0)
	if err := db.
		Where("order_id = ?", orderRef).
		Order("id ASC").
		Find(&entries).Error; err != nil {
		return nil, err
	}

	var snapshotData interface{}
	if snapshotResult.Error == nil && strings.TrimSpace(snapshot.SnapshotJSON) != "" {
		if err := json.Unmarshal([]byte(snapshot.SnapshotJSON), &snapshotData); err != nil {
			snapshotData = map[string]interface{}{
				"raw": snapshot.SnapshotJSON,
			}
		}
	}

	response := map[string]interface{}{
		"lookup_key":     orderLookupKey,
		"order_id":       orderRef,
		"order":          orderSummary,
		"ledger_entries": entries,
	}

	if snapshotResult.Error == gorm.ErrRecordNotFound {
		response["snapshot"] = nil
		response["snapshot_data"] = nil
		response["status"] = "missing"
		return response, nil
	}

	response["snapshot"] = snapshot
	response["snapshot_data"] = snapshotData
	response["status"] = snapshot.Status
	return response, nil
}

func (s *WalletService) lookupSettlementOrder(ctx context.Context, rawOrderID string) (*repository.Order, error) {
	lookupKey := strings.TrimSpace(rawOrderID)
	if lookupKey == "" {
		return nil, fmt.Errorf("%w: order id is required", ErrInvalidArgument)
	}

	db := s.walletRepo.DB().WithContext(ctx)
	var order repository.Order

	if numericID, err := strconv.ParseUint(lookupKey, 10, 64); err == nil && numericID > 0 {
		if err := db.Where("id = ?", numericID).First(&order).Error; err == nil {
			return &order, nil
		} else if err != gorm.ErrRecordNotFound {
			return nil, err
		}
	}

	err := db.
		Where("uid = ? OR tsid = ? OR daily_order_id = ?", lookupKey, lookupKey, lookupKey).
		Order("id DESC").
		First(&order).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &order, nil
}
