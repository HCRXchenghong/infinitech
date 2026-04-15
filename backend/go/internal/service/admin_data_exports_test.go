package service

import (
	"context"
	"encoding/json"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newAdminServiceForDataExportsTest(t *testing.T) (*AdminService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "admin_data_exports_test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("resolve sql db failed: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	if err := db.AutoMigrate(
		&repository.IDCodebook{},
		&repository.IDSequence{},
		&repository.IDLegacyMapping{},
		&repository.Setting{},
		&repository.User{},
		&repository.Rider{},
		&repository.Merchant{},
		&repository.Order{},
		&repository.PublicAPI{},
		&repository.Carousel{},
		&repository.PushMessage{},
		&repository.HomePromotionCampaign{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	return NewAdminService(db, nil, ""), db
}

func normalizeJSONValue(t *testing.T, value interface{}) interface{} {
	t.Helper()

	payload, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal normalized json failed: %v", err)
	}

	var normalized interface{}
	if err := json.Unmarshal(payload, &normalized); err != nil {
		t.Fatalf("unmarshal normalized json failed: %v", err)
	}
	return normalized
}

func assertJSONEquivalent(t *testing.T, label string, expected, actual interface{}) {
	t.Helper()

	normalizedExpected := normalizeJSONValue(t, expected)
	normalizedActual := normalizeJSONValue(t, actual)
	if !reflect.DeepEqual(normalizedExpected, normalizedActual) {
		t.Fatalf("%s mismatch\nexpected=%#v\nactual=%#v", label, expected, actual)
	}
}

func TestAdminServiceExportAPIConfigBundleIncludesSensitiveValues(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()

	settings := []repository.Setting{
		{
			Key:   "sms_config",
			Value: `{"provider":"aliyun","enabled":true,"access_key_id":"ak-id","access_key_secret":"ak-secret","sign_name":"demo","template_code":"SMS_000001","admin_enabled":true}`,
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26041000000001",
				TSID: "260410000000000000000001",
			},
		},
		{
			Key:   "weather_config",
			Value: `{"location":"Shanghai","api_key":"weather-secret"}`,
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26041000000002",
				TSID: "260410000000000000000002",
			},
		},
		{
			Key:   "wechat_login_config",
			Value: `{"enabled":true,"app_id":"wx-demo","app_secret":"wx-secret","callback_url":"https://example.com/wechat/callback","scope":"snsapi_userinfo"}`,
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26041000000003",
				TSID: "260410000000000000000003",
			},
		},
	}
	for _, item := range settings {
		if err := db.Save(&item).Error; err != nil {
			t.Fatalf("save setting %s failed: %v", item.Key, err)
		}
	}

	publicAPI := repository.PublicAPI{
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000000004",
			TSID: "260410000000000000000004",
		},
		Name:        "天气开放接口",
		Path:        "/api/open/weather",
		Permissions: `["weather.read"]`,
		APIKey:      "public-api-key",
		Description: "test api",
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := db.Create(&publicAPI).Error; err != nil {
		t.Fatalf("create public api failed: %v", err)
	}

	result, err := svc.ExportAPIConfigBundle(ctx)
	if err != nil {
		t.Fatalf("export api config bundle failed: %v", err)
	}

	smsConfig, ok := result["sms_config"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected sms_config map, got %#v", result["sms_config"])
	}
	if got := parseString(smsConfig["access_key_secret"]); got != "ak-secret" {
		t.Fatalf("expected raw sms secret, got %q", got)
	}

	weatherConfig, ok := result["weather_config"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected weather_config map, got %#v", result["weather_config"])
	}
	if got := parseString(weatherConfig["city"]); got != "Shanghai" {
		t.Fatalf("expected city to fallback from legacy location, got %q", got)
	}
	if got := parseString(weatherConfig["api_key"]); got != "weather-secret" {
		t.Fatalf("expected raw weather api key, got %q", got)
	}

	wechatConfig, ok := result["wechat_login_config"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected wechat_login_config map, got %#v", result["wechat_login_config"])
	}
	if got := parseString(wechatConfig["app_secret"]); got != "wx-secret" {
		t.Fatalf("expected raw wechat secret, got %q", got)
	}

	publicAPIs, ok := result["public_apis"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected public_apis slice, got %#v", result["public_apis"])
	}
	if len(publicAPIs) != 1 {
		t.Fatalf("expected 1 public api, got %d", len(publicAPIs))
	}
	if got := parseString(publicAPIs[0]["api_key"]); got != "public-api-key" {
		t.Fatalf("expected raw public api key, got %q", got)
	}
}

