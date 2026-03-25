package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

var (
	ErrInvalidArgument         = errors.New("invalid argument")
	ErrInsufficientBalance     = errors.New("insufficient balance")
	ErrRiskControl             = errors.New("risk control rejected")
	ErrConcurrentBalanceUpdate = errors.New("concurrent balance update")
)

type WalletService struct {
	walletRepo repository.WalletRepository
	paymentSvc *PaymentService
	riskSvc    *RiskControlService
	signSecret string
}

type RechargeRequest struct {
	UserID            string `json:"userId"`
	UserType          string `json:"userType"`
	Amount            int64  `json:"amount"`
	PaymentMethod     string `json:"paymentMethod"`
	PaymentChannel    string `json:"paymentChannel"`
	ThirdPartyOrderID string `json:"thirdPartyOrderId"`
	Description       string `json:"description"`
	IdempotencyKey    string `json:"idempotencyKey"`
}

type WithdrawRequest struct {
	UserID          string `json:"userId"`
	UserType        string `json:"userType"`
	Amount          int64  `json:"amount"`
	WithdrawMethod  string `json:"withdrawMethod"`
	WithdrawAccount string `json:"withdrawAccount"`
	WithdrawName    string `json:"withdrawName"`
	BankName        string `json:"bankName"`
	BankBranch      string `json:"bankBranch"`
	Remark          string `json:"remark"`
	IdempotencyKey  string `json:"idempotencyKey"`
}

type WalletTransactionQuery struct {
	UserID   string
	UserType string
	Type     string
	Status   string
	Page     int
	Limit    int
	StartAt  *time.Time
	EndAt    *time.Time
}

type AdminWalletActor struct {
	AdminID   string
	AdminName string
	AdminIP   string
}

type AdminBalanceOperationRequest struct {
	TargetUserID   string `json:"targetUserId"`
	TargetUserType string `json:"targetUserType"`
	Amount         int64  `json:"amount"`
	Reason         string `json:"reason"`
	Remark         string `json:"remark"`
}

type AdminFreezeRequest struct {
	TargetUserID   string `json:"targetUserId"`
	TargetUserType string `json:"targetUserType"`
	Reason         string `json:"reason"`
	Remark         string `json:"remark"`
}

type AdminOperationListQuery struct {
	TargetUserID   string
	TargetUserType string
	OperationType  string
	AdminID        string
	Page           int
	Limit          int
}

func NewWalletService(walletRepo repository.WalletRepository, paymentSvc *PaymentService, riskSvc *RiskControlService, signSecret string) *WalletService {
	if signSecret == "" {
		signSecret = "wallet-sign-secret-change-in-production"
	}
	return &WalletService{
		walletRepo: walletRepo,
		paymentSvc: paymentSvc,
		riskSvc:    riskSvc,
		signSecret: signSecret,
	}
}

func (s *WalletService) GetBalance(ctx context.Context, userID, userType string) (map[string]interface{}, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("%w: userId is required", ErrInvalidArgument)
	}

	normalizedType, err := normalizeUserType(userType)
	if err != nil {
		return nil, err
	}

	account, err := s.ensureWalletAccount(ctx, userID, normalizedType)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"userId":        account.UserID,
		"userType":      account.UserType,
		"balance":       account.Balance,
		"frozenBalance": account.FrozenBalance,
		"totalBalance":  account.TotalBalance,
		"status":        account.Status,
		"version":       account.Version,
		"updatedAt":     account.UpdatedAt,
	}, nil
}

