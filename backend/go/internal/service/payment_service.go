package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type PayOrderRequest struct {
	UserID            string `json:"userId"`
	UserType          string `json:"userType"`
	Platform          string `json:"platform"`
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
	Params            map[string]string `json:"params"`
	RawBody           string            `json:"rawBody"`
	Verified          bool              `json:"verified"`
	Response          string            `json:"response"`
	HTTPRequest       *http.Request     `json:"-"`
}

type PaymentService struct {
	walletRepo repository.WalletRepository
	riskSvc    *RiskControlService
	signSecret string
	settlement *WalletService
	notifier   *RealtimeNotificationService
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

func (s *PaymentService) SetSettlementWallet(wallet *WalletService) {
	s.settlement = wallet
}

func (s *PaymentService) SetRealtimeNotifier(notifier *RealtimeNotificationService) {
	s.notifier = notifier
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
	req.Platform = normalizeClientPlatform(req.Platform)
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
	var gatewayIntent *paymentIntentResult
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
		} else {
			intent, err := s.createThirdPartyIntent(ctx, req.PaymentMethod, "order_payment", transactionID, req.Amount, req.Description, req.UserID, req.UserType, req.Platform)
			if err != nil {
				return err
			}
			gatewayIntent = intent
			req.ThirdPartyOrderID = intent.ThirdPartyOrderID
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
		if gatewayIntent != nil {
			transaction.Status = gatewayIntent.Status
			if payload, err := json.Marshal(gatewayIntent.ResponseData); err == nil {
				transaction.ResponseData = string(payload)
			}
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

		if req.PaymentMethod == "ifpay" {
			if err := s.walletRepo.UpdateOrderPaymentStatusTx(ctx, tx, req.OrderID, transactionID, req.PaymentMethod, now); err != nil {
				return err
			}
			if s.settlement != nil {
				if err := s.settlement.PrepareOrderSettlementTx(ctx, tx, order); err != nil {
					return err
				}
			}

			respJSON, _ := json.Marshal(map[string]interface{}{"status": "success", "balanceAfter": balanceAfter})
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transactionID, "success", string(respJSON), &now); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	if gatewayIntent != nil {
		return map[string]interface{}{
			"transactionId":     transactionID,
			"orderId":           req.OrderID,
			"paymentMethod":     req.PaymentMethod,
			"status":            gatewayIntent.Status,
			"thirdPartyOrderId": gatewayIntent.ThirdPartyOrderID,
			"paymentPayload":    gatewayIntent.ClientPayload,
			"integrationTarget": gatewayIntent.IntegrationTarget,
			"gateway":           gatewayIntent.Gateway,
			"requestedAt":       now,
			"balance":           balanceAfter,
			"frozenBalance":     frozenAfter,
		}, nil
	}

	result := map[string]interface{}{
		"transactionId": transactionID,
		"orderId":       req.OrderID,
		"paymentMethod": req.PaymentMethod,
		"status":        "success",
		"balance":       balanceAfter,
		"frozenBalance": frozenAfter,
		"paidAt":        now,
	}
	if s.notifier != nil {
		if order, err := s.findOrderTx(ctx, s.walletRepo.DB(), req.OrderID); err == nil && order != nil {
			s.notifier.NotifyOrderEvent(ctx, order, "order.payment.success", "订单支付成功", "你的订单已支付成功，请等待商家接单。", true, true, false)
		}
	}
	return result, nil
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
	var gatewayRefund *paymentRefundResult

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
		if err := s.riskSvc.ValidateAmount(req.Amount, "refund"); err != nil {
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
		balanceAfter = balanceBefore
		frozenAfter = account.FrozenBalance

		originalPaymentTransaction, err := s.findSuccessfulOrderPaymentTransactionTx(ctx, tx, order)
		if err != nil {
			return err
		}
		refundMethod := normalizeChannel(firstNonEmptyText(order.PaymentMethod, originalPaymentTransaction.PaymentMethod))
		if refundMethod == "" {
			refundMethod = "ifpay"
		}
		if refundMethod == "ifpay" {
			balanceAfter = balanceBefore + req.Amount
		} else {
			gatewayRefund, err = s.createThirdPartyRefund(ctx, refundMethod, transactionID, originalPaymentTransaction, req.Amount, req.Reason)
			if err != nil {
				return err
			}
		}

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
			PaymentMethod:     refundMethod,
			PaymentChannel:    refundMethod,
			Status:            "pending",
			Description:       req.Reason,
			Signature:         signWalletTransaction(s.signSecret, transactionID, req.UserID, req.Amount, "refund", now),
			RequestData:       string(reqJSON),
		}
		if gatewayRefund != nil {
			transaction.Status = gatewayRefund.Status
			transaction.ThirdPartyOrderID = gatewayRefund.ThirdPartyOrderID
			if payload, err := json.Marshal(gatewayRefund.ResponseData); err == nil {
				transaction.ResponseData = string(payload)
			}
		}
		if err := s.walletRepo.CreateWalletTransactionTx(ctx, tx, transaction); err != nil {
			return err
		}

		if gatewayRefund == nil {
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
			if s.settlement != nil {
				if err := s.settlement.ReverseOrderSettlementTx(ctx, tx, order, req.Amount, now, req.Reason); err != nil {
					return err
				}
			}

			respJSON, _ := json.Marshal(map[string]interface{}{"status": "success", "balanceAfter": balanceAfter})
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transactionID, "success", string(respJSON), &now); err != nil {
				return err
			}
			return nil
		}

		if err := s.markOrderRefundPendingTx(ctx, tx, req.OrderID, transactionID, req.Amount); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if gatewayRefund != nil {
		return map[string]interface{}{
			"transactionId":     transactionID,
			"orderId":           req.OrderID,
			"status":            gatewayRefund.Status,
			"gateway":           gatewayRefund.Gateway,
			"integrationTarget": gatewayRefund.IntegrationTarget,
			"thirdPartyOrderId": gatewayRefund.ThirdPartyOrderID,
			"requestedAt":       now,
			"balance":           balanceAfter,
			"frozenBalance":     frozenAfter,
		}, nil
	}

	result := map[string]interface{}{
		"transactionId": transactionID,
		"orderId":       req.OrderID,
		"status":        "success",
		"balance":       balanceAfter,
		"frozenBalance": frozenAfter,
		"refundAt":      now,
	}
	if s.notifier != nil {
		if order, err := s.findOrderTx(ctx, s.walletRepo.DB(), req.OrderID); err == nil && order != nil {
			s.notifier.NotifyOrderEvent(ctx, order, "order.refund.success", "退款已完成", "你的订单退款已完成，请注意查收。", true, true, false)
		}
	}
	return result, nil
}

func (s *PaymentService) RecordCallback(ctx context.Context, req PaymentCallbackRequest) (map[string]interface{}, error) {
	channel := strings.ToLower(strings.TrimSpace(req.Channel))
	if channel != "wechat" && channel != "alipay" && channel != "bank_card" {
		return nil, fmt.Errorf("%w: unsupported callback channel", ErrInvalidArgument)
	}
	if !req.Verified {
		verifiedReq, verifyErr := s.verifyAndNormalizeCallback(ctx, req)
		if verifyErr == nil {
			req = verifiedReq
		}
	}
	if strings.TrimSpace(req.Response) == "" {
		req.Response = BuildPaymentCallbackAcknowledgement(channel, req.Verified).Body
	}

	headersJSON, _ := json.Marshal(req.Headers)
	fingerprintSeed := req.RawBody + "|" + req.Signature + "|" + req.Nonce
	fingerprintSum := sha256.Sum256([]byte(fingerprintSeed))
	fingerprint := hex.EncodeToString(fingerprintSum[:])
	if duplicated, result, err := s.findDuplicatedProcessedCallback(ctx, channel, fingerprint); err != nil {
		return nil, err
	} else if duplicated {
		return result, nil
	}
	now := time.Now()
	status := paymentCallbackInitialStatus(req.Verified)

	var resolvedTransaction *repository.WalletTransaction
	if req.Verified {
		transaction, resolveErr := s.maybeFindWalletTransactionForCallback(ctx, s.walletRepo.DB(), req)
		if resolveErr != nil {
			return nil, resolveErr
		}
		if transaction != nil {
			resolvedTransaction = transaction
			req.TransactionID = strings.TrimSpace(transaction.TransactionID)
			req.ThirdPartyOrderID = firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID)
		}
	}

	callbackID, callbackIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketPaymentCallback, req.CallbackID)
	if err != nil {
		return nil, err
	}
	transactionID := ""
	transactionIDRaw := ""
	if resolvedTransaction != nil {
		transactionID = strings.TrimSpace(resolvedTransaction.TransactionID)
		transactionIDRaw = strings.TrimSpace(resolvedTransaction.TransactionIDRaw)
	} else {
		transactionID, transactionIDRaw, err = normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, req.TransactionID)
		if err != nil {
			return nil, err
		}
	}

	callback := repository.PaymentCallback{
		UnifiedIdentity:   repository.UnifiedIdentity{},
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
	if uid, tsid, idErr := idkit.NextIdentityForTable(ctx, s.walletRepo.DB(), callback.TableName(), now); idErr == nil {
		callback.UID = uid
		callback.TSID = tsid
	} else {
		return nil, idErr
	}
	if err := s.walletRepo.DB().WithContext(ctx).Create(&callback).Error; err != nil {
		return nil, err
	}

	settlement := map[string]interface{}{
		"handled": false,
	}
	if req.Verified {
		settlementResult, err := s.applyVerifiedCallback(ctx, req)
		if err != nil {
			callback.ResponseBody = BuildPaymentCallbackAcknowledgement(channel, false).Body
			if updateErr := s.updatePaymentCallbackOutcome(ctx, callback.ID, callback.Status, callback.ResponseBody); updateErr != nil {
				return nil, updateErr
			}
			return nil, err
		}
		settlement = settlementResult
		callback.Status = paymentCallbackCompletedStatus()
		if updateErr := s.updatePaymentCallbackOutcome(ctx, callback.ID, callback.Status, callback.ResponseBody); updateErr != nil {
			return nil, updateErr
		}
		s.notifyCallbackOutcome(ctx, settlement)
	}

	return map[string]interface{}{
		"callbackId":  callback.CallbackID,
		"status":      callback.Status,
		"verified":    callback.Verified,
		"settlement":  settlement,
		"processedAt": now,
	}, nil
}

