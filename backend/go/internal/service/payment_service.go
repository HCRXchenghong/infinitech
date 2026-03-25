package service

import (
	"context"
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

type PayOrderRequest struct {
	UserID            string `json:"userId"`
	UserType          string `json:"userType"`
	OrderID           string `json:"orderId"`
	Amount            int64  `json:"amount"`
	PaymentMethod     string `json:"paymentMethod"`
	PaymentChannel    string `json:"paymentChannel"`
	ThirdPartyOrderID string `json:"thirdPartyOrderId"`
	Description       string `json:"description"`
	IdempotencyKey    string `json:"idempotencyKey"`
}

type RefundOrderRequest struct {
	UserID         string `json:"userId"`
	UserType       string `json:"userType"`
	OrderID        string `json:"orderId"`
	Amount         int64  `json:"amount"`
	Reason         string `json:"reason"`
	IdempotencyKey string `json:"idempotencyKey"`
}

type PaymentCallbackRequest struct {
	CallbackID        string            `json:"callbackId"`
	Channel           string            `json:"channel"`
	EventType         string            `json:"eventType"`
	Signature         string            `json:"signature"`
	Nonce             string            `json:"nonce"`
	TransactionID     string            `json:"transactionId"`
	ThirdPartyOrderID string            `json:"thirdPartyOrderId"`
	Headers           map[string]string `json:"headers"`
	RawBody           string            `json:"rawBody"`
	Verified          bool              `json:"verified"`
	Response          string            `json:"response"`
}

type PaymentService struct {
	walletRepo repository.WalletRepository
	riskSvc    *RiskControlService
	signSecret string
}

func NewPaymentService(walletRepo repository.WalletRepository, riskSvc *RiskControlService, signSecret string) *PaymentService {
	if signSecret == "" {
		signSecret = "wallet-sign-secret-change-in-production"
	}
	return &PaymentService{
		walletRepo: walletRepo,
		riskSvc:    riskSvc,
		signSecret: signSecret,
	}
}

func (s *PaymentService) PayOrder(ctx context.Context, req PayOrderRequest) (map[string]interface{}, error) {
	if strings.TrimSpace(req.OrderID) == "" {
		return nil, fmt.Errorf("%w: orderId is required", ErrInvalidArgument)
	}
	standardIdempotencyKey, idempotencyKeyRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketIdempotency, req.IdempotencyKey)
	if err != nil {
		return nil, err
	}
	req.IdempotencyKey = standardIdempotencyKey

	normalizedType, err := normalizeUserType(req.UserType)
	if err != nil {
		return nil, err
	}
	req.UserType = normalizedType
	method, channel, err := normalizePaymentMethod(req.PaymentMethod, req.PaymentChannel)
	if err != nil {
		return nil, err
	}
	req.PaymentMethod = method
	req.PaymentChannel = channel

	if existing, err := s.walletRepo.GetWalletTransactionByIdempotencyKey(ctx, req.IdempotencyKey); err == nil {
		var balance int64
		var frozen int64
		account, acctErr := s.walletRepo.GetWalletAccount(ctx, existing.UserID, existing.UserType)
		if acctErr == nil {
			balance = account.Balance
			frozen = account.FrozenBalance
		}
		return map[string]interface{}{
			"duplicated":    true,
			"transactionId": existing.TransactionID,
			"orderId":       req.OrderID,
			"paymentMethod": existing.PaymentMethod,
			"status":        existing.Status,
			"balance":       balance,
			"frozenBalance": frozen,
		}, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	now := time.Now()
	transactionID, transactionIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, "")
	if err != nil {
		return nil, err
	}
	var balanceAfter int64
	var frozenAfter int64

	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		order, err := s.findOrderTx(ctx, tx, req.OrderID)
		if err != nil {
			return err
		}

		if strings.TrimSpace(req.UserID) == "" {
			req.UserID = order.UserID
		}
		if strings.TrimSpace(req.UserID) == "" {
			return fmt.Errorf("%w: userId is required", ErrInvalidArgument)
		}

		if req.Amount <= 0 {
			amount := int64(order.TotalPrice * 100)
			if amount <= 0 {
				return fmt.Errorf("%w: amount is required", ErrInvalidArgument)
			}
			req.Amount = amount
		}
		if err := s.riskSvc.ValidateAmount(req.Amount, "payment"); err != nil {
			return err
		}

		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, req.UserID, req.UserType)
		if err != nil {
			return err
		}
		if err := s.riskSvc.CheckAccountStatus(account); err != nil {
			return err
		}
		accountResetForNewDay(account, now)
		if err := s.riskSvc.CheckDailyLimit(account, "payment", req.Amount); err != nil {
			return err
		}

		balanceBefore := account.Balance
		balanceAfter = balanceBefore
		frozenAfter = account.FrozenBalance
		if req.PaymentMethod == "ifpay" {
			if err := s.riskSvc.ValidateDebit(account, req.Amount); err != nil {
				return err
			}
			balanceAfter = balanceBefore - req.Amount
		}

		reqJSON, _ := json.Marshal(req)
		transaction := &repository.WalletTransaction{
			TransactionID:     transactionID,
			TransactionIDRaw:  transactionIDRaw,
			IdempotencyKey:    req.IdempotencyKey,
			IdempotencyKeyRaw: idempotencyKeyRaw,
			UserID:            req.UserID,
			UserType:          req.UserType,
			Type:              "payment",
			BusinessType:      "order_payment",
			BusinessID:        req.OrderID,
			Amount:            req.Amount,
			BalanceBefore:     balanceBefore,
			BalanceAfter:      balanceAfter,
			PaymentMethod:     req.PaymentMethod,
			PaymentChannel:    req.PaymentChannel,
			ThirdPartyOrderID: req.ThirdPartyOrderID,
			Status:            "pending",
			Description:       req.Description,
			Signature:         signWalletTransaction(s.signSecret, transactionID, req.UserID, req.Amount, "payment", now),
			RequestData:       string(reqJSON),
		}
		if err := s.walletRepo.CreateWalletTransactionTx(ctx, tx, transaction); err != nil {
			return err
		}

		updates := map[string]interface{}{
			"last_transaction_id": transactionID,
			"last_transaction_at": now,
			"last_daily_reset_at": dayStart(now),
		}
		if req.PaymentMethod == "ifpay" {
			updates["balance"] = balanceAfter
			updates["total_balance"] = balanceAfter + frozenAfter
			updates["daily_payment_amount"] = account.DailyPaymentAmount + req.Amount
		}
		updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, updates)
		if err != nil {
			return err
		}
		if !updated {
			return fmt.Errorf("%w: payment update conflict", ErrConcurrentBalanceUpdate)
		}

		if err := s.walletRepo.UpdateOrderPaymentStatusTx(ctx, tx, req.OrderID, transactionID, req.PaymentMethod, now); err != nil {
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
		"transactionId": transactionID,
		"orderId":       req.OrderID,
		"paymentMethod": req.PaymentMethod,
		"status":        "success",
		"balance":       balanceAfter,
		"frozenBalance": frozenAfter,
		"paidAt":        now,
	}, nil
}

