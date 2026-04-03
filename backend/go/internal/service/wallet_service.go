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
	"sync"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrInvalidArgument         = errors.New("invalid argument")
	ErrInsufficientBalance     = errors.New("insufficient balance")
	ErrRiskControl             = errors.New("risk control rejected")
	ErrConcurrentBalanceUpdate = errors.New("concurrent balance update")
)

type WalletService struct {
	walletRepo                       repository.WalletRepository
	paymentSvc                       *PaymentService
	riskSvc                          *RiskControlService
	signSecret                       string
	notifier                         *RealtimeNotificationService
	withdrawReconcileEnabled         bool
	withdrawReconcileInterval        time.Duration
	withdrawReconcileBatchSize       int
	withdrawReconcileMu              sync.RWMutex
	withdrawReconcileRunning         bool
	withdrawReconcileLastCycleAt     time.Time
	withdrawReconcileLastSuccessAt   time.Time
	withdrawReconcileLastCycleStatus string
	withdrawReconcileLastProcessed   int
	withdrawReconcileFailureCount    int
	withdrawReconcileLastError       string
}

func (s *WalletService) SetRealtimeNotifier(notifier *RealtimeNotificationService) {
	s.notifier = notifier
}

type RechargeRequest struct {
	UserID            string `json:"userId"`
	UserType          string `json:"userType"`
	Platform          string `json:"platform"`
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
	Platform        string `json:"platform"`
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
	TransactionID  string
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
		walletRepo:                       walletRepo,
		paymentSvc:                       paymentSvc,
		riskSvc:                          riskSvc,
		signSecret:                       signSecret,
		withdrawReconcileEnabled:         true,
		withdrawReconcileInterval:        time.Minute,
		withdrawReconcileBatchSize:       50,
		withdrawReconcileLastCycleStatus: "not_started",
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
	req.Platform = normalizeClientPlatform(req.Platform)
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
	intent, err := s.paymentSvc.createThirdPartyIntent(ctx, req.PaymentMethod, "wallet_recharge", transactionID, req.Amount, req.Description, req.UserID, req.UserType, req.Platform)
	if err != nil {
		return nil, err
	}

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

		balanceBefore := account.Balance
		balanceAfter = balanceBefore
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
			ThirdPartyOrderID: intent.ThirdPartyOrderID,
			Status:            intent.Status,
			Description:       req.Description,
			Signature:         signature,
			RequestData:       string(reqJSON),
		}
		if payload, err := json.Marshal(intent.ResponseData); err == nil {
			transaction.ResponseData = string(payload)
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
			ThirdPartyOrderID: intent.ThirdPartyOrderID,
			Status:            "pending",
		}
		if err := s.walletRepo.CreateRechargeOrderTx(ctx, tx, rechargeOrder); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"transactionId":     transactionID,
		"rechargeOrderId":   rechargeOrderID,
		"paymentMethod":     req.PaymentMethod,
		"status":            intent.Status,
		"thirdPartyOrderId": intent.ThirdPartyOrderID,
		"paymentPayload":    intent.ClientPayload,
		"integrationTarget": intent.IntegrationTarget,
		"gateway":           intent.Gateway,
		"balance":           balanceAfter,
		"frozenBalance":     frozenAfter,
		"requestedAt":       now,
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
		return nil, fmt.Errorf("%w: withdrawMethod is required", ErrInvalidArgument)
	}
	req.WithdrawMethod = normalizeChannel(req.WithdrawMethod)
	req.Platform = normalizeClientPlatform(req.Platform)
	if strings.TrimSpace(req.WithdrawAccount) == "" {
		return nil, fmt.Errorf("%w: withdrawAccount is required", ErrInvalidArgument)
	}
	feePreview, err := s.PreviewWithdrawFee(ctx, WithdrawFeePreviewRequest{
		UserID:         req.UserID,
		UserType:       req.UserType,
		Amount:         req.Amount,
		WithdrawMethod: req.WithdrawMethod,
		Platform:       req.Platform,
	})
	if err != nil {
		return nil, err
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
			"fee":               feePreview["fee"],
			"actualAmount":      feePreview["actualAmount"],
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
			PaymentMethod:     req.WithdrawMethod,
			PaymentChannel:    req.WithdrawMethod,
			Status:            "pending_review",
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
			Fee:              toInt64(feePreview["fee"]),
			ActualAmount:     toInt64(feePreview["actualAmount"]),
			WithdrawMethod:   req.WithdrawMethod,
			WithdrawAccount:  req.WithdrawAccount,
			WithdrawName:     req.WithdrawName,
			BankName:         req.BankName,
			BankBranch:       req.BankBranch,
			Status:           "pending_review",
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
		"fee":               feePreview["fee"],
		"actualAmount":      feePreview["actualAmount"],
		"arrivalText":       feePreview["arrivalText"],
		"status":            "pending_review",
		"balance":           balanceAfter,
		"frozenBalance":     frozenAfter,
		"requestedAt":       now,
	}, nil
}

func (s *WalletService) GetTransactionStatus(ctx context.Context, userID, userType, transactionID string) (map[string]interface{}, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("%w: userId is required", ErrInvalidArgument)
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, fmt.Errorf("%w: transactionId is required", ErrInvalidArgument)
	}

	transaction, err := s.walletRepo.GetWalletTransactionByID(ctx, transactionID)
	if err != nil {
		return nil, err
	}
	if err := ensureWalletRecordOwnership(userID, userType, transaction.UserID, transaction.UserType); err != nil {
		return nil, err
	}

	result := buildWalletTransactionStatusMap(transaction)
	switch transaction.Type {
	case "recharge", "rider_deposit":
		rechargeOrder, err := s.getRechargeOrderByIdentifiers(ctx, transaction.BusinessID, transaction.TransactionID)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if rechargeOrder != nil {
			result["status"] = deriveWalletFlowStatus(transaction.Status, rechargeOrder.Status)
			result["rechargeOrderId"] = rechargeOrder.OrderID
			result["recharge"] = buildRechargeStatusMap(rechargeOrder, transaction)
		}
	case "withdraw":
		withdrawRequest, err := s.getWithdrawRequestByIdentifiers(ctx, transaction.BusinessID, transaction.TransactionID)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if withdrawRequest != nil {
			result["status"] = deriveWalletFlowStatus(transaction.Status, withdrawRequest.Status)
			result["withdrawRequestId"] = withdrawRequest.RequestID
			result["withdraw"] = buildWithdrawStatusMap(withdrawRequest, transaction, s.getWithdrawArrivalText(ctx, withdrawRequest.WithdrawMethod))
		}
	}

	return result, nil
}

func (s *WalletService) GetRechargeStatus(ctx context.Context, userID, userType, rechargeOrderID, transactionID string) (map[string]interface{}, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("%w: userId is required", ErrInvalidArgument)
	}
	if strings.TrimSpace(rechargeOrderID) == "" && strings.TrimSpace(transactionID) == "" {
		return nil, fmt.Errorf("%w: rechargeOrderId or transactionId is required", ErrInvalidArgument)
	}

	rechargeOrder, err := s.getRechargeOrderByIdentifiers(ctx, rechargeOrderID, transactionID)
	if err != nil {
		return nil, err
	}
	if err := ensureWalletRecordOwnership(userID, userType, rechargeOrder.UserID, rechargeOrder.UserType); err != nil {
		return nil, err
	}

	var transaction *repository.WalletTransaction
	if strings.TrimSpace(rechargeOrder.TransactionID) != "" {
		transaction, err = s.walletRepo.GetWalletTransactionByID(ctx, rechargeOrder.TransactionID)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	status := strings.TrimSpace(rechargeOrder.Status)
	if transaction != nil {
		status = deriveWalletFlowStatus(transaction.Status, rechargeOrder.Status)
	}

	return map[string]interface{}{
		"transactionId":     rechargeOrder.TransactionID,
		"rechargeOrderId":   rechargeOrder.OrderID,
		"status":            status,
		"transactionStatus": walletTransactionStatusValue(transaction),
		"recharge":          buildRechargeStatusMap(rechargeOrder, transaction),
	}, nil
}