func (s *PaymentService) findDuplicatedProcessedCallback(ctx context.Context, channel, fingerprint string) (bool, map[string]interface{}, error) {
	if strings.TrimSpace(fingerprint) == "" {
		return false, nil, nil
	}

	var callback repository.PaymentCallback
	err := s.walletRepo.DB().WithContext(ctx).
		Model(&repository.PaymentCallback{}).
		Where("channel = ? AND replay_fingerprint = ? AND verified = ? AND status = ?", channel, fingerprint, true, paymentCallbackDuplicateEligibleStatus()).
		Order("id DESC").
		First(&callback).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, nil
		}
		return false, nil, err
	}

	result := map[string]interface{}{
		"callbackId":  callback.CallbackID,
		"status":      callback.Status,
		"verified":    callback.Verified,
		"duplicated":  true,
		"settlement":  map[string]interface{}{"handled": false, "duplicated": true},
		"processedAt": callback.ProcessedAt,
	}
	return true, result, nil
}

func (s *PaymentService) updatePaymentCallbackOutcome(ctx context.Context, callbackID uint, status, responseBody string) error {
	return s.walletRepo.DB().WithContext(ctx).
		Model(&repository.PaymentCallback{}).
		Where("id = ?", callbackID).
		Updates(map[string]interface{}{
			"status":        strings.TrimSpace(status),
			"response_body": strings.TrimSpace(responseBody),
		}).Error
}

