package service

import (
	"context"
	"fmt"
)

func (s *WalletService) GetEnhancedWithdrawOptions(ctx context.Context, userType, platform string) (map[string]interface{}, error) {
	result, err := s.GetWithdrawOptions(ctx, userType, platform)
	if err != nil {
		return nil, err
	}

	normalizedUserType, err := normalizeUserType(userType)
	if err != nil {
		return nil, err
	}

	bankCardCfg, err := s.loadBankCardConfig(ctx)
	if err != nil {
		return nil, err
	}

	options, _ := result["options"].([]map[string]interface{})
	for _, item := range options {
		for key, value := range buildWithdrawOptionMetadata(fmt.Sprint(item["channel"]), normalizedUserType, bankCardCfg) {
			item[key] = value
		}
	}
	return result, nil
}

func buildWithdrawOptionMetadata(channel, userType string, bankCardCfg BankCardConfig) map[string]interface{} {
	normalizedChannel := normalizeChannel(channel)
	normalizedUserType, _ := normalizeUserType(userType)
	arrivalText := "预计 1-2 小时到账"
	accountPlaceholder := "请输入收款账号"
	accountHint := "提现申请提交后会先冻结金额，审核完成后再转账到账。"
	namePlaceholder := "请输入收款人姓名（选填）"
	metadata := map[string]interface{}{
		"arrivalText":           arrivalText,
		"accountPlaceholder":    accountPlaceholder,
		"accountHint":           accountHint,
		"namePlaceholder":       namePlaceholder,
		"requiresName":          false,
		"requiresBankName":      false,
		"requiresBankBranch":    false,
		"bankNamePlaceholder":   "请输入开户银行",
		"bankBranchPlaceholder": "请输入开户支行",
		"reviewNotice":          "",
	}

	switch normalizedChannel {
	case "wechat":
		metadata["accountPlaceholder"] = "请输入微信收款账号或绑定手机号"
		metadata["accountHint"] = "微信提现会打到你绑定的微信收款账户，请确认实名信息一致。"
		metadata["namePlaceholder"] = "请输入微信实名姓名（选填）"
	case "alipay":
		metadata["accountPlaceholder"] = "请输入支付宝账号"
		metadata["accountHint"] = "支付宝提现会打到你绑定的支付宝账户，请确认账号和实名信息一致。"
		metadata["namePlaceholder"] = "请输入支付宝实名姓名（选填）"
	case "bank_card":
		arrivalText = firstTrimmed(bankCardCfg.ArrivalText, defaultBankCardConfig().ArrivalText)
		metadata["arrivalText"] = arrivalText
		metadata["accountPlaceholder"] = "请输入银行卡号"
		metadata["namePlaceholder"] = "请输入持卡人姓名"
		metadata["requiresName"] = true
		metadata["requiresBankName"] = true
		metadata["requiresBankBranch"] = true
		metadata["reviewNotice"] = fmt.Sprintf("银行卡提现到账时效为 %s，如自动通道不可用将转入人工打款。", arrivalText)
		switch normalizedUserType {
		case "merchant":
			metadata["accountHint"] = "商户银行卡提现会先冻结金额，后台确认打款后再入账。"
		case "rider":
			metadata["accountHint"] = "骑手银行卡提现会先冻结金额，后台确认打款后再入账。"
		default:
			metadata["accountHint"] = "银行卡提现会先冻结金额，后台确认打款后再入账。"
		}
	}

	return metadata
}
