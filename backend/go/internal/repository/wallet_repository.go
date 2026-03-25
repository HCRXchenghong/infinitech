package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type WalletTransactionListParams struct {
	UserID   string
	UserType string
	Type     string
	Status   string
	Limit    int
	Offset   int
	StartAt  *time.Time
	EndAt    *time.Time
}

type AdminWalletOperationListParams struct {
	TargetUserID   string
	TargetUserType string
	OperationType  string
	AdminID        string
	Limit          int
	Offset         int
}

type WalletRepository interface {
	DB() *gorm.DB
	WithTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error

	GetWalletAccount(ctx context.Context, userID, userType string) (*WalletAccount, error)
	GetOrCreateWalletAccountTx(ctx context.Context, tx *gorm.DB, userID, userType string) (*WalletAccount, error)
	UpdateWalletAccountWithVersionTx(ctx context.Context, tx *gorm.DB, accountID uint, version int, updates map[string]interface{}) (bool, error)

	CreateWalletTransactionTx(ctx context.Context, tx *gorm.DB, transaction *WalletTransaction) error
	UpdateWalletTransactionStatusTx(ctx context.Context, tx *gorm.DB, transactionID, status, responseData string, completedAt *time.Time) error
	GetWalletTransactionByIdempotencyKey(ctx context.Context, idempotencyKey string) (*WalletTransaction, error)
	GetWalletTransactionByID(ctx context.Context, transactionID string) (*WalletTransaction, error)
	ListWalletTransactions(ctx context.Context, params WalletTransactionListParams) ([]WalletTransaction, int64, error)

	CreateRechargeOrderTx(ctx context.Context, tx *gorm.DB, rechargeOrder *RechargeOrder) error
	CreateWithdrawRequestTx(ctx context.Context, tx *gorm.DB, withdrawRequest *WithdrawRequest) error
	ListWithdrawRequests(ctx context.Context, userID, userType, status string, limit, offset int) ([]WithdrawRequest, int64, error)
	UpdateWithdrawRequestStatus(ctx context.Context, requestID, status, reviewerID, reviewerName, reviewRemark string) error
	GetWithdrawRequestByID(ctx context.Context, requestID string) (*WithdrawRequest, error)
	CreateAdminWalletOperationTx(ctx context.Context, tx *gorm.DB, operation *AdminWalletOperation) error
	ListAdminWalletOperations(ctx context.Context, params AdminWalletOperationListParams) ([]AdminWalletOperation, int64, error)

	UpdateOrderPaymentStatusTx(ctx context.Context, tx *gorm.DB, orderID, transactionID, paymentMethod string, paymentTime time.Time) error
	UpdateOrderRefundStatusTx(ctx context.Context, tx *gorm.DB, orderID, transactionID string, refundAmount int64, refundTime time.Time) error
}

type walletRepository struct {
	db *gorm.DB
}

func NewWalletRepository(db *gorm.DB) WalletRepository {
	return &walletRepository{db: db}
}

func (r *walletRepository) DB() *gorm.DB {
	return r.db
}

func (r *walletRepository) WithTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(tx.WithContext(ctx))
	})
}

func (r *walletRepository) GetWalletAccount(ctx context.Context, userID, userType string) (*WalletAccount, error) {
	var account WalletAccount
	query := r.db.WithContext(ctx).Model(&WalletAccount{}).Where("user_id = ?", userID)
	if userType != "" {
		query = query.Where("user_type = ?", userType)
	}
	if err := query.First(&account).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *walletRepository) GetOrCreateWalletAccountTx(ctx context.Context, tx *gorm.DB, userID, userType string) (*WalletAccount, error) {
	var account WalletAccount
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ? AND user_type = ?", userID, userType).
		First(&account).Error
	if err == nil {
		return &account, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	account = WalletAccount{
		UserID:        userID,
		UserType:      userType,
		Balance:       0,
		FrozenBalance: 0,
		TotalBalance:  0,
		Version:       0,
		Status:        "active",
	}

	if err := tx.WithContext(ctx).Create(&account).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			var existed WalletAccount
			if findErr := tx.WithContext(ctx).
				Where("user_id = ? AND user_type = ?", userID, userType).
				First(&existed).Error; findErr == nil {
				return &existed, nil
			}
		}
		return nil, err
	}
	return &account, nil
}

