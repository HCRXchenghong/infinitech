package service

import (
	"fmt"
	"net/url"
	"strings"
)

const (
	DefaultMapProvider     = "proxy"
	DefaultMapTileTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
	DefaultMapTimeoutSec   = 5
)

var defaultRiderExceptionReportReasons = []string{
	"商家出餐慢",
	"联系不上顾客",
	"顾客位置错误",
	"车辆故障",
	"恶劣天气",
	"道路拥堵",
	"订单信息错误",
	"其他原因",
}

var defaultRiderInsuranceClaimSteps = []string{
	"发生意外后第一时间联系客服或站点负责人",
	"准备相关证明材料（医疗票据、诊断证明、事故说明等）",
	"按平台指引提交理赔申请与补充材料",
	"等待保险审核与回款通知",
}

type RiderInsuranceCoverageItem struct {
	Icon   string `json:"icon"`
	Name   string `json:"name"`
	Amount string `json:"amount"`
}

type ServiceSettings struct {
	ServicePhone                string                       `json:"service_phone"`
	SupportChatTitle            string                       `json:"support_chat_title"`
	SupportChatWelcomeMessage   string                       `json:"support_chat_welcome_message"`
	MerchantChatWelcomeMessage  string                       `json:"merchant_chat_welcome_message"`
	RiderChatWelcomeMessage     string                       `json:"rider_chat_welcome_message"`
	RiderAboutSummary           string                       `json:"rider_about_summary"`
	RiderPortalTitle            string                       `json:"rider_portal_title"`
	RiderPortalSubtitle         string                       `json:"rider_portal_subtitle"`
	RiderPortalLoginFooter      string                       `json:"rider_portal_login_footer"`
	MerchantPortalTitle         string                       `json:"merchant_portal_title"`
	MerchantPortalSubtitle      string                       `json:"merchant_portal_subtitle"`
	MerchantPortalLoginFooter   string                       `json:"merchant_portal_login_footer"`
	MerchantPrivacyPolicy       string                       `json:"merchant_privacy_policy"`
	MerchantServiceAgreement    string                       `json:"merchant_service_agreement"`
	ConsumerPortalTitle         string                       `json:"consumer_portal_title"`
	ConsumerPortalSubtitle      string                       `json:"consumer_portal_subtitle"`
	ConsumerPortalLoginFooter   string                       `json:"consumer_portal_login_footer"`
	ConsumerAboutSummary        string                       `json:"consumer_about_summary"`
	ConsumerPrivacyPolicy       string                       `json:"consumer_privacy_policy"`
	ConsumerUserAgreement       string                       `json:"consumer_user_agreement"`
	InviteLandingURL            string                       `json:"invite_landing_url"`
	WechatLoginEnabled          bool                         `json:"wechat_login_enabled"`
	WechatLoginEntryURL         string                       `json:"wechat_login_entry_url"`
	MedicineSupportPhone        string                       `json:"medicine_support_phone"`
	MedicineSupportTitle        string                       `json:"medicine_support_title"`
	MedicineSupportSubtitle     string                       `json:"medicine_support_subtitle"`
	MedicineDeliveryDescription string                       `json:"medicine_delivery_description"`
	MedicineSeasonTip           string                       `json:"medicine_season_tip"`
	RiderExceptionReportReasons []string                     `json:"rider_exception_report_reasons"`
	RiderInsuranceStatusTitle   string                       `json:"rider_insurance_status_title"`
	RiderInsuranceStatusDesc    string                       `json:"rider_insurance_status_desc"`
	RiderInsurancePolicyNumber  string                       `json:"rider_insurance_policy_number"`
	RiderInsuranceProvider      string                       `json:"rider_insurance_provider"`
	RiderInsuranceEffectiveDate string                       `json:"rider_insurance_effective_date"`
	RiderInsuranceExpireDate    string                       `json:"rider_insurance_expire_date"`
	RiderInsuranceClaimURL      string                       `json:"rider_insurance_claim_url"`
	RiderInsuranceDetailURL     string                       `json:"rider_insurance_detail_url"`
	RiderInsuranceClaimButton   string                       `json:"rider_insurance_claim_button_text"`
	RiderInsuranceDetailButton  string                       `json:"rider_insurance_detail_button_text"`
	RiderInsuranceClaimSteps    []string                     `json:"rider_insurance_claim_steps"`
	RiderInsuranceCoverages     []RiderInsuranceCoverageItem `json:"rider_insurance_coverages"`
	MapProvider                 string                       `json:"map_provider"`
	MapSearchURL                string                       `json:"map_search_url"`
	MapReverseURL               string                       `json:"map_reverse_url"`
	MapAPIKey                   string                       `json:"map_api_key"`
	MapTileTemplate             string                       `json:"map_tile_template"`
	MapTimeoutSec               int                          `json:"map_timeout_seconds"`
}

