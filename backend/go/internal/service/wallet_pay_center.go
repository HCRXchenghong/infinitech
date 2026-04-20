package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	payCenterChannelMatrixSettingKey = "pay_center_channel_matrix"
	payCenterFeeRulesSettingKey      = "pay_center_withdraw_fee_rules"
	payCenterSettlementSettingKey    = "pay_center_settlement_rule_sets"
	payCenterSubjectsSettingKey      = "pay_center_settlement_subjects"
	payCenterDepositPolicySettingKey = "pay_center_rider_deposit_policy"
	payCenterBankCardSettingKey      = "pay_center_bank_card_config"
)

type PaymentChannelMatrixItem struct {
	UserType    string `json:"user_type"`
	Platform    string `json:"platform"`
	Scene       string `json:"scene"`
	Channel     string `json:"channel"`
	Enabled     bool   `json:"enabled"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type SettlementTier struct {
	MinAmount          int64 `json:"min_amount"`
	MaxAmount          int64 `json:"max_amount"`
	Amount             int64 `json:"amount"`
	PercentBasisPoints int64 `json:"percent_basis_points"`
}

type SettlementRuleStepInput struct {
	UID                  string           `json:"uid"`
	SettlementSubjectUID string           `json:"settlement_subject_uid"`
	StepOrder            int              `json:"step_order"`
	CalcType             string           `json:"calc_type"`
	PercentBasisPoints   int64            `json:"percent_basis_points"`
	FixedAmount          int64            `json:"fixed_amount"`
	MinOrderAmount       int64            `json:"min_order_amount"`
	MaxOrderAmount       int64            `json:"max_order_amount"`
	Tiers                []SettlementTier `json:"tiers"`
	Enabled              bool             `json:"enabled"`
	Notes                string           `json:"notes"`
}

type SettlementRuleSetInput struct {
	UID           string                    `json:"uid"`
	Name          string                    `json:"name"`
	ScopeType     string                    `json:"scope_type"`
	ScopeID       string                    `json:"scope_id"`
	Version       int                       `json:"version"`
	IsDefault     bool                      `json:"is_default"`
	Enabled       bool                      `json:"enabled"`
	EffectiveFrom *time.Time                `json:"effective_from"`
	Notes         string                    `json:"notes"`
	Steps         []SettlementRuleStepInput `json:"steps"`
}

type RiderDepositPolicy struct {
	Amount                int64    `json:"amount"`
	UnlockDays            int      `json:"unlock_days"`
	AutoApproveWithdrawal bool     `json:"auto_approve_withdrawal"`
	AllowedMethods        []string `json:"allowed_methods"`
}

type BankCardConfig struct {
	ArrivalText string `json:"arrival_text"`
	SidecarURL  string `json:"sidecar_url"`
	ProviderURL string `json:"provider_url"`
	MerchantID  string `json:"merchant_id"`
	APIKey      string `json:"api_key"`
	NotifyURL   string `json:"notify_url"`
}

type PaymentCenterConfigPayload struct {
	PayMode          map[string]interface{}         `json:"pay_mode"`
	WxpayConfig      map[string]interface{}         `json:"wxpay_config"`
	AlipayConfig     map[string]interface{}         `json:"alipay_config"`
	ChannelMatrix    []PaymentChannelMatrixItem     `json:"channel_matrix"`
	WithdrawFeeRules []repository.WithdrawFeeRule   `json:"withdraw_fee_rules"`
	SettlementRules  []SettlementRuleSetInput       `json:"settlement_rules"`
	SettlementUsers  []repository.SettlementSubject `json:"settlement_subjects"`
	RiderDeposit     RiderDepositPolicy             `json:"rider_deposit_policy"`
	BankCard         BankCardConfig                 `json:"bank_card_config"`
}

type WithdrawFeePreviewRequest struct {
	UserID         string `json:"userId"`
	UserType       string `json:"userType"`
	Amount         int64  `json:"amount"`
	WithdrawMethod string `json:"withdrawMethod"`
	Platform       string `json:"platform"`
}

type RiderDepositPayRequest struct {
	RiderID        string `json:"rider_id"`
	PaymentMethod  string `json:"payment_method"`
	PaymentChannel string `json:"payment_channel"`
	IdempotencyKey string `json:"idempotencyKey"`
	Description    string `json:"description"`
}

type RiderDepositWithdrawRequest struct {
	RiderID         string `json:"rider_id"`
	WithdrawMethod  string `json:"withdraw_method"`
	WithdrawAccount string `json:"withdraw_account"`
	WithdrawName    string `json:"withdraw_name"`
	BankName        string `json:"bank_name"`
	BankBranch      string `json:"bank_branch"`
	IdempotencyKey  string `json:"idempotencyKey"`
}

type settlementPreviewLine struct {
	SubjectUID  string `json:"subject_uid"`
	CalcType    string `json:"calc_type"`
	Amount      int64  `json:"amount"`
	Description string `json:"description"`
}

func defaultRiderDepositPolicy() RiderDepositPolicy {
	return RiderDepositPolicy{
		Amount:                5000,
		UnlockDays:            7,
		AutoApproveWithdrawal: true,
		AllowedMethods:        []string{"wechat", "alipay"},
	}
}

func defaultBankCardConfig() BankCardConfig {
	return BankCardConfig{
		ArrivalText: "24小时-48小时",
		SidecarURL:  "",
		ProviderURL: "",
		MerchantID:  "",
		APIKey:      "",
		NotifyURL:   "",
	}
}

func defaultSettlementSubjects() []repository.SettlementSubject {
	return []repository.SettlementSubject{
		{Name: "学校", SubjectType: "school", ScopeType: "global", Enabled: true, SortOrder: 10},
		{Name: "平台", SubjectType: "platform", ScopeType: "global", Enabled: true, SortOrder: 20},
		{Name: "骑手", SubjectType: "rider", ScopeType: "global", Enabled: true, SortOrder: 30},
		{Name: "商户", SubjectType: "merchant", ScopeType: "global", Enabled: true, SortOrder: 40},
	}
}

func defaultSettlementRuleSets() []SettlementRuleSetInput {
	return []SettlementRuleSetInput{
		{
			Name:      "默认分账规则",
			ScopeType: "global",
			Version:   1,
			IsDefault: true,
			Enabled:   true,
			Steps: []SettlementRuleStepInput{
				{StepOrder: 10, CalcType: "percent_of_gross", SettlementSubjectUID: "school", PercentBasisPoints: 500, Enabled: true, Notes: "学校按订单总金额的 5% 抽取"},
				{StepOrder: 20, CalcType: "percent_of_gross", SettlementSubjectUID: "platform", PercentBasisPoints: 800, Enabled: true, Notes: "平台按订单总金额的 8% 抽取"},
				{StepOrder: 30, CalcType: "tiered_by_order_amount", SettlementSubjectUID: "rider", Enabled: true, Tiers: []SettlementTier{
					{MinAmount: 0, MaxAmount: 2000, Amount: 300},
					{MinAmount: 2001, MaxAmount: 5000, Amount: 500},
					{MinAmount: 5001, MaxAmount: 0, Amount: 800},
				}, Notes: "骑手按订单金额阶梯结算"},
				{StepOrder: 40, CalcType: "remainder", SettlementSubjectUID: "merchant", Enabled: true, Notes: "商户拿剩余金额"},
			},
		},
	}
}

func defaultChannelMatrix() []PaymentChannelMatrixItem {
	return []PaymentChannelMatrixItem{
		{UserType: "customer", Platform: "mini_program", Scene: "order_payment", Channel: "ifpay", Enabled: true, Label: "IF-Pay 余额", Description: "平台余额支付"},
		{UserType: "customer", Platform: "mini_program", Scene: "order_payment", Channel: "wechat", Enabled: true, Label: "微信支付", Description: "小程序订单支付"},
		{UserType: "customer", Platform: "mini_program", Scene: "wallet_recharge", Channel: "wechat", Enabled: true, Label: "微信充值", Description: "小程序充值"},
		{UserType: "customer", Platform: "mini_program", Scene: "wallet_withdraw", Channel: "wechat", Enabled: true, Label: "微信提现", Description: "预计 1-2 小时到账"},
		{UserType: "customer", Platform: "mini_program", Scene: "wallet_withdraw", Channel: "alipay", Enabled: true, Label: "支付宝提现", Description: "小程序仅支持提现到支付宝，不支持支付宝支付"},
		{UserType: "customer", Platform: "app", Scene: "order_payment", Channel: "ifpay", Enabled: true, Label: "IF-Pay 余额", Description: "平台余额支付"},
		{UserType: "customer", Platform: "app", Scene: "order_payment", Channel: "wechat", Enabled: true, Label: "微信支付", Description: "App 订单支付"},
		{UserType: "customer", Platform: "app", Scene: "order_payment", Channel: "alipay", Enabled: true, Label: "支付宝支付", Description: "App 订单支付"},
		{UserType: "customer", Platform: "app", Scene: "wallet_recharge", Channel: "wechat", Enabled: true, Label: "微信充值", Description: "App 充值"},
		{UserType: "customer", Platform: "app", Scene: "wallet_recharge", Channel: "alipay", Enabled: true, Label: "支付宝充值", Description: "App 充值"},
		{UserType: "customer", Platform: "app", Scene: "wallet_withdraw", Channel: "wechat", Enabled: true, Label: "微信提现", Description: "预计 1-2 小时到账"},
		{UserType: "customer", Platform: "app", Scene: "wallet_withdraw", Channel: "alipay", Enabled: true, Label: "支付宝提现", Description: "预计 1-2 小时到账"},
		{UserType: "rider", Platform: "app", Scene: "wallet_recharge", Channel: "wechat", Enabled: true, Label: "微信充值", Description: "骑手充值"},
		{UserType: "rider", Platform: "app", Scene: "wallet_recharge", Channel: "alipay", Enabled: true, Label: "支付宝充值", Description: "骑手充值"},
		{UserType: "rider", Platform: "app", Scene: "wallet_withdraw", Channel: "wechat", Enabled: true, Label: "微信提现", Description: "预计 1-2 小时到账"},
		{UserType: "rider", Platform: "app", Scene: "wallet_withdraw", Channel: "alipay", Enabled: true, Label: "支付宝提现", Description: "预计 1-2 小时到账"},
		{UserType: "rider", Platform: "app", Scene: "wallet_withdraw", Channel: "bank_card", Enabled: true, Label: "银行卡提现", Description: "24小时-48小时到账"},
		{UserType: "rider", Platform: "app", Scene: "rider_deposit", Channel: "wechat", Enabled: true, Label: "微信缴纳保证金", Description: "50 元保证金"},
		{UserType: "rider", Platform: "app", Scene: "rider_deposit", Channel: "alipay", Enabled: true, Label: "支付宝缴纳保证金", Description: "50 元保证金"},
		{UserType: "merchant", Platform: "app", Scene: "wallet_recharge", Channel: "wechat", Enabled: true, Label: "微信充值", Description: "商户充值"},
		{UserType: "merchant", Platform: "app", Scene: "wallet_recharge", Channel: "alipay", Enabled: true, Label: "支付宝充值", Description: "商户充值"},
		{UserType: "merchant", Platform: "app", Scene: "wallet_withdraw", Channel: "wechat", Enabled: true, Label: "微信提现", Description: "预计 1-2 小时到账"},
		{UserType: "merchant", Platform: "app", Scene: "wallet_withdraw", Channel: "alipay", Enabled: true, Label: "支付宝提现", Description: "预计 1-2 小时到账"},
		{UserType: "merchant", Platform: "app", Scene: "wallet_withdraw", Channel: "bank_card", Enabled: true, Label: "银行卡提现", Description: "24小时-48小时到账"},
	}
}

func defaultWithdrawFeeRules() []repository.WithdrawFeeRule {
	return []repository.WithdrawFeeRule{
		{UserType: "customer", WithdrawMethod: "wechat", MinAmount: 0, MaxAmount: 50000, RateBasisPoints: 20, MinFee: 10, MaxFee: 500, Enabled: true, SortOrder: 10},
		{UserType: "customer", WithdrawMethod: "alipay", MinAmount: 0, MaxAmount: 50000, RateBasisPoints: 20, MinFee: 10, MaxFee: 500, Enabled: true, SortOrder: 20},
		{UserType: "rider", WithdrawMethod: "wechat", MinAmount: 0, MaxAmount: 50000, RateBasisPoints: 30, MinFee: 10, MaxFee: 800, Enabled: true, SortOrder: 10},
		{UserType: "rider", WithdrawMethod: "alipay", MinAmount: 0, MaxAmount: 50000, RateBasisPoints: 30, MinFee: 10, MaxFee: 800, Enabled: true, SortOrder: 20},
		{UserType: "rider", WithdrawMethod: "bank_card", MinAmount: 0, MaxAmount: 0, RateBasisPoints: 35, MinFee: 20, MaxFee: 1200, Enabled: true, SortOrder: 30},
		{UserType: "merchant", WithdrawMethod: "wechat", MinAmount: 0, MaxAmount: 0, RateBasisPoints: 25, MinFee: 20, MaxFee: 1000, Enabled: true, SortOrder: 10},
		{UserType: "merchant", WithdrawMethod: "alipay", MinAmount: 0, MaxAmount: 0, RateBasisPoints: 25, MinFee: 20, MaxFee: 1000, Enabled: true, SortOrder: 20},
		{UserType: "merchant", WithdrawMethod: "bank_card", MinAmount: 0, MaxAmount: 0, RateBasisPoints: 30, MinFee: 30, MaxFee: 1500, Enabled: true, SortOrder: 30},
	}
}

func (s *WalletService) getJSONSetting(ctx context.Context, key string, dest interface{}) error {
	var settings []repository.Setting
	if err := s.walletRepo.DB().WithContext(ctx).Where("key = ?", key).Limit(1).Find(&settings).Error; err != nil {
		return err
	}
	if len(settings) == 0 || strings.TrimSpace(settings[0].Value) == "" {
		return nil
	}
	return json.Unmarshal([]byte(settings[0].Value), dest)
}

func (s *WalletService) saveJSONSetting(ctx context.Context, key string, value interface{}) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return s.walletRepo.DB().WithContext(ctx).Save(&repository.Setting{
		Key:   key,
		Value: string(payload),
	}).Error
}

func normalizeClientPlatform(platform string) string {
	switch strings.ToLower(strings.TrimSpace(platform)) {
	case "mini_program", "mini", "wxmp", "mp":
		return "mini_program"
	default:
		return "app"
	}
}

func normalizeChannel(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "if-pay", "if_pay", "ifpay", "balance":
		return "ifpay"
	case "wechat", "wxpay", "wechatpay":
		return "wechat"
	case "alipay", "ali":
		return "alipay"
	case "bank", "bankcard", "bank_card":
		return "bank_card"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizeScene(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "order", "orderpay", "order_payment":
		return "order_payment"
	case "recharge", "wallet_recharge":
		return "wallet_recharge"
	case "withdraw", "wallet_withdraw":
		return "wallet_withdraw"
	case "deposit", "rider_deposit":
		return "rider_deposit"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func firstNonEmptyText(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func toInt64(value interface{}) int64 {
	switch v := value.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	case json.Number:
		out, _ := v.Int64()
		return out
	default:
		return 0
	}
}

func (s *WalletService) loadChannelMatrix(ctx context.Context) ([]PaymentChannelMatrixItem, error) {
	items := defaultChannelMatrix()
	if err := s.getJSONSetting(ctx, payCenterChannelMatrixSettingKey, &items); err != nil {
		return nil, err
	}
	return items, nil
}

func (s *WalletService) loadWithdrawFeeRules(ctx context.Context) ([]repository.WithdrawFeeRule, error) {
	rules := defaultWithdrawFeeRules()
	if err := s.getJSONSetting(ctx, payCenterFeeRulesSettingKey, &rules); err != nil {
		return nil, err
	}
	return rules, nil
}

func (s *WalletService) loadSettlementRuleSets(ctx context.Context) ([]SettlementRuleSetInput, error) {
	rules := defaultSettlementRuleSets()
	if err := s.getJSONSetting(ctx, payCenterSettlementSettingKey, &rules); err != nil {
		return nil, err
	}
	return rules, nil
}

func (s *WalletService) loadSettlementSubjects(ctx context.Context) ([]repository.SettlementSubject, error) {
	subjects := defaultSettlementSubjects()
	if err := s.getJSONSetting(ctx, payCenterSubjectsSettingKey, &subjects); err != nil {
		return nil, err
	}
	return subjects, nil
}

func (s *WalletService) loadRiderDepositPolicy(ctx context.Context) (RiderDepositPolicy, error) {
	policy := defaultRiderDepositPolicy()
	if err := s.getJSONSetting(ctx, payCenterDepositPolicySettingKey, &policy); err != nil {
		return policy, err
	}
	if policy.Amount <= 0 {
		policy.Amount = defaultRiderDepositPolicy().Amount
	}
	if policy.UnlockDays <= 0 {
		policy.UnlockDays = defaultRiderDepositPolicy().UnlockDays
	}
	if len(policy.AllowedMethods) == 0 {
		policy.AllowedMethods = defaultRiderDepositPolicy().AllowedMethods
	}
	return policy, nil
}

func (s *WalletService) loadBankCardConfig(ctx context.Context) (BankCardConfig, error) {
	cfg := defaultBankCardConfig()
	if err := s.getJSONSetting(ctx, payCenterBankCardSettingKey, &cfg); err != nil {
		return cfg, err
	}
	return normalizeBankCardConfig(cfg), nil
}

func (s *WalletService) GetPaymentOptions(ctx context.Context, userType, platform, scene string) (map[string]interface{}, error) {
	normalizedUserType, err := normalizeUserType(userType)
	if err != nil {
		return nil, err
	}
	normalizedPlatform := normalizeClientPlatform(platform)
	normalizedScene := normalizeScene(scene)
	items, err := s.loadChannelMatrix(ctx)
	if err != nil {
		return nil, err
	}
	options := make([]map[string]interface{}, 0)
	for _, item := range items {
		if item.UserType != normalizedUserType || item.Platform != normalizedPlatform || item.Scene != normalizedScene || !item.Enabled {
			continue
		}
		options = append(options, map[string]interface{}{
			"channel":     normalizeChannel(item.Channel),
			"label":       item.Label,
			"description": item.Description,
			"enabled":     item.Enabled,
		})
	}
	return map[string]interface{}{
		"userType": normalizedUserType,
		"platform": normalizedPlatform,
		"scene":    normalizedScene,
		"options":  options,
	}, nil
}

func (s *WalletService) GetWithdrawOptions(ctx context.Context, userType, platform string) (map[string]interface{}, error) {
	result, err := s.GetPaymentOptions(ctx, userType, platform, "wallet_withdraw")
	if err != nil {
		return nil, err
	}
	bankCardCfg, err := s.loadBankCardConfig(ctx)
	if err != nil {
		return nil, err
	}
	options, _ := result["options"].([]map[string]interface{})
	for _, item := range options {
		switch normalizeChannel(fmt.Sprint(item["channel"])) {
		case "bank_card":
			item["arrivalText"] = bankCardCfg.ArrivalText
		default:
			item["arrivalText"] = "预计 1-2 小时到账"
		}
	}
	result["bankCardConfig"] = bankCardCfg
	return result, nil
}

func (s *WalletService) PreviewWithdrawFee(ctx context.Context, req WithdrawFeePreviewRequest) (map[string]interface{}, error) {
	if req.Amount <= 0 {
		return nil, fmt.Errorf("%w: amount must be greater than 0", ErrInvalidArgument)
	}
	normalizedUserType, err := normalizeUserType(req.UserType)
	if err != nil {
		return nil, err
	}
	normalizedMethod := normalizeChannel(req.WithdrawMethod)
	options, err := s.GetWithdrawOptions(ctx, normalizedUserType, req.Platform)
	if err != nil {
		return nil, err
	}
	allowed := false
	for _, raw := range options["options"].([]map[string]interface{}) {
		if normalizeChannel(fmt.Sprint(raw["channel"])) == normalizedMethod {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, fmt.Errorf("%w: withdraw method is disabled for current user/platform", ErrInvalidArgument)
	}

	rules, err := s.loadWithdrawFeeRules(ctx)
	if err != nil {
		return nil, err
	}
	var matched *repository.WithdrawFeeRule
	for i := range rules {
		rule := rules[i]
		if !rule.Enabled || rule.UserType != normalizedUserType || normalizeChannel(rule.WithdrawMethod) != normalizedMethod {
			continue
		}
		if req.Amount < rule.MinAmount {
			continue
		}
		if rule.MaxAmount > 0 && req.Amount > rule.MaxAmount {
			continue
		}
		matched = &rule
		break
	}
	if matched == nil {
		return nil, fmt.Errorf("%w: withdraw fee rule is not configured", ErrInvalidArgument)
	}

	fee := int64(math.Ceil(float64(req.Amount*matched.RateBasisPoints) / 10000.0))
	if fee < matched.MinFee {
		fee = matched.MinFee
	}
	if matched.MaxFee > 0 && fee > matched.MaxFee {
		fee = matched.MaxFee
	}
	actualAmount := req.Amount - fee
	if actualAmount <= 0 {
		return nil, fmt.Errorf("%w: actual amount must be greater than 0 after fee", ErrInvalidArgument)
	}

	arrivalText := "预计 1-2 小时到账"
	if normalizedMethod == "bank_card" {
		bankCardCfg, err := s.loadBankCardConfig(ctx)
		if err != nil {
			return nil, err
		}
		arrivalText = bankCardCfg.ArrivalText
	}

	return map[string]interface{}{
		"userType":         normalizedUserType,
		"withdrawMethod":   normalizedMethod,
		"amount":           req.Amount,
		"fee":              fee,
		"actualAmount":     actualAmount,
		"arrivalText":      arrivalText,
		"rateBasisPoints":  matched.RateBasisPoints,
		"minFee":           matched.MinFee,
		"maxFee":           matched.MaxFee,
		"matchedRuleOrder": matched.SortOrder,
	}, nil
}

func (s *WalletService) GetPaymentCenterConfig(ctx context.Context) (map[string]interface{}, error) {
	payMode := map[string]interface{}{"isProd": false}
	_ = s.getJSONSetting(ctx, "pay_mode", &payMode)
	wxpayConfig := map[string]interface{}{
		"appId":           "",
		"mchId":           "",
		"apiKey":          "",
		"apiV3Key":        "",
		"serialNo":        "",
		"privateKey":      "",
		"notifyUrl":       "",
		"refundNotifyUrl": "",
		"payoutNotifyUrl": "",
	}
	_ = s.getJSONSetting(ctx, "wxpay_config", &wxpayConfig)
	alipayConfig := map[string]interface{}{
		"appId":           "",
		"privateKey":      "",
		"alipayPublicKey": "",
		"notifyUrl":       "",
		"sandbox":         true,
		"sidecarUrl":      "",
	}
	_ = s.getJSONSetting(ctx, "alipay_config", &alipayConfig)
	channelMatrix, err := s.loadChannelMatrix(ctx)
	if err != nil {
		return nil, err
	}
	feeRules, err := s.loadWithdrawFeeRules(ctx)
	if err != nil {
		return nil, err
	}
	settlementRules, err := s.loadSettlementRuleSets(ctx)
	if err != nil {
		return nil, err
	}
	settlementSubjects, err := s.loadSettlementSubjects(ctx)
	if err != nil {
		return nil, err
	}
	depositPolicy, err := s.loadRiderDepositPolicy(ctx)
	if err != nil {
		return nil, err
	}
	bankCardCfg, err := s.loadBankCardConfig(ctx)
	if err != nil {
		return nil, err
	}
	runtimeConfig, err := loadPaymentGatewayRuntimeConfig(ctx, s.walletRepo)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"pay_mode":             payMode,
		"wxpay_config":         wxpayConfig,
		"alipay_config":        alipayConfig,
		"channel_matrix":       channelMatrix,
		"withdraw_fee_rules":   feeRules,
		"settlement_rules":     settlementRules,
		"settlement_subjects":  settlementSubjects,
		"rider_deposit_policy": depositPolicy,
		"bank_card_config":     bankCardCfg,
		"gateway_summary":      buildPaymentGatewaySummary(runtimeConfig),
	}, nil
}

func (s *WalletService) SavePaymentCenterConfig(ctx context.Context, payload PaymentCenterConfigPayload) (map[string]interface{}, error) {
	channelMatrix, err := normalizeAndValidateChannelMatrix(payload.ChannelMatrix)
	if err != nil {
		return nil, err
	}
	feeRules, err := normalizeAndValidateWithdrawFeeRules(payload.WithdrawFeeRules, channelMatrix)
	if err != nil {
		return nil, err
	}
	subjects, err := normalizeAndValidateSettlementSubjects(payload.SettlementUsers)
	if err != nil {
		return nil, err
	}
	settlementRules, err := normalizeAndValidateSettlementRuleSets(payload.SettlementRules, subjects)
	if err != nil {
		return nil, err
	}
	depositPolicy, err := normalizeAndValidateRiderDepositPolicy(payload.RiderDeposit)
	if err != nil {
		return nil, err
	}
	bankCardCfg, err := normalizeAndValidateBankCardConfig(payload.BankCard)
	if err != nil {
		return nil, err
	}

	if payload.PayMode != nil {
		if err := s.saveJSONSetting(ctx, "pay_mode", payload.PayMode); err != nil {
			return nil, err
		}
	}
	if payload.WxpayConfig != nil {
		if err := s.saveJSONSetting(ctx, "wxpay_config", payload.WxpayConfig); err != nil {
			return nil, err
		}
	}
	if payload.AlipayConfig != nil {
		if err := s.saveJSONSetting(ctx, "alipay_config", payload.AlipayConfig); err != nil {
			return nil, err
		}
	}
	if payload.ChannelMatrix != nil {
		if err := s.saveJSONSetting(ctx, payCenterChannelMatrixSettingKey, channelMatrix); err != nil {
			return nil, err
		}
	}
	if payload.WithdrawFeeRules != nil {
		if err := s.saveJSONSetting(ctx, payCenterFeeRulesSettingKey, feeRules); err != nil {
			return nil, err
		}
	}
	if payload.SettlementRules != nil {
		if err := s.saveJSONSetting(ctx, payCenterSettlementSettingKey, settlementRules); err != nil {
			return nil, err
		}
	}
	if payload.SettlementUsers != nil {
		if err := s.saveJSONSetting(ctx, payCenterSubjectsSettingKey, subjects); err != nil {
			return nil, err
		}
	}
	if payload.RiderDeposit.Amount > 0 {
		if err := s.saveJSONSetting(ctx, payCenterDepositPolicySettingKey, depositPolicy); err != nil {
			return nil, err
		}
	}
	if strings.TrimSpace(bankCardCfg.ArrivalText) != "" {
		if err := s.saveJSONSetting(ctx, payCenterBankCardSettingKey, bankCardCfg); err != nil {
			return nil, err
		}
	}
	return s.GetPaymentCenterConfig(ctx)
}

func normalizeAndValidateChannelMatrix(items []PaymentChannelMatrixItem) ([]PaymentChannelMatrixItem, error) {
	if items == nil {
		return nil, nil
	}
	normalized := make([]PaymentChannelMatrixItem, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for index, item := range items {
		userType, err := normalizeUserType(item.UserType)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid channel matrix user type on row %d", ErrInvalidArgument, index+1)
		}

		platform := normalizeClientPlatform(item.Platform)
		rawPlatform := strings.ToLower(strings.TrimSpace(item.Platform))
		if rawPlatform != "" && rawPlatform != "app" && rawPlatform != "mini_program" && rawPlatform != "mini" && rawPlatform != "wxmp" && rawPlatform != "mp" {
			return nil, fmt.Errorf("%w: invalid channel matrix platform on row %d", ErrInvalidArgument, index+1)
		}

		scene := normalizeScene(item.Scene)
		switch scene {
		case "order_payment", "wallet_recharge", "wallet_withdraw", "rider_deposit":
		default:
			return nil, fmt.Errorf("%w: invalid channel matrix scene on row %d", ErrInvalidArgument, index+1)
		}

		channel := normalizeChannel(item.Channel)
		switch channel {
		case "ifpay", "wechat", "alipay", "bank_card":
		default:
			return nil, fmt.Errorf("%w: invalid channel matrix channel on row %d", ErrInvalidArgument, index+1)
		}

		if platform == "mini_program" && userType != "customer" {
			return nil, fmt.Errorf("%w: mini program only supports customer channel matrix rows", ErrInvalidArgument)
		}
		if platform == "mini_program" && channel == "bank_card" {
			return nil, fmt.Errorf("%w: mini program does not support bank card channels", ErrInvalidArgument)
		}
		if platform == "mini_program" && channel == "alipay" && scene != "wallet_withdraw" {
			return nil, fmt.Errorf("%w: mini program only allows alipay for withdraw scene", ErrInvalidArgument)
		}
		if userType == "customer" && channel == "bank_card" {
			return nil, fmt.Errorf("%w: customer side does not support bank card withdraw", ErrInvalidArgument)
		}
		if scene == "wallet_recharge" && channel == "ifpay" {
			return nil, fmt.Errorf("%w: wallet recharge cannot use ifpay as incoming channel", ErrInvalidArgument)
		}
		if scene == "wallet_withdraw" && channel == "ifpay" {
			return nil, fmt.Errorf("%w: wallet withdraw cannot use ifpay as payout channel", ErrInvalidArgument)
		}
		if scene == "order_payment" && channel == "bank_card" {
			return nil, fmt.Errorf("%w: order payment does not support bank card", ErrInvalidArgument)
		}
		if scene == "rider_deposit" {
			if userType != "rider" || platform != "app" {
				return nil, fmt.Errorf("%w: rider deposit only supports rider app", ErrInvalidArgument)
			}
			if channel != "wechat" && channel != "alipay" {
				return nil, fmt.Errorf("%w: rider deposit only supports wechat or alipay", ErrInvalidArgument)
			}
		}

		key := strings.Join([]string{userType, platform, scene, channel}, "|")
		if _, exists := seen[key]; exists {
			return nil, fmt.Errorf("%w: duplicate channel matrix row %s", ErrInvalidArgument, key)
		}
		seen[key] = struct{}{}

		normalized = append(normalized, PaymentChannelMatrixItem{
			UserType:    userType,
			Platform:    platform,
			Scene:       scene,
			Channel:     channel,
			Enabled:     item.Enabled,
			Label:       strings.TrimSpace(item.Label),
			Description: strings.TrimSpace(item.Description),
		})
	}
	return normalized, nil
}

func normalizeAndValidateWithdrawFeeRules(rules []repository.WithdrawFeeRule, matrix []PaymentChannelMatrixItem) ([]repository.WithdrawFeeRule, error) {
	if rules == nil {
		return nil, nil
	}
	normalized := make([]repository.WithdrawFeeRule, 0, len(rules))
	for index, rule := range rules {
		userType, err := normalizeUserType(rule.UserType)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid withdraw fee user type on row %d", ErrInvalidArgument, index+1)
		}
		method := normalizeChannel(rule.WithdrawMethod)
		switch method {
		case "wechat", "alipay", "bank_card":
		default:
			return nil, fmt.Errorf("%w: invalid withdraw fee method on row %d", ErrInvalidArgument, index+1)
		}
		if userType == "customer" && method == "bank_card" {
			return nil, fmt.Errorf("%w: customer side does not support bank card withdraw fees", ErrInvalidArgument)
		}
		if rule.MinAmount < 0 || rule.MaxAmount < 0 || rule.RateBasisPoints < 0 || rule.MinFee < 0 || rule.MaxFee < 0 {
			return nil, fmt.Errorf("%w: withdraw fee values cannot be negative on row %d", ErrInvalidArgument, index+1)
		}
		if rule.MaxAmount > 0 && rule.MaxAmount < rule.MinAmount {
			return nil, fmt.Errorf("%w: withdraw fee max amount must be greater than min amount on row %d", ErrInvalidArgument, index+1)
		}
		if rule.MaxFee > 0 && rule.MaxFee < rule.MinFee {
			return nil, fmt.Errorf("%w: withdraw fee max fee must be greater than min fee on row %d", ErrInvalidArgument, index+1)
		}
		rule.UserType = userType
		rule.WithdrawMethod = method
		if rule.SortOrder == 0 {
			rule.SortOrder = (index + 1) * 10
		}
		normalized = append(normalized, rule)
	}

	for i := 0; i < len(normalized); i++ {
		left := normalized[i]
		if !left.Enabled {
			continue
		}
		for j := i + 1; j < len(normalized); j++ {
			right := normalized[j]
			if !right.Enabled || left.UserType != right.UserType || left.WithdrawMethod != right.WithdrawMethod {
				continue
			}
			if withdrawAmountRangeOverlap(left.MinAmount, left.MaxAmount, right.MinAmount, right.MaxAmount) {
				return nil, fmt.Errorf("%w: overlapping withdraw fee ranges for %s/%s", ErrInvalidArgument, left.UserType, left.WithdrawMethod)
			}
		}
	}

	requiredCombos := make(map[string]struct{})
	for _, item := range matrix {
		if !item.Enabled || item.Scene != "wallet_withdraw" {
			continue
		}
		requiredCombos[item.UserType+"|"+item.Channel] = struct{}{}
	}
	for combo := range requiredCombos {
		parts := strings.Split(combo, "|")
		matched := false
		for _, rule := range normalized {
			if rule.Enabled && rule.UserType == parts[0] && rule.WithdrawMethod == parts[1] {
				matched = true
				break
			}
		}
		if !matched {
			return nil, fmt.Errorf("%w: missing withdraw fee rule for enabled channel %s", ErrInvalidArgument, combo)
		}
	}

	return normalized, nil
}

func normalizeAndValidateSettlementSubjects(subjects []repository.SettlementSubject) ([]repository.SettlementSubject, error) {
	if subjects == nil {
		return nil, nil
	}
	normalized := make([]repository.SettlementSubject, 0, len(subjects))
	seen := make(map[string]struct{}, len(subjects))
	for index, subject := range subjects {
		subjectType := strings.ToLower(strings.TrimSpace(subject.SubjectType))
		switch subjectType {
		case "school", "platform", "rider", "merchant", "custom":
		default:
			return nil, fmt.Errorf("%w: invalid settlement subject type on row %d", ErrInvalidArgument, index+1)
		}
		subject.SubjectType = subjectType
		subject.Name = strings.TrimSpace(subject.Name)
		if subject.Name == "" {
			return nil, fmt.Errorf("%w: settlement subject name is required on row %d", ErrInvalidArgument, index+1)
		}
		subject.ScopeType = firstTrimmed(subject.ScopeType, "global")
		subject.UID = firstTrimmed(subject.UID, subject.SubjectType)
		subject.ExternalChannel = normalizeChannel(subject.ExternalChannel)
		switch subject.ExternalChannel {
		case "", "wechat", "alipay", "bank_card":
		default:
			return nil, fmt.Errorf("%w: invalid settlement subject external channel on row %d", ErrInvalidArgument, index+1)
		}
		if subject.SortOrder == 0 {
			subject.SortOrder = (index + 1) * 10
		}
		if _, exists := seen[subject.UID]; exists {
			return nil, fmt.Errorf("%w: duplicate settlement subject uid %s", ErrInvalidArgument, subject.UID)
		}
		seen[subject.UID] = struct{}{}
		normalized = append(normalized, subject)
	}
	return normalized, nil
}

func normalizeAndValidateSettlementRuleSets(rules []SettlementRuleSetInput, subjects []repository.SettlementSubject) ([]SettlementRuleSetInput, error) {
	if rules == nil {
		return nil, nil
	}
	subjectIndex := make(map[string]struct{}, len(subjects)*2)
	for _, subject := range subjects {
		subjectIndex[strings.TrimSpace(subject.UID)] = struct{}{}
		subjectIndex[strings.TrimSpace(subject.SubjectType)] = struct{}{}
	}

	normalized := make([]SettlementRuleSetInput, 0, len(rules))
	defaultCount := 0
	for index, rule := range rules {
		rule.Name = strings.TrimSpace(rule.Name)
		if rule.Name == "" {
			return nil, fmt.Errorf("%w: settlement rule set name is required on row %d", ErrInvalidArgument, index+1)
		}
		rule.UID = firstTrimmed(rule.UID, fmt.Sprintf("rule-set-%d", index+1))
		rule.ScopeType = firstTrimmed(rule.ScopeType, "global")
		if rule.Version <= 0 {
			rule.Version = 1
		}
		if len(rule.Steps) == 0 {
			return nil, fmt.Errorf("%w: settlement rule set %s must contain at least one step", ErrInvalidArgument, rule.Name)
		}
		remainderCount := 0
		for stepIndex, step := range rule.Steps {
			step.CalcType = strings.ToLower(strings.TrimSpace(step.CalcType))
			step.SettlementSubjectUID = strings.TrimSpace(step.SettlementSubjectUID)
			if step.StepOrder == 0 {
				step.StepOrder = (stepIndex + 1) * 10
			}
			if step.SettlementSubjectUID == "" {
				return nil, fmt.Errorf("%w: settlement step subject is required in %s", ErrInvalidArgument, rule.Name)
			}
			if _, exists := subjectIndex[step.SettlementSubjectUID]; !exists {
				return nil, fmt.Errorf("%w: settlement step subject %s is not configured", ErrInvalidArgument, step.SettlementSubjectUID)
			}
			if step.MinOrderAmount < 0 || step.MaxOrderAmount < 0 || step.FixedAmount < 0 || step.PercentBasisPoints < 0 {
				return nil, fmt.Errorf("%w: settlement step values cannot be negative in %s", ErrInvalidArgument, rule.Name)
			}
			if step.MaxOrderAmount > 0 && step.MaxOrderAmount < step.MinOrderAmount {
				return nil, fmt.Errorf("%w: settlement step max order amount must be greater than min amount in %s", ErrInvalidArgument, rule.Name)
			}
			switch step.CalcType {
			case "percent_of_gross":
				if step.PercentBasisPoints <= 0 {
					return nil, fmt.Errorf("%w: percent_of_gross requires percent_basis_points in %s", ErrInvalidArgument, rule.Name)
				}
			case "fixed_amount":
				if step.FixedAmount <= 0 {
					return nil, fmt.Errorf("%w: fixed_amount requires fixed_amount in %s", ErrInvalidArgument, rule.Name)
				}
			case "tiered_by_order_amount":
				if err := validateSettlementTiers(step.Tiers, rule.Name, stepIndex+1); err != nil {
					return nil, err
				}
			case "remainder":
				remainderCount++
			default:
				return nil, fmt.Errorf("%w: unsupported settlement calc type %s", ErrInvalidArgument, step.CalcType)
			}
			rule.Steps[stepIndex] = step
		}
		if remainderCount > 1 {
			return nil, fmt.Errorf("%w: settlement rule set %s can only contain one remainder step", ErrInvalidArgument, rule.Name)
		}
		if rule.IsDefault && rule.Enabled {
			defaultCount++
		}
		normalized = append(normalized, rule)
	}

	if defaultCount == 0 && len(normalized) > 0 {
		normalized[0].IsDefault = true
	}
	return normalized, nil
}

func normalizeAndValidateRiderDepositPolicy(policy RiderDepositPolicy) (RiderDepositPolicy, error) {
	if policy.Amount <= 0 {
		policy.Amount = defaultRiderDepositPolicy().Amount
	}
	if policy.UnlockDays <= 0 {
		policy.UnlockDays = defaultRiderDepositPolicy().UnlockDays
	}
	if len(policy.AllowedMethods) == 0 {
		policy.AllowedMethods = defaultRiderDepositPolicy().AllowedMethods
	}
	methods := make([]string, 0, len(policy.AllowedMethods))
	seen := map[string]struct{}{}
	for _, method := range policy.AllowedMethods {
		normalized := normalizeChannel(method)
		if normalized != "wechat" && normalized != "alipay" {
			return policy, fmt.Errorf("%w: rider deposit only supports wechat or alipay", ErrInvalidArgument)
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		methods = append(methods, normalized)
	}
	if len(methods) == 0 {
		methods = append(methods, defaultRiderDepositPolicy().AllowedMethods...)
	}
	policy.AllowedMethods = methods
	return policy, nil
}

func normalizeBankCardConfig(cfg BankCardConfig) BankCardConfig {
	cfg.ArrivalText = firstTrimmed(cfg.ArrivalText, defaultBankCardConfig().ArrivalText)
	cfg.SidecarURL = strings.TrimSpace(cfg.SidecarURL)
	cfg.ProviderURL = strings.TrimSpace(cfg.ProviderURL)
	cfg.MerchantID = strings.TrimSpace(cfg.MerchantID)
	cfg.APIKey = strings.TrimSpace(cfg.APIKey)
	cfg.NotifyURL = strings.TrimSpace(cfg.NotifyURL)
	return cfg
}

func normalizeAndValidateBankCardConfig(cfg BankCardConfig) (BankCardConfig, error) {
	normalized := normalizeBankCardConfig(cfg)
	providerFieldsConfigured := normalized.ProviderURL != "" || normalized.MerchantID != "" || normalized.APIKey != "" || normalized.NotifyURL != ""
	if providerFieldsConfigured {
		if normalized.SidecarURL == "" {
			return BankCardConfig{}, fmt.Errorf("%w: bank card payout adapter requires sidecar_url", ErrInvalidArgument)
		}
		if normalized.ProviderURL == "" || normalized.MerchantID == "" || normalized.APIKey == "" || normalized.NotifyURL == "" {
			return BankCardConfig{}, fmt.Errorf("%w: bank card payout adapter requires provider_url, merchant_id, api_key, and notify_url", ErrInvalidArgument)
		}
	}

	return normalized, nil
}

func withdrawAmountRangeOverlap(leftMin, leftMax, rightMin, rightMax int64) bool {
	const unlimited = int64(^uint64(0) >> 1)
	if leftMax <= 0 {
		leftMax = unlimited
	}
	if rightMax <= 0 {
		rightMax = unlimited
	}
	return leftMin <= rightMax && rightMin <= leftMax
}

func validateSettlementTiers(tiers []SettlementTier, ruleName string, stepIndex int) error {
	if len(tiers) == 0 {
		return fmt.Errorf("%w: tiered settlement step %d in %s requires at least one tier", ErrInvalidArgument, stepIndex, ruleName)
	}
	for index, tier := range tiers {
		if tier.MinAmount < 0 || tier.MaxAmount < 0 || tier.Amount < 0 || tier.PercentBasisPoints < 0 {
			return fmt.Errorf("%w: settlement tier values cannot be negative in %s", ErrInvalidArgument, ruleName)
		}
		if tier.MaxAmount > 0 && tier.MaxAmount < tier.MinAmount {
			return fmt.Errorf("%w: settlement tier max amount must be greater than min amount in %s", ErrInvalidArgument, ruleName)
		}
		if tier.Amount <= 0 && tier.PercentBasisPoints <= 0 {
			return fmt.Errorf("%w: settlement tier must define amount or percent in %s", ErrInvalidArgument, ruleName)
		}
		for next := index + 1; next < len(tiers); next++ {
			if withdrawAmountRangeOverlap(tier.MinAmount, tier.MaxAmount, tiers[next].MinAmount, tiers[next].MaxAmount) {
				return fmt.Errorf("%w: overlapping settlement tiers in %s", ErrInvalidArgument, ruleName)
			}
		}
	}
	return nil
}

func (s *WalletService) PreviewSettlement(ctx context.Context, amount int64, ruleSetName string) (map[string]interface{}, error) {
	plan, err := s.computeSettlementPlan(ctx, amount, ruleSetName)
	if err != nil {
		return nil, err
	}
	lines := make([]settlementPreviewLine, 0, len(plan.Lines))
	for _, line := range plan.Lines {
		lines = append(lines, settlementPreviewLine{
			SubjectUID:  line.SubjectUID,
			CalcType:    line.CalcType,
			Amount:      line.Amount,
			Description: line.Description,
		})
	}
	return map[string]interface{}{
		"amount":          amount,
		"rule_set_name":   plan.RuleSet.Name,
		"remaining":       plan.Remaining,
		"preview_entries": lines,
	}, nil
}

func (s *WalletService) latestRiderDepositRecord(ctx context.Context, riderID string) (*repository.RiderDepositRecord, error) {
	var record repository.RiderDepositRecord
	if err := s.walletRepo.DB().WithContext(ctx).Where("rider_id = ?", riderID).Order("created_at DESC, id DESC").First(&record).Error; err != nil {
		return nil, err
	}
	return &record, nil
}

func (s *WalletService) hasActiveRiderOrders(ctx context.Context, riderID string) (bool, error) {
	activeStatuses := []string{"pending", "accepted", "delivering"}
	var count int64
	err := s.walletRepo.DB().WithContext(ctx).Model(&repository.Order{}).
		Where("(rider_id = ? OR rider_phone = ?)", riderID, riderID).
		Where("status IN ?", activeStatuses).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *WalletService) refreshRiderDepositState(ctx context.Context, riderID string) (*repository.RiderDepositRecord, error) {
	record, err := s.latestRiderDepositRecord(ctx, riderID)
	if err != nil {
		return nil, err
	}
	if record.Status != "paid_locked" && record.Status != "withdrawable" {
		return record, nil
	}
	policy, err := s.loadRiderDepositPolicy(ctx)
	if err != nil {
		return nil, err
	}
	baseTime := record.CreatedAt
	if record.LockedAt != nil && !record.LockedAt.IsZero() {
		baseTime = *record.LockedAt
	}
	if record.LastAcceptedAt != nil && !record.LastAcceptedAt.IsZero() {
		baseTime = *record.LastAcceptedAt
	}
	active, err := s.hasActiveRiderOrders(ctx, riderID)
	if err != nil {
		return nil, err
	}
	if active {
		if record.Status != "paid_locked" {
			now := time.Now()
			record.Status = "paid_locked"
			record.WithdrawableAt = nil
			if err := s.walletRepo.DB().WithContext(ctx).Model(&repository.RiderDepositRecord{}).Where("id = ?", record.ID).Updates(map[string]interface{}{
				"status":          "paid_locked",
				"withdrawable_at": nil,
				"updated_at":      now,
			}).Error; err != nil {
				return nil, err
			}
		}
		return record, nil
	}
	dueAt := baseTime.AddDate(0, 0, policy.UnlockDays)
	if time.Now().After(dueAt) || time.Now().Equal(dueAt) {
		record.Status = "withdrawable"
		record.WithdrawableAt = &dueAt
		if err := s.walletRepo.DB().WithContext(ctx).Model(&repository.RiderDepositRecord{}).Where("id = ?", record.ID).Updates(map[string]interface{}{
			"status":          "withdrawable",
			"withdrawable_at": dueAt,
			"updated_at":      time.Now(),
		}).Error; err != nil {
			return nil, err
		}
	}
	return record, nil
}

func (s *WalletService) GetRiderDepositStatus(ctx context.Context, riderID string) (map[string]interface{}, error) {
	riderID = strings.TrimSpace(riderID)
	if riderID == "" {
		return nil, fmt.Errorf("%w: rider_id is required", ErrInvalidArgument)
	}
	policy, err := s.loadRiderDepositPolicy(ctx)
	if err != nil {
		return nil, err
	}
	record, err := s.refreshRiderDepositState(ctx, riderID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if record == nil || errors.Is(err, gorm.ErrRecordNotFound) {
		return map[string]interface{}{
			"rider_id":          riderID,
			"required":          true,
			"amount":            policy.Amount,
			"status":            "unpaid",
			"canAcceptOrders":   false,
			"unlockDays":        policy.UnlockDays,
			"allowedMethods":    policy.AllowedMethods,
			"autoApproveRefund": policy.AutoApproveWithdrawal,
		}, nil
	}
	return map[string]interface{}{
		"rider_id":          riderID,
		"required":          true,
		"amount":            record.Amount,
		"status":            record.Status,
		"canAcceptOrders":   record.Status == "paid_locked" || record.Status == "withdrawable",
		"lastAcceptedAt":    record.LastAcceptedAt,
		"withdrawableAt":    record.WithdrawableAt,
		"withdrawRequestId": record.WithdrawRequestID,
		"allowedMethods":    policy.AllowedMethods,
		"autoApproveRefund": policy.AutoApproveWithdrawal,
	}, nil
}

func (s *WalletService) CanRiderAcceptOrders(ctx context.Context, riderID string) (bool, string, error) {
	status, err := s.GetRiderDepositStatus(ctx, riderID)
	if err != nil {
		return false, "", err
	}
	if allowed, _ := status["canAcceptOrders"].(bool); allowed {
		return true, "", nil
	}
	return false, "骑手当前未持有有效保证金，请先缴纳 50 元保证金后再接单", nil
}

func (s *WalletService) MarkRiderAccepted(ctx context.Context, riderID string) error {
	record, err := s.latestRiderDepositRecord(ctx, riderID)
	if err != nil {
		return err
	}
	now := time.Now()
	return s.walletRepo.DB().WithContext(ctx).Model(&repository.RiderDepositRecord{}).Where("id = ?", record.ID).Updates(map[string]interface{}{
		"status":           "paid_locked",
		"last_accepted_at": now,
		"locked_at":        now,
		"withdrawable_at":  nil,
		"updated_at":       now,
	}).Error
}

func (s *WalletService) CreateRiderDepositPayIntent(ctx context.Context, req RiderDepositPayRequest) (map[string]interface{}, error) {
	riderID := strings.TrimSpace(req.RiderID)
	if riderID == "" {
		return nil, fmt.Errorf("%w: rider_id is required", ErrInvalidArgument)
	}
	policy, err := s.loadRiderDepositPolicy(ctx)
	if err != nil {
		return nil, err
	}
	if existing, err := s.refreshRiderDepositState(ctx, riderID); err == nil {
		if existing.Status == "paid_locked" || existing.Status == "withdrawable" || existing.Status == "withdrawing" {
			return map[string]interface{}{
				"duplicated": true,
				"rider_id":   riderID,
				"status":     existing.Status,
				"amount":     existing.Amount,
			}, nil
		}
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	method, _, err := normalizePaymentMethod(req.PaymentMethod, req.PaymentChannel)
	if err != nil {
		return nil, err
	}
	allowed := false
	for _, item := range policy.AllowedMethods {
		if normalizeChannel(item) == method {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, fmt.Errorf("%w: payment method is not allowed for rider deposit", ErrInvalidArgument)
	}
	transactionID, transactionIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, "")
	if err != nil {
		return nil, err
	}
	rechargeOrderID, err := nextUnifiedRefID(ctx, s.walletRepo.DB(), bucketRechargeOrder)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	intent, err := s.paymentSvc.createThirdPartyIntent(ctx, method, "rider_deposit", transactionID, policy.Amount, req.Description, req.RiderID, "rider", "app")
	if err != nil {
		return nil, err
	}
	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, riderID, "rider")
		if err != nil {
			return err
		}
		if err := s.walletRepo.CreateWalletTransactionTx(ctx, tx, &repository.WalletTransaction{
			TransactionID:     transactionID,
			TransactionIDRaw:  transactionIDRaw,
			IdempotencyKey:    rechargeOrderID,
			UserID:            riderID,
			UserType:          "rider",
			Type:              "rider_deposit",
			BusinessType:      "rider_deposit",
			BusinessID:        rechargeOrderID,
			Amount:            policy.Amount,
			BalanceBefore:     account.Balance,
			BalanceAfter:      account.Balance,
			PaymentMethod:     method,
			PaymentChannel:    method,
			ThirdPartyOrderID: intent.ThirdPartyOrderID,
			Status:            intent.Status,
			Description:       firstNonEmptyText(req.Description, "骑手保证金缴纳"),
			CompletedAt:       nil,
		}); err != nil {
			return err
		}
		if payload, marshalErr := json.Marshal(intent.ResponseData); marshalErr == nil {
			if err := s.walletRepo.UpdateWalletTransactionStatusTx(ctx, tx, transactionID, intent.Status, string(payload), nil); err != nil {
				return err
			}
		}
		if err := s.walletRepo.CreateRechargeOrderTx(ctx, tx, &repository.RechargeOrder{
			OrderID:           rechargeOrderID,
			TransactionID:     transactionID,
			TransactionIDRaw:  transactionIDRaw,
			UserID:            riderID,
			UserType:          "rider",
			Amount:            policy.Amount,
			ActualAmount:      policy.Amount,
			PaymentMethod:     method,
			PaymentChannel:    method,
			ThirdPartyOrderID: intent.ThirdPartyOrderID,
			Status:            "pending",
		}); err != nil {
			return err
		}
		return tx.WithContext(ctx).Create(&repository.RiderDepositRecord{
			RiderID:         riderID,
			Amount:          policy.Amount,
			PaymentMethod:   method,
			RechargeOrderID: rechargeOrderID,
			Status:          "unpaid",
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"success":           true,
		"rider_id":          riderID,
		"amount":            policy.Amount,
		"status":            intent.Status,
		"rechargeOrderId":   rechargeOrderID,
		"transactionId":     transactionID,
		"thirdPartyOrderId": intent.ThirdPartyOrderID,
		"paymentPayload":    intent.ClientPayload,
		"integrationTarget": intent.IntegrationTarget,
		"gateway":           intent.Gateway,
		"requestedAt":       now,
	}, nil
}

func (s *WalletService) WithdrawRiderDeposit(ctx context.Context, req RiderDepositWithdrawRequest) (map[string]interface{}, error) {
	riderID := strings.TrimSpace(req.RiderID)
	if riderID == "" {
		return nil, fmt.Errorf("%w: rider_id is required", ErrInvalidArgument)
	}
	if strings.TrimSpace(req.WithdrawAccount) == "" {
		return nil, fmt.Errorf("%w: withdraw_account is required", ErrInvalidArgument)
	}
	record, err := s.refreshRiderDepositState(ctx, riderID)
	if err != nil {
		return nil, err
	}
	if record.Status != "withdrawable" {
		return nil, fmt.Errorf("%w: rider deposit is not withdrawable", ErrInvalidArgument)
	}
	preview, err := s.PreviewWithdrawFee(ctx, WithdrawFeePreviewRequest{
		UserID:         riderID,
		UserType:       "rider",
		Amount:         record.Amount,
		WithdrawMethod: req.WithdrawMethod,
		Platform:       "app",
	})
	if err != nil {
		return nil, err
	}
	policy, err := s.loadRiderDepositPolicy(ctx)
	if err != nil {
		return nil, err
	}
	transactionID, transactionIDRaw, err := normalizeUnifiedRefID(ctx, s.walletRepo.DB(), bucketWalletTransaction, "")
	if err != nil {
		return nil, err
	}
	withdrawRequestID, err := nextUnifiedRefID(ctx, s.walletRepo.DB(), bucketWithdrawRequest)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	err = s.walletRepo.WithTransaction(ctx, func(tx *gorm.DB) error {
		account, err := s.walletRepo.GetOrCreateWalletAccountTx(ctx, tx, riderID, "rider")
		if err != nil {
			return err
		}
		if err := s.walletRepo.CreateWalletTransactionTx(ctx, tx, &repository.WalletTransaction{
			TransactionID:    transactionID,
			TransactionIDRaw: transactionIDRaw,
			IdempotencyKey:   withdrawRequestID,
			UserID:           riderID,
			UserType:         "rider",
			Type:             "rider_deposit_withdraw",
			BusinessType:     "rider_deposit_refund",
			BusinessID:       withdrawRequestID,
			Amount:           record.Amount,
			BalanceBefore:    account.Balance,
			BalanceAfter:     account.Balance,
			PaymentMethod:    "ifpay",
			PaymentChannel:   normalizeChannel(req.WithdrawMethod),
			Status:           "pending_transfer",
			Description:      "骑手保证金退回",
		}); err != nil {
			return err
		}
		if err := s.walletRepo.CreateWithdrawRequestTx(ctx, tx, &repository.WithdrawRequest{
			RequestID:        withdrawRequestID,
			TransactionID:    transactionID,
			TransactionIDRaw: transactionIDRaw,
			UserID:           riderID,
			UserType:         "rider",
			Amount:           record.Amount,
			Fee:              toInt64(preview["fee"]),
			ActualAmount:     toInt64(preview["actualAmount"]),
			WithdrawMethod:   normalizeChannel(req.WithdrawMethod),
			WithdrawAccount:  strings.TrimSpace(req.WithdrawAccount),
			WithdrawName:     strings.TrimSpace(req.WithdrawName),
			BankName:         strings.TrimSpace(req.BankName),
			BankBranch:       strings.TrimSpace(req.BankBranch),
			Status:           "pending_transfer",
			ReviewRemark:     "保证金提现自动通过",
		}); err != nil {
			return err
		}
		return tx.WithContext(ctx).Model(&repository.RiderDepositRecord{}).Where("id = ?", record.ID).Updates(map[string]interface{}{
			"status":              "withdrawing",
			"withdraw_request_id": withdrawRequestID,
			"updated_at":          now,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	status := "pending_transfer"
	autoExecuted := false
	autoExecuteError := ""
	if policy.AutoApproveWithdrawal {
		autoExecuted = true
		execResult, execErr := s.ReviewWithdraw(ctx, WithdrawReviewRequest{
			RequestID:      withdrawRequestID,
			Action:         "execute",
			ReviewerID:     "system-auto",
			ReviewerName:   "system-auto",
			Remark:         "保证金提现自动发起打款",
			TransferResult: "保证金提现自动发起打款",
		}, AdminWalletActor{
			AdminID:   "system-auto",
			AdminName: "system-auto",
		})
		if execErr != nil {
			autoExecuteError = execErr.Error()
		} else if latestStatus, _ := execResult["status"].(string); strings.TrimSpace(latestStatus) != "" {
			status = latestStatus
		}
	}
	return map[string]interface{}{
		"success":          true,
		"requestId":        withdrawRequestID,
		"transactionId":    transactionID,
		"amount":           record.Amount,
		"fee":              preview["fee"],
		"actualAmount":     preview["actualAmount"],
		"arrivalText":      preview["arrivalText"],
		"status":           status,
		"autoExecuted":     autoExecuted,
		"autoExecuteError": autoExecuteError,
	}, nil
}

func (s *WalletService) GetRiderDepositOverview(ctx context.Context) (map[string]interface{}, error) {
	var total, paidLocked, withdrawable, withdrawing int64
	db := s.walletRepo.DB().WithContext(ctx).Model(&repository.RiderDepositRecord{})
	if err := db.Count(&total).Error; err != nil {
		return nil, err
	}
	if err := db.Where("status = ?", "paid_locked").Count(&paidLocked).Error; err != nil {
		return nil, err
	}
	if err := db.Where("status = ?", "withdrawable").Count(&withdrawable).Error; err != nil {
		return nil, err
	}
	if err := db.Where("status = ?", "withdrawing").Count(&withdrawing).Error; err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"total":        total,
		"paid_locked":  paidLocked,
		"withdrawable": withdrawable,
		"withdrawing":  withdrawing,
	}, nil
}

func (s *WalletService) ListRiderDepositRecords(ctx context.Context, status string, page, limit int) (map[string]interface{}, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	var total int64
	items := make([]repository.RiderDepositRecord, 0)
	query := s.walletRepo.DB().WithContext(ctx).Model(&repository.RiderDepositRecord{})
	if strings.TrimSpace(status) != "" {
		query = query.Where("status = ?", strings.TrimSpace(status))
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}
	if err := query.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"items": items,
		"pagination": map[string]interface{}{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}, nil
}
