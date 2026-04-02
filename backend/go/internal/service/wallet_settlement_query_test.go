package service

import (
	"context"
	"strconv"
	"testing"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestGetOrderSettlementReturnsSnapshotAndLedgerEntries(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	order := &repository.Order{
		UnifiedIdentity: testIdentity("OS", 1),
		DailyOrderID:    "DAY-ORDER-001",
		UserID:          "customer-001",
		MerchantID:      "merchant-001",
		RiderID:         "rider-001",
		ShopName:        "测试门店",
		Status:          "completed",
		PaymentStatus:   "paid",
		BizType:         "takeout",
		TotalPrice:      28.6,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("create order failed: %v", err)
	}

	orderRef := settlementOrderRef(order)
	snapshot := &repository.OrderSettlementSnapshot{
		UnifiedIdentity: testIdentity("SS", 1),
		OrderID:         orderRef,
		RuleSetUID:      "rule-global-default",
		OrderAmount:     2860,
		Status:          "settled",
		SnapshotJSON:    `{"lines":[{"subject_uid":"platform","amount":200},{"subject_uid":"merchant","amount":2660}]}`,
		SettledAt:       &now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(snapshot).Error; err != nil {
		t.Fatalf("create snapshot failed: %v", err)
	}

	entries := []repository.SettlementLedgerEntry{
		{
			UnifiedIdentity:      testIdentity("LE", 1),
			OrderID:              orderRef,
			SettlementSubjectUID: "platform",
			SubjectType:          "platform",
			EntryType:            "settlement",
			Amount:               200,
			Status:               "settled",
			OccurredAt:           &now,
			CreatedAt:            now,
			UpdatedAt:            now,
		},
		{
			UnifiedIdentity:      testIdentity("LE", 2),
			OrderID:              orderRef,
			SettlementSubjectUID: "merchant",
			SubjectType:          "merchant",
			EntryType:            "settlement",
			Amount:               2660,
			Status:               "settled",
			OccurredAt:           &now,
			CreatedAt:            now,
			UpdatedAt:            now,
		},
	}
	if err := db.Create(&entries).Error; err != nil {
		t.Fatalf("create settlement entries failed: %v", err)
	}

	result, err := walletSvc.GetOrderSettlement(context.Background(), order.DailyOrderID)
	if err != nil {
		t.Fatalf("get order settlement failed: %v", err)
	}

	if got := result["status"]; got != "settled" {
		t.Fatalf("expected settled status, got %v", got)
	}
	if got := result["order_id"]; got != strconv.FormatUint(uint64(order.ID), 10) {
		t.Fatalf("expected normalized order ref, got %v", got)
	}
	orderSummary, ok := result["order"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected order summary map, got %T", result["order"])
	}
	if got := orderSummary["shop_name"]; got != "测试门店" {
		t.Fatalf("expected shop name 测试门店, got %v", got)
	}
	ledgerEntries, ok := result["ledger_entries"].([]repository.SettlementLedgerEntry)
	if !ok {
		t.Fatalf("expected settlement ledger entries, got %T", result["ledger_entries"])
	}
	if len(ledgerEntries) != 2 {
		t.Fatalf("expected 2 settlement entries, got %d", len(ledgerEntries))
	}
}

func TestGetOrderSettlementReturnsMissingWhenSnapshotDoesNotExist(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	now := time.Now()
	order := &repository.Order{
		UnifiedIdentity: testIdentity("OS", 2),
		DailyOrderID:    "DAY-ORDER-002",
		UserID:          "customer-002",
		MerchantID:      "merchant-002",
		Status:          "pending",
		PaymentStatus:   "unpaid",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("create order failed: %v", err)
	}

	result, err := walletSvc.GetOrderSettlement(context.Background(), order.UID)
	if err != nil {
		t.Fatalf("get order settlement failed: %v", err)
	}

	if got := result["status"]; got != "missing" {
		t.Fatalf("expected missing status, got %v", got)
	}
	if result["snapshot"] != nil {
		t.Fatalf("expected snapshot to be nil, got %#v", result["snapshot"])
	}
	orderSummary, ok := result["order"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected order summary map, got %T", result["order"])
	}
	if got := orderSummary["payment_status"]; got != "unpaid" {
		t.Fatalf("expected unpaid payment status, got %v", got)
	}
}