func (s *PaymentService) applyVerifiedCallback(ctx context.Context, req PaymentCallbackRequest) (map[string]interface{}, error) {
	eventType := strings.ToLower(strings.TrimSpace(req.EventType))
	if eventType != "" {
		if isGatewayPendingStatus(eventType) {
			return map[string]interface{}{
				"handled": false,
				"status":  "pending",
				"reason":  req.EventType,
			}, nil
		}
		if isGatewayFailureStatus(eventType) {
			return s.markThirdPartyCallbackFailed(ctx, req)
		}
		if !isGatewaySuccessStatus(eventType) {
			return map[string]interface{}{
				"handled": false,
				"status":  "pending",
				"reason":  req.EventType,
			}, nil
		}
	}
	return s.settleThirdPartyCallbackSuccess(ctx, req)
}

func (s *PaymentService) settleThirdPartyCallbackSuccess(ctx context.Context, req PaymentCallbackRequest) (map[string]interface{}, error) {
	now := time.Now()
	var result map[string]interface{}

	err := s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		transaction, err := s.findWalletTransactionForCallbackTx(ctx, tx, req)
		if err != nil {
			return err
		}
		if transaction.Status == "success" {
			result = map[string]interface{}{
				"handled":       true,
				"duplicated":    true,
				"transactionId": transaction.TransactionID,
				"type":          transaction.Type,
				"status":        transaction.Status,
			}
			return nil
		}
		if transaction.Status == "failed" {
			result = map[string]interface{}{
				"handled":       true,
				"duplicated":    true,
				"transactionId": transaction.TransactionID,
				"type":          transaction.Type,
				"status":        transaction.Status,
				"ignored":       true,
				"reason":        "transaction already failed",
			}
			return nil
		}

		switch transaction.Type {
		case "payment":
			respJSON, _ := json.Marshal(map[string]interface{}{
				"status":            "success",
				"callbackChannel":   req.Channel,
				"thirdPartyOrderId": firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
			})
			if err := s.walletRepo.UpdateOrderPaymentStatusTx(ctx, tx, transaction.BusinessID, transaction.TransactionID, transaction.PaymentMethod, now); err != nil {
				return err
			}
			if s.settlement != nil {
				order, err := s.findOrderTx(ctx, tx, transaction.BusinessID)
				if err != nil {
					return err
				}
				if err := s.settlement.PrepareOrderSettlementTx(ctx, tx, order); err != nil {
					return err
				}
			}
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "success", string(respJSON), &now); err != nil {
				return err
			}
			result = map[string]interface{}{
				"handled":       true,
				"transactionId": transaction.TransactionID,
				"type":          transaction.Type,
				"status":        "success",
				"orderId":       transaction.BusinessID,
			}
			return nil
		case "refund":
			return s.completeRefundCallbackTx(ctx, tx, transaction, req, now, &result)
		case "withdraw", "rider_deposit_withdraw":
			return s.completeWithdrawCallbackTx(ctx, tx, transaction, req, now, &result)
		case "recharge":
			return s.completeRechargeCallbackTx(ctx, tx, transaction, req, now, &result)
		case "rider_deposit":
			return s.completeRiderDepositCallbackTx(ctx, tx, transaction, req, now, &result)
		default:
			result = map[string]interface{}{
				"handled":       false,
				"transactionId": transaction.TransactionID,
				"type":          transaction.Type,
				"status":        transaction.Status,
			}
			return nil
		}
	})
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *PaymentService) markThirdPartyCallbackFailed(ctx context.Context, req PaymentCallbackRequest) (map[string]interface{}, error) {
	now := time.Now()
	var result map[string]interface{}
	err := s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		transaction, err := s.findWalletTransactionForCallbackTx(ctx, tx, req)
		if err != nil {
			return err
		}
		if transaction.Status == "failed" {
			result = map[string]interface{}{
				"handled":       true,
				"duplicated":    true,
				"transactionId": transaction.TransactionID,
				"type":          transaction.Type,
				"status":        transaction.Status,
			}
			return nil
		}
		if transaction.Status == "success" {
			result = map[string]interface{}{
				"handled":       true,
				"duplicated":    true,
				"transactionId": transaction.TransactionID,
				"type":          transaction.Type,
				"status":        transaction.Status,
				"ignored":       true,
				"reason":        "transaction already succeeded",
			}
			return nil
		}
		respJSON, _ := json.Marshal(map[string]interface{}{
			"status":            "failed",
			"callbackChannel":   req.Channel,
			"thirdPartyOrderId": firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
			"eventType":         req.EventType,
		})
		if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "failed", string(respJSON), &now); err != nil {
			return err
		}
		if transaction.Type == "refund" {
			if err := s.resetOrderRefundPendingTx(ctx, tx, transaction.BusinessID); err != nil {
				return err
			}
			if err := tx.WithContext(ctx).
				Model(&repository.AfterSalesRequest{}).
				Where("refund_transaction_id = ?", transaction.TransactionID).
				Updates(map[string]interface{}{
					"refund_transaction_id": "",
					"refunded_at":           nil,
					"processed_at":          now,
				}).Error; err != nil {
				return err
			}
		}
		if (transaction.Type == "withdraw" || transaction.Type == "rider_deposit_withdraw") && s.settlement != nil {
			if err := s.settlement.failWithdrawByCallbackTx(
				ctx,
				tx,
				transaction,
				firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
				firstNonEmptyText(req.EventType, "callback marked transfer failed"),
				now,
			); err != nil {
				return err
			}
		}
		if transaction.Type == "recharge" || transaction.Type == "rider_deposit" {
			if err := tx.WithContext(ctx).Model(&repository.RechargeOrder{}).
				Where("order_id = ?", transaction.BusinessID).
				Updates(map[string]interface{}{
					"status":        "failed",
					"callback_data": req.RawBody,
					"callback_at":   now,
				}).Error; err != nil {
				return err
			}
		}
		result = map[string]interface{}{
			"handled":       true,
			"transactionId": transaction.TransactionID,
			"type":          transaction.Type,
			"status":        "failed",
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *PaymentService) notifyCallbackOutcome(ctx context.Context, result map[string]interface{}) {
	if s == nil || s.notifier == nil || len(result) == 0 {
		return
	}
	if handled, _ := result["handled"].(bool); !handled {
		return
	}
	if duplicated, _ := result["duplicated"].(bool); duplicated {
		return
	}

	transactionID := strings.TrimSpace(fmt.Sprint(result["transactionId"]))
	if transactionID == "" {
		return
	}
	transaction, err := s.walletRepo.GetWalletTransactionByID(ctx, transactionID)
	if err != nil || transaction == nil {
		return
	}

	status := strings.ToLower(strings.TrimSpace(fmt.Sprint(result["status"])))
	switch transaction.Type {
	case "payment":
		order, orderErr := s.findOrderTx(ctx, s.walletRepo.DB(), transaction.BusinessID)
		if orderErr != nil || order == nil {
			return
		}
		if status == "success" {
			s.notifier.NotifyOrderEvent(ctx, order, "order.payment.success", "订单支付成功", "你的订单已支付成功，请等待商家接单。", true, true, false)
		}
	case "refund":
		order, orderErr := s.findOrderTx(ctx, s.walletRepo.DB(), transaction.BusinessID)
		if orderErr != nil || order == nil {
			return
		}
		if status == "success" {
			s.notifier.NotifyOrderEvent(ctx, order, "order.refund.success", "退款已完成", "你的订单退款已完成，请注意查收。", true, true, false)
		} else if status == "failed" {
			s.notifier.NotifyOrderEvent(ctx, order, "order.refund.failed", "退款失败", "你的订单退款处理失败，请联系平台客服。", true, true, false)
		}
	case "withdraw", "rider_deposit_withdraw":
		var record repository.WithdrawRequest
		if err := s.walletRepo.DB().WithContext(ctx).
			Where("request_id = ? OR request_id_raw = ?", transaction.BusinessID, transaction.BusinessID).
			First(&record).Error; err != nil {
			return
		}
		reason := firstNonEmptyText(
			fmt.Sprint(result["reason"]),
			fmt.Sprint(result["eventType"]),
			strings.TrimSpace(record.RejectReason),
			strings.TrimSpace(record.TransferResult),
		)
		s.notifier.NotifyWithdrawStatus(ctx, &record, status, reason)
	case "recharge":
		s.notifier.NotifyRechargeStatus(ctx, transaction.UserType, transaction.UserID, transaction.BusinessID, status, firstNonEmptyText(fmt.Sprint(result["reason"]), fmt.Sprint(result["eventType"])))
	case "rider_deposit":
		s.notifier.NotifyRiderDepositStatus(ctx, transaction.UserID, transaction.BusinessID, status, firstNonEmptyText(fmt.Sprint(result["reason"]), fmt.Sprint(result["eventType"])))
	}
}