func (s *PaymentService) RefundOrder(ctx context.Context, req RefundOrderRequest) (map[string]interface{}, error) {
	if strings.TrimSpace(req.OrderID) == "" {
		return nil, fmt.Errorf("%w: orderId is required", ErrInvalidArgument)
	}
	standardIdempotencyKey, idempotencyKeyRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketIdempotency, req.IdempotencyKey)
	if err != nil {
		return nil, err
	}
	req.IdempotencyKey = standardIdempotencyKey

	normalizedType, err := normalizeUserType(req.UserType)
	if err != nil {
		return nil, err
	}
	req.UserType = normalizedType

	if existing, err := s.walletRepo.GetWalletTransactionByIdempotencyKey(ctx, req.IdempotencyKey); err == nil {
		account, acctErr := s.walletRepo.GetWalletAccount(ctx, existing.UserID, existing.UserType)
		if acctErr != nil {
			return nil, acctErr
		}
		return map[string]interface{}{
			"duplicated":    true,
			"transactionId": existing.TransactionID,
			"orderId":       req.OrderID,
			"status":        existing.Status,
			"balance":       account.Balance,
			"frozenBalance": account.FrozenBalance,
		}, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	now := time.Now()
	transactionID, transactionIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, "")
	if err != nil {
		return nil, err
	}
	var balanceAfter int64
	var frozenAfter int64

	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		order, err := s.findOrderTx(ctx, tx, req.OrderID)
		if err != nil {
			return err
		}
		if strings.TrimSpace(req.UserID) == "" {
			req.UserID = order.UserID
		}
		if req.Amount <= 0 {
			amount := int64(order.TotalPrice * 100)
			if amount <= 0 {
				return fmt.Errorf("%w: amount is required", ErrInvalidArgument)
			}
			req.Amount = amount
		}
		if err := s.riskSvc.ValidateAmount(req.Amount, "recharge"); err != nil {
			return err
		}

		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, req.UserID, req.UserType)
		if err != nil {
			return err
		}
		if err := s.riskSvc.CheckAccountStatus(account); err != nil {
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
			Type:              "refund",
			BusinessType:      "order_refund",
			BusinessID:        req.OrderID,
			Amount:            req.Amount,
			BalanceBefore:     balanceBefore,
			BalanceAfter:      balanceAfter,
			PaymentMethod:     "ifpay",
			Status:            "pending",
			Description:       req.Reason,
			Signature:         signWalletTransaction(s.signSecret, transactionID, req.UserID, req.Amount, "refund", now),
			RequestData:       string(reqJSON),
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
			return fmt.Errorf("%w: refund update conflict", ErrConcurrentBalanceUpdate)
		}

		if err := s.walletRepo.UpdateOrderRefundStatusTx(ctx, tx, req.OrderID, transactionID, req.Amount, now); err != nil {
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
		"transactionId": transactionID,
		"orderId":       req.OrderID,
		"status":        "success",
		"balance":       balanceAfter,
		"frozenBalance": frozenAfter,
		"refundAt":      now,
	}, nil
}