func (s *WalletService) GetWithdrawStatus(ctx context.Context, userID, userType, requestID, transactionID string) (map[string]interface{}, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("%w: userId is required", ErrInvalidArgument)
	}
	if strings.TrimSpace(requestID) == "" && strings.TrimSpace(transactionID) == "" {
		return nil, fmt.Errorf("%w: requestId or transactionId is required", ErrInvalidArgument)
	}

	record, err := s.getWithdrawRequestByIdentifiers(ctx, requestID, transactionID)
	if err != nil {
		return nil, err
	}
	if err := ensureWalletRecordOwnership(userID, userType, record.UserID, record.UserType); err != nil {
		return nil, err
	}

	var transaction *repository.WalletTransaction
	if strings.TrimSpace(record.TransactionID) != "" {
		transaction, err = s.walletRepo.GetWalletTransactionByID(ctx, record.TransactionID)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	if transaction != nil && canRefreshWithdrawGatewayStatus(record, transaction) {
		if refreshErr := s.refreshWithdrawGatewayStatus(ctx, record, transaction); refreshErr == nil {
			if latestRecord, latestErr := s.getWithdrawRequestByIdentifiers(ctx, requestID, transactionID); latestErr == nil {
				record = latestRecord
			}
			if latestTx, latestErr := s.walletRepo.GetWalletTransactionByID(ctx, record.TransactionID); latestErr == nil {
				transaction = latestTx
			}
		}
	}

	status := strings.TrimSpace(record.Status)
	if transaction != nil {
		status = deriveWalletFlowStatus(transaction.Status, record.Status)
	}

	return map[string]interface{}{
		"transactionId":     record.TransactionID,
		"withdrawRequestId": record.RequestID,
		"status":            status,
		"transactionStatus": walletTransactionStatusValue(transaction),
		"withdraw":          buildWithdrawStatusMap(record, transaction, s.getWithdrawArrivalText(ctx, record.WithdrawMethod)),
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
		TransactionID:  query.TransactionID,
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

func withdrawAdminOperationType(action string) string {
	switch strings.TrimSpace(action) {
	case "approve":
		return "withdraw_approve"
	case "reject":
		return "withdraw_reject"
	case "execute":
		return "withdraw_execute"
	case "mark_processing":
		return "withdraw_mark_processing"
	case "complete":
		return "withdraw_complete"
	case "fail":
		return "withdraw_fail"
	case "sync_gateway_status":
		return "withdraw_sync_gateway_status"
	case "retry_payout":
		return "withdraw_retry_payout"
	case "supplement_success":
		return "withdraw_supplement_success"
	case "supplement_fail":
		return "withdraw_supplement_fail"
	default:
		return "withdraw_operation"
	}
}

func withdrawAdminOperationReason(action string) string {
	switch strings.TrimSpace(action) {
	case "approve":
		return "后台审核通过提现申请"
	case "reject":
		return "后台驳回提现申请"
	case "execute":
		return "后台发起提现打款"
	case "mark_processing":
		return "后台标记提现转账中"
	case "complete":
		return "后台确认提现打款成功"
	case "fail":
		return "后台标记提现打款失败"
	case "sync_gateway_status":
		return "后台同步提现网关状态"
	case "retry_payout":
		return "后台重试提现打款"
	case "supplement_success":
		return "后台补记提现成功"
	case "supplement_fail":
		return "后台补记提现失败"
	default:
		return "后台处理提现单"
	}
}

func (s *WalletService) createWithdrawAdminOperationTx(
	ctx context.Context,
	tx *gorm.DB,
	record *repository.WithdrawRequest,
	transaction *repository.WalletTransaction,
	action string,
	actor AdminWalletActor,
	reason string,
	remark string,
) error {
	if record == nil {
		return fmt.Errorf("%w: withdraw request is required", ErrInvalidArgument)
	}

	operationID, operationIDRaw, err := normalizeUnifiedRefID(ctx, tx, bucketAdminOperation, "")
	if err != nil {
		return err
	}

	transactionID := ""
	transactionIDRaw := ""
	if transaction != nil {
		transactionID = transaction.TransactionID
		transactionIDRaw = transaction.TransactionIDRaw
	}
	if transactionID == "" {
		transactionID = strings.TrimSpace(record.TransactionID)
		transactionIDRaw = strings.TrimSpace(record.TransactionIDRaw)
	}

	operation := &repository.AdminWalletOperation{
		OperationID:      operationID,
		OperationIDRaw:   operationIDRaw,
		TransactionID:    transactionID,
		TransactionIDRaw: transactionIDRaw,
		TargetUserID:     strings.TrimSpace(record.UserID),
		TargetUserType:   strings.TrimSpace(record.UserType),
		OperationType:    withdrawAdminOperationType(action),
		Amount:           record.Amount,
		AdminID:          strings.TrimSpace(actor.AdminID),
		AdminName:        strings.TrimSpace(actor.AdminName),
		AdminIP:          strings.TrimSpace(actor.AdminIP),
		Reason:           firstTrimmed(strings.TrimSpace(reason), withdrawAdminOperationReason(action)),
		Remark:           strings.TrimSpace(remark),
	}
	return s.walletRepo.CreateAdminWalletOperationTx(ctx, tx, operation)
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

func (s *WalletService) getRechargeOrderByIdentifiers(ctx context.Context, rechargeOrderID, transactionID string) (*repository.RechargeOrder, error) {
	db := s.walletRepo.DB().WithContext(ctx).Model(&repository.RechargeOrder{})
	var order repository.RechargeOrder

	switch {
	case strings.TrimSpace(rechargeOrderID) != "":
		if err := db.Where("order_id = ?", strings.TrimSpace(rechargeOrderID)).First(&order).Error; err != nil {
			return nil, err
		}
	case strings.TrimSpace(transactionID) != "":
		if err := db.Where("transaction_id = ? OR transaction_id_raw = ?", strings.TrimSpace(transactionID), strings.TrimSpace(transactionID)).First(&order).Error; err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("%w: rechargeOrderId or transactionId is required", ErrInvalidArgument)
	}

	return &order, nil
}

func (s *WalletService) getWithdrawRequestByIdentifiers(ctx context.Context, requestID, transactionID string) (*repository.WithdrawRequest, error) {
	switch {
	case strings.TrimSpace(requestID) != "":
		return s.walletRepo.GetWithdrawRequestByID(ctx, requestID)
	case strings.TrimSpace(transactionID) != "":
		var record repository.WithdrawRequest
		if err := s.walletRepo.DB().WithContext(ctx).
			Where("transaction_id = ? OR transaction_id_raw = ?", strings.TrimSpace(transactionID), strings.TrimSpace(transactionID)).
			First(&record).Error; err != nil {
			return nil, err
		}
		return &record, nil
	default:
		return nil, fmt.Errorf("%w: requestId or transactionId is required", ErrInvalidArgument)
	}
}

func (s *WalletService) findWithdrawTransactionForRecord(ctx context.Context, record *repository.WithdrawRequest) (*repository.WalletTransaction, error) {
	if record == nil {
		return nil, nil
	}

	findOne := func(apply func(query *gorm.DB) *gorm.DB) (*repository.WalletTransaction, error) {
		var transaction repository.WalletTransaction
		query := s.walletRepo.DB().WithContext(ctx).
			Model(&repository.WalletTransaction{}).
			Where("type IN ?", []string{"withdraw", "rider_deposit_withdraw"}).
			Where("user_id = ? AND user_type = ?", strings.TrimSpace(record.UserID), strings.TrimSpace(record.UserType))
		if apply != nil {
			query = apply(query)
		}
		if err := query.Order("id DESC").First(&transaction).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil
			}
			return nil, err
		}
		return &transaction, nil
	}

	if transactionID := firstTrimmed(record.TransactionID, record.TransactionIDRaw); transactionID != "" {
		transaction, err := findOne(func(query *gorm.DB) *gorm.DB {
			return query.Where("transaction_id = ? OR transaction_id_raw = ?", transactionID, transactionID)
		})
		if err != nil {
			return nil, err
		}
		if transaction != nil {
			return transaction, nil
		}
	}

	if thirdPartyOrderID := strings.TrimSpace(record.ThirdPartyOrderID); thirdPartyOrderID != "" {
		transaction, err := findOne(func(query *gorm.DB) *gorm.DB {
			return query.Where("third_party_order_id = ?", thirdPartyOrderID)
		})
		if err != nil {
			return nil, err
		}
		if transaction != nil {
			return transaction, nil
		}
	}

	if businessID := firstTrimmed(record.RequestID, record.RequestIDRaw); businessID != "" {
		return findOne(func(query *gorm.DB) *gorm.DB {
			return query.Where("business_id = ?", businessID)
		})
	}

	return nil, nil
}

func (s *WalletService) getWithdrawArrivalText(ctx context.Context, withdrawMethod string) string {
	if normalizeChannel(withdrawMethod) == "bank_card" {
		cfg, err := s.loadBankCardConfig(ctx)
		if err == nil {
			return firstTrimmed(cfg.ArrivalText, "24小时-48小时")
		}
		return "24小时-48小时"
	}
	return "预计1-2小时到账"
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

func ensureWalletRecordOwnership(requestUserID, requestUserType, recordUserID, recordUserType string) error {
	if strings.TrimSpace(requestUserID) == "" {
		return fmt.Errorf("%w: userId is required", ErrInvalidArgument)
	}
	if strings.TrimSpace(requestUserID) != strings.TrimSpace(recordUserID) {
		return fmt.Errorf("%w: wallet record does not belong to current user", ErrInvalidArgument)
	}
	if strings.TrimSpace(requestUserType) == "" {
		return nil
	}
	normalizedType, err := normalizeUserType(requestUserType)
	if err != nil {
		return err
	}
	if normalizedType != strings.TrimSpace(recordUserType) {
		return fmt.Errorf("%w: wallet record userType mismatch", ErrInvalidArgument)
	}
	return nil
}

func buildWalletTransactionStatusMap(transaction *repository.WalletTransaction) map[string]interface{} {
	if transaction == nil {
		return map[string]interface{}{}
	}
	return map[string]interface{}{
		"transactionId":           transaction.TransactionID,
		"type":                    transaction.Type,
		"businessType":            transaction.BusinessType,
		"businessId":              transaction.BusinessID,
		"userId":                  transaction.UserID,
		"userType":                transaction.UserType,
		"status":                  strings.TrimSpace(transaction.Status),
		"amount":                  transaction.Amount,
		"paymentMethod":           transaction.PaymentMethod,
		"paymentChannel":          transaction.PaymentChannel,
		"thirdPartyOrderId":       transaction.ThirdPartyOrderID,
		"thirdPartyTransactionId": transaction.ThirdPartyTransactionID,
		"createdAt":               transaction.CreatedAt,
		"updatedAt":               transaction.UpdatedAt,
		"completedAt":             transaction.CompletedAt,
		"responseData":            parseWalletResponsePayload(transaction.ResponseData),
	}
}

func buildRechargeStatusMap(order *repository.RechargeOrder, transaction *repository.WalletTransaction) map[string]interface{} {
	if order == nil {
		return map[string]interface{}{}
	}
	return map[string]interface{}{
		"orderId":                 order.OrderID,
		"transactionId":           order.TransactionID,
		"userId":                  order.UserID,
		"userType":                order.UserType,
		"status":                  strings.TrimSpace(order.Status),
		"transactionStatus":       walletTransactionStatusValue(transaction),
		"amount":                  order.Amount,
		"actualAmount":            order.ActualAmount,
		"paymentMethod":           order.PaymentMethod,
		"paymentChannel":          order.PaymentChannel,
		"thirdPartyOrderId":       firstTrimmed(order.ThirdPartyOrderID, walletTransactionThirdPartyOrderID(transaction)),
		"thirdPartyTransactionId": walletTransactionThirdPartyTransactionID(transaction),
		"createdAt":               order.CreatedAt,
		"updatedAt":               order.UpdatedAt,
		"paidAt":                  order.PaidAt,
		"callbackAt":              order.CallbackAt,
		"callbackData":            parseWalletResponsePayload(order.CallbackData),
		"responseData":            walletTransactionResponseData(transaction),
	}
}

func buildWithdrawStatusMap(record *repository.WithdrawRequest, transaction *repository.WalletTransaction, arrivalText string) map[string]interface{} {
	if record == nil {
		return map[string]interface{}{}
	}
	autoRetry := withdrawAutoRetrySummary(transaction, record.WithdrawMethod)
	return map[string]interface{}{
		"requestId":               record.RequestID,
		"transactionId":           record.TransactionID,
		"userId":                  record.UserID,
		"userType":                record.UserType,
		"status":                  strings.TrimSpace(record.Status),
		"transactionStatus":       walletTransactionStatusValue(transaction),
		"amount":                  record.Amount,
		"fee":                     record.Fee,
		"actualAmount":            record.ActualAmount,
		"withdrawMethod":          record.WithdrawMethod,
		"withdrawAccount":         record.WithdrawAccount,
		"withdrawName":            record.WithdrawName,
		"bankName":                record.BankName,
		"bankBranch":              record.BankBranch,
		"arrivalText":             arrivalText,
		"thirdPartyOrderId":       firstTrimmed(record.ThirdPartyOrderID, walletTransactionThirdPartyOrderID(transaction)),
		"thirdPartyTransactionId": walletTransactionThirdPartyTransactionID(transaction),
		"rejectReason":            strings.TrimSpace(record.RejectReason),
		"transferResult":          firstTrimmed(record.TransferResult, walletTransactionTransferResult(transaction)),
		"reviewedAt":              record.ReviewedAt,
		"completedAt":             record.CompletedAt,
		"createdAt":               record.CreatedAt,
		"updatedAt":               record.UpdatedAt,
		"autoRetry":               autoRetry,
		"responseData":            walletTransactionResponseData(transaction),
	}
}

func buildWithdrawRecordListItem(record *repository.WithdrawRequest, transaction *repository.WalletTransaction, arrivalText string) map[string]interface{} {
	item := cloneJSONObject(record)
	if item == nil {
		item = map[string]interface{}{}
	}

	autoRetry := withdrawAutoRetrySummary(transaction, record.WithdrawMethod)
	responseData := walletTransactionResponseData(transaction)
	thirdPartyOrderID := firstTrimmed(record.ThirdPartyOrderID, walletTransactionThirdPartyOrderID(transaction))
	transferResult := firstTrimmed(record.TransferResult, walletTransactionTransferResult(transaction))
	rejectReason := strings.TrimSpace(record.RejectReason)
	transactionStatus := walletTransactionStatusValue(transaction)
	gatewaySubmitted := canRefreshWithdrawGatewayStatus(record, transaction)

	item["third_party_order_id"] = thirdPartyOrderID
	item["transfer_result"] = transferResult
	item["reject_reason"] = rejectReason
	item["transaction_status"] = transactionStatus
	item["arrival_text"] = arrivalText
	item["response_data"] = responseData
	item["auto_retry"] = autoRetry
	item["gateway_submitted"] = gatewaySubmitted

	item["thirdPartyOrderId"] = thirdPartyOrderID
	item["transferResult"] = transferResult
	item["rejectReason"] = rejectReason
	item["transactionStatus"] = transactionStatus
	item["arrivalText"] = arrivalText
	item["responseData"] = responseData
	item["autoRetry"] = autoRetry
	item["gatewaySubmitted"] = gatewaySubmitted
	if transaction != nil {
		item["transaction"] = buildWalletTransactionStatusMap(transaction)
	}
	return item
}

func cloneJSONObject(value interface{}) map[string]interface{} {
	if value == nil {
		return map[string]interface{}{}
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return map[string]interface{}{}
	}
	var result map[string]interface{}
	if err := json.Unmarshal(raw, &result); err != nil {
		return map[string]interface{}{}
	}
	return result
}

func walletTransactionStatusValue(transaction *repository.WalletTransaction) string {
	if transaction == nil {
		return ""
	}
	return strings.TrimSpace(transaction.Status)
}

func walletTransactionThirdPartyOrderID(transaction *repository.WalletTransaction) string {
	if transaction == nil {
		return ""
	}
	return strings.TrimSpace(transaction.ThirdPartyOrderID)
}

func walletTransactionThirdPartyTransactionID(transaction *repository.WalletTransaction) string {
	if transaction == nil {
		return ""
	}
	return strings.TrimSpace(transaction.ThirdPartyTransactionID)
}

func walletTransactionTransferResult(transaction *repository.WalletTransaction) string {
	if transaction == nil {
		return ""
	}
	switch payload := parseWalletResponsePayload(transaction.ResponseData).(type) {
	case map[string]interface{}:
		if value, ok := payload["transferResult"]; ok {
			return strings.TrimSpace(fmt.Sprint(value))
		}
	}
	return ""
}

func walletTransactionResponseData(transaction *repository.WalletTransaction) interface{} {
	if transaction == nil {
		return nil
	}
	return parseWalletResponsePayload(transaction.ResponseData)
}

func parseWalletResponsePayload(raw string) interface{} {
	text := strings.TrimSpace(raw)
	if text == "" {
		return nil
	}
	var payload interface{}
	if err := json.Unmarshal([]byte(text), &payload); err == nil {
		return payload
	}
	return text
}

func deriveWalletFlowStatus(transactionStatus, recordStatus string) string {
	txStatus := strings.TrimSpace(transactionStatus)
	record := strings.TrimSpace(recordStatus)

	switch {
	case txStatus == "awaiting_client_pay", txStatus == "refund_pending":
		return txStatus
	case record != "" && (txStatus == "" || txStatus == "pending" || txStatus == "processing"):
		return record
	default:
		return firstTrimmed(txStatus, record, "pending")
	}
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
	items := make([]map[string]interface{}, 0, len(records))
	for i := range records {
		record := records[i]
		transaction, err := s.findWithdrawTransactionForRecord(ctx, &record)
		if err != nil {
			return nil, err
		}
		items = append(items, buildWithdrawRecordListItem(&record, transaction, s.getWithdrawArrivalText(ctx, record.WithdrawMethod)))
	}
	return map[string]interface{}{
		"total":   total,
		"page":    page,
		"limit":   limit,
		"records": items,
	}, nil
}

type WithdrawReviewRequest struct {
	RequestID               string `json:"requestId"`
	Action                  string `json:"action"` // approve, reject, execute, mark_processing, complete, fail, sync_gateway_status, retry_payout, supplement_success, supplement_fail
	ReviewerID              string `json:"reviewerId"`
	ReviewerName            string `json:"reviewerName"`
	Remark                  string `json:"remark"`
	RejectReason            string `json:"rejectReason"`
	ThirdPartyOrderID       string `json:"thirdPartyOrderId"`
	TransferResult          string `json:"transferResult"`
	PayoutVoucherURL        string `json:"payoutVoucherUrl"`
	PayoutReferenceNo       string `json:"payoutReferenceNo"`
	PayoutSourceBankName    string `json:"payoutSourceBankName"`
	PayoutSourceBankBranch  string `json:"payoutSourceBankBranch"`
	PayoutSourceCardNo      string `json:"payoutSourceCardNo"`
	PayoutSourceAccountName string `json:"payoutSourceAccountName"`
}

func (s *WalletService) ReviewWithdraw(ctx context.Context, req WithdrawReviewRequest, actor AdminWalletActor) (map[string]interface{}, error) {
	if strings.TrimSpace(req.RequestID) == "" {
		return nil, fmt.Errorf("%w: requestId is required", ErrInvalidArgument)
	}
	switch req.Action {
	case "approve", "reject", "execute", "mark_processing", "complete", "fail", "sync_gateway_status", "retry_payout", "supplement_success", "supplement_fail":
	default:
		return nil, fmt.Errorf("%w: action must be one of approve/reject/execute/mark_processing/complete/fail/sync_gateway_status/retry_payout/supplement_success/supplement_fail", ErrInvalidArgument)
	}

	record, transaction, err := s.getWithdrawRequestAndTransaction(ctx, req.RequestID)
	if err != nil {
		return nil, err
	}

	reviewerID := req.ReviewerID
	if reviewerID == "" {
		reviewerID = actor.AdminID
	}
	reviewerName := req.ReviewerName
	if reviewerName == "" {
		reviewerName = actor.AdminName
	}
	reviewActor := AdminWalletActor{
		AdminID:   reviewerID,
		AdminName: reviewerName,
		AdminIP:   actor.AdminIP,
	}
	if req.Action == "sync_gateway_status" {
		return s.syncWithdrawGatewayStatus(ctx, record, transaction, reviewActor)
	}
	if req.Action == "retry_payout" {
		return s.retryWithdrawPayout(ctx, record, transaction, reviewActor, req.Remark)
	}
	if req.Action == "supplement_success" || req.Action == "supplement_fail" {
		return s.supplementWithdrawByCallback(ctx, record, transaction, req, reviewActor)
	}

	now := time.Now()
	rejectReason := firstTrimmed(strings.TrimSpace(req.RejectReason), strings.TrimSpace(req.Remark))
	responsePayload := map[string]interface{}{
		"remark":            req.Remark,
		"rejectReason":      rejectReason,
		"reviewerId":        reviewerID,
		"reviewerName":      reviewerName,
		"thirdPartyOrderId": strings.TrimSpace(req.ThirdPartyOrderID),
		"transferResult":    strings.TrimSpace(req.TransferResult),
	}
	requestUpdates := map[string]interface{}{
		"reviewer_id":   reviewerID,
		"reviewer_name": reviewerName,
		"review_remark": req.Remark,
		"reject_reason": "",
	}
	newStatus := record.Status

	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		var transitionErr error
		switch req.Action {
		case "approve":
			if record.Status != "pending" && record.Status != "pending_review" {
				return fmt.Errorf("%w: withdraw request is not pending review", ErrInvalidArgument)
			}
			newStatus = "pending_transfer"
			requestUpdates["status"] = newStatus
			requestUpdates["reviewed_at"] = now
			responsePayload["status"] = newStatus
			respJSON, _ := json.Marshal(responsePayload)
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "processing", string(respJSON), nil); err != nil {
				return err
			}
			transitionErr = s.updateRiderDepositWithdrawStateTx(ctx, tx, req.RequestID, newStatus, req.Remark, nil)
		case "reject":
			if record.Status != "pending" && record.Status != "pending_review" {
				return fmt.Errorf("%w: withdraw request is not pending review", ErrInvalidArgument)
			}
			if rejectReason == "" {
				return fmt.Errorf("%w: rejectReason is required", ErrInvalidArgument)
			}
			newStatus = "rejected"
			account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, record.UserID, record.UserType)
			if err != nil {
				return err
			}
			if account.FrozenBalance < record.Amount {
				return fmt.Errorf("%w: frozen balance is not enough to reject withdraw", ErrConcurrentBalanceUpdate)
			}
			updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, map[string]interface{}{
				"balance":             account.Balance + record.Amount,
				"frozen_balance":      account.FrozenBalance - record.Amount,
				"total_balance":       account.Balance + record.Amount + account.FrozenBalance - record.Amount,
				"last_transaction_id": transaction.TransactionID,
				"last_transaction_at": now,
			})
			if err != nil {
				return err
			}
			if !updated {
				return fmt.Errorf("%w: withdraw reject update conflict", ErrConcurrentBalanceUpdate)
			}
			requestUpdates["status"] = newStatus
			requestUpdates["reject_reason"] = rejectReason
			requestUpdates["reviewed_at"] = now
			requestUpdates["completed_at"] = now
			responsePayload["status"] = newStatus
			responsePayload["reason"] = rejectReason
			respJSON, _ := json.Marshal(responsePayload)
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "failed", string(respJSON), &now); err != nil {
				return err
			}
			transitionErr = s.updateRiderDepositWithdrawStateTx(ctx, tx, req.RequestID, newStatus, rejectReason, nil)
		case "execute":
			if record.Status != "pending_transfer" {
				return fmt.Errorf("%w: withdraw request is not pending transfer", ErrInvalidArgument)
			}
			execution, err := s.executeWithdrawPayout(ctx, record)
			if err != nil {
				return err
			}
			if execution.Status == "failed" {
				newStatus = "failed"
				return s.failWithdrawByCallbackTxWithPayload(ctx, tx, transaction,
					firstTrimmed(strings.TrimSpace(req.ThirdPartyOrderID), execution.ThirdPartyOrderID),
					firstTrimmed(strings.TrimSpace(req.TransferResult), execution.TransferResult),
					now,
					execution.ResponseData,
				)
			}
			newStatus = execution.Status
			thirdPartyOrderID := firstTrimmed(strings.TrimSpace(req.ThirdPartyOrderID), execution.ThirdPartyOrderID)
			requestUpdates["status"] = newStatus
			requestUpdates["third_party_order_id"] = thirdPartyOrderID
			requestUpdates["transfer_result"] = firstTrimmed(strings.TrimSpace(req.TransferResult), execution.TransferResult)
			responsePayload["status"] = newStatus
			responsePayload["gateway"] = execution.Gateway
			responsePayload["integrationTarget"] = execution.IntegrationTarget
			responsePayload["thirdPartyOrderId"] = thirdPartyOrderID
			responsePayload["transferResult"] = requestUpdates["transfer_result"]
			executionPayload := buildWithdrawRetryExecutionPayload(transaction, record.WithdrawMethod, responsePayload)
			if execution.ResponseData != nil {
				executionPayload = buildWithdrawRetryExecutionPayload(transaction, record.WithdrawMethod, execution.ResponseData)
			}
			respJSON, _ := json.Marshal(executionPayload)
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "processing", string(respJSON), nil); err != nil {
				return err
			}
			if err := s.updateWalletTransactionThirdPartyOrderIDTx(ctx, tx, transaction.TransactionID, thirdPartyOrderID, false); err != nil {
				return err
			}
			transitionErr = s.updateRiderDepositWithdrawStateTx(ctx, tx, req.RequestID, newStatus, req.Remark, nil)
		case "mark_processing":
			if record.Status != "pending_transfer" {
				return fmt.Errorf("%w: withdraw request is not pending transfer", ErrInvalidArgument)
			}
			newStatus = "transferring"
			thirdPartyOrderID := strings.TrimSpace(req.ThirdPartyOrderID)
			requestUpdates["status"] = newStatus
			requestUpdates["third_party_order_id"] = thirdPartyOrderID
			requestUpdates["transfer_result"] = strings.TrimSpace(req.TransferResult)
			responsePayload["status"] = newStatus
			respJSON, _ := json.Marshal(responsePayload)
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "processing", string(respJSON), nil); err != nil {
				return err
			}
			if err := s.updateWalletTransactionThirdPartyOrderIDTx(ctx, tx, transaction.TransactionID, thirdPartyOrderID, false); err != nil {
				return err
			}
			transitionErr = s.updateRiderDepositWithdrawStateTx(ctx, tx, req.RequestID, newStatus, req.Remark, nil)
		case "complete":
			if record.Status != "pending_transfer" && record.Status != "transferring" {
				return fmt.Errorf("%w: withdraw request is not ready to complete", ErrInvalidArgument)
			}
			if err := validateManualWithdrawCompletion(record, req); err != nil {
				return err
			}
			newStatus = "success"
			account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, record.UserID, record.UserType)
			if err != nil {
				return err
			}
			if account.FrozenBalance < record.Amount {
				return fmt.Errorf("%w: frozen balance is not enough to complete withdraw", ErrConcurrentBalanceUpdate)
			}
			updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, map[string]interface{}{
				"frozen_balance":      account.FrozenBalance - record.Amount,
				"total_balance":       account.Balance + account.FrozenBalance - record.Amount,
				"last_transaction_id": transaction.TransactionID,
				"last_transaction_at": now,
			})
			if err != nil {
				return err
			}
			if !updated {
				return fmt.Errorf("%w: withdraw complete update conflict", ErrConcurrentBalanceUpdate)
			}
			requestUpdates["status"] = newStatus
			requestUpdates["reject_reason"] = ""
			requestUpdates["completed_at"] = now
			thirdPartyOrderID := strings.TrimSpace(req.ThirdPartyOrderID)
			requestUpdates["third_party_order_id"] = thirdPartyOrderID
			requestUpdates["transfer_result"] = strings.TrimSpace(req.TransferResult)
			requestUpdates["payout_voucher_url"] = strings.TrimSpace(req.PayoutVoucherURL)
			requestUpdates["payout_reference_no"] = strings.TrimSpace(req.PayoutReferenceNo)
			requestUpdates["payout_source_bank_name"] = strings.TrimSpace(req.PayoutSourceBankName)
			requestUpdates["payout_source_bank_branch"] = strings.TrimSpace(req.PayoutSourceBankBranch)
			requestUpdates["payout_source_card_no"] = strings.TrimSpace(req.PayoutSourceCardNo)
			requestUpdates["payout_source_account_name"] = strings.TrimSpace(req.PayoutSourceAccountName)
			responsePayload["status"] = newStatus
			responsePayload["actualAmount"] = record.ActualAmount
			responsePayload["fee"] = record.Fee
			if strings.TrimSpace(req.PayoutReferenceNo) != "" {
				responsePayload["payoutReferenceNo"] = strings.TrimSpace(req.PayoutReferenceNo)
			}
			if strings.TrimSpace(req.PayoutVoucherURL) != "" {
				responsePayload["payoutVoucherUrl"] = strings.TrimSpace(req.PayoutVoucherURL)
			}
			respJSON, _ := json.Marshal(responsePayload)
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "success", string(respJSON), &now); err != nil {
				return err
			}
			if err := s.updateWalletTransactionThirdPartyOrderIDTx(ctx, tx, transaction.TransactionID, thirdPartyOrderID, false); err != nil {
				return err
			}
			transitionErr = s.updateRiderDepositWithdrawStateTx(ctx, tx, req.RequestID, newStatus, req.Remark, &now)
		case "fail":
			if record.Status != "pending_transfer" && record.Status != "transferring" {
				return fmt.Errorf("%w: withdraw request is not in transfer flow", ErrInvalidArgument)
			}
			newStatus = "failed"
			if err := s.failWithdrawByCallbackTxWithPayload(ctx, tx, transaction,
				strings.TrimSpace(req.ThirdPartyOrderID),
				firstTrimmed(strings.TrimSpace(req.TransferResult), strings.TrimSpace(req.Remark)),
				now,
				map[string]interface{}{
					"remark":       req.Remark,
					"reviewerId":   reviewerID,
					"reviewerName": reviewerName,
				},
			); err != nil {
				return err
			}
			return s.createWithdrawAdminOperationTx(
				ctx,
				tx,
				record,
				transaction,
				req.Action,
				reviewActor,
				withdrawAdminOperationReason(req.Action),
				firstTrimmed(strings.TrimSpace(req.TransferResult), strings.TrimSpace(req.Remark), rejectReason),
			)
		}
		if transitionErr != nil {
			return transitionErr
		}
		if err := tx.WithContext(ctx).Model(&repository.WithdrawRequest{}).
			Where("request_id = ? OR request_id_raw = ?", req.RequestID, req.RequestID).
			Updates(requestUpdates).Error; err != nil {
			return err
		}
		return s.createWithdrawAdminOperationTx(
			ctx,
			tx,
			record,
			transaction,
			req.Action,
			reviewActor,
			withdrawAdminOperationReason(req.Action),
			firstTrimmed(strings.TrimSpace(req.TransferResult), rejectReason, strings.TrimSpace(req.Remark)),
		)
	})
	if err != nil {
		return nil, err
	}

	if s.notifier != nil {
		if latestRecord, latestErr := s.getWithdrawRequestByIdentifiers(ctx, req.RequestID, transaction.TransactionID); latestErr == nil && latestRecord != nil {
			s.notifier.NotifyWithdrawStatus(ctx, latestRecord, latestRecord.Status, firstTrimmed(rejectReason, strings.TrimSpace(req.TransferResult), strings.TrimSpace(req.Remark)))
		}
	}

	return map[string]interface{}{
		"success":   true,
		"requestId": req.RequestID,
		"status":    newStatus,
	}, nil
}