func (s *WalletService) PayOrder(ctx context.Context, req PayOrderRequest) (map[string]interface{}, error) {
	result, err := s.paymentSvc.PayOrder(ctx, req)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *WalletService) Recharge(ctx context.Context, req RechargeRequest) (map[string]interface{}, error) {
	if strings.TrimSpace(req.UserID) == "" {
		return nil, fmt.Errorf("%w: userId is required", ErrInvalidArgument)
	}
	normalizedType, err := normalizeUserType(req.UserType)
	if err != nil {
		return nil, err
	}
	req.UserType = normalizedType
	standardIdempotencyKey, idempotencyKeyRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketIdempotency, req.IdempotencyKey)
	if err != nil {
		return nil, err
	}
	req.IdempotencyKey = standardIdempotencyKey
	method, channel, err := normalizePaymentMethod(req.PaymentMethod, req.PaymentChannel)
	if err != nil {
		return nil, err
	}
	if method == "ifpay" {
		return nil, fmt.Errorf("%w: recharge paymentMethod does not support ifpay", ErrInvalidArgument)
	}
	req.PaymentMethod = method
	req.PaymentChannel = channel

	if err := s.riskSvc.ValidateAmount(req.Amount, "recharge"); err != nil {
		return nil, err
	}

	if existing, err := s.walletRepo.GetWalletTransactionByIdempotencyKey(ctx, req.IdempotencyKey); err == nil {
		account, acctErr := s.ensureWalletAccount(ctx, req.UserID, req.UserType)
		if acctErr != nil {
			return nil, acctErr
		}
		return map[string]interface{}{
			"duplicated":    true,
			"transactionId": existing.TransactionID,
			"status":        existing.Status,
			"balance":       account.Balance,
			"frozenBalance": account.FrozenBalance,
			"completedAt":   existing.CompletedAt,
		}, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	now := time.Now()
	transactionID, transactionIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, "")
	if err != nil {
		return nil, err
	}
	rechargeOrderID, err := nextUnifiedRefID(ctx, s.walletRepo.DB(), bucketRechargeOrder)
	if err != nil {
		return nil, err
	}
	signature := signWalletTransaction(s.signSecret, transactionID, req.UserID, req.Amount, "recharge", now)

	var balanceAfter int64
	var frozenAfter int64

	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, req.UserID, req.UserType)
		if err != nil {
			return err
		}
		if err := s.riskSvc.CheckAccountStatus(account); err != nil {
			return err
		}

		accountResetForNewDay(account, now)
		if err := s.riskSvc.CheckDailyLimit(account, "recharge", req.Amount); err != nil {
			return err
		}

		balanceBefore := account.Balance
		balanceAfter = balanceBefore + req.Amount
		frozenAfter = account.FrozenBalance

		reqJSON, _ := json.Marshal(req)
		transaction := &repository.WalletTransaction{
			TransactionID:     transactionID,
			TransactionIDRaw:  transactionIDRaw,
			IdempotencyKey:    req.IdempotencyKey,
			IdempotencyKeyRaw: idempotencyKeyRaw,
			UserID:            req.UserID,
			UserType:          req.UserType,
			Type:              "recharge",
			BusinessType:      "wallet_recharge",
			BusinessID:        rechargeOrderID,
			Amount:            req.Amount,
			BalanceBefore:     balanceBefore,
			BalanceAfter:      balanceAfter,
			PaymentMethod:     req.PaymentMethod,
			PaymentChannel:    req.PaymentChannel,
			ThirdPartyOrderID: req.ThirdPartyOrderID,
			Status:            "pending",
			Description:       req.Description,
			Signature:         signature,
			RequestData:       string(reqJSON),
		}
		if err := s.walletRepo.CreateWalletTransactionTx(ctx, tx, transaction); err != nil {
			return err
		}

		rechargeOrder := &repository.RechargeOrder{
			OrderID:           rechargeOrderID,
			TransactionID:     transactionID,
			TransactionIDRaw:  transactionIDRaw,
			UserID:            req.UserID,
			UserType:          req.UserType,
			Amount:            req.Amount,
			ActualAmount:      req.Amount,
			PaymentMethod:     req.PaymentMethod,
			PaymentChannel:    req.PaymentChannel,
			ThirdPartyOrderID: req.ThirdPartyOrderID,
			Status:            "success",
			PaidAt:            &now,
		}
		if err := s.walletRepo.CreateRechargeOrderTx(ctx, tx, rechargeOrder); err != nil {
			return err
		}

		updates := map[string]interface{}{
			"balance":               balanceAfter,
			"total_balance":         balanceAfter + account.FrozenBalance,
			"daily_recharge_amount": account.DailyRechargeAmount + req.Amount,
			"daily_recharge_count":  account.DailyRechargeCount + 1,
			"last_transaction_id":   transactionID,
			"last_transaction_at":   now,
			"last_daily_reset_at":   dayStart(now),
		}
		updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, updates)
		if err != nil {
			return err
		}
		if !updated {
			return fmt.Errorf("%w: recharge update conflict", ErrConcurrentBalanceUpdate)
		}

		respJSON, _ := json.Marshal(map[string]interface{}{"status": "success", "balanceAfter": balanceAfter})
		if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transactionID, "success", string(respJSON), &now); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"transactionId":   transactionID,
		"rechargeOrderId": rechargeOrderID,
		"paymentMethod":   req.PaymentMethod,
		"status":          "success",
		"balance":         balanceAfter,
		"frozenBalance":   frozenAfter,
		"completedAt":     now,
	}, nil
}