func (r *walletRepository) UpdateWalletAccountWithVersionTx(ctx context.Context, tx *gorm.DB, accountID uint, version int, updates map[string]interface{}) (bool, error) {
	if updates == nil {
		updates = map[string]interface{}{}
	}
	updates["version"] = version + 1
	res := tx.WithContext(ctx).
		Model(&WalletAccount{}).
		Where("id = ? AND version = ?", accountID, version).
		Updates(updates)
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *walletRepository) CreateWalletTransactionTx(ctx context.Context, tx *gorm.DB, transaction *WalletTransaction) error {
	if transaction != nil && strings.TrimSpace(transaction.IdempotencyKey) == "" {
		// Defensive fallback: never persist empty idempotency_key.
		if fallback := strings.TrimSpace(transaction.BusinessID); fallback != "" && idkit.UIDPattern.MatchString(fallback) {
			transaction.IdempotencyKey = fallback
		}
		if transaction.IdempotencyKey == "" {
			if fallback := strings.TrimSpace(transaction.TransactionID); fallback != "" && idkit.UIDPattern.MatchString(fallback) {
				transaction.IdempotencyKey = fallback
			}
		}
		if transaction.IdempotencyKey == "" {
			idValue, _, err := idkit.NextUIDWithDB(ctx, tx, "77")
			if err != nil {
				return err
			}
			transaction.IdempotencyKey = idValue
		}
	}
	return tx.WithContext(ctx).Create(transaction).Error
}

func (r *walletRepository) UpdateWalletTransactionStatusTx(ctx context.Context, tx *gorm.DB, transactionID, status, responseData string, completedAt *time.Time) error {
	updates := map[string]interface{}{
		"status":        status,
		"response_data": responseData,
	}
	if completedAt != nil {
		updates["completed_at"] = *completedAt
	}
	res := tx.WithContext(ctx).
		Model(&WalletTransaction{}).
		Where("transaction_id = ? OR transaction_id_raw = ?", transactionID, transactionID).
		Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *walletRepository) GetWalletTransactionByIdempotencyKey(ctx context.Context, idempotencyKey string) (*WalletTransaction, error) {
	var transaction WalletTransaction
	if err := r.db.WithContext(ctx).
		Where("idempotency_key = ? OR idempotency_key_raw = ?", idempotencyKey, idempotencyKey).
		First(&transaction).Error; err != nil {
		return nil, err
	}
	return &transaction, nil
}

func (r *walletRepository) GetWalletTransactionByID(ctx context.Context, transactionID string) (*WalletTransaction, error) {
	var transaction WalletTransaction
	if err := r.db.WithContext(ctx).
		Where("transaction_id = ? OR transaction_id_raw = ?", transactionID, transactionID).
		First(&transaction).Error; err != nil {
		return nil, err
	}
	return &transaction, nil
}