type PublicRuntimeSettings struct {
	ServicePhone                string                       `json:"service_phone"`
	SupportChatTitle            string                       `json:"support_chat_title"`
	SupportChatWelcomeMessage   string                       `json:"support_chat_welcome_message"`
	MerchantChatWelcomeMessage  string                       `json:"merchant_chat_welcome_message"`
	RiderChatWelcomeMessage     string                       `json:"rider_chat_welcome_message"`
	RiderAboutSummary           string                       `json:"rider_about_summary"`
	RiderPortalTitle            string                       `json:"rider_portal_title"`
	RiderPortalSubtitle         string                       `json:"rider_portal_subtitle"`
	RiderPortalLoginFooter      string                       `json:"rider_portal_login_footer"`
	MerchantPortalTitle         string                       `json:"merchant_portal_title"`
	MerchantPortalSubtitle      string                       `json:"merchant_portal_subtitle"`
	MerchantPortalLoginFooter   string                       `json:"merchant_portal_login_footer"`
	MerchantPrivacyPolicy       string                       `json:"merchant_privacy_policy"`
	MerchantServiceAgreement    string                       `json:"merchant_service_agreement"`
	ConsumerPortalTitle         string                       `json:"consumer_portal_title"`
	ConsumerPortalSubtitle      string                       `json:"consumer_portal_subtitle"`
	ConsumerPortalLoginFooter   string                       `json:"consumer_portal_login_footer"`
	ConsumerAboutSummary        string                       `json:"consumer_about_summary"`
	ConsumerPrivacyPolicy       string                       `json:"consumer_privacy_policy"`
	ConsumerUserAgreement       string                       `json:"consumer_user_agreement"`
	InviteLandingURL            string                       `json:"invite_landing_url"`
	WechatLoginEnabled          bool                         `json:"wechat_login_enabled"`
	WechatLoginEntryURL         string                       `json:"wechat_login_entry_url"`
	MedicineSupportPhone        string                       `json:"medicine_support_phone"`
	MedicineSupportTitle        string                       `json:"medicine_support_title"`
	MedicineSupportSubtitle     string                       `json:"medicine_support_subtitle"`
	MedicineDeliveryDescription string                       `json:"medicine_delivery_description"`
	MedicineSeasonTip           string                       `json:"medicine_season_tip"`
	RiderExceptionReportReasons []string                     `json:"rider_exception_report_reasons"`
	RiderInsuranceStatusTitle   string                       `json:"rider_insurance_status_title"`
	RiderInsuranceStatusDesc    string                       `json:"rider_insurance_status_desc"`
	RiderInsurancePolicyNumber  string                       `json:"rider_insurance_policy_number"`
	RiderInsuranceProvider      string                       `json:"rider_insurance_provider"`
	RiderInsuranceEffectiveDate string                       `json:"rider_insurance_effective_date"`
	RiderInsuranceExpireDate    string                       `json:"rider_insurance_expire_date"`
	RiderInsuranceClaimURL      string                       `json:"rider_insurance_claim_url"`
	RiderInsuranceDetailURL     string                       `json:"rider_insurance_detail_url"`
	RiderInsuranceClaimButton   string                       `json:"rider_insurance_claim_button_text"`
	RiderInsuranceDetailButton  string                       `json:"rider_insurance_detail_button_text"`
	RiderInsuranceClaimSteps    []string                     `json:"rider_insurance_claim_steps"`
	RiderInsuranceCoverages     []RiderInsuranceCoverageItem `json:"rider_insurance_coverages"`
}