func (s *WalletService) Withdraw(ctx context.Context, req WithdrawRequest) (map[string]interface{}, error) {
	if strings.TrimSpace(req.UserID) == "" {
		return nil, fmt.Errorf("%w: userId is required", ErrInvalidArgument)
	}
	normalizedType, err := normalizeUserType(req.UserType)
	if err != nil {
		return nil, err
	}
	req.UserType = normalizedType
	if strings.TrimSpace(req.WithdrawMethod) == "" {
		req.WithdrawMethod = "ifpay"
	}
	if strings.TrimSpace(req.WithdrawAccount) == "" {
		return nil, fmt.Errorf("%w: withdrawAccount is required", ErrInvalidArgument)
	}
	standardIdempotencyKey, idempotencyKeyRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketIdempotency, req.IdempotencyKey)
	if err != nil {
		return nil, err
	}
	req.IdempotencyKey = standardIdempotencyKey
	if err := s.riskSvc.ValidateAmount(req.Amount, "withdraw"); err != nil {
		return nil, err
	}

	if existing, err := s.walletRepo.GetWalletTransactionByIdempotencyKey(ctx, req.IdempotencyKey); err == nil {
		account, acctErr := s.ensureWalletAccount(ctx, req.UserID, req.UserType)
		if acctErr != nil {
			return nil, acctErr
		}
		return map[string]interface{}{
			"duplicated":        true,
			"transactionId":     existing.TransactionID,
			"status":            existing.Status,
			"balance":           account.Balance,
			"frozenBalance":     account.FrozenBalance,
			"withdrawRequestId": existing.BusinessID,
		}, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	now := time.Now()
	transactionID, transactionIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, "")
	if err != nil {
		return nil, err
	}
	withdrawRequestID, err := nextUnifiedRefID(ctx, s.walletRepo.DB(), bucketWithdrawRequest)
	if err != nil {
		return nil, err
	}
	signature := signWalletTransaction(s.signSecret, transactionID, req.UserID, req.Amount, "withdraw", now)

	var balanceAfter int64
	var frozenAfter int64

	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, req.UserID, req.UserType)
		if err != nil {
			return err
		}
		if err := s.riskSvc.CheckAccountStatus(account); err != nil {
			return err
		}

		accountResetForNewDay(account, now)
		if err := s.riskSvc.CheckDailyLimit(account, "withdraw", req.Amount); err != nil {
			return err
		}
		if err := s.riskSvc.ValidateDebit(account, req.Amount); err != nil {
			return err
		}

		balanceBefore := account.Balance
		balanceAfter = balanceBefore - req.Amount
		frozenAfter = account.FrozenBalance + req.Amount

		reqJSON, _ := json.Marshal(req)
		transaction := &repository.WalletTransaction{
			TransactionID:     transactionID,
			TransactionIDRaw:  transactionIDRaw,
			IdempotencyKey:    req.IdempotencyKey,
			IdempotencyKeyRaw: idempotencyKeyRaw,
			UserID:            req.UserID,
			UserType:          req.UserType,
			Type:              "withdraw",
			BusinessType:      "withdraw_request",
			BusinessID:        withdrawRequestID,
			Amount:            req.Amount,
			BalanceBefore:     balanceBefore,
			BalanceAfter:      balanceAfter,
			PaymentMethod:     "ifpay",
			PaymentChannel:    req.WithdrawMethod,
			Status:            "pending",
			Description:       req.Remark,
			Signature:         signature,
			RequestData:       string(reqJSON),
		}
		if err := s.walletRepo.CreateWalletTransactionTx(ctx, tx, transaction); err != nil {
			return err
		}

		withdrawRequest := &repository.WithdrawRequest{
			RequestID:        withdrawRequestID,
			RequestIDRaw:     "",
			TransactionID:    transactionID,
			TransactionIDRaw: transactionIDRaw,
			UserID:           req.UserID,
			UserType:         req.UserType,
			Amount:           req.Amount,
			Fee:              0,
			ActualAmount:     req.Amount,
			WithdrawMethod:   req.WithdrawMethod,
			WithdrawAccount:  req.WithdrawAccount,
			WithdrawName:     req.WithdrawName,
			BankName:         req.BankName,
			BankBranch:       req.BankBranch,
			Status:           "pending",
		}
		if err := s.walletRepo.CreateWithdrawRequestTx(ctx, tx, withdrawRequest); err != nil {
			return err
		}

		updates := map[string]interface{}{
			"balance":               balanceAfter,
			"frozen_balance":        frozenAfter,
			"total_balance":         balanceAfter + frozenAfter,
			"daily_withdraw_amount": account.DailyWithdrawAmount + req.Amount,
			"daily_withdraw_count":  account.DailyWithdrawCount + 1,
			"last_transaction_id":   transactionID,
			"last_transaction_at":   now,
			"last_daily_reset_at":   dayStart(now),
		}
		updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, updates)
		if err != nil {
			return err
		}
		if !updated {
			return fmt.Errorf("%w: withdraw update conflict", ErrConcurrentBalanceUpdate)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"transactionId":     transactionID,
		"withdrawRequestId": withdrawRequestID,
		"status":            "pending",
		"balance":           balanceAfter,
		"frozenBalance":     frozenAfter,
		"requestedAt":       now,
	}, nil
}