func validateManualWithdrawCompletion(record *repository.WithdrawRequest, req WithdrawReviewRequest) error {
	if record == nil {
		return fmt.Errorf("%w: withdraw request is required", ErrInvalidArgument)
	}
	if normalizeChannel(record.WithdrawMethod) != "bank_card" {
		return nil
	}
	if strings.TrimSpace(req.PayoutVoucherURL) == "" {
		return fmt.Errorf("%w: payoutVoucherUrl is required for bank card completion", ErrInvalidArgument)
	}
	if strings.TrimSpace(req.PayoutSourceBankName) == "" {
		return fmt.Errorf("%w: payoutSourceBankName is required for bank card completion", ErrInvalidArgument)
	}
	if strings.TrimSpace(req.PayoutSourceBankBranch) == "" {
		return fmt.Errorf("%w: payoutSourceBankBranch is required for bank card completion", ErrInvalidArgument)
	}
	if strings.TrimSpace(req.PayoutSourceCardNo) == "" {
		return fmt.Errorf("%w: payoutSourceCardNo is required for bank card completion", ErrInvalidArgument)
	}
	if strings.TrimSpace(req.PayoutSourceAccountName) == "" {
		return fmt.Errorf("%w: payoutSourceAccountName is required for bank card completion", ErrInvalidArgument)
	}
	return nil
}

