package handler

import (
	"github.com/yuexiang/go-api/internal/service"
)

type Handlers struct {
	Shop              *ShopHandler
	Order             *OrderHandler
	Groupbuy          *GroupbuyHandler
	AfterSales        *AfterSalesHandler
	OpNotification    *OpNotificationHandler
	User              *UserHandler
	Auth              *AuthHandler
	Sync              *SyncHandler
	SMS               *SMSHandler
	Captcha           *CaptchaHandler
	Medicine          *MedicineHandler
	Message           *MessageHandler
	DiningBuddy       *DiningBuddyHandler
	Notification      *NotificationHandler
	Product           *ProductHandler
	FeaturedProduct   *FeaturedProductHandler
	Admin             *AdminHandler
	AdminSettings     *AdminSettingsHandler
	Points            *PointsHandler
	Cooperation       *CooperationHandler
	Invite            *InviteHandler
	OnboardingInvite  *OnboardingInviteHandler
	Rider             *RiderHandler
	Upload            *UploadHandler
	FileUpload        *FileUploadHandler
	Wallet            *WalletHandler
	Payment           *PaymentHandler
	Financial         *FinancialHandler
	AdminWallet       *AdminWalletHandler
	MobilePush        *MobilePushHandler
	MobileMap         *MobileMapHandler
	HomeFeed          *HomeFeedHandler
	PhoneContactAudit *PhoneContactAuditHandler
}

func NewHandlers(services *service.Services) *Handlers {
	return &Handlers{
		Shop:              NewShopHandler(services.Shop),
		Order:             NewOrderHandler(services.Order),
		Groupbuy:          NewGroupbuyHandler(services.Groupbuy),
		AfterSales:        NewAfterSalesHandler(services.AfterSales),
		OpNotification:    NewOpNotificationHandler(services.OpNotification),
		User:              NewUserHandler(services.User),
		Auth:              NewAuthHandler(services.Auth),
		Sync:              NewSyncHandler(services.Sync),
		SMS:               NewSMSHandler(services.SMS),
		Captcha:           NewCaptchaHandler(services.Captcha),
		Medicine:          NewMedicineHandler(services.Medicine),
		Message:           NewMessageHandler(services.Message),
		DiningBuddy:       NewDiningBuddyHandler(services.DiningBuddy),
		Notification:      NewNotificationHandler(services.Notification),
		Product:           NewProductHandler(services.Product),
		FeaturedProduct:   NewFeaturedProductHandler(services.FeaturedProduct),
		Admin:             NewAdminHandler(services.Admin, services.SMS),
		AdminSettings:     NewAdminSettingsHandler(services.Admin, services.MobilePush),
		Upload:            NewUploadHandler(),
		Points:            NewPointsHandler(services.Points),
		Cooperation:       NewCooperationHandler(services.Cooperation),
		Invite:            NewInviteHandler(services.Invite),
		OnboardingInvite:  NewOnboardingInviteHandler(services.OnboardingInvite),
		Wallet:            NewWalletHandler(services.Wallet),
		Payment:           NewPaymentHandler(services.Payment),
		Financial:         NewFinancialHandler(services.Financial),
		AdminWallet:       NewAdminWalletHandler(services.Wallet),
		MobilePush:        NewMobilePushHandler(services.MobilePush),
		MobileMap:         NewMobileMapHandler(services.MobileMap),
		HomeFeed:          NewHomeFeedHandler(services.HomeFeed),
		PhoneContactAudit: NewPhoneContactAuditHandler(services.PhoneContactAudit),
	}
}