func (s *WalletService) ListTransactions(ctx context.Context, query WalletTransactionQuery) (map[string]interface{}, error) {
	if strings.TrimSpace(query.UserID) == "" {
		return nil, fmt.Errorf("%w: userId is required", ErrInvalidArgument)
	}
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.Limit <= 0 {
		query.Limit = 20
	}
	if query.Limit > 100 {
		query.Limit = 100
	}
	if query.UserType != "" {
		normalizedType, err := normalizeUserType(query.UserType)
		if err != nil {
			return nil, err
		}
		query.UserType = normalizedType
	}
	if query.StartAt != nil && query.EndAt != nil && query.StartAt.After(*query.EndAt) {
		return nil, fmt.Errorf("%w: startTime cannot be greater than endTime", ErrInvalidArgument)
	}

	offset := (query.Page - 1) * query.Limit
	transactions, total, err := s.walletRepo.ListWalletTransactions(ctx, repository.WalletTransactionListParams{
		UserID:   query.UserID,
		UserType: query.UserType,
		Type:     query.Type,
		Status:   query.Status,
		Limit:    query.Limit,
		Offset:   offset,
		StartAt:  query.StartAt,
		EndAt:    query.EndAt,
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"items": transactions,
		"pagination": map[string]interface{}{
			"page":  query.Page,
			"limit": query.Limit,
			"total": total,
		},
	}, nil
}

func (s *WalletService) AdminAddBalance(ctx context.Context, req AdminBalanceOperationRequest, actor AdminWalletActor) (map[string]interface{}, error) {
	return s.adminBalanceOperation(ctx, req, actor, "add_balance")
}

func (s *WalletService) AdminDeductBalance(ctx context.Context, req AdminBalanceOperationRequest, actor AdminWalletActor) (map[string]interface{}, error) {
	return s.adminBalanceOperation(ctx, req, actor, "deduct_balance")
}

func (s *WalletService) adminBalanceOperation(ctx context.Context, req AdminBalanceOperationRequest, actor AdminWalletActor, operationType string) (map[string]interface{}, error) {
	if strings.TrimSpace(req.TargetUserID) == "" {
		return nil, fmt.Errorf("%w: targetUserId is required", ErrInvalidArgument)
	}
	normalizedType, err := normalizeUserType(req.TargetUserType)
	if err != nil {
		return nil, err
	}
	req.TargetUserType = normalizedType
	resolvedTargetUserID, err := s.resolveAdminWalletTargetUserID(ctx, req.TargetUserID, req.TargetUserType)
	if err != nil {
		return nil, err
	}
	req.TargetUserID = resolvedTargetUserID
	if strings.TrimSpace(req.Reason) == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalidArgument)
	}
	if req.Amount <= 0 {
		return nil, fmt.Errorf("%w: amount must be greater than 0", ErrInvalidArgument)
	}

	now := time.Now()
	transactionID, transactionIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, "")
	if err != nil {
		return nil, err
	}
	operationID, operationIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketAdminOperation, "")
	if err != nil {
		return nil, err
	}
	transactionType := "admin_add_balance"
	if operationType == "deduct_balance" {
		transactionType = "admin_deduct_balance"
	}
	signature := signWalletTransaction(s.signSecret, transactionID, req.TargetUserID, req.Amount, transactionType, now)

	var balanceAfter int64
	var frozenAfter int64

	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, req.TargetUserID, req.TargetUserType)
		if err != nil {
			return err
		}
		if err := s.riskSvc.CheckAccountStatus(account); err != nil {
			return err
		}

		balanceBefore := account.Balance
		delta := req.Amount
		if operationType == "deduct_balance" {
			if err := s.riskSvc.ValidateDebit(account, req.Amount); err != nil {
				return err
			}
			delta = -req.Amount
		}
		balanceAfter = balanceBefore + delta
		frozenAfter = account.FrozenBalance

		transaction := &repository.WalletTransaction{
			TransactionID:     transactionID,
			TransactionIDRaw:  transactionIDRaw,
			IdempotencyKey:    operationID,
			IdempotencyKeyRaw: operationIDRaw,
			UserID:            req.TargetUserID,
			UserType:          req.TargetUserType,
			Type:              transactionType,
			BusinessType:      "admin_wallet_operation",
			BusinessID:        operationID,
			Amount:            req.Amount,
			BalanceBefore:     balanceBefore,
			BalanceAfter:      balanceAfter,
			PaymentMethod:     "admin",
			Status:            "pending",
			Description:       req.Reason,
			Remark:            req.Remark,
			OperatorID:        actor.AdminID,
			OperatorName:      actor.AdminName,
			OperatorIP:        actor.AdminIP,
			Signature:         signature,
		}
		if err := s.walletRepo.CreateWalletTransactionTx(ctx, tx, transaction); err != nil {
			return err
		}

		updates := map[string]interface{}{
			"balance":             balanceAfter,
			"total_balance":       balanceAfter + frozenAfter,
			"last_transaction_id": transactionID,
			"last_transaction_at": now,
		}
		updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, updates)
		if err != nil {
			return err
		}
		if !updated {
			return fmt.Errorf("%w: admin operation update conflict", ErrConcurrentBalanceUpdate)
		}

		operation := &repository.AdminWalletOperation{
			OperationID:      operationID,
			OperationIDRaw:   operationIDRaw,
			TransactionID:    transactionID,
			TransactionIDRaw: transactionIDRaw,
			TargetUserID:     req.TargetUserID,
			TargetUserType:   req.TargetUserType,
			OperationType:    operationType,
			Amount:           req.Amount,
			AdminID:          actor.AdminID,
			AdminName:        actor.AdminName,
			AdminIP:          actor.AdminIP,
			Reason:           req.Reason,
			Remark:           req.Remark,
		}
		if err := s.walletRepo.CreateAdminWalletOperationTx(ctx, tx, operation); err != nil {
			return err
		}

		respJSON, _ := json.Marshal(map[string]interface{}{"status": "success", "balanceAfter": balanceAfter})
		if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transactionID, "success", string(respJSON), &now); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"operationId":    operationID,
		"transactionId":  transactionID,
		"targetUserId":   req.TargetUserID,
		"targetUserType": req.TargetUserType,
		"operationType":  operationType,
		"status":         "success",
		"balance":        balanceAfter,
		"frozenBalance":  frozenAfter,
		"operatedAt":     now,
	}, nil
}

