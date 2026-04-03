package service

import (
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
)

type Services struct {
	Shop              *ShopService
	Order             *OrderService
	Groupbuy          *GroupbuyService
	AfterSales        *AfterSalesService
	OpNotification    *OpNotificationService
	User              *UserService
	Auth              *AuthService
	Sync              *SyncService
	SMS               *SMSService
	Captcha           *CaptchaService
	Medicine          *MedicineService
	Message           *MessageService
	DiningBuddy       *DiningBuddyService
	Notification      *NotificationService
	Admin             *AdminService
	Product           *ProductService
	FeaturedProduct   FeaturedProductService
	Points            *PointsService
	Cooperation       *CooperationService
	Invite            *InviteService
	OnboardingInvite  *OnboardingInviteService
	RiskControl       *RiskControlService
	Payment           *PaymentService
	Wallet            *WalletService
	Financial         *FinancialService
	MobilePush        *MobilePushService
	RealtimeNotify    *RealtimeNotificationService
	MobileMap         *MobileMapService
	HomeFeed          *HomeFeedService
	PhoneContactAudit *PhoneContactAuditService
	RTCCallAudit      *RTCCallAuditService
}

func NewServices(repos *repository.Repositories, cfg *config.Config) *Services {
	authService := NewAuthService(repos.User, cfg)
	authService.SetDBAndRedis(repos.DB, repos.Redis)
	pointsService := NewPointsService(repos.DB)
	walletSignSecret := cfg.JWT.Secret
	riskControlService := NewRiskControlService(repos.Wallet)
	paymentService := NewPaymentService(repos.Wallet, riskControlService, walletSignSecret)
	walletService := NewWalletService(repos.Wallet, paymentService, riskControlService, walletSignSecret)
	paymentService.SetSettlementWallet(walletService)
	financialService := NewFinancialService(repos.Wallet)
	groupbuyService := NewGroupbuyService(repos.DB, walletSignSecret)
	opNotificationService := NewOpNotificationService(repos.DB)
	adminService := NewAdminService(repos.DB, repos.Redis, cfg.JWT.Secret)
	mobilePushService := NewMobilePushService(repos.DB, cfg, adminService)
	realtimeNotifyService := NewRealtimeNotificationService(repos.DB, cfg, mobilePushService)
	paymentService.SetRealtimeNotifier(realtimeNotifyService)
	walletService.SetRealtimeNotifier(realtimeNotifyService)
	mobileMapService := NewMobileMapService(cfg, adminService)
	captchaService := NewCaptchaService(repos.DB)
	phoneContactAuditService := NewPhoneContactAuditService(repos.DB)
	rtcCallAuditService := NewRTCCallAuditService(repos.DB, cfg)
	afterSalesService := NewAfterSalesService(repos.AfterSales, repos.Order, repos.DB, paymentService, opNotificationService)
	afterSalesService.SetRealtimeNotifier(realtimeNotifyService)

	return &Services{
		Shop:              NewShopService(repos.Shop, repos.Redis),
		Order:             NewOrderService(repos.Order, repos.DB, groupbuyService),
		Groupbuy:          groupbuyService,
		AfterSales:        afterSalesService,
		OpNotification:    opNotificationService,
		User:              NewUserService(repos.User, authService),
		Auth:              authService,
		Sync:              NewSyncService(repos.DB, repos.Redis),
		SMS:               NewSMSService(repos.DB, repos.Redis, captchaService, adminService),
		Captcha:           captchaService,
		Medicine:          NewMedicineService(),
		Message:           NewMessageService(repos.DB),
		DiningBuddy:       NewDiningBuddyService(repos.DB),
		Notification:      NewNotificationService(repos.Notification),
		Admin:             adminService,
		Product:           NewProductService(repos.Product, repos.Redis),
		FeaturedProduct:   NewFeaturedProductService(repos.FeaturedProduct),
		Points:            pointsService,
		Cooperation:       NewCooperationService(repos.DB),
		Invite:            NewInviteService(repos.DB, pointsService),
		OnboardingInvite:  NewOnboardingInviteService(repos.DB),
		RiskControl:       riskControlService,
		Payment:           paymentService,
		Wallet:            walletService,
		Financial:         financialService,
		MobilePush:        mobilePushService,
		RealtimeNotify:    realtimeNotifyService,
		MobileMap:         mobileMapService,
		HomeFeed:          NewHomeFeedService(repos.DB, repos.Shop, repos.FeaturedProduct),
		PhoneContactAudit: phoneContactAuditService,
		RTCCallAudit:      rtcCallAuditService,
	}
}