func (s *WalletService) supplementWithdrawByCallback(
	ctx context.Context,
	record *repository.WithdrawRequest,
	transaction *repository.WalletTransaction,
	req WithdrawReviewRequest,
	actor AdminWalletActor,
) (map[string]interface{}, error) {
	if record == nil || transaction == nil {
		return nil, fmt.Errorf("%w: withdraw request is required", ErrInvalidArgument)
	}
	if record.Status != "pending_transfer" && record.Status != "transferring" {
		return nil, fmt.Errorf("%w: withdraw request is not in supplementable transfer flow", ErrInvalidArgument)
	}
	if s.paymentSvc == nil {
		return nil, fmt.Errorf("%w: payment callback service is unavailable", ErrInvalidArgument)
	}

	channel := normalizeChannel(record.WithdrawMethod)
	switch channel {
	case "wechat", "alipay", "bank_card":
	default:
		return nil, fmt.Errorf("%w: withdraw method does not support supplement callback", ErrInvalidArgument)
	}

	eventType := "payout.success"
	defaultRemark := "后台补记成功"
	if req.Action == "supplement_fail" {
		eventType = "payout.fail"
		defaultRemark = "后台补记失败"
	}
	reviewerID := strings.TrimSpace(actor.AdminID)
	reviewerName := strings.TrimSpace(actor.AdminName)
	remark := firstTrimmed(strings.TrimSpace(req.Remark), defaultRemark)
	thirdPartyOrderID := firstTrimmed(
		strings.TrimSpace(req.ThirdPartyOrderID),
		strings.TrimSpace(record.ThirdPartyOrderID),
		strings.TrimSpace(transaction.ThirdPartyOrderID),
		strings.TrimSpace(record.RequestID),
	)

	rawPayload, _ := json.Marshal(map[string]interface{}{
		"status":            eventType,
		"requestId":         record.RequestID,
		"transactionId":     transaction.TransactionID,
		"thirdPartyOrderId": thirdPartyOrderID,
		"remark":            remark,
		"reviewerId":        reviewerID,
		"reviewerName":      reviewerName,
		"supplemented":      true,
		"supplementAction":  req.Action,
	})

	callbackResult, err := s.paymentSvc.RecordCallback(ctx, PaymentCallbackRequest{
		Channel:           channel,
		EventType:         eventType,
		Signature:         fmt.Sprintf("admin-supplement:%s:%s:%s", req.Action, record.RequestID, thirdPartyOrderID),
		Nonce:             fmt.Sprintf("admin-supplement:%s", record.RequestID),
		TransactionID:     transaction.TransactionID,
		ThirdPartyOrderID: thirdPartyOrderID,
		RawBody:           string(rawPayload),
		Verified:          true,
		Response:          remark,
		Headers: map[string]string{
			"X-Admin-Supplement": "true",
			"X-Admin-ID":         reviewerID,
			"X-Admin-Name":       reviewerName,
		},
		Params: map[string]string{
			"requestId":         record.RequestID,
			"transactionId":     transaction.TransactionID,
			"thirdPartyOrderId": thirdPartyOrderID,
			"supplementAction":  req.Action,
		},
	})
	if err != nil {
		return nil, err
	}

	latestRecord, latestTransaction, err := s.getWithdrawRequestAndTransaction(ctx, record.RequestID)
	if err != nil {
		return nil, err
	}
	if err := s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		return s.createWithdrawAdminOperationTx(
			ctx,
			tx,
			latestRecord,
			latestTransaction,
			req.Action,
			actor,
			withdrawAdminOperationReason(req.Action),
			remark,
		)
	}); err != nil {
		return nil, err
	}
	status := deriveWalletFlowStatus(latestTransaction.Status, latestRecord.Status)
	return map[string]interface{}{
		"success":           true,
		"requestId":         latestRecord.RequestID,
		"status":            status,
		"transactionStatus": walletTransactionStatusValue(latestTransaction),
		"duplicated":        toBool(callbackResult["duplicated"]),
		"settlement":        callbackResult["settlement"],
		"withdraw":          buildWithdrawStatusMap(latestRecord, latestTransaction, s.getWithdrawArrivalText(ctx, latestRecord.WithdrawMethod)),
	}, nil
}

