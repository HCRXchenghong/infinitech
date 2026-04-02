package service

import "testing"

func TestBuildWithdrawOptionMetadataForBankCard(t *testing.T) {
	metadata := buildWithdrawOptionMetadata("bank_card", "merchant", BankCardConfig{
		ArrivalText: "24小时-48小时",
	})

	if metadata["arrivalText"] != "24小时-48小时" {
		t.Fatalf("expected bank card arrival text, got %#v", metadata["arrivalText"])
	}
	if metadata["requiresName"] != true {
		t.Fatalf("expected bank card to require name, got %#v", metadata["requiresName"])
	}
	if metadata["requiresBankName"] != true {
		t.Fatalf("expected bank card to require bank name, got %#v", metadata["requiresBankName"])
	}
	if metadata["requiresBankBranch"] != true {
		t.Fatalf("expected bank card to require bank branch, got %#v", metadata["requiresBankBranch"])
	}
}

func TestValidateWithdrawRequestDetailsRequiresBankCardFields(t *testing.T) {
	err := validateWithdrawRequestDetails(WithdrawRequest{
		WithdrawMethod:  "bank_card",
		WithdrawAccount: "622200******1234",
	})
	if err == nil {
		t.Fatal("expected bank card withdraw validation to fail without holder and bank details")
	}

	err = validateWithdrawRequestDetails(WithdrawRequest{
		WithdrawMethod:  "bank_card",
		WithdrawAccount: "622200******1234",
		WithdrawName:    "张三",
		BankName:        "中国银行",
		BankBranch:      "深圳南山支行",
	})
	if err != nil {
		t.Fatalf("expected bank card withdraw validation to pass, got %v", err)
	}
}