func TestAdminServiceExportContentConfigBundleIncludesOperationalData(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()

	if err := db.Save(&repository.Setting{
		Key:   "carousel_settings",
		Value: `{"auto_play_seconds":8}`,
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000000005",
			TSID: "260410000000000000000005",
		},
	}).Error; err != nil {
		t.Fatalf("save carousel settings failed: %v", err)
	}

	carousel := repository.Carousel{
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000000006",
			TSID: "260410000000000000000006",
		},
		Title:     "首页主图",
		ImageURL:  "/uploads/banner.png",
		LinkURL:   "/promo",
		LinkType:  "internal",
		SortOrder: 1,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := db.Create(&carousel).Error; err != nil {
		t.Fatalf("create carousel failed: %v", err)
	}

	pushMessage := repository.PushMessage{
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000000007",
			TSID: "260410000000000000000007",
		},
		Title:              "系统通知",
		Content:            "hello",
		IsActive:           true,
		ScheduledStartTime: "2026-04-10 10:00:00",
		ScheduledEndTime:   "2026-04-11 10:00:00",
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	if err := db.Create(&pushMessage).Error; err != nil {
		t.Fatalf("create push message failed: %v", err)
	}

	campaign := repository.HomePromotionCampaign{
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000000008",
			TSID: "260410000000000000000008",
		},
		ObjectType:       "shop",
		TargetLegacyID:   101,
		TargetPublicID:   "shop_101",
		SlotPosition:     1,
		Status:           "active",
		IsPositionLocked: true,
		PromoteLabel:     "推荐",
		StartAt:          time.Now(),
		EndAt:            time.Now().Add(24 * time.Hour),
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	if err := db.Create(&campaign).Error; err != nil {
		t.Fatalf("create home campaign failed: %v", err)
	}

	result, err := svc.ExportContentConfigBundle(ctx)
	if err != nil {
		t.Fatalf("export content config bundle failed: %v", err)
	}

	carousels, ok := result["carousels"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected carousels slice, got %#v", result["carousels"])
	}
	if len(carousels) != 1 {
		t.Fatalf("expected 1 carousel, got %d", len(carousels))
	}

	pushMessages, ok := result["push_messages"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected push_messages slice, got %#v", result["push_messages"])
	}
	if len(pushMessages) != 1 {
		t.Fatalf("expected 1 push message, got %d", len(pushMessages))
	}

	homeCampaigns, ok := result["home_campaigns"].([]map[string]interface{})
	if !ok {
		t.Fatalf("expected home_campaigns slice, got %#v", result["home_campaigns"])
	}
	if len(homeCampaigns) != 1 {
		t.Fatalf("expected 1 home campaign, got %d", len(homeCampaigns))
	}

	summary, ok := result["summary"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected summary map, got %#v", result["summary"])
	}
	if got := parseInt64(summary["locked_home_slot_count"]); got != 1 {
		t.Fatalf("expected locked_home_slot_count=1, got %d", got)
	}
}

func TestAdminServiceExportSystemSettingsBundleAppliesDefaults(t *testing.T) {
	svc, _ := newAdminServiceForDataExportsTest(t)

	result, err := svc.ExportSystemSettingsBundle(context.Background())
	if err != nil {
		t.Fatalf("export system settings bundle failed: %v", err)
	}

	serviceSettings, ok := result["service_settings"].(ServiceSettings)
	if !ok {
		t.Fatalf("expected service_settings map, got %#v", result["service_settings"])
	}
	if serviceSettings.SupportChatTitle == "" {
		t.Fatalf("expected normalized service_settings defaults")
	}

	appDownloadConfig, ok := result["app_download_config"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected app_download_config map, got %#v", result["app_download_config"])
	}
	if parseString(appDownloadConfig["updated_at"]) == "" {
		t.Fatalf("expected default updated_at to be populated")
	}
}