func (s *WalletService) resolveAdminWalletTargetUserID(ctx context.Context, targetUserID, targetUserType string) (string, error) {
	rawID := strings.TrimSpace(targetUserID)
	if rawID == "" {
		return "", fmt.Errorf("%w: targetUserId is required", ErrInvalidArgument)
	}
	db := s.walletRepo.DB().WithContext(ctx)

	switch targetUserType {
	case "customer":
		var user repository.User
		if err := db.Where("phone = ?", rawID).First(&user).Error; err == nil {
			return strings.TrimSpace(user.Phone), nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", err
		}
		if numericID, parseErr := strconv.Atoi(rawID); parseErr == nil {
			if err := db.Where("id = ? OR role_id = ?", numericID, numericID).First(&user).Error; err == nil {
				if strings.TrimSpace(user.Phone) == "" {
					return "", fmt.Errorf("%w: target customer phone is empty", ErrInvalidArgument)
				}
				return strings.TrimSpace(user.Phone), nil
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return "", err
			}
		}
		// Backward compatibility: allow legacy customer wallet IDs that already exist in wallet_accounts.
		var account repository.WalletAccount
		if err := db.Where("user_id = ? AND user_type = ?", rawID, "customer").First(&account).Error; err == nil {
			return rawID, nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", err
		}
		return "", fmt.Errorf("%w: target customer not found, please use customer phone or users.id/role_id", ErrInvalidArgument)
	case "rider":
		var rider repository.Rider
		if err := db.Where("phone = ?", rawID).First(&rider).Error; err == nil {
			return strconv.FormatUint(uint64(rider.ID), 10), nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", err
		}
		if numericID, parseErr := strconv.Atoi(rawID); parseErr == nil {
			if err := db.Where("id = ? OR role_id = ?", numericID, numericID).First(&rider).Error; err == nil {
				return strconv.FormatUint(uint64(rider.ID), 10), nil
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return "", err
			}
		}
		return "", fmt.Errorf("%w: target rider not found, please use rider phone or riders.id/role_id", ErrInvalidArgument)
	case "merchant":
		var merchant repository.Merchant
		if err := db.Where("phone = ?", rawID).First(&merchant).Error; err == nil {
			return strconv.FormatUint(uint64(merchant.ID), 10), nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", err
		}
		if numericID, parseErr := strconv.Atoi(rawID); parseErr == nil {
			if err := db.Where("id = ? OR role_id = ?", numericID, numericID).First(&merchant).Error; err == nil {
				return strconv.FormatUint(uint64(merchant.ID), 10), nil
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return "", err
			}
		}
		return "", fmt.Errorf("%w: target merchant not found, please use merchant phone or merchants.id/role_id", ErrInvalidArgument)
	default:
		return "", fmt.Errorf("%w: unsupported userType", ErrInvalidArgument)
	}
}