func (s *PaymentService) completeWithdrawCallbackTx(
	ctx context.Context,
	tx *gorm.DB,
	transaction *repository.WalletTransaction,
	req PaymentCallbackRequest,
	now time.Time,
	result *map[string]interface{},
) error {
	if s.settlement == nil {
		return fmt.Errorf("%w: withdraw callback settlement service is unavailable", ErrInvalidArgument)
	}
	if err := s.settlement.completeWithdrawByCallbackTx(
		ctx,
		tx,
		transaction,
		firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
		firstNonEmptyText(req.EventType, "callback transfer completed"),
		now,
	); err != nil {
		return err
	}

	*result = map[string]interface{}{
		"handled":       true,
		"transactionId": transaction.TransactionID,
		"type":          transaction.Type,
		"status":        "success",
		"requestId":     transaction.BusinessID,
		"completedAt":   now,
	}
	return nil
}

func (s *PaymentService) completeRefundCallbackTx(
	ctx context.Context,
	tx *gorm.DB,
	transaction *repository.WalletTransaction,
	req PaymentCallbackRequest,
	now time.Time,
	result *map[string]interface{},
) error {
	order, err := s.findOrderTx(ctx, tx, transaction.BusinessID)
	if err != nil {
		return err
	}

	respJSON, _ := json.Marshal(map[string]interface{}{
		"status":            "success",
		"callbackChannel":   req.Channel,
		"thirdPartyOrderId": firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
	})
	if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "success", string(respJSON), &now); err != nil {
		return err
	}
	if err := s.walletRepo.UpdateOrderRefundStatusTx(ctx, tx, transaction.BusinessID, transaction.TransactionID, transaction.Amount, now); err != nil {
		return err
	}
	if s.settlement != nil {
		if err := s.settlement.ReverseOrderSettlementTx(ctx, tx, order, transaction.Amount, now, transaction.Description); err != nil {
			return err
		}
	}
	if err := tx.WithContext(ctx).
		Model(&repository.AfterSalesRequest{}).
		Where("refund_transaction_id = ?", transaction.TransactionID).
		Updates(map[string]interface{}{
			"refunded_at": now,
		}).Error; err != nil {
		return err
	}

	*result = map[string]interface{}{
		"handled":       true,
		"transactionId": transaction.TransactionID,
		"type":          transaction.Type,
		"status":        "success",
		"orderId":       transaction.BusinessID,
		"refundAt":      now,
	}
	return nil
}