func (r *walletRepository) ListWalletTransactions(ctx context.Context, params WalletTransactionListParams) ([]WalletTransaction, int64, error) {
	var transactions []WalletTransaction
	var total int64

	query := r.db.WithContext(ctx).Model(&WalletTransaction{})
	if params.UserID != "" {
		query = query.Where("user_id = ?", params.UserID)
	}
	if params.UserType != "" {
		query = query.Where("user_type = ?", params.UserType)
	}
	if params.Type != "" {
		query = query.Where("type = ?", params.Type)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.StartAt != nil {
		query = query.Where("created_at >= ?", *params.StartAt)
	}
	if params.EndAt != nil {
		query = query.Where("created_at <= ?", *params.EndAt)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Order("created_at DESC").Find(&transactions).Error; err != nil {
		return nil, 0, err
	}
	return transactions, total, nil
}

func (r *walletRepository) CreateRechargeOrderTx(ctx context.Context, tx *gorm.DB, rechargeOrder *RechargeOrder) error {
	return tx.WithContext(ctx).Create(rechargeOrder).Error
}

func (r *walletRepository) CreateWithdrawRequestTx(ctx context.Context, tx *gorm.DB, withdrawRequest *WithdrawRequest) error {
	return tx.WithContext(ctx).Create(withdrawRequest).Error
}

func (r *walletRepository) CreateAdminWalletOperationTx(ctx context.Context, tx *gorm.DB, operation *AdminWalletOperation) error {
	return tx.WithContext(ctx).Create(operation).Error
}

func (r *walletRepository) ListAdminWalletOperations(ctx context.Context, params AdminWalletOperationListParams) ([]AdminWalletOperation, int64, error) {
	var operations []AdminWalletOperation
	var total int64

	query := r.db.WithContext(ctx).Model(&AdminWalletOperation{})
	if params.TargetUserID != "" {
		query = query.Where("target_user_id = ?", params.TargetUserID)
	}
	if params.TargetUserType != "" {
		query = query.Where("target_user_type = ?", params.TargetUserType)
	}
	if params.OperationType != "" {
		query = query.Where("operation_type = ?", params.OperationType)
	}
	if params.AdminID != "" {
		query = query.Where("admin_id = ?", params.AdminID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Order("created_at DESC").Find(&operations).Error; err != nil {
		return nil, 0, err
	}
	return operations, total, nil
}

func (r *walletRepository) UpdateOrderPaymentStatusTx(ctx context.Context, tx *gorm.DB, orderID, transactionID, paymentMethod string, paymentTime time.Time) error {
	updates := map[string]interface{}{
		"payment_status":         "paid",
		"payment_method":         paymentMethod,
		"payment_transaction_id": transactionID,
		"payment_time":           paymentTime,
	}
	res := tx.WithContext(ctx).
		Model(&Order{}).
		Where("id = ? OR daily_order_id = ?", orderID, orderID).
		Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *walletRepository) UpdateOrderRefundStatusTx(ctx context.Context, tx *gorm.DB, orderID, transactionID string, refundAmount int64, refundTime time.Time) error {
	updates := map[string]interface{}{
		"payment_status":        "refunded",
		"refund_transaction_id": transactionID,
		"refund_amount":         refundAmount,
		"refund_time":           refundTime,
	}
	res := tx.WithContext(ctx).
		Model(&Order{}).
		Where("id = ? OR daily_order_id = ?", orderID, orderID).
		Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *walletRepository) ListWithdrawRequests(ctx context.Context, userID, userType, status string, limit, offset int) ([]WithdrawRequest, int64, error) {
	var records []WithdrawRequest
	var total int64
	query := r.db.WithContext(ctx).Model(&WithdrawRequest{})
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if userType != "" {
		query = query.Where("user_type = ?", userType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if limit <= 0 {
		limit = 20
	}
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&records).Error; err != nil {
		return nil, 0, err
	}
	return records, total, nil
}

func (r *walletRepository) UpdateWithdrawRequestStatus(ctx context.Context, requestID, status, reviewerID, reviewerName, reviewRemark string) error {
	updates := map[string]interface{}{
		"status":        status,
		"reviewer_id":   reviewerID,
		"reviewer_name": reviewerName,
		"review_remark": reviewRemark,
		"reviewed_at":   time.Now(),
	}
	if status == "approved" || status == "completed" || status == "rejected" {
		now := time.Now()
		updates["completed_at"] = now
	}
	return r.db.WithContext(ctx).Model(&WithdrawRequest{}).
		Where("request_id = ? OR request_id_raw = ?", requestID, requestID).
		Updates(updates).Error
}

func (r *walletRepository) GetWithdrawRequestByID(ctx context.Context, requestID string) (*WithdrawRequest, error) {
	var record WithdrawRequest
	if err := r.db.WithContext(ctx).Where("request_id = ? OR request_id_raw = ?", requestID, requestID).First(&record).Error; err != nil {
		return nil, err
	}
	return &record, nil
}
