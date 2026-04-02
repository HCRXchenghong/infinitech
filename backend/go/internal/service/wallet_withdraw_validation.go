package service

import (
	"context"
	"fmt"
	"strings"
)

func (s *WalletService) WithdrawValidated(ctx context.Context, req WithdrawRequest) (map[string]interface{}, error) {
	req.WithdrawAccount = strings.TrimSpace(req.WithdrawAccount)
	req.WithdrawName = strings.TrimSpace(req.WithdrawName)
	req.BankName = strings.TrimSpace(req.BankName)
	req.BankBranch = strings.TrimSpace(req.BankBranch)
	req.Remark = strings.TrimSpace(req.Remark)

	if err := validateWithdrawRequestDetails(req); err != nil {
		return nil, err
	}

	return s.Withdraw(ctx, req)
}

func validateWithdrawRequestDetails(req WithdrawRequest) error {
	switch normalizeChannel(req.WithdrawMethod) {
	case "bank_card":
		if strings.TrimSpace(req.WithdrawName) == "" {
			return fmt.Errorf("%w: withdrawName is required for bank card withdraw", ErrInvalidArgument)
		}
		if strings.TrimSpace(req.BankName) == "" {
			return fmt.Errorf("%w: bankName is required for bank card withdraw", ErrInvalidArgument)
		}
		if strings.TrimSpace(req.BankBranch) == "" {
			return fmt.Errorf("%w: bankBranch is required for bank card withdraw", ErrInvalidArgument)
		}
	}
	return nil
}