func (s *WalletService) FreezeAccount(ctx context.Context, req AdminFreezeRequest, actor AdminWalletActor) (map[string]interface{}, error) {
	return s.changeAccountStatus(ctx, req, actor, "frozen")
}

func (s *WalletService) UnfreezeAccount(ctx context.Context, req AdminFreezeRequest, actor AdminWalletActor) (map[string]interface{}, error) {
	return s.changeAccountStatus(ctx, req, actor, "active")
}

func (s *WalletService) changeAccountStatus(ctx context.Context, req AdminFreezeRequest, actor AdminWalletActor, targetStatus string) (map[string]interface{}, error) {
	if strings.TrimSpace(req.TargetUserID) == "" {
		return nil, fmt.Errorf("%w: targetUserId is required", ErrInvalidArgument)
	}
	normalizedType, err := normalizeUserType(req.TargetUserType)
	if err != nil {
		return nil, err
	}
	req.TargetUserType = normalizedType
	if targetStatus == "frozen" && strings.TrimSpace(req.Reason) == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalidArgument)
	}

	now := time.Now()
	operationType := "freeze"
	if targetStatus == "active" {
		operationType = "unfreeze"
	}
	operationID, operationIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketAdminOperation, "")
	if err != nil {
		return nil, err
	}

	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, req.TargetUserID, req.TargetUserType)
		if err != nil {
			return err
		}

		updates := map[string]interface{}{
			"status": targetStatus,
		}
		if targetStatus == "frozen" {
			updates["frozen_reason"] = req.Reason
		} else {
			updates["frozen_reason"] = ""
		}
		updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, updates)
		if err != nil {
			return err
		}
		if !updated {
			return fmt.Errorf("%w: freeze status update conflict", ErrConcurrentBalanceUpdate)
		}

		operation := &repository.AdminWalletOperation{
			OperationID:    operationID,
			OperationIDRaw: operationIDRaw,
			TargetUserID:   req.TargetUserID,
			TargetUserType: req.TargetUserType,
			OperationType:  operationType,
			Amount:         0,
			AdminID:        actor.AdminID,
			AdminName:      actor.AdminName,
			AdminIP:        actor.AdminIP,
			Reason:         req.Reason,
			Remark:         req.Remark,
		}
		return s.walletRepo.CreateAdminWalletOperationTx(ctx, tx, operation)
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"operationId":    operationID,
		"targetUserId":   req.TargetUserID,
		"targetUserType": req.TargetUserType,
		"status":         targetStatus,
		"updatedAt":      now,
	}, nil
}