func (s *PaymentService) completeRechargeCallbackTx(
	ctx context.Context,
	tx *gorm.DB,
	transaction *repository.WalletTransaction,
	req PaymentCallbackRequest,
	now time.Time,
	result *map[string]interface{},
) error {
	account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, transaction.UserID, transaction.UserType)
	if err != nil {
		return err
	}
	accountResetForNewDay(account, now)

	balanceAfter := account.Balance + transaction.Amount
	updates := map[string]interface{}{
		"balance":               balanceAfter,
		"total_balance":         balanceAfter + account.FrozenBalance,
		"daily_recharge_amount": account.DailyRechargeAmount + transaction.Amount,
		"daily_recharge_count":  account.DailyRechargeCount + 1,
		"last_transaction_id":   transaction.TransactionID,
		"last_transaction_at":   now,
		"last_daily_reset_at":   dayStart(now),
	}
	updated, err := s.walletRepo.UpdateWalletAccountWithVersionTx(ctx, tx, account.ID, account.Version, updates)
	if err != nil {
		return err
	}
	if !updated {
		return fmt.Errorf("%w: recharge callback update conflict", ErrConcurrentBalanceUpdate)
	}

	respJSON, _ := json.Marshal(map[string]interface{}{
		"status":            "success",
		"balanceAfter":      balanceAfter,
		"callbackChannel":   req.Channel,
		"thirdPartyOrderId": firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
	})
	if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "success", string(respJSON), &now); err != nil {
		return err
	}
	if err := tx.WithContext(ctx).Model(&repository.RechargeOrder{}).
		Where("order_id = ?", transaction.BusinessID).
		Updates(map[string]interface{}{
			"status":               "success",
			"paid_at":              now,
			"callback_data":        req.RawBody,
			"callback_at":          now,
			"third_party_order_id": firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
		}).Error; err != nil {
		return err
	}
	*result = map[string]interface{}{
		"handled":         true,
		"transactionId":   transaction.TransactionID,
		"type":            transaction.Type,
		"status":          "success",
		"rechargeOrderId": transaction.BusinessID,
		"balanceAfter":    balanceAfter,
	}
	return nil
}