func (s *WalletService) getWithdrawRequestAndTransaction(ctx context.Context, requestID string) (*repository.WithdrawRequest, *repository.WalletTransaction, error) {
	record, err := s.walletRepo.GetWithdrawRequestByID(ctx, requestID)
	if err != nil {
		return nil, nil, fmt.Errorf("withdraw request not found: %w", err)
	}

	var transaction repository.WalletTransaction
	if err := s.walletRepo.DB().WithContext(ctx).
		Where("transaction_id = ? OR transaction_id_raw = ?", record.TransactionID, record.TransactionID).
		First(&transaction).Error; err != nil {
		return nil, nil, fmt.Errorf("withdraw transaction not found: %w", err)
	}
	return record, &transaction, nil
}

func (s *WalletService) syncWithdrawGatewayStatus(
	ctx context.Context,
	record *repository.WithdrawRequest,
	transaction *repository.WalletTransaction,
	actor AdminWalletActor,
) (map[string]interface{}, error) {
	if record == nil || transaction == nil {
		return nil, fmt.Errorf("%w: withdraw request is required", ErrInvalidArgument)
	}
	if record.Status != "pending_transfer" && record.Status != "transferring" {
		return nil, fmt.Errorf("%w: withdraw request is not in transfer flow", ErrInvalidArgument)
	}
	if !canRefreshWithdrawGatewayStatus(record, transaction) {
		return nil, fmt.Errorf("%w: withdraw request has not been submitted to gateway", ErrInvalidArgument)
	}
	if err := s.refreshWithdrawGatewayStatus(ctx, record, transaction); err != nil {
		return nil, err
	}

	latestRecord, latestTransaction, err := s.getWithdrawRequestAndTransaction(ctx, record.RequestID)
	if err != nil {
		return nil, err
	}
	if err := s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		return s.createWithdrawAdminOperationTx(
			ctx,
			tx,
			latestRecord,
			latestTransaction,
			"sync_gateway_status",
			actor,
			withdrawAdminOperationReason("sync_gateway_status"),
			firstTrimmed(strings.TrimSpace(latestRecord.TransferResult), "同步网关状态"),
		)
	}); err != nil {
		return nil, err
	}
	status := deriveWalletFlowStatus(latestTransaction.Status, latestRecord.Status)
	return map[string]interface{}{
		"success":           true,
		"requestId":         latestRecord.RequestID,
		"status":            status,
		"transactionStatus": walletTransactionStatusValue(latestTransaction),
		"withdraw":          buildWithdrawStatusMap(latestRecord, latestTransaction, s.getWithdrawArrivalText(ctx, latestRecord.WithdrawMethod)),
	}, nil
}