func DefaultServiceSettings() ServiceSettings {
	settings := ServiceSettings{
		ServicePhone:                "",
		SupportChatTitle:            "平台客服",
		SupportChatWelcomeMessage:   "您好！我是平台客服，有什么可以帮助您的吗？",
		MerchantChatWelcomeMessage:  "欢迎光临，有什么可以帮您的？",
		RiderChatWelcomeMessage:     "您好，您的骑手正在配送中。",
		RiderAboutSummary:           "骑手端聚焦接单、配送、收入与保障场景，帮助骑手稳定履约并提升效率。",
		RiderPortalTitle:            "骑手登录",
		RiderPortalSubtitle:         "悦享e食 · 骑手端",
		RiderPortalLoginFooter:      "骑手账号由平台邀约开通",
		InviteLandingURL:            "",
		WechatLoginEnabled:          false,
		WechatLoginEntryURL:         "",
		MedicineSupportPhone:        "",
		MedicineSupportTitle:        "一键医务室",
		MedicineSupportSubtitle:     "紧急连线\n人工服务",
		MedicineDeliveryDescription: "24小时配送\n平均30分钟达",
		MedicineSeasonTip:           "近期流感高发，建议常备常用药。如遇高热不退，请及时就医。",
		RiderExceptionReportReasons: cloneStringSlice(defaultRiderExceptionReportReasons),
		RiderInsuranceStatusTitle:   "骑手保障信息待配置",
		RiderInsuranceStatusDesc:    "请联系平台管理员完善承保信息与理赔入口",
		RiderInsurancePolicyNumber:  "",
		RiderInsuranceProvider:      "",
		RiderInsuranceEffectiveDate: "",
		RiderInsuranceExpireDate:    "",
		RiderInsuranceClaimURL:      "",
		RiderInsuranceDetailURL:     "",
		RiderInsuranceClaimButton:   "联系平台处理",
		RiderInsuranceDetailButton:  "查看保障说明",
		RiderInsuranceClaimSteps:    cloneStringSlice(defaultRiderInsuranceClaimSteps),
		RiderInsuranceCoverages:     []RiderInsuranceCoverageItem{},
		MapProvider:                 DefaultMapProvider,
		MapSearchURL:                "",
		MapReverseURL:               "",
		MapAPIKey:                   "",
		MapTileTemplate:             DefaultMapTileTemplate,
		MapTimeoutSec:               DefaultMapTimeoutSec,
	}
	settings.MerchantPortalTitle = "商户工作台"
	settings.MerchantPortalSubtitle = "悦享e食 · Merchant Console"
	settings.MerchantPortalLoginFooter = "账号由平台管理员分配，登录后可直接管理订单和商品"
	settings.MerchantPrivacyPolicy = "我们会在必要范围内处理商户信息，用于订单履约、结算和风控，详细条款请联系平台管理员获取。"
	settings.MerchantServiceAgreement = "使用商户端即表示你同意平台商户服务协议，包含店铺经营规范、结算与售后条款。"
	settings.ConsumerPortalTitle = "欢迎使用悦享e食"
	settings.ConsumerPortalSubtitle = "一站式本地生活服务平台"
	settings.ConsumerPortalLoginFooter = "登录后可同步订单、消息、地址与优惠权益"
	settings.ConsumerAboutSummary = "悦享e食专注本地生活即时服务，覆盖外卖、跑腿、到店和会员等场景，持续优化用户体验。"
	settings.ConsumerPrivacyPolicy = "平台仅在提供服务所必需的范围内处理账号、定位和订单信息，并遵循最小必要原则。"
	settings.ConsumerUserAgreement = "使用平台服务前，请确认已阅读并同意用户协议、隐私政策及相关活动规则。"
	return settings
}

