package service

import (
	"fmt"

	"github.com/yuexiang/go-api/internal/repository"
)

const (
	maxSingleRechargeAmount int64 = 5000000 // 50,000.00
	maxSingleWithdrawAmount int64 = 2000000 // 20,000.00
	maxSinglePaymentAmount  int64 = 2000000 // 20,000.00
	maxDailyRechargeAmount  int64 = 10000000
	maxDailyWithdrawAmount  int64 = 5000000
	maxDailyPaymentAmount   int64 = 5000000
	maxDailyRechargeCount         = 30
	maxDailyWithdrawCount         = 10
)

type RiskControlService struct {
	walletRepo repository.WalletRepository
}

func NewRiskControlService(walletRepo repository.WalletRepository) *RiskControlService {
	return &RiskControlService{walletRepo: walletRepo}
}

func (s *RiskControlService) ValidateAmount(amount int64, operationType string) error {
	if amount <= 0 {
		return fmt.Errorf("%w: amount must be greater than 0", ErrInvalidArgument)
	}

	switch operationType {
	case "recharge":
		if amount > maxSingleRechargeAmount {
			return fmt.Errorf("%w: recharge amount exceeds single limit", ErrRiskControl)
		}
	case "withdraw":
		if amount > maxSingleWithdrawAmount {
			return fmt.Errorf("%w: withdraw amount exceeds single limit", ErrRiskControl)
		}
	case "payment":
		if amount > maxSinglePaymentAmount {
			return fmt.Errorf("%w: payment amount exceeds single limit", ErrRiskControl)
		}
	}
	return nil
}

func (s *RiskControlService) CheckAccountStatus(account *repository.WalletAccount) error {
	if account == nil {
		return fmt.Errorf("%w: wallet account is nil", ErrInvalidArgument)
	}
	if account.Status == "closed" {
		return fmt.Errorf("%w: wallet account is closed", ErrRiskControl)
	}
	if account.Status == "frozen" {
		return fmt.Errorf("%w: wallet account is frozen", ErrRiskControl)
	}
	return nil
}

func (s *RiskControlService) ValidateDebit(account *repository.WalletAccount, amount int64) error {
	if account.Balance < amount {
		return fmt.Errorf("%w: available balance is not enough", ErrInsufficientBalance)
	}
	return nil
}

func (s *RiskControlService) CheckDailyLimit(account *repository.WalletAccount, operationType string, amount int64) error {
	switch operationType {
	case "recharge":
		if account.DailyRechargeAmount+amount > maxDailyRechargeAmount {
			return fmt.Errorf("%w: daily recharge amount exceeded", ErrRiskControl)
		}
		if account.DailyRechargeCount+1 > maxDailyRechargeCount {
			return fmt.Errorf("%w: daily recharge count exceeded", ErrRiskControl)
		}
	case "withdraw":
		if account.DailyWithdrawAmount+amount > maxDailyWithdrawAmount {
			return fmt.Errorf("%w: daily withdraw amount exceeded", ErrRiskControl)
		}
		if account.DailyWithdrawCount+1 > maxDailyWithdrawCount {
			return fmt.Errorf("%w: daily withdraw count exceeded", ErrRiskControl)
		}
	case "payment":
		if account.DailyPaymentAmount+amount > maxDailyPaymentAmount {
			return fmt.Errorf("%w: daily payment amount exceeded", ErrRiskControl)
		}
	}
	return nil
}