func (s *WalletService) retryWithdrawPayout(
	ctx context.Context,
	record *repository.WithdrawRequest,
	transaction *repository.WalletTransaction,
	actor AdminWalletActor,
	remark string,
) (map[string]interface{}, error) {
	if record == nil || transaction == nil {
		return nil, fmt.Errorf("%w: withdraw request is required", ErrInvalidArgument)
	}
	if record.Status != "failed" {
		return nil, fmt.Errorf("%w: withdraw request is not failed", ErrInvalidArgument)
	}

	reviewerID := strings.TrimSpace(actor.AdminID)
	reviewerName := strings.TrimSpace(actor.AdminName)
	remark = firstTrimmed(strings.TrimSpace(remark), "后台重试提现打款")
	now := time.Now()
	if err := s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		var lockedRecord repository.WithdrawRequest
		if err := tx.WithContext(ctx).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("request_id = ? OR request_id_raw = ?", record.RequestID, record.RequestID).
			First(&lockedRecord).Error; err != nil {
			return err
		}
		if lockedRecord.Status != "failed" {
			return fmt.Errorf("%w: withdraw request is not failed", ErrInvalidArgument)
		}

		var lockedTransaction repository.WalletTransaction
		if err := tx.WithContext(ctx).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("transaction_id = ? OR transaction_id_raw = ?", lockedRecord.TransactionID, lockedRecord.TransactionID).
			First(&lockedTransaction).Error; err != nil {
			return fmt.Errorf("withdraw transaction not found: %w", err)
		}

		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, lockedRecord.UserID, lockedRecord.UserType)
		if err != nil {
			return err
		}
		if account.Balance < lockedRecord.Amount {
			return fmt.Errorf("%w: available balance is not enough to retry withdraw", ErrInsufficientBalance)
		}
		updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, map[string]interface{}{
			"balance":             account.Balance - lockedRecord.Amount,
			"frozen_balance":      account.FrozenBalance + lockedRecord.Amount,
			"total_balance":       account.Balance - lockedRecord.Amount + account.FrozenBalance + lockedRecord.Amount,
			"last_transaction_id": lockedTransaction.TransactionID,
			"last_transaction_at": now,
		})
		if err != nil {
			return err
		}
		if !updated {
			return fmt.Errorf("%w: withdraw retry update conflict", ErrConcurrentBalanceUpdate)
		}

		responsePayload := buildWithdrawRetrySubmittedPayload(&lockedTransaction, lockedRecord.WithdrawMethod, map[string]interface{}{
			"status":         "pending_transfer",
			"remark":         remark,
			"reviewerId":     reviewerID,
			"reviewerName":   reviewerName,
			"retryRequested": true,
			"retryAt":        now,
		}, now, map[bool]string{true: "auto", false: "manual"}[strings.EqualFold(strings.TrimSpace(reviewerID), "system-withdraw-retry-worker")])
		respJSON, _ := json.Marshal(responsePayload)
		if err := tx.WithContext(ctx).
			Model(&repository.WalletTransaction{}).
			Where("transaction_id = ? OR transaction_id_raw = ?", lockedTransaction.TransactionID, lockedTransaction.TransactionID).
			Updates(map[string]interface{}{
				"status":        "processing",
				"response_data": string(respJSON),
				"completed_at":  nil,
				"updated_at":    now,
			}).Error; err != nil {
			return err
		}
		if err := s.updateWalletTransactionThirdPartyOrderIDTx(ctx, tx, lockedTransaction.TransactionID, "", true); err != nil {
			return err
		}

		if err := tx.WithContext(ctx).
			Model(&repository.WithdrawRequest{}).
			Where("request_id = ? OR request_id_raw = ?", lockedRecord.RequestID, lockedRecord.RequestID).
			Updates(map[string]interface{}{
				"status":               "pending_transfer",
				"reviewer_id":          reviewerID,
				"reviewer_name":        reviewerName,
				"review_remark":        remark,
				"reviewed_at":          now,
				"completed_at":         nil,
				"third_party_order_id": "",
				"transfer_result":      "",
				"updated_at":           now,
			}).Error; err != nil {
			return err
		}
		if err := s.updateRiderDepositWithdrawStateTx(ctx, tx, lockedRecord.RequestID, "pending_transfer", remark, nil); err != nil {
			return err
		}
		return s.createWithdrawAdminOperationTx(
			ctx,
			tx,
			&lockedRecord,
			&lockedTransaction,
			"retry_payout",
			actor,
			withdrawAdminOperationReason("retry_payout"),
			remark,
		)
	}); err != nil {
		return nil, err
	}

	result, execErr := s.ReviewWithdraw(ctx, WithdrawReviewRequest{
		RequestID:      record.RequestID,
		Action:         "execute",
		ReviewerID:     reviewerID,
		ReviewerName:   reviewerName,
		Remark:         remark,
		TransferResult: remark,
	}, AdminWalletActor{
		AdminID:   reviewerID,
		AdminName: reviewerName,
		AdminIP:   actor.AdminIP,
	})
	if execErr != nil {
		if revertErr := s.restoreFailedWithdrawRetry(ctx, record.RequestID, reviewerID, reviewerName, remark, execErr.Error()); revertErr != nil {
			return nil, revertErr
		}
		return map[string]interface{}{
			"success":   true,
			"requestId": record.RequestID,
			"status":    "failed",
			"warning":   execErr.Error(),
		}, nil
	}
	result["retrySubmitted"] = true
	return result, nil
}