func NormalizeServiceSettings(input ServiceSettings) ServiceSettings {
	defaults := DefaultServiceSettings()
	settings := defaults

	settings.ServicePhone = strings.TrimSpace(input.ServicePhone)
	settings.SupportChatTitle = normalizeOptionalMultiline(input.SupportChatTitle)
	settings.SupportChatWelcomeMessage = normalizeOptionalMultiline(input.SupportChatWelcomeMessage)
	settings.MerchantChatWelcomeMessage = normalizeOptionalMultiline(input.MerchantChatWelcomeMessage)
	settings.RiderChatWelcomeMessage = normalizeOptionalMultiline(input.RiderChatWelcomeMessage)
	settings.RiderAboutSummary = normalizeOptionalMultiline(input.RiderAboutSummary)
	settings.RiderPortalTitle = normalizeOptionalMultiline(input.RiderPortalTitle)
	settings.RiderPortalSubtitle = normalizeOptionalMultiline(input.RiderPortalSubtitle)
	settings.RiderPortalLoginFooter = normalizeOptionalMultiline(input.RiderPortalLoginFooter)
	settings.MerchantPortalTitle = normalizeOptionalMultiline(input.MerchantPortalTitle)
	settings.MerchantPortalSubtitle = normalizeOptionalMultiline(input.MerchantPortalSubtitle)
	settings.MerchantPortalLoginFooter = normalizeOptionalMultiline(input.MerchantPortalLoginFooter)
	settings.MerchantPrivacyPolicy = normalizeOptionalMultiline(input.MerchantPrivacyPolicy)
	settings.MerchantServiceAgreement = normalizeOptionalMultiline(input.MerchantServiceAgreement)
	settings.ConsumerPortalTitle = normalizeOptionalMultiline(input.ConsumerPortalTitle)
	settings.ConsumerPortalSubtitle = normalizeOptionalMultiline(input.ConsumerPortalSubtitle)
	settings.ConsumerPortalLoginFooter = normalizeOptionalMultiline(input.ConsumerPortalLoginFooter)
	settings.ConsumerAboutSummary = normalizeOptionalMultiline(input.ConsumerAboutSummary)
	settings.ConsumerPrivacyPolicy = normalizeOptionalMultiline(input.ConsumerPrivacyPolicy)
	settings.ConsumerUserAgreement = normalizeOptionalMultiline(input.ConsumerUserAgreement)
	settings.InviteLandingURL = strings.TrimSpace(input.InviteLandingURL)
	settings.WechatLoginEnabled = input.WechatLoginEnabled
	settings.WechatLoginEntryURL = strings.TrimSpace(input.WechatLoginEntryURL)
	settings.MedicineSupportPhone = strings.TrimSpace(input.MedicineSupportPhone)
	settings.MedicineSupportTitle = normalizeOptionalMultiline(input.MedicineSupportTitle)
	settings.MedicineSupportSubtitle = normalizeOptionalMultiline(input.MedicineSupportSubtitle)
	settings.MedicineDeliveryDescription = normalizeOptionalMultiline(input.MedicineDeliveryDescription)
	settings.MedicineSeasonTip = normalizeOptionalMultiline(input.MedicineSeasonTip)
	settings.RiderExceptionReportReasons = normalizeRuntimeStringList(input.RiderExceptionReportReasons)
	settings.RiderInsuranceStatusTitle = normalizeOptionalMultiline(input.RiderInsuranceStatusTitle)
	settings.RiderInsuranceStatusDesc = normalizeOptionalMultiline(input.RiderInsuranceStatusDesc)
	settings.RiderInsurancePolicyNumber = strings.TrimSpace(input.RiderInsurancePolicyNumber)
	settings.RiderInsuranceProvider = strings.TrimSpace(input.RiderInsuranceProvider)
	settings.RiderInsuranceEffectiveDate = strings.TrimSpace(input.RiderInsuranceEffectiveDate)
	settings.RiderInsuranceExpireDate = strings.TrimSpace(input.RiderInsuranceExpireDate)
	settings.RiderInsuranceClaimURL = strings.TrimSpace(input.RiderInsuranceClaimURL)
	settings.RiderInsuranceDetailURL = strings.TrimSpace(input.RiderInsuranceDetailURL)
	settings.RiderInsuranceClaimButton = normalizeOptionalMultiline(input.RiderInsuranceClaimButton)
	settings.RiderInsuranceDetailButton = normalizeOptionalMultiline(input.RiderInsuranceDetailButton)
	settings.RiderInsuranceClaimSteps = normalizeRuntimeStringList(input.RiderInsuranceClaimSteps)
	settings.RiderInsuranceCoverages = normalizeRiderInsuranceCoverages(input.RiderInsuranceCoverages)
	settings.MapProvider = normalizeMapProvider(input.MapProvider)
	settings.MapSearchURL = strings.TrimSpace(input.MapSearchURL)
	settings.MapReverseURL = strings.TrimSpace(input.MapReverseURL)
	settings.MapAPIKey = strings.TrimSpace(input.MapAPIKey)
	settings.MapTileTemplate = strings.TrimSpace(input.MapTileTemplate)
	settings.MapTimeoutSec = input.MapTimeoutSec

	if settings.MapProvider == "" {
		settings.MapProvider = DefaultMapProvider
	}
	if settings.SupportChatTitle == "" {
		settings.SupportChatTitle = defaults.SupportChatTitle
	}
	if settings.SupportChatWelcomeMessage == "" {
		settings.SupportChatWelcomeMessage = defaults.SupportChatWelcomeMessage
	}
	if settings.MerchantChatWelcomeMessage == "" {
		settings.MerchantChatWelcomeMessage = defaults.MerchantChatWelcomeMessage
	}
	if settings.RiderChatWelcomeMessage == "" {
		settings.RiderChatWelcomeMessage = defaults.RiderChatWelcomeMessage
	}
	if settings.RiderAboutSummary == "" {
		settings.RiderAboutSummary = defaults.RiderAboutSummary
	}
	if settings.RiderPortalTitle == "" {
		settings.RiderPortalTitle = defaults.RiderPortalTitle
	}
	if settings.RiderPortalSubtitle == "" {
		settings.RiderPortalSubtitle = defaults.RiderPortalSubtitle
	}
	if settings.RiderPortalLoginFooter == "" {
		settings.RiderPortalLoginFooter = defaults.RiderPortalLoginFooter
	}
	if settings.MerchantPortalTitle == "" {
		settings.MerchantPortalTitle = defaults.MerchantPortalTitle
	}
	if settings.MerchantPortalSubtitle == "" {
		settings.MerchantPortalSubtitle = defaults.MerchantPortalSubtitle
	}
	if settings.MerchantPortalLoginFooter == "" {
		settings.MerchantPortalLoginFooter = defaults.MerchantPortalLoginFooter
	}
	if settings.MerchantPrivacyPolicy == "" {
		settings.MerchantPrivacyPolicy = defaults.MerchantPrivacyPolicy
	}
	if settings.MerchantServiceAgreement == "" {
		settings.MerchantServiceAgreement = defaults.MerchantServiceAgreement
	}
	if settings.ConsumerPortalTitle == "" {
		settings.ConsumerPortalTitle = defaults.ConsumerPortalTitle
	}
	if settings.ConsumerPortalSubtitle == "" {
		settings.ConsumerPortalSubtitle = defaults.ConsumerPortalSubtitle
	}
	if settings.ConsumerPortalLoginFooter == "" {
		settings.ConsumerPortalLoginFooter = defaults.ConsumerPortalLoginFooter
	}
	if settings.ConsumerAboutSummary == "" {
		settings.ConsumerAboutSummary = defaults.ConsumerAboutSummary
	}
	if settings.ConsumerPrivacyPolicy == "" {
		settings.ConsumerPrivacyPolicy = defaults.ConsumerPrivacyPolicy
	}
	if settings.ConsumerUserAgreement == "" {
		settings.ConsumerUserAgreement = defaults.ConsumerUserAgreement
	}
	if settings.MedicineSupportTitle == "" {
		settings.MedicineSupportTitle = defaults.MedicineSupportTitle
	}
	if settings.MedicineSupportSubtitle == "" {
		settings.MedicineSupportSubtitle = defaults.MedicineSupportSubtitle
	}
	if settings.MedicineDeliveryDescription == "" {
		settings.MedicineDeliveryDescription = defaults.MedicineDeliveryDescription
	}
	if settings.MedicineSeasonTip == "" {
		settings.MedicineSeasonTip = defaults.MedicineSeasonTip
	}
	if len(settings.RiderExceptionReportReasons) == 0 {
		settings.RiderExceptionReportReasons = cloneStringSlice(defaultRiderExceptionReportReasons)
	}
	if settings.RiderInsuranceStatusTitle == "" {
		settings.RiderInsuranceStatusTitle = defaults.RiderInsuranceStatusTitle
	}
	if settings.RiderInsuranceStatusDesc == "" {
		settings.RiderInsuranceStatusDesc = defaults.RiderInsuranceStatusDesc
	}
	if settings.RiderInsuranceClaimButton == "" {
		settings.RiderInsuranceClaimButton = defaults.RiderInsuranceClaimButton
	}
	if settings.RiderInsuranceDetailButton == "" {
		settings.RiderInsuranceDetailButton = defaults.RiderInsuranceDetailButton
	}
	if len(settings.RiderInsuranceClaimSteps) == 0 {
		settings.RiderInsuranceClaimSteps = cloneStringSlice(defaultRiderInsuranceClaimSteps)
	}
	if settings.MapTileTemplate == "" {
		settings.MapTileTemplate = DefaultMapTileTemplate
	}
	if settings.MapTimeoutSec <= 0 {
		settings.MapTimeoutSec = DefaultMapTimeoutSec
	}

	return settings
}