func TestAdminServiceImportUsersRoundTripPreservesExportedFields(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()
	createdAt := time.Date(2026, 4, 10, 10, 0, 0, 0, time.Local)
	updatedAt := createdAt.Add(15 * time.Minute)

	user := repository.User{
		ID: 88,
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000010001",
			TSID: "26041000010001260410100001",
		},
		RoleID:         1088,
		Phone:          "13800000001",
		Name:           "测试用户",
		AvatarURL:      "/uploads/user.png",
		HeaderBg:       "/uploads/bg.png",
		WechatOpenID:   "wx-open-id",
		WechatUnionID:  "wx-union-id",
		WechatNickname: "wx-nick",
		WechatAvatar:   "/uploads/wx.png",
		PasswordHash:   "hash-user",
		Type:           "customer",
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	exported, err := svc.ExportUsers(ctx)
	if err != nil {
		t.Fatalf("export users failed: %v", err)
	}

	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.User{}).Error; err != nil {
		t.Fatalf("clear users failed: %v", err)
	}

	successCount, errorCount := svc.ImportUsers(ctx, exported)
	if successCount != 1 || errorCount != 0 {
		t.Fatalf("unexpected import result success=%d error=%d", successCount, errorCount)
	}

	roundTrip, err := svc.ExportUsers(ctx)
	if err != nil {
		t.Fatalf("re-export users failed: %v", err)
	}
	if len(roundTrip) != 1 {
		t.Fatalf("expected 1 user after import, got %d", len(roundTrip))
	}
	assertJSONEquivalent(t, "user round-trip", exported[0], roundTrip[0])
}

func TestAdminServiceImportRidersRoundTripPreservesExportedFields(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()
	createdAt := time.Date(2026, 4, 10, 11, 0, 0, 0, time.Local)
	updatedAt := createdAt.Add(20 * time.Minute)
	healthExpiry := createdAt.Add(24 * time.Hour)
	onlineStart := createdAt.Add(5 * time.Minute)

	rider := repository.Rider{
		ID: 66,
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000010002",
			TSID: "26041000010002260410110002",
		},
		RoleID:                2066,
		Phone:                 "13800000002",
		Name:                  "测试骑手",
		IsOnline:              true,
		Rating:                4.8,
		RatingCount:           12,
		Avatar:                "/uploads/rider-avatar.png",
		Nickname:              "骑手Nick",
		RealName:              "骑手实名",
		IDCardNumber:          "370101199001010011",
		EmergencyContactName:  "联系人",
		EmergencyContactPhone: "13900000000",
		IDCardFront:           "/uploads/id-front.png",
		IDCardBack:            "/uploads/id-back.png",
		HealthCert:            "/uploads/health.png",
		HealthCertExpiry:      &healthExpiry,
		IsVerified:            true,
		Level:                 3,
		TotalOrders:           120,
		WeekOrders:            18,
		ConsecutiveWeeks:      6,
		TodayOnlineMinutes:    90,
		OnlineStartTime:       &onlineStart,
		LastOnlineDate:        "2026-04-10",
		PasswordHash:          "hash-rider",
		CreatedAt:             createdAt,
		UpdatedAt:             updatedAt,
	}
	if err := db.Create(&rider).Error; err != nil {
		t.Fatalf("create rider failed: %v", err)
	}

	exported, err := svc.ExportRiders(ctx)
	if err != nil {
		t.Fatalf("export riders failed: %v", err)
	}
	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.Rider{}).Error; err != nil {
		t.Fatalf("clear riders failed: %v", err)
	}

	successCount, errorCount := svc.ImportRiders(ctx, exported)
	if successCount != 1 || errorCount != 0 {
		t.Fatalf("unexpected import result success=%d error=%d", successCount, errorCount)
	}

	roundTrip, err := svc.ExportRiders(ctx)
	if err != nil {
		t.Fatalf("re-export riders failed: %v", err)
	}
	if len(roundTrip) != 1 {
		t.Fatalf("expected 1 rider after import, got %d", len(roundTrip))
	}
	assertJSONEquivalent(t, "rider round-trip", exported[0], roundTrip[0])
}