func (s *WalletService) restoreFailedWithdrawRetry(
	ctx context.Context,
	requestID string,
	reviewerID string,
	reviewerName string,
	remark string,
	failureReason string,
) error {
	failedAt := time.Now()
	return s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		var lockedRecord repository.WithdrawRequest
		if err := tx.WithContext(ctx).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("request_id = ? OR request_id_raw = ?", requestID, requestID).
			First(&lockedRecord).Error; err != nil {
			return err
		}
		if lockedRecord.Status != "pending_transfer" && lockedRecord.Status != "transferring" {
			return nil
		}

		var lockedTransaction repository.WalletTransaction
		if err := tx.WithContext(ctx).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("transaction_id = ? OR transaction_id_raw = ?", lockedRecord.TransactionID, lockedRecord.TransactionID).
			First(&lockedTransaction).Error; err != nil {
			return fmt.Errorf("withdraw transaction not found: %w", err)
		}

		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, lockedRecord.UserID, lockedRecord.UserType)
		if err != nil {
			return err
		}
		if account.FrozenBalance < lockedRecord.Amount {
			return fmt.Errorf("%w: frozen balance is not enough to restore failed retry", ErrConcurrentBalanceUpdate)
		}
		updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, map[string]interface{}{
			"balance":             account.Balance + lockedRecord.Amount,
			"frozen_balance":      account.FrozenBalance - lockedRecord.Amount,
			"total_balance":       account.Balance + lockedRecord.Amount + account.FrozenBalance - lockedRecord.Amount,
			"last_transaction_id": lockedTransaction.TransactionID,
			"last_transaction_at": failedAt,
		})
		if err != nil {
			return err
		}
		if !updated {
			return fmt.Errorf("%w: restore failed retry update conflict", ErrConcurrentBalanceUpdate)
		}

		responsePayload := buildWithdrawRetryFailurePayload(&lockedTransaction, lockedRecord.WithdrawMethod, map[string]interface{}{
			"status":         "failed",
			"reviewerId":     reviewerID,
			"reviewerName":   reviewerName,
			"remark":         remark,
			"transferResult": strings.TrimSpace(failureReason),
			"retryRollback":  true,
		}, failedAt, strings.TrimSpace(failureReason))
		respJSON, _ := json.Marshal(responsePayload)
		if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, lockedTransaction.TransactionID, "failed", string(respJSON), &failedAt); err != nil {
			return err
		}
		if err := tx.WithContext(ctx).
			Model(&repository.WithdrawRequest{}).
			Where("request_id = ? OR request_id_raw = ?", lockedRecord.RequestID, lockedRecord.RequestID).
			Updates(map[string]interface{}{
				"status":               "failed",
				"reviewer_id":          reviewerID,
				"reviewer_name":        reviewerName,
				"review_remark":        remark,
				"completed_at":         failedAt,
				"third_party_order_id": strings.TrimSpace(lockedRecord.ThirdPartyOrderID),
				"transfer_result":      strings.TrimSpace(failureReason),
				"updated_at":           failedAt,
			}).Error; err != nil {
			return err
		}
		return s.updateRiderDepositWithdrawStateTx(ctx, tx, lockedRecord.RequestID, "failed", failureReason, nil)
	})
}