func (s *WalletService) ListAdminOperations(ctx context.Context, query AdminOperationListQuery) (map[string]interface{}, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.Limit <= 0 {
		query.Limit = 20
	}
	if query.Limit > 100 {
		query.Limit = 100
	}
	if query.TargetUserType != "" {
		normalizedType, err := normalizeUserType(query.TargetUserType)
		if err != nil {
			return nil, err
		}
		query.TargetUserType = normalizedType
	}
	offset := (query.Page - 1) * query.Limit

	operations, total, err := s.walletRepo.ListAdminWalletOperations(ctx, repository.AdminWalletOperationListParams{
		TargetUserID:   query.TargetUserID,
		TargetUserType: query.TargetUserType,
		OperationType:  query.OperationType,
		AdminID:        query.AdminID,
		Limit:          query.Limit,
		Offset:         offset,
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"items": operations,
		"pagination": map[string]interface{}{
			"page":  query.Page,
			"limit": query.Limit,
			"total": total,
		},
	}, nil
}

func (s *WalletService) ensureWalletAccount(ctx context.Context, userID, userType string) (*repository.WalletAccount, error) {
	account, err := s.walletRepo.GetWalletAccount(ctx, userID, userType)
	if err == nil {
		return account, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var created *repository.WalletAccount
	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		acc, txErr := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, userID, userType)
		if txErr != nil {
			return txErr
		}
		created = acc
		return nil
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func normalizeUserType(userType string) (string, error) {
	if strings.TrimSpace(userType) == "" {
		return "customer", nil
	}
	value := strings.ToLower(strings.TrimSpace(userType))
	switch value {
	case "customer", "user":
		return "customer", nil
	case "rider", "merchant":
		return value, nil
	default:
		return "", fmt.Errorf("%w: unsupported userType", ErrInvalidArgument)
	}
}

func normalizePaymentMethod(method, channel string) (string, string, error) {
	m := strings.ToLower(strings.TrimSpace(method))
	c := strings.ToLower(strings.TrimSpace(channel))

	switch m {
	case "", "ifpay", "if-pay", "if_pay":
		return "ifpay", walletFirstNonEmpty(c, "ifpay"), nil
	case "wechat", "wxpay", "wechatpay":
		return "wechat", walletFirstNonEmpty(c, "wxpay"), nil
	case "alipay", "ali":
		return "alipay", walletFirstNonEmpty(c, "alipay"), nil
	default:
		return "", "", fmt.Errorf("%w: unsupported paymentMethod", ErrInvalidArgument)
	}
}

func walletFirstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func signWalletTransaction(secret, transactionID, userID string, amount int64, txType string, timestamp time.Time) string {
	payload := fmt.Sprintf("%s|%s|%d|%s|%d", transactionID, userID, amount, txType, timestamp.Unix())
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	return hex.EncodeToString(h.Sum(nil))
}

func dayStart(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func accountResetForNewDay(account *repository.WalletAccount, now time.Time) {
	if account.LastDailyResetAt == nil {
		account.DailyRechargeAmount = 0
		account.DailyWithdrawAmount = 0
		account.DailyPaymentAmount = 0
		account.DailyRechargeCount = 0
		account.DailyWithdrawCount = 0
		return
	}
	if !isSameDay(*account.LastDailyResetAt, now) {
		account.DailyRechargeAmount = 0
		account.DailyWithdrawAmount = 0
		account.DailyPaymentAmount = 0
		account.DailyRechargeCount = 0
		account.DailyWithdrawCount = 0
	}
}

func isSameDay(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	return ay == by && am == bm && ad == bd
}

func (s *WalletService) ListWithdrawRecords(ctx context.Context, userID, userType, status string, page, limit int) (map[string]interface{}, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	offset := (page - 1) * limit
	records, total, err := s.walletRepo.ListWithdrawRequests(ctx, userID, userType, status, limit, offset)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"total":   total,
		"page":    page,
		"limit":   limit,
		"records": records,
	}, nil
}

type WithdrawReviewRequest struct {
	RequestID    string `json:"requestId"`
	Action       string `json:"action"` // approve, reject
	ReviewerID   string `json:"reviewerId"`
	ReviewerName string `json:"reviewerName"`
	Remark       string `json:"remark"`
}

func (s *WalletService) ReviewWithdraw(ctx context.Context, req WithdrawReviewRequest, actor AdminWalletActor) (map[string]interface{}, error) {
	if strings.TrimSpace(req.RequestID) == "" {
		return nil, fmt.Errorf("%w: requestId is required", ErrInvalidArgument)
	}
	if req.Action != "approve" && req.Action != "reject" {
		return nil, fmt.Errorf("%w: action must be approve or reject", ErrInvalidArgument)
	}

	record, err := s.walletRepo.GetWithdrawRequestByID(ctx, req.RequestID)
	if err != nil {
		return nil, fmt.Errorf("withdraw request not found: %w", err)
	}
	if record.Status != "pending" {
		return nil, fmt.Errorf("%w: withdraw request is not pending", ErrInvalidArgument)
	}

	reviewerID := req.ReviewerID
	if reviewerID == "" {
		reviewerID = actor.AdminID
	}
	reviewerName := req.ReviewerName
	if reviewerName == "" {
		reviewerName = actor.AdminName
	}

	newStatus := "rejected"
	if req.Action == "approve" {
		newStatus = "approved"
	}

	if err := s.walletRepo.UpdateWithdrawRequestStatus(ctx, req.RequestID, newStatus, reviewerID, reviewerName, req.Remark); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":   true,
		"requestId": req.RequestID,
		"status":    newStatus,
	}, nil
}