func TestAdminServiceImportMerchantsRoundTripPreservesExportedFields(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()
	createdAt := time.Date(2026, 4, 10, 12, 0, 0, 0, time.Local)
	updatedAt := createdAt.Add(10 * time.Minute)

	merchant := repository.Merchant{
		ID: 77,
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000010003",
			TSID: "26041000010003260410120003",
		},
		RoleID:               3077,
		Phone:                "13800000003",
		Name:                 "测试商户",
		OwnerName:            "老板",
		BusinessLicenseImage: "/uploads/license.png",
		PasswordHash:         "hash-merchant",
		IsOnline:             true,
		CreatedAt:            createdAt,
		UpdatedAt:            updatedAt,
	}
	if err := db.Create(&merchant).Error; err != nil {
		t.Fatalf("create merchant failed: %v", err)
	}

	exported, err := svc.ExportMerchants(ctx)
	if err != nil {
		t.Fatalf("export merchants failed: %v", err)
	}
	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.Merchant{}).Error; err != nil {
		t.Fatalf("clear merchants failed: %v", err)
	}

	successCount, errorCount := svc.ImportMerchants(ctx, exported)
	if successCount != 1 || errorCount != 0 {
		t.Fatalf("unexpected import result success=%d error=%d", successCount, errorCount)
	}

	roundTrip, err := svc.ExportMerchants(ctx)
	if err != nil {
		t.Fatalf("re-export merchants failed: %v", err)
	}
	if len(roundTrip) != 1 {
		t.Fatalf("expected 1 merchant after import, got %d", len(roundTrip))
	}
	assertJSONEquivalent(t, "merchant round-trip", exported[0], roundTrip[0])
}

func TestAdminServiceImportAccountsWithoutPasswordDoesNotInjectWeakDefault(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()

	userSuccess, userErrors := svc.ImportUsers(ctx, []map[string]interface{}{
		{
			"phone": "13800000101",
			"name":  "无密码用户",
		},
	})
	if userSuccess != 1 || userErrors != 0 {
		t.Fatalf("unexpected user import result success=%d error=%d", userSuccess, userErrors)
	}

	riderSuccess, riderErrors := svc.ImportRiders(ctx, []map[string]interface{}{
		{
			"phone": "13800000102",
			"name":  "无密码骑手",
		},
	})
	if riderSuccess != 1 || riderErrors != 0 {
		t.Fatalf("unexpected rider import result success=%d error=%d", riderSuccess, riderErrors)
	}

	merchantSuccess, merchantErrors := svc.ImportMerchants(ctx, []map[string]interface{}{
		{
			"phone":      "13800000103",
			"name":       "无密码商户",
			"owner_name": "老板",
		},
	})
	if merchantSuccess != 1 || merchantErrors != 0 {
		t.Fatalf("unexpected merchant import result success=%d error=%d", merchantSuccess, merchantErrors)
	}

	var user repository.User
	if err := db.Where("phone = ?", "13800000101").First(&user).Error; err != nil {
		t.Fatalf("load imported user failed: %v", err)
	}
	if user.PasswordHash != "" {
		t.Fatalf("expected imported user without password to keep empty hash, got %q", user.PasswordHash)
	}

	var rider repository.Rider
	if err := db.Where("phone = ?", "13800000102").First(&rider).Error; err != nil {
		t.Fatalf("load imported rider failed: %v", err)
	}
	if rider.PasswordHash != "" {
		t.Fatalf("expected imported rider without password to keep empty hash, got %q", rider.PasswordHash)
	}

	var merchant repository.Merchant
	if err := db.Where("phone = ?", "13800000103").First(&merchant).Error; err != nil {
		t.Fatalf("load imported merchant failed: %v", err)
	}
	if merchant.PasswordHash != "" {
		t.Fatalf("expected imported merchant without password to keep empty hash, got %q", merchant.PasswordHash)
	}
}