func ValidateServiceSettings(input ServiceSettings) error {
	settings := NormalizeServiceSettings(input)

	if len(settings.ServicePhone) > 64 {
		return fmt.Errorf("service_phone is too long")
	}
	if len(settings.SupportChatTitle) > 80 {
		return fmt.Errorf("support_chat_title is too long")
	}
	if len(settings.SupportChatWelcomeMessage) > 500 {
		return fmt.Errorf("support_chat_welcome_message is too long")
	}
	if len(settings.MerchantChatWelcomeMessage) > 500 {
		return fmt.Errorf("merchant_chat_welcome_message is too long")
	}
	if len(settings.RiderChatWelcomeMessage) > 500 {
		return fmt.Errorf("rider_chat_welcome_message is too long")
	}
	if len(settings.RiderAboutSummary) > 500 {
		return fmt.Errorf("rider_about_summary is too long")
	}
	if len(settings.RiderPortalTitle) > 80 {
		return fmt.Errorf("rider_portal_title is too long")
	}
	if len(settings.RiderPortalSubtitle) > 120 {
		return fmt.Errorf("rider_portal_subtitle is too long")
	}
	if len(settings.RiderPortalLoginFooter) > 200 {
		return fmt.Errorf("rider_portal_login_footer is too long")
	}
	if len(settings.MerchantPortalTitle) > 80 {
		return fmt.Errorf("merchant_portal_title is too long")
	}
	if len(settings.MerchantPortalSubtitle) > 120 {
		return fmt.Errorf("merchant_portal_subtitle is too long")
	}
	if len(settings.MerchantPortalLoginFooter) > 200 {
		return fmt.Errorf("merchant_portal_login_footer is too long")
	}
	if len(settings.MerchantPrivacyPolicy) > 500 {
		return fmt.Errorf("merchant_privacy_policy is too long")
	}
	if len(settings.MerchantServiceAgreement) > 500 {
		return fmt.Errorf("merchant_service_agreement is too long")
	}
	if len(settings.ConsumerPortalTitle) > 80 {
		return fmt.Errorf("consumer_portal_title is too long")
	}
	if len(settings.ConsumerPortalSubtitle) > 120 {
		return fmt.Errorf("consumer_portal_subtitle is too long")
	}
	if len(settings.ConsumerPortalLoginFooter) > 200 {
		return fmt.Errorf("consumer_portal_login_footer is too long")
	}
	if len(settings.ConsumerAboutSummary) > 500 {
		return fmt.Errorf("consumer_about_summary is too long")
	}
	if len(settings.ConsumerPrivacyPolicy) > 500 {
		return fmt.Errorf("consumer_privacy_policy is too long")
	}
	if len(settings.ConsumerUserAgreement) > 500 {
		return fmt.Errorf("consumer_user_agreement is too long")
	}
	if len(settings.MedicineSupportPhone) > 64 {
		return fmt.Errorf("medicine_support_phone is too long")
	}
	if err := validateOptionalServiceURL(settings.InviteLandingURL, "invite_landing_url"); err != nil {
		return err
	}
	if len(settings.InviteLandingURL) > 1024 {
		return fmt.Errorf("invite_landing_url is too long")
	}
	if err := validateOptionalServiceURL(settings.WechatLoginEntryURL, "wechat_login_entry_url"); err != nil {
		return err
	}
	if len(settings.WechatLoginEntryURL) > 1024 {
		return fmt.Errorf("wechat_login_entry_url is too long")
	}
	if len(settings.MedicineSupportTitle) > 80 {
		return fmt.Errorf("medicine_support_title is too long")
	}
	if len(settings.MedicineSupportSubtitle) > 200 {
		return fmt.Errorf("medicine_support_subtitle is too long")
	}
	if len(settings.MedicineDeliveryDescription) > 200 {
		return fmt.Errorf("medicine_delivery_description is too long")
	}
	if len(settings.MedicineSeasonTip) > 500 {
		return fmt.Errorf("medicine_season_tip is too long")
	}
	if len(settings.RiderExceptionReportReasons) > 20 {
		return fmt.Errorf("rider_exception_report_reasons exceeds maximum size")
	}
	for _, reason := range settings.RiderExceptionReportReasons {
		if len(reason) > 64 {
			return fmt.Errorf("rider_exception_report_reasons item is too long")
		}
	}
	if len(settings.RiderInsuranceStatusTitle) > 80 {
		return fmt.Errorf("rider_insurance_status_title is too long")
	}
	if len(settings.RiderInsuranceStatusDesc) > 200 {
		return fmt.Errorf("rider_insurance_status_desc is too long")
	}
	if len(settings.RiderInsurancePolicyNumber) > 120 {
		return fmt.Errorf("rider_insurance_policy_number is too long")
	}
	if len(settings.RiderInsuranceProvider) > 120 {
		return fmt.Errorf("rider_insurance_provider is too long")
	}
	if len(settings.RiderInsuranceEffectiveDate) > 40 {
		return fmt.Errorf("rider_insurance_effective_date is too long")
	}
	if len(settings.RiderInsuranceExpireDate) > 40 {
		return fmt.Errorf("rider_insurance_expire_date is too long")
	}
	if err := validateOptionalServiceURL(settings.RiderInsuranceClaimURL, "rider_insurance_claim_url"); err != nil {
		return err
	}
	if err := validateOptionalServiceURL(settings.RiderInsuranceDetailURL, "rider_insurance_detail_url"); err != nil {
		return err
	}
	if len(settings.RiderInsuranceClaimButton) > 40 {
		return fmt.Errorf("rider_insurance_claim_button_text is too long")
	}
	if len(settings.RiderInsuranceDetailButton) > 40 {
		return fmt.Errorf("rider_insurance_detail_button_text is too long")
	}
	if len(settings.RiderInsuranceClaimSteps) > 10 {
		return fmt.Errorf("rider_insurance_claim_steps exceeds maximum size")
	}
	for _, step := range settings.RiderInsuranceClaimSteps {
		if len(step) > 200 {
			return fmt.Errorf("rider_insurance_claim_steps item is too long")
		}
	}
	if len(settings.RiderInsuranceCoverages) > 10 {
		return fmt.Errorf("rider_insurance_coverages exceeds maximum size")
	}
	for _, coverage := range settings.RiderInsuranceCoverages {
		if len(coverage.Icon) > 64 {
			return fmt.Errorf("rider_insurance_coverages icon is too long")
		}
		if len(coverage.Name) > 80 {
			return fmt.Errorf("rider_insurance_coverages name is too long")
		}
		if len(coverage.Amount) > 80 {
			return fmt.Errorf("rider_insurance_coverages amount is too long")
		}
	}
	if settings.MapProvider != "proxy" && settings.MapProvider != "custom" && settings.MapProvider != "tianditu" {
		return fmt.Errorf("map_provider is invalid")
	}
	if settings.MapProvider == "tianditu" && strings.TrimSpace(settings.MapAPIKey) == "" {
		return fmt.Errorf("map_api_key is required when map_provider is tianditu")
	}
	if err := validateOptionalServiceURL(settings.MapSearchURL, "map_search_url"); err != nil {
		return err
	}
	if err := validateOptionalServiceURL(settings.MapReverseURL, "map_reverse_url"); err != nil {
		return err
	}
	if err := validateOptionalMapTileTemplate(settings.MapTileTemplate); err != nil {
		return err
	}
	if settings.MapTimeoutSec < 1 || settings.MapTimeoutSec > 30 {
		return fmt.Errorf("map_timeout_seconds must be between 1 and 30")
	}
	if len(settings.MapAPIKey) > 512 {
		return fmt.Errorf("map_api_key is too long")
	}

	return nil
}