func (s *PaymentService) RecordCallback(ctx context.Context, req PaymentCallbackRequest) (map[string]interface{}, error) {
	channel := strings.ToLower(strings.TrimSpace(req.Channel))
	if channel != "wechat" && channel != "alipay" {
		return nil, fmt.Errorf("%w: unsupported callback channel", ErrInvalidArgument)
	}

	headersJSON, _ := json.Marshal(req.Headers)
	fingerprintSeed := req.RawBody + "|" + req.Signature + "|" + req.Nonce
	fingerprintSum := sha256.Sum256([]byte(fingerprintSeed))
	fingerprint := hex.EncodeToString(fingerprintSum[:])
	now := time.Now()
	status := "success"
	if !req.Verified {
		status = "failed"
	}

	callbackID, callbackIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketPaymentCallback, req.CallbackID)
	if err != nil {
		return nil, err
	}
	transactionID, transactionIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, req.TransactionID)
	if err != nil {
		return nil, err
	}

	callback := repository.PaymentCallback{
		CallbackID:        callbackID,
		CallbackIDRaw:     callbackIDRaw,
		Channel:           channel,
		EventType:         req.EventType,
		ThirdPartyOrderID: req.ThirdPartyOrderID,
		TransactionID:     transactionID,
		TransactionIDRaw:  transactionIDRaw,
		Nonce:             req.Nonce,
		Signature:         req.Signature,
		Verified:          req.Verified,
		ReplayFingerprint: fingerprint,
		Status:            status,
		RequestHeaders:    string(headersJSON),
		RequestBody:       req.RawBody,
		ResponseBody:      req.Response,
		ProcessedAt:       &now,
	}
	if err := s.walletRepo.DB().WithContext(ctx).Create(&callback).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"callbackId":  callback.CallbackID,
		"status":      callback.Status,
		"verified":    callback.Verified,
		"processedAt": now,
	}, nil
}

func (s *PaymentService) findOrderTx(ctx context.Context, tx *gorm.DB, orderID string) (*repository.Order, error) {
	var order repository.Order
	query := tx.WithContext(ctx).Model(&repository.Order{})

	if numericID, err := strconv.ParseUint(orderID, 10, 64); err == nil {
		query = query.Where("id = ?", uint(numericID)).Or("daily_order_id = ?", orderID)
	} else {
		query = query.Where("daily_order_id = ?", orderID)
	}

	if err := query.First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: order not found", ErrInvalidArgument)
		}
		return nil, err
	}
	return &order, nil
}