func (s *WalletService) updateWalletTransactionThirdPartyOrderIDTx(
	ctx context.Context,
	tx *gorm.DB,
	transactionID string,
	thirdPartyOrderID string,
	allowClear bool,
) error {
	transactionID = strings.TrimSpace(transactionID)
	thirdPartyOrderID = strings.TrimSpace(thirdPartyOrderID)
	if transactionID == "" || (thirdPartyOrderID == "" && !allowClear) {
		return nil
	}
	return tx.WithContext(ctx).
		Model(&repository.WalletTransaction{}).
		Where("transaction_id = ? OR transaction_id_raw = ?", transactionID, transactionID).
		Update("third_party_order_id", thirdPartyOrderID).Error
}

func (s *WalletService) updateWalletTransactionThirdPartyOrderID(
	ctx context.Context,
	transactionID string,
	thirdPartyOrderID string,
	allowClear bool,
) error {
	transactionID = strings.TrimSpace(transactionID)
	thirdPartyOrderID = strings.TrimSpace(thirdPartyOrderID)
	if transactionID == "" || (thirdPartyOrderID == "" && !allowClear) {
		return nil
	}
	return s.walletRepo.DB().WithContext(ctx).
		Model(&repository.WalletTransaction{}).
		Where("transaction_id = ? OR transaction_id_raw = ?", transactionID, transactionID).
		Update("third_party_order_id", thirdPartyOrderID).Error
}

func (s *WalletService) completeWithdrawByCallbackTx(
	ctx context.Context,
	tx *gorm.DB,
	transaction *repository.WalletTransaction,
	thirdPartyOrderID string,
	transferResult string,
	completedAt time.Time,
) error {
	if transaction == nil {
		return fmt.Errorf("%w: withdraw transaction is nil", ErrInvalidArgument)
	}

	var record repository.WithdrawRequest
	if err := tx.WithContext(ctx).
		Where("request_id = ? OR request_id_raw = ?", transaction.BusinessID, transaction.BusinessID).
		First(&record).Error; err != nil {
		return err
	}
	if record.Status != "pending_transfer" && record.Status != "transferring" {
		return fmt.Errorf("%w: withdraw request is not ready to complete", ErrInvalidArgument)
	}

	account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, record.UserID, record.UserType)
	if err != nil {
		return err
	}
	if account.FrozenBalance < record.Amount {
		return fmt.Errorf("%w: frozen balance is not enough to complete withdraw", ErrConcurrentBalanceUpdate)
	}
	updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, map[string]interface{}{
		"frozen_balance":      account.FrozenBalance - record.Amount,
		"total_balance":       account.Balance + account.FrozenBalance - record.Amount,
		"last_transaction_id": transaction.TransactionID,
		"last_transaction_at": completedAt,
	})
	if err != nil {
		return err
	}
	if !updated {
		return fmt.Errorf("%w: withdraw complete update conflict", ErrConcurrentBalanceUpdate)
	}

	responsePayload := mergeWalletResponseData(walletTransactionResponseMap(transaction), map[string]interface{}{
		"status":            "success",
		"actualAmount":      record.ActualAmount,
		"fee":               record.Fee,
		"thirdPartyOrderId": strings.TrimSpace(thirdPartyOrderID),
		"transferResult":    strings.TrimSpace(transferResult),
	})
	respJSON, _ := json.Marshal(responsePayload)
	if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "success", string(respJSON), &completedAt); err != nil {
		return err
	}
	if err := s.updateWalletTransactionThirdPartyOrderIDTx(ctx, tx, transaction.TransactionID, thirdPartyOrderID, false); err != nil {
		return err
	}
	if err := tx.WithContext(ctx).
		Model(&repository.WithdrawRequest{}).
		Where("request_id = ? OR request_id_raw = ?", record.RequestID, record.RequestID).
		Updates(map[string]interface{}{
			"status":               "success",
			"completed_at":         completedAt,
			"third_party_order_id": strings.TrimSpace(thirdPartyOrderID),
			"transfer_result":      strings.TrimSpace(transferResult),
		}).Error; err != nil {
		return err
	}
	return s.updateRiderDepositWithdrawStateTx(ctx, tx, record.RequestID, "success", transferResult, &completedAt)
}

func (s *WalletService) failWithdrawByCallbackTx(
	ctx context.Context,
	tx *gorm.DB,
	transaction *repository.WalletTransaction,
	thirdPartyOrderID string,
	transferResult string,
	failedAt time.Time,
) error {
	return s.failWithdrawByCallbackTxWithPayload(ctx, tx, transaction, thirdPartyOrderID, transferResult, failedAt, nil)
}

func (s *WalletService) failWithdrawByCallbackTxWithPayload(
	ctx context.Context,
	tx *gorm.DB,
	transaction *repository.WalletTransaction,
	thirdPartyOrderID string,
	transferResult string,
	failedAt time.Time,
	extraPayload map[string]interface{},
) error {
	if transaction == nil {
		return fmt.Errorf("%w: withdraw transaction is nil", ErrInvalidArgument)
	}

	var record repository.WithdrawRequest
	if err := tx.WithContext(ctx).
		Where("request_id = ? OR request_id_raw = ?", transaction.BusinessID, transaction.BusinessID).
		First(&record).Error; err != nil {
		return err
	}
	if record.Status != "pending_transfer" && record.Status != "transferring" {
		return fmt.Errorf("%w: withdraw request is not in transfer flow", ErrInvalidArgument)
	}

	account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, record.UserID, record.UserType)
	if err != nil {
		return err
	}
	if account.FrozenBalance < record.Amount {
		return fmt.Errorf("%w: frozen balance is not enough to fail withdraw", ErrConcurrentBalanceUpdate)
	}
	updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, map[string]interface{}{
		"balance":             account.Balance + record.Amount,
		"frozen_balance":      account.FrozenBalance - record.Amount,
		"total_balance":       account.Balance + record.Amount + account.FrozenBalance - record.Amount,
		"last_transaction_id": transaction.TransactionID,
		"last_transaction_at": failedAt,
	})
	if err != nil {
		return err
	}
	if !updated {
		return fmt.Errorf("%w: withdraw fail update conflict", ErrConcurrentBalanceUpdate)
	}

	responsePayload := map[string]interface{}{
		"status":            "failed",
		"thirdPartyOrderId": strings.TrimSpace(thirdPartyOrderID),
		"transferResult":    strings.TrimSpace(transferResult),
	}
	responsePayload = mergeWalletResponseData(responsePayload, extraPayload)
	responsePayload = buildWithdrawRetryFailurePayload(transaction, record.WithdrawMethod, responsePayload, failedAt, strings.TrimSpace(transferResult))
	respJSON, _ := json.Marshal(responsePayload)
	if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "failed", string(respJSON), &failedAt); err != nil {
		return err
	}
	if err := s.updateWalletTransactionThirdPartyOrderIDTx(ctx, tx, transaction.TransactionID, thirdPartyOrderID, false); err != nil {
		return err
	}
	if err := tx.WithContext(ctx).
		Model(&repository.WithdrawRequest{}).
		Where("request_id = ? OR request_id_raw = ?", record.RequestID, record.RequestID).
		Updates(map[string]interface{}{
			"status":               "failed",
			"completed_at":         failedAt,
			"third_party_order_id": strings.TrimSpace(thirdPartyOrderID),
			"transfer_result":      strings.TrimSpace(transferResult),
		}).Error; err != nil {
		return err
	}
	return s.updateRiderDepositWithdrawStateTx(ctx, tx, record.RequestID, "failed", transferResult, nil)
}

func (s *WalletService) updateRiderDepositWithdrawStateTx(ctx context.Context, tx *gorm.DB, requestID, withdrawStatus, remark string, completedAt *time.Time) error {
	updates := map[string]interface{}{
		"updated_at": time.Now(),
	}
	switch withdrawStatus {
	case "pending_transfer", "transferring":
		updates["status"] = "withdrawing"
	case "success":
		updates["status"] = "refunded"
		updates["refunded_at"] = completedAt
	case "rejected", "failed":
		updates["status"] = "withdrawable"
	}
	if strings.TrimSpace(remark) != "" {
		updates["notes"] = remark
	}
	return tx.WithContext(ctx).
		Model(&repository.RiderDepositRecord{}).
		Where("withdraw_request_id = ?", requestID).
		Updates(updates).Error
}