func (s *PaymentService) completeRiderDepositCallbackTx(
	ctx context.Context,
	tx *gorm.DB,
	transaction *repository.WalletTransaction,
	req PaymentCallbackRequest,
	now time.Time,
	result *map[string]interface{},
) error {
	respJSON, _ := json.Marshal(map[string]interface{}{
		"status":            "success",
		"callbackChannel":   req.Channel,
		"thirdPartyOrderId": firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
	})
	if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transaction.TransactionID, "success", string(respJSON), &now); err != nil {
		return err
	}
	if err := tx.WithContext(ctx).Model(&repository.RechargeOrder{}).
		Where("order_id = ?", transaction.BusinessID).
		Updates(map[string]interface{}{
			"status":               "success",
			"paid_at":              now,
			"callback_data":        req.RawBody,
			"callback_at":          now,
			"third_party_order_id": firstNonEmptyText(req.ThirdPartyOrderID, transaction.ThirdPartyOrderID),
		}).Error; err != nil {
		return err
	}
	if err := tx.WithContext(ctx).Model(&repository.RiderDepositRecord{}).
		Where("recharge_order_id = ?", transaction.BusinessID).
		Updates(map[string]interface{}{
			"status":     "paid_locked",
			"locked_at":  now,
			"updated_at": now,
		}).Error; err != nil {
		return err
	}
	*result = map[string]interface{}{
		"handled":         true,
		"transactionId":   transaction.TransactionID,
		"type":            transaction.Type,
		"status":          "success",
		"rechargeOrderId": transaction.BusinessID,
	}
	return nil
}

