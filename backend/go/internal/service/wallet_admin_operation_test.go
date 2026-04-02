package service

import (
	"context"
	"testing"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestReviewWithdrawCreatesAdminOperationRecord(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	transaction := &repository.WalletTransaction{
		UnifiedIdentity: testIdentity("WT", 301),
		TransactionID:   "WITHDRAW-TXN-ADMIN-301",
		IdempotencyKey:  "withdraw-admin-op-301",
		UserID:          "merchant-301",
		UserType:        "merchant",
		Type:            "withdraw",
		BusinessType:    "withdraw_request",
		BusinessID:      "WITHDRAW-REQ-ADMIN-301",
		Amount:          5000,
		BalanceBefore:   12000,
		BalanceAfter:    7000,
		PaymentMethod:   "bank_card",
		PaymentChannel:  "bank_card",
		Status:          "pending",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := db.Create(transaction).Error; err != nil {
		t.Fatalf("create withdraw transaction failed: %v", err)
	}

	record := &repository.WithdrawRequest{
		UnifiedIdentity: testIdentity("WR", 301),
		RequestID:       "WITHDRAW-REQ-ADMIN-301",
		TransactionID:   transaction.TransactionID,
		UserID:          "merchant-301",
		UserType:        "merchant",
		Amount:          5000,
		Fee:             50,
		ActualAmount:    4950,
		WithdrawMethod:  "bank_card",
		WithdrawAccount: "6222000000000301",
		WithdrawName:    "商户管理员测试",
		BankName:        "中国工商银行",
		BankBranch:      "软件园支行",
		Status:          "pending_review",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := db.Create(record).Error; err != nil {
		t.Fatalf("create withdraw request failed: %v", err)
	}

	_, err := walletSvc.ReviewWithdraw(context.Background(), WithdrawReviewRequest{
		RequestID:    record.RequestID,
		Action:       "approve",
		ReviewerID:   "admin-approve-1",
		ReviewerName: "审核管理员",
		Remark:       "通过提现审核",
	}, AdminWalletActor{
		AdminID:   "admin-approve-1",
		AdminName: "审核管理员",
		AdminIP:   "127.0.0.1",
	})
	if err != nil {
		t.Fatalf("review withdraw failed: %v", err)
	}

	var operation repository.AdminWalletOperation
	if err := db.Where("transaction_id = ? AND operation_type = ?", transaction.TransactionID, "withdraw_approve").First(&operation).Error; err != nil {
		t.Fatalf("expected withdraw admin operation, got %v", err)
	}
	if operation.AdminID != "admin-approve-1" {
		t.Fatalf("expected admin id to be recorded, got %q", operation.AdminID)
	}
	if operation.Reason == "" {
		t.Fatal("expected operation reason to be recorded")
	}
}

func TestListAdminOperationsFiltersByTransactionID(t *testing.T) {
	_, walletSvc, db := newPaymentAndWalletServicesForTest(t)

	operations := []repository.AdminWalletOperation{
		{
			UnifiedIdentity: testIdentity("AO", 401),
			OperationID:     "ADMIN-OP-401",
			TransactionID:   "TX-FILTER-401",
			TargetUserID:    "merchant-401",
			TargetUserType:  "merchant",
			OperationType:   "withdraw_retry_payout",
			Amount:          4200,
			AdminID:         "admin-401",
			AdminName:       "管理员401",
			AdminIP:         "127.0.0.1",
			Reason:          "重试打款",
		},
		{
			UnifiedIdentity: testIdentity("AO", 402),
			OperationID:     "ADMIN-OP-402",
			TransactionID:   "TX-FILTER-402",
			TargetUserID:    "merchant-402",
			TargetUserType:  "merchant",
			OperationType:   "withdraw_complete",
			Amount:          4300,
			AdminID:         "admin-402",
			AdminName:       "管理员402",
			AdminIP:         "127.0.0.1",
			Reason:          "确认打款成功",
		},
	}
	if err := db.Create(&operations).Error; err != nil {
		t.Fatalf("create admin wallet operations failed: %v", err)
	}

	result, err := walletSvc.ListAdminOperations(context.Background(), AdminOperationListQuery{
		TransactionID: "TX-FILTER-402",
		Page:          1,
		Limit:         20,
	})
	if err != nil {
		t.Fatalf("list admin operations failed: %v", err)
	}

	items, ok := result["items"].([]repository.AdminWalletOperation)
	if !ok {
		t.Fatalf("expected admin operation items, got %T", result["items"])
	}
	if len(items) != 1 {
		t.Fatalf("expected exactly one filtered operation, got %d", len(items))
	}
	if items[0].TransactionID != "TX-FILTER-402" {
		t.Fatalf("expected transaction filter to match TX-FILTER-402, got %q", items[0].TransactionID)
	}
}