func TestAdminServiceImportOrdersRoundTripPreservesExportedFields(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()
	createdAt := time.Date(2026, 4, 10, 13, 0, 0, 0, time.Local)
	updatedAt := createdAt.Add(30 * time.Minute)
	acceptedAt := createdAt.Add(3 * time.Minute)
	paidAt := createdAt.Add(4 * time.Minute)
	completedAt := createdAt.Add(25 * time.Minute)
	reviewedAt := createdAt.Add(28 * time.Minute)

	order := repository.Order{
		ID: 99,
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000010004",
			TSID: "26041000010004260410130004",
		},
		DailyOrderID:                "D202604100001",
		DailyOrderNumber:            1,
		UserID:                      "26041000010001",
		CustomerName:                "测试用户",
		CustomerPhone:               "13800000001",
		RiderID:                     "26041000010002",
		RiderName:                   "测试骑手",
		RiderPhone:                  "13800000002",
		MerchantID:                  "26041000010003",
		ShopID:                      "shop-001",
		ShopName:                    "测试门店",
		BizType:                     "takeout",
		Status:                      "completed",
		ServiceType:                 "delivery",
		ServiceDescription:          "帮我送到楼下",
		PackageName:                 "套餐A",
		PackagePrice:                18.8,
		PhoneModel:                  "iPhone",
		SpecialNotes:                "少冰",
		PreferredTime:               "尽快",
		FoodRequest:                 "鸡排饭",
		FoodShop:                    "食堂",
		FoodAllergies:               "花生",
		TasteNotes:                  "微辣",
		DrinkRequest:                "奶茶",
		DrinkPickupCode:             "PICK123",
		DrinkSugar:                  "三分糖",
		DrinkPickupQRImage:          "/uploads/pick-qr.png",
		DeliveryRequest:             "帮取快递",
		DeliveryName:                "张三",
		DeliveryPhone:               "13700000000",
		DeliveryCodes:               "A1",
		DeliveryPhoto:               "/uploads/delivery.png",
		DeliveryMessage:             "已放门口",
		DeliveryPhotoTime:           "2026-04-10 13:22:00",
		ErrandRequest:               "取资料",
		ErrandLocation:              "教学楼",
		ErrandRequirements:          "前台取件",
		DormNumber:                  "8-302",
		Address:                     "大学城 8 栋 302",
		TotalPrice:                  36.5,
		RiderQuotedPrice:            6.2,
		DeliveryFee:                 4.5,
		ProductPrice:                32.0,
		Items:                       `[{"name":"鸡排饭","qty":1}]`,
		RawPayload:                  `{"source":"admin-test"}`,
		PaymentMethod:               "wxpay",
		PaymentStatus:               "paid",
		PaymentTransactionID:        "TX123",
		RefundTransactionID:         "RF123",
		RefundAmount:                320,
		PlatformCommission:          180,
		RiderIncome:                 260,
		MerchantIncome:              2880,
		AcceptedAt:                  &acceptedAt,
		PaidAt:                      &paidAt,
		CompletedAt:                 &completedAt,
		LatestExceptionReason:       "none",
		LatestExceptionReporterID:   "26041000010002",
		LatestExceptionReporterRole: "rider",
		ExceptionReports:            `[]`,
		IsReviewed:                  true,
		ReviewedAt:                  &reviewedAt,
		CreatedAt:                   createdAt,
		UpdatedAt:                   updatedAt,
	}
	if err := db.Create(&order).Error; err != nil {
		t.Fatalf("create order failed: %v", err)
	}

	exported, err := svc.ExportOrders(ctx)
	if err != nil {
		t.Fatalf("export orders failed: %v", err)
	}
	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.Order{}).Error; err != nil {
		t.Fatalf("clear orders failed: %v", err)
	}

	successCount, errorCount := svc.ImportOrders(ctx, exported)
	if successCount != 1 || errorCount != 0 {
		t.Fatalf("unexpected import result success=%d error=%d", successCount, errorCount)
	}

	roundTrip, err := svc.ExportOrders(ctx)
	if err != nil {
		t.Fatalf("re-export orders failed: %v", err)
	}
	if len(roundTrip) != 1 {
		t.Fatalf("expected 1 order after import, got %d", len(roundTrip))
	}
	assertJSONEquivalent(t, "order round-trip", exported[0], roundTrip[0])
}

func TestAdminServiceImportSystemSettingsBundleRoundTrip(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()

	settings := []repository.Setting{
		{Key: "debug_mode", Value: `{"enabled":true,"delivery":true}`},
		{Key: "service_settings", Value: `{"service_phone":"400-800-1234","support_chat_title":"运营客服"}`},
		{Key: "charity_settings", Value: `{"enabled":true,"page_title":"公益页"}`},
		{Key: "vip_settings", Value: `{"enabled":true,"page_title":"VIP中心"}`},
		{Key: "coin_ratio", Value: `{"ratio":2}`},
		{Key: "app_download_config", Value: `{"ios_url":"https://example.com/ios","updated_at":"2026-04-10"}`},
	}
	for _, item := range settings {
		if err := db.Save(&item).Error; err != nil {
			t.Fatalf("save setting %s failed: %v", item.Key, err)
		}
	}

	exported, err := svc.ExportSystemSettingsBundle(ctx)
	if err != nil {
		t.Fatalf("export system settings failed: %v", err)
	}

	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.Setting{}).Error; err != nil {
		t.Fatalf("clear settings failed: %v", err)
	}
	if _, err := svc.ImportSystemSettingsBundle(ctx, exported); err != nil {
		t.Fatalf("import system settings failed: %v", err)
	}

	roundTrip, err := svc.ExportSystemSettingsBundle(ctx)
	if err != nil {
		t.Fatalf("re-export system settings failed: %v", err)
	}
	for _, key := range []string{"debug_mode", "service_settings", "charity_settings", "vip_settings", "coin_ratio", "app_download_config"} {
		assertJSONEquivalent(t, "system settings "+key, exported[key], roundTrip[key])
	}
}