func BuildPublicRuntimeSettings(input ServiceSettings) PublicRuntimeSettings {
	settings := NormalizeServiceSettings(input)
	wechatEntryURL := strings.TrimSpace(settings.WechatLoginEntryURL)
	wechatEnabled := settings.WechatLoginEnabled && wechatEntryURL != ""
	medicineSupportPhone := strings.TrimSpace(settings.MedicineSupportPhone)

	if !wechatEnabled {
		wechatEntryURL = ""
	}
	if medicineSupportPhone == "" {
		medicineSupportPhone = settings.ServicePhone
	}

	return PublicRuntimeSettings{
		ServicePhone:                settings.ServicePhone,
		SupportChatTitle:            settings.SupportChatTitle,
		SupportChatWelcomeMessage:   settings.SupportChatWelcomeMessage,
		MerchantChatWelcomeMessage:  settings.MerchantChatWelcomeMessage,
		RiderChatWelcomeMessage:     settings.RiderChatWelcomeMessage,
		RiderAboutSummary:           settings.RiderAboutSummary,
		RiderPortalTitle:            settings.RiderPortalTitle,
		RiderPortalSubtitle:         settings.RiderPortalSubtitle,
		RiderPortalLoginFooter:      settings.RiderPortalLoginFooter,
		MerchantPortalTitle:         settings.MerchantPortalTitle,
		MerchantPortalSubtitle:      settings.MerchantPortalSubtitle,
		MerchantPortalLoginFooter:   settings.MerchantPortalLoginFooter,
		MerchantPrivacyPolicy:       settings.MerchantPrivacyPolicy,
		MerchantServiceAgreement:    settings.MerchantServiceAgreement,
		ConsumerPortalTitle:         settings.ConsumerPortalTitle,
		ConsumerPortalSubtitle:      settings.ConsumerPortalSubtitle,
		ConsumerPortalLoginFooter:   settings.ConsumerPortalLoginFooter,
		ConsumerAboutSummary:        settings.ConsumerAboutSummary,
		ConsumerPrivacyPolicy:       settings.ConsumerPrivacyPolicy,
		ConsumerUserAgreement:       settings.ConsumerUserAgreement,
		InviteLandingURL:            settings.InviteLandingURL,
		WechatLoginEnabled:          wechatEnabled,
		WechatLoginEntryURL:         wechatEntryURL,
		MedicineSupportPhone:        medicineSupportPhone,
		MedicineSupportTitle:        settings.MedicineSupportTitle,
		MedicineSupportSubtitle:     settings.MedicineSupportSubtitle,
		MedicineDeliveryDescription: settings.MedicineDeliveryDescription,
		MedicineSeasonTip:           settings.MedicineSeasonTip,
		RiderExceptionReportReasons: cloneStringSlice(settings.RiderExceptionReportReasons),
		RiderInsuranceStatusTitle:   settings.RiderInsuranceStatusTitle,
		RiderInsuranceStatusDesc:    settings.RiderInsuranceStatusDesc,
		RiderInsurancePolicyNumber:  settings.RiderInsurancePolicyNumber,
		RiderInsuranceProvider:      settings.RiderInsuranceProvider,
		RiderInsuranceEffectiveDate: settings.RiderInsuranceEffectiveDate,
		RiderInsuranceExpireDate:    settings.RiderInsuranceExpireDate,
		RiderInsuranceClaimURL:      settings.RiderInsuranceClaimURL,
		RiderInsuranceDetailURL:     settings.RiderInsuranceDetailURL,
		RiderInsuranceClaimButton:   settings.RiderInsuranceClaimButton,
		RiderInsuranceDetailButton:  settings.RiderInsuranceDetailButton,
		RiderInsuranceClaimSteps:    cloneStringSlice(settings.RiderInsuranceClaimSteps),
		RiderInsuranceCoverages:     cloneRiderInsuranceCoverages(settings.RiderInsuranceCoverages),
	}
}