func (s *PaymentService) findWalletTransactionForCallbackTx(
	ctx context.Context,
	tx *gorm.DB,
	req PaymentCallbackRequest,
) (*repository.WalletTransaction, error) {
	transactionID := strings.TrimSpace(req.TransactionID)
	thirdPartyOrderID := strings.TrimSpace(req.ThirdPartyOrderID)
	if transactionID == "" && thirdPartyOrderID == "" {
		return nil, fmt.Errorf("%w: callback transaction identifiers are required", ErrInvalidArgument)
	}

	findOne := func(builder func(*gorm.DB) *gorm.DB) (*repository.WalletTransaction, error) {
		var transaction repository.WalletTransaction
		err := builder(tx.WithContext(ctx).Model(&repository.WalletTransaction{})).
			Order("id DESC").
			First(&transaction).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil
			}
			return nil, err
		}
		return &transaction, nil
	}

	if transactionID != "" {
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
	if thirdPartyOrderID != "" {
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
	if transactionID != "" {
		transaction, err := findOne(func(query *gorm.DB) *gorm.DB {
			return query.Where("business_id = ?", transactionID)
		})
		if err != nil {
			return nil, err
		}
		if transaction != nil {
			return transaction, nil
		}
	}
	return nil, fmt.Errorf("%w: callback target transaction not found", ErrInvalidArgument)
}

func (s *PaymentService) maybeFindWalletTransactionForCallback(
	ctx context.Context,
	tx *gorm.DB,
	req PaymentCallbackRequest,
) (*repository.WalletTransaction, error) {
	transaction, err := s.findWalletTransactionForCallbackTx(ctx, tx, req)
	if err == nil {
		return transaction, nil
	}
	if errors.Is(err, ErrInvalidArgument) {
		return nil, nil
	}
	return nil, err
}

func (s *PaymentService) findSuccessfulOrderPaymentTransactionTx(
	ctx context.Context,
	tx *gorm.DB,
	order *repository.Order,
) (*repository.WalletTransaction, error) {
	if order == nil {
		return nil, fmt.Errorf("%w: order is required", ErrInvalidArgument)
	}
	method := normalizeChannel(order.PaymentMethod)
	if method == "ifpay" {
		return &repository.WalletTransaction{
			TransactionID:     strings.TrimSpace(order.PaymentTransactionID),
			PaymentMethod:     "ifpay",
			ThirdPartyOrderID: "",
		}, nil
	}

	var transaction repository.WalletTransaction
	query := tx.WithContext(ctx).
		Model(&repository.WalletTransaction{}).
		Where("type = ? AND business_type = ? AND business_id = ? AND status = ?", "payment", "order_payment", settlementOrderRef(order), "success").
		Order("id DESC")
	if err := query.First(&transaction).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: order payment transaction not found", ErrInvalidArgument)
		}
		return nil, err
	}
	return &transaction, nil
}

func (s *PaymentService) markOrderRefundPendingTx(ctx context.Context, tx *gorm.DB, orderID, transactionID string, refundAmount int64) error {
	updates := map[string]interface{}{
		"payment_status":        "refunding",
		"refund_transaction_id": transactionID,
		"refund_amount":         refundAmount,
		"refund_time":           nil,
	}
	res := tx.WithContext(ctx).
		Model(&repository.Order{}).
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

func (s *PaymentService) resetOrderRefundPendingTx(ctx context.Context, tx *gorm.DB, orderID string) error {
	updates := map[string]interface{}{
		"payment_status":        "paid",
		"refund_transaction_id": "",
		"refund_amount":         int64(0),
		"refund_time":           nil,
	}
	res := tx.WithContext(ctx).
		Model(&repository.Order{}).
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