func TestAdminServiceImportContentConfigBundleRoundTrip(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()

	if err := db.Save(&repository.Setting{
		Key:   "carousel_settings",
		Value: `{"auto_play_seconds":9}`,
	}).Error; err != nil {
		t.Fatalf("save carousel settings failed: %v", err)
	}

	startAt := time.Date(2026, 4, 10, 14, 0, 0, 0, time.Local)
	endAt := startAt.Add(24 * time.Hour)
	approvedAt := startAt.Add(2 * time.Hour)
	adminID := uint(1)

	seedRecords := []interface{}{
		&repository.Carousel{
			ID: 31,
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26041000010005",
				TSID: "26041000010005260410140005",
			},
			Title:     "首页轮播",
			ImageURL:  "/uploads/carousel.png",
			LinkURL:   "/promo",
			LinkType:  "internal",
			SortOrder: 1,
			IsActive:  true,
			CreatedAt: startAt,
			UpdatedAt: startAt.Add(time.Minute),
		},
		&repository.PushMessage{
			ID: 32,
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26041000010006",
				TSID: "26041000010006260410140006",
			},
			Title:              "活动推送",
			Content:            "hello",
			ImageURL:           "/uploads/push.png",
			CompressImage:      true,
			IsActive:           true,
			ScheduledStartTime: "2026-04-10 14:00:00",
			ScheduledEndTime:   "2026-04-11 14:00:00",
			CreatedAt:          startAt,
			UpdatedAt:          startAt.Add(2 * time.Minute),
		},
		&repository.HomePromotionCampaign{
			ID: 33,
			UnifiedIdentity: repository.UnifiedIdentity{
				UID:  "26041000010007",
				TSID: "26041000010007260410140007",
			},
			ObjectType:        "shop",
			TargetLegacyID:    101,
			TargetPublicID:    "shop-101",
			SlotPosition:      1,
			City:              "青岛",
			BusinessCategory:  "food",
			Status:            "active",
			IsPositionLocked:  true,
			PromoteLabel:      "推荐",
			ContractNo:        "HT001",
			ServiceRecordNo:   "SR001",
			Remark:            "备注",
			StartAt:           startAt,
			EndAt:             endAt,
			ApprovedAt:        &approvedAt,
			ApprovedByAdminID: &adminID,
			CreatedAt:         startAt,
			UpdatedAt:         startAt.Add(3 * time.Minute),
		},
	}
	for _, record := range seedRecords {
		if err := db.Create(record).Error; err != nil {
			t.Fatalf("seed content record failed: %v", err)
		}
	}

	exported, err := svc.ExportContentConfigBundle(ctx)
	if err != nil {
		t.Fatalf("export content config failed: %v", err)
	}

	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.Carousel{}).Error; err != nil {
		t.Fatalf("clear carousels failed: %v", err)
	}
	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.PushMessage{}).Error; err != nil {
		t.Fatalf("clear push messages failed: %v", err)
	}
	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.HomePromotionCampaign{}).Error; err != nil {
		t.Fatalf("clear campaigns failed: %v", err)
	}
	if err := db.Where("key = ?", "carousel_settings").Delete(&repository.Setting{}).Error; err != nil {
		t.Fatalf("clear carousel settings failed: %v", err)
	}

	if _, err := svc.ImportContentConfigBundle(ctx, exported); err != nil {
		t.Fatalf("import content config failed: %v", err)
	}

	roundTrip, err := svc.ExportContentConfigBundle(ctx)
	if err != nil {
		t.Fatalf("re-export content config failed: %v", err)
	}
	for _, key := range []string{"carousel_settings", "carousels", "push_messages", "home_campaigns"} {
		assertJSONEquivalent(t, "content config "+key, exported[key], roundTrip[key])
	}
}