func normalizeMapProvider(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

func validateOptionalServiceURL(raw, fieldName string) error {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil {
		return fmt.Errorf("%s is invalid", fieldName)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("%s must use http or https", fieldName)
	}
	if strings.TrimSpace(parsed.Host) == "" {
		return fmt.Errorf("%s host is required", fieldName)
	}
	return nil
}

func validateOptionalMapTileTemplate(raw string) error {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil
	}
	sanitized := strings.NewReplacer("{z}", "0", "{x}", "0", "{y}", "0").Replace(value)
	return validateOptionalServiceURL(sanitized, "map_tile_template")
}

func normalizeOptionalMultiline(value string) string {
	normalized := strings.ReplaceAll(value, "\r\n", "\n")
	normalized = strings.ReplaceAll(normalized, "\r", "\n")
	return strings.TrimSpace(normalized)
}

func normalizeRuntimeStringList(items []string) []string {
	if len(items) == 0 {
		return []string{}
	}

	result := make([]string, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for _, item := range items {
		normalized := strings.TrimSpace(item)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}

func normalizeRiderInsuranceCoverages(items []RiderInsuranceCoverageItem) []RiderInsuranceCoverageItem {
	if len(items) == 0 {
		return []RiderInsuranceCoverageItem{}
	}

	result := make([]RiderInsuranceCoverageItem, 0, len(items))
	for _, item := range items {
		normalized := RiderInsuranceCoverageItem{
			Icon:   strings.TrimSpace(item.Icon),
			Name:   strings.TrimSpace(item.Name),
			Amount: strings.TrimSpace(item.Amount),
		}
		if normalized.Icon == "" && normalized.Name == "" && normalized.Amount == "" {
			continue
		}
		result = append(result, normalized)
	}
	return result
}

func cloneStringSlice(items []string) []string {
	if len(items) == 0 {
		return []string{}
	}
	cloned := make([]string, len(items))
	copy(cloned, items)
	return cloned
}

func cloneRiderInsuranceCoverages(items []RiderInsuranceCoverageItem) []RiderInsuranceCoverageItem {
	if len(items) == 0 {
		return []RiderInsuranceCoverageItem{}
	}
	cloned := make([]RiderInsuranceCoverageItem, len(items))
	copy(cloned, items)
	return cloned
}
