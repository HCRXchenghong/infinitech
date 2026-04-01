package service

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newWalletServiceForSettlementTest(t *testing.T) (*WalletService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "settlement_runtime_test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("resolve sql db failed: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	if err := db.AutoMigrate(
		&repository.IDCodebook{},
		&repository.IDSequence{},
		&repository.Setting{},
		&repository.Order{},
		&repository.OrderSettlementSnapshot{},
		&repository.SettlementLedgerEntry{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	walletRepo := repository.NewWalletRepository(db)
	return NewWalletService(walletRepo, nil, nil, "test-sign"), db
}

func TestSettlementLifecyclePrepareSettleAndReverse(t *testing.T) {
	svc, db := newWalletServiceForSettlementTest(t)
	ctx := context.Background()
	now := time.Now()

	order := &repository.Order{
		UserID:        "user-1",
		MerchantID:    "merchant-1",
		RiderID:       "rider-1",
		ShopID:        "shop-1",
		ShopName:      "测试店铺",
		Status:        "delivering",
		PaymentStatus: "paid",
		PaymentMethod: "wechat",
		TotalPrice:    20,
		ProductPrice:  15,
		DeliveryFee:   5,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("create order failed: %v", err)
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		return svc.PrepareOrderSettlementTx(ctx, tx, order)
	}); err != nil {
		t.Fatalf("prepare settlement failed: %v", err)
	}

	var pendingSnapshot repository.OrderSettlementSnapshot
	if err := db.Where("order_id = ?", settlementOrderRef(order)).First(&pendingSnapshot).Error; err != nil {
		t.Fatalf("query pending snapshot failed: %v", err)
	}
	if pendingSnapshot.Status != "pending_settlement" {
		t.Fatalf("expected pending snapshot, got %q", pendingSnapshot.Status)
	}

	completedAt := now.Add(10 * time.Minute)
	order.Status = "completed"
	order.CompletedAt = &completedAt
	if err := db.Save(order).Error; err != nil {
		t.Fatalf("update order status failed: %v", err)
	}
	if err := db.Transaction(func(tx *gorm.DB) error {
		return svc.SettleCompletedOrderTx(ctx, tx, order, completedAt)
	}); err != nil {
		t.Fatalf("settle completed order failed: %v", err)
	}

	var settledSnapshot repository.OrderSettlementSnapshot
	if err := db.Where("order_id = ?", settlementOrderRef(order)).First(&settledSnapshot).Error; err != nil {
		t.Fatalf("query settled snapshot failed: %v", err)
	}
	if settledSnapshot.Status != "settled" {
		t.Fatalf("expected settled snapshot, got %q", settledSnapshot.Status)
	}
	if settledSnapshot.SettledAt == nil {
		t.Fatal("expected settledAt to be populated")
	}

	var entries []repository.SettlementLedgerEntry
	if err := db.Where("order_id = ? AND entry_type = ?", settlementOrderRef(order), "settlement").Order("id ASC").Find(&entries).Error; err != nil {
		t.Fatalf("query settlement entries failed: %v", err)
	}
	if len(entries) != 4 {
		t.Fatalf("expected 4 settlement entries, got %d", len(entries))
	}

	var settledOrder repository.Order
	if err := db.First(&settledOrder, order.ID).Error; err != nil {
		t.Fatalf("reload order failed: %v", err)
	}
	if settledOrder.PlatformCommission != 160 {
		t.Fatalf("expected platform commission 160, got %d", settledOrder.PlatformCommission)
	}
	if settledOrder.RiderIncome != 300 {
		t.Fatalf("expected rider income 300, got %d", settledOrder.RiderIncome)
	}
	if settledOrder.MerchantIncome != 1440 {
		t.Fatalf("expected merchant income 1440, got %d", settledOrder.MerchantIncome)
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		return svc.ReverseOrderSettlementTx(ctx, tx, &settledOrder, 2000, now.Add(20*time.Minute), "test refund")
	}); err != nil {
		t.Fatalf("reverse settlement failed: %v", err)
	}

	var reversedSnapshot repository.OrderSettlementSnapshot
	if err := db.Where("order_id = ?", settlementOrderRef(order)).First(&reversedSnapshot).Error; err != nil {
		t.Fatalf("query reversed snapshot failed: %v", err)
	}
	if reversedSnapshot.Status != "reversed" {
		t.Fatalf("expected reversed snapshot, got %q", reversedSnapshot.Status)
	}
	if reversedSnapshot.ReversedAt == nil {
		t.Fatal("expected reversedAt to be populated")
	}

	var reversalEntries []repository.SettlementLedgerEntry
	if err := db.Where("order_id = ? AND entry_type = ?", settlementOrderRef(order), "reversal").Order("id ASC").Find(&reversalEntries).Error; err != nil {
		t.Fatalf("query reversal entries failed: %v", err)
	}
	if len(reversalEntries) != 4 {
		t.Fatalf("expected 4 reversal entries, got %d", len(reversalEntries))
	}

	var reversedOrder repository.Order
	if err := db.First(&reversedOrder, order.ID).Error; err != nil {
		t.Fatalf("reload reversed order failed: %v", err)
	}
	if reversedOrder.PlatformCommission != 0 || reversedOrder.RiderIncome != 0 || reversedOrder.MerchantIncome != 0 {
		t.Fatalf("expected settlement amounts to be reset after full reversal, got platform=%d rider=%d merchant=%d", reversedOrder.PlatformCommission, reversedOrder.RiderIncome, reversedOrder.MerchantIncome)
	}
}

func TestPreviewSettlementUsesSameRuleAmountsAsSettlement(t *testing.T) {
	svc, _ := newWalletServiceForSettlementTest(t)

	result, err := svc.PreviewSettlement(context.Background(), 2000, "")
	if err != nil {
		t.Fatalf("preview settlement failed: %v", err)
	}

	lines, ok := result["preview_entries"].([]settlementPreviewLine)
	if !ok {
		t.Fatalf("unexpected preview entry type: %T", result["preview_entries"])
	}
	if len(lines) != 4 {
		t.Fatalf("expected 4 preview lines, got %d", len(lines))
	}
	if lines[0].Amount != 100 {
		t.Fatalf("expected school amount 100, got %d", lines[0].Amount)
	}
	if lines[1].Amount != 160 {
		t.Fatalf("expected platform amount 160, got %d", lines[1].Amount)
	}
	if lines[2].Amount != 300 {
		t.Fatalf("expected rider amount 300, got %d", lines[2].Amount)
	}
	if lines[3].Amount != 1440 {
		t.Fatalf("expected merchant remainder 1440, got %d", lines[3].Amount)
	}
}