func TestAdminServiceImportAPIConfigBundleRoundTrip(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()

	settings := []repository.Setting{
		{Key: "sms_config", Value: `{"provider":"aliyun","access_key_id":"ak","access_key_secret":"secret","sign_name":"demo","template_code":"SMS_1","admin_enabled":true}`},
		{Key: "weather_config", Value: `{"city":"Qingdao","api_key":"weather-key","refresh_interval_minutes":12}`},
		{Key: "wechat_login_config", Value: `{"enabled":true,"app_id":"wx-app","app_secret":"wx-secret","callback_url":"https://example.com/callback","scope":"snsapi_userinfo"}`},
	}
	for _, item := range settings {
		if err := db.Save(&item).Error; err != nil {
			t.Fatalf("save setting %s failed: %v", item.Key, err)
		}
	}

	publicAPI := repository.PublicAPI{
		ID: 41,
		UnifiedIdentity: repository.UnifiedIdentity{
			UID:  "26041000010008",
			TSID: "26041000010008260410150008",
		},
		Name:        "天气开放接口",
		Path:        "/api/open/weather",
		Permissions: `["weather.read","weather.write"]`,
		APIKey:      "public-api-key",
		Description: "test api",
		IsActive:    true,
		CreatedAt:   time.Date(2026, 4, 10, 15, 0, 0, 0, time.Local),
		UpdatedAt:   time.Date(2026, 4, 10, 15, 5, 0, 0, time.Local),
	}
	if err := db.Create(&publicAPI).Error; err != nil {
		t.Fatalf("create public api failed: %v", err)
	}

	exported, err := svc.ExportAPIConfigBundle(ctx)
	if err != nil {
		t.Fatalf("export api config failed: %v", err)
	}

	if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&repository.PublicAPI{}).Error; err != nil {
		t.Fatalf("clear public apis failed: %v", err)
	}
	if err := db.Where("key IN ?", []string{"sms_config", "weather_config", "wechat_login_config"}).Delete(&repository.Setting{}).Error; err != nil {
		t.Fatalf("clear api settings failed: %v", err)
	}

	if _, err := svc.ImportAPIConfigBundle(ctx, exported); err != nil {
		t.Fatalf("import api config failed: %v", err)
	}

	roundTrip, err := svc.ExportAPIConfigBundle(ctx)
	if err != nil {
		t.Fatalf("re-export api config failed: %v", err)
	}
	for _, key := range []string{"sms_config", "weather_config", "wechat_login_config", "public_apis"} {
		assertJSONEquivalent(t, "api config "+key, exported[key], roundTrip[key])
	}
}

func TestAdminServiceImportPaymentConfigBundleRoundTrip(t *testing.T) {
	svc, db := newAdminServiceForDataExportsTest(t)
	ctx := context.Background()

	settings := []repository.Setting{
		{Key: "pay_mode", Value: `{"isProd":true}`},
		{Key: "wxpay_config", Value: `{"appId":"wx-app","mchId":"mch-1","apiKey":"k1","apiV3Key":"k2","serialNo":"sn1","notifyUrl":"https://example.com/wxpay"}`},
		{Key: "alipay_config", Value: `{"appId":"ali-app","privateKey":"pri","alipayPublicKey":"pub","notifyUrl":"https://example.com/alipay","sandbox":false}`},
		{Key: "payment_notices", Value: `{"delivery":"支付成功","phone_film":"贴膜支付成功"}`},
	}
	for _, item := range settings {
		if err := db.Save(&item).Error; err != nil {
			t.Fatalf("save setting %s failed: %v", item.Key, err)
		}
	}

	exported, err := svc.ExportPaymentConfigBundle(ctx)
	if err != nil {
		t.Fatalf("export payment config failed: %v", err)
	}

	if err := db.Where("key IN ?", []string{"pay_mode", "wxpay_config", "alipay_config", "payment_notices"}).Delete(&repository.Setting{}).Error; err != nil {
		t.Fatalf("clear payment settings failed: %v", err)
	}
	if _, err := svc.ImportPaymentConfigBundle(ctx, exported); err != nil {
		t.Fatalf("import payment config failed: %v", err)
	}

	roundTrip, err := svc.ExportPaymentConfigBundle(ctx)
	if err != nil {
		t.Fatalf("re-export payment config failed: %v", err)
	}
	for _, key := range []string{"pay_mode", "wxpay_config", "alipay_config", "payment_notices"} {
		assertJSONEquivalent(t, "payment config "+key, exported[key], roundTrip[key])
	}
}
