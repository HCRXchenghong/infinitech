package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

var importTimeLayouts = []string{
	time.RFC3339Nano,
	time.RFC3339,
	"2006-01-02 15:04:05",
	"2006-01-02 15:04",
	"2006-01-02",
}

func exportUserRecord(user repository.User) map[string]interface{} {
	return map[string]interface{}{
		"id":              user.UID,
		"tsid":            user.TSID,
		"legacy_id":       user.ID,
		"role_id":         user.RoleID,
		"phone":           user.Phone,
		"name":            user.Name,
		"avatar_url":      user.AvatarURL,
		"header_bg":       user.HeaderBg,
		"wechat_open_id":  user.WechatOpenID,
		"wechat_union_id": user.WechatUnionID,
		"wechat_nickname": user.WechatNickname,
		"wechat_avatar":   user.WechatAvatar,
		"password_hash":   user.PasswordHash,
		"type":            user.Type,
		"created_at":      formatTime(user.CreatedAt),
		"updated_at":      formatTime(user.UpdatedAt),
	}
}

func exportRiderRecord(rider repository.Rider) map[string]interface{} {
	return map[string]interface{}{
		"id":                      rider.UID,
		"tsid":                    rider.TSID,
		"legacy_id":               rider.ID,
		"role_id":                 rider.RoleID,
		"phone":                   rider.Phone,
		"name":                    rider.Name,
		"is_online":               rider.IsOnline,
		"rating":                  rider.Rating,
		"rating_count":            rider.RatingCount,
		"avatar":                  rider.Avatar,
		"nickname":                rider.Nickname,
		"real_name":               rider.RealName,
		"id_card_number":          rider.IDCardNumber,
		"emergency_contact_name":  rider.EmergencyContactName,
		"emergency_contact_phone": rider.EmergencyContactPhone,
		"id_card_front":           rider.IDCardFront,
		"id_card_back":            rider.IDCardBack,
		"health_cert":             rider.HealthCert,
		"health_cert_expiry":      formatTimePtr(rider.HealthCertExpiry),
		"is_verified":             rider.IsVerified,
		"level":                   rider.Level,
		"total_orders":            rider.TotalOrders,
		"week_orders":             rider.WeekOrders,
		"consecutive_weeks":       rider.ConsecutiveWeeks,
		"today_online_minutes":    rider.TodayOnlineMinutes,
		"online_start_time":       formatTimePtr(rider.OnlineStartTime),
		"last_online_date":        rider.LastOnlineDate,
		"password_hash":           rider.PasswordHash,
		"created_at":              formatTime(rider.CreatedAt),
		"updated_at":              formatTime(rider.UpdatedAt),
	}
}

func exportMerchantRecord(merchant repository.Merchant) map[string]interface{} {
	return map[string]interface{}{
		"id":                     merchant.UID,
		"tsid":                   merchant.TSID,
		"legacy_id":              merchant.ID,
		"role_id":                merchant.RoleID,
		"phone":                  merchant.Phone,
		"name":                   merchant.Name,
		"owner_name":             merchant.OwnerName,
		"business_license_image": merchant.BusinessLicenseImage,
		"password_hash":          merchant.PasswordHash,
		"is_online":              merchant.IsOnline,
		"created_at":             formatTime(merchant.CreatedAt),
		"updated_at":             formatTime(merchant.UpdatedAt),
	}
}

func exportOrderRecord(order repository.Order) map[string]interface{} {
	return map[string]interface{}{
		"id":                             order.UID,
		"tsid":                           order.TSID,
		"legacy_id":                      order.ID,
		"daily_order_id":                 order.DailyOrderID,
		"daily_order_number":             order.DailyOrderNumber,
		"user_id":                        order.UserID,
		"customer_name":                  order.CustomerName,
		"customer_phone":                 order.CustomerPhone,
		"rider_id":                       order.RiderID,
		"rider_name":                     order.RiderName,
		"rider_phone":                    order.RiderPhone,
		"merchant_id":                    order.MerchantID,
		"shop_id":                        order.ShopID,
		"shop_name":                      order.ShopName,
		"biz_type":                       order.BizType,
		"status":                         order.Status,
		"service_type":                   order.ServiceType,
		"service_description":            order.ServiceDescription,
		"package_name":                   order.PackageName,
		"package_price":                  order.PackagePrice,
		"phone_model":                    order.PhoneModel,
		"special_notes":                  order.SpecialNotes,
		"preferred_time":                 order.PreferredTime,
		"food_request":                   order.FoodRequest,
		"food_shop":                      order.FoodShop,
		"food_allergies":                 order.FoodAllergies,
		"taste_notes":                    order.TasteNotes,
		"drink_request":                  order.DrinkRequest,
		"drink_pickup_code":              order.DrinkPickupCode,
		"drink_sugar":                    order.DrinkSugar,
		"drink_pickup_qr_image":          order.DrinkPickupQRImage,
		"delivery_request":               order.DeliveryRequest,
		"delivery_name":                  order.DeliveryName,
		"delivery_phone":                 order.DeliveryPhone,
		"delivery_codes":                 order.DeliveryCodes,
		"delivery_photo":                 order.DeliveryPhoto,
		"delivery_message":               order.DeliveryMessage,
		"delivery_photo_time":            order.DeliveryPhotoTime,
		"errand_request":                 order.ErrandRequest,
		"errand_location":                order.ErrandLocation,
		"errand_requirements":            order.ErrandRequirements,
		"dorm_number":                    order.DormNumber,
		"address":                        order.Address,
		"total_price":                    order.TotalPrice,
		"rider_quoted_price":             order.RiderQuotedPrice,
		"delivery_fee":                   order.DeliveryFee,
		"product_price":                  order.ProductPrice,
		"items":                          order.Items,
		"raw_payload":                    order.RawPayload,
		"payment_method":                 order.PaymentMethod,
		"payment_status":                 order.PaymentStatus,
		"payment_transaction_id":         order.PaymentTransactionID,
		"payment_time":                   formatTimePtr(order.PaymentTime),
		"refund_transaction_id":          order.RefundTransactionID,
		"refund_amount":                  order.RefundAmount,
		"refund_time":                    formatTimePtr(order.RefundTime),
		"platform_commission":            order.PlatformCommission,
		"rider_income":                   order.RiderIncome,
		"merchant_income":                order.MerchantIncome,
		"accepted_at":                    formatTimePtr(order.AcceptedAt),
		"paid_at":                        formatTimePtr(order.PaidAt),
		"completed_at":                   formatTimePtr(order.CompletedAt),
		"latest_exception_reason":        order.LatestExceptionReason,
		"latest_exception_reporter_id":   order.LatestExceptionReporterID,
		"latest_exception_reporter_role": order.LatestExceptionReporterRole,
		"latest_exception_reported_at":   formatTimePtr(order.LatestExceptionReportedAt),
		"exception_reports":              order.ExceptionReports,
		"is_reviewed":                    order.IsReviewed,
		"reviewed_at":                    formatTimePtr(order.ReviewedAt),
		"created_at":                     formatTime(order.CreatedAt),
		"updated_at":                     formatTime(order.UpdatedAt),
	}
}

func parseImportString(item map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if value, ok := item[key]; ok {
			return strings.TrimSpace(parseString(value))
		}
	}
	return ""
}

func parseImportLegacyID(item map[string]interface{}) uint {
	if value := parseImportString(item, "legacy_id", "legacyId", "legacyID"); value != "" {
		if parsed, err := strconv.ParseUint(value, 10, 64); err == nil && parsed > 0 {
			return uint(parsed)
		}
	}

	idValue := parseImportString(item, "id")
	if idValue == "" {
		return 0
	}
	if idkit.UIDPattern.MatchString(idValue) || idkit.TSIDPattern.MatchString(idValue) {
		return 0
	}
	parsed, err := strconv.ParseUint(idValue, 10, 64)
	if err != nil || parsed == 0 {
		return 0
	}
	return uint(parsed)
}

func parseImportTimestampValue(value interface{}) time.Time {
	switch typed := value.(type) {
	case time.Time:
		return typed
	case *time.Time:
		if typed != nil {
			return *typed
		}
	case string:
		text := strings.TrimSpace(typed)
		if text == "" {
			return time.Time{}
		}
		for _, layout := range importTimeLayouts {
			if parsed, err := time.ParseInLocation(layout, text, time.Local); err == nil {
				return parsed
			}
		}
	case float64:
		if typed > 0 {
			return time.Unix(int64(typed), 0)
		}
	case int64:
		if typed > 0 {
			return time.Unix(typed, 0)
		}
	case int:
		if typed > 0 {
			return time.Unix(int64(typed), 0)
		}
	}
	return time.Time{}
}

func parseImportTime(item map[string]interface{}, keys ...string) time.Time {
	for _, key := range keys {
		if value, ok := item[key]; ok {
			return parseImportTimestampValue(value)
		}
	}
	return time.Time{}
}

func parseImportTimePtr(item map[string]interface{}, keys ...string) *time.Time {
	for _, key := range keys {
		if value, ok := item[key]; ok {
			parsed := parseImportTimestampValue(value)
			if parsed.IsZero() {
				return nil
			}
			return &parsed
		}
	}
	return nil
}

func hasImportKey(item map[string]interface{}, keys ...string) bool {
	for _, key := range keys {
		if _, ok := item[key]; ok {
			return true
		}
	}
	return false
}

func parseImportItems(raw interface{}) []map[string]interface{} {
	result := make([]map[string]interface{}, 0)
	switch typed := raw.(type) {
	case []map[string]interface{}:
		result = append(result, typed...)
	case []interface{}:
		for _, item := range typed {
			if mapped, ok := item.(map[string]interface{}); ok {
				result = append(result, mapped)
			}
		}
	}
	return result
}

func parseStringSliceValue(value interface{}) []string {
	switch typed := value.(type) {
	case []string:
		return append([]string(nil), typed...)
	case []interface{}:
		items := make([]string, 0, len(typed))
		for _, item := range typed {
			text := strings.TrimSpace(parseString(item))
			if text != "" {
				items = append(items, text)
			}
		}
		return items
	default:
		return []string{}
	}
}

func normalizeImportScope(payload map[string]interface{}, expected string) error {
	if payload == nil {
		return fmt.Errorf("导入内容为空")
	}
	scope := strings.TrimSpace(parseString(payload["scope"]))
	if scope == "" {
		return nil
	}
	if scope != expected {
		return fmt.Errorf("导入文件类型不匹配，期望 %s，实际 %s", expected, scope)
	}
	return nil
}

func importReferenceTime(createdAt, updatedAt time.Time) time.Time {
	if !createdAt.IsZero() {
		return createdAt
	}
	if !updatedAt.IsZero() {
		return updatedAt
	}
	return time.Now()
}

func ensureImportedIdentity(ctx context.Context, tx *gorm.DB, tableName string, uid, tsid string, createdAt, updatedAt time.Time) (string, string, error) {
	if uid != "" && tsid != "" {
		return uid, tsid, nil
	}

	generatedUID, generatedTSID, err := idkit.NextIdentityForTable(ctx, tx, tableName, importReferenceTime(createdAt, updatedAt))
	if err != nil {
		return "", "", err
	}
	if uid == "" {
		uid = generatedUID
	}
	if tsid == "" {
		tsid = generatedTSID
	}
	return uid, tsid, nil
}

func findImportedRecordID(ctx context.Context, tx *gorm.DB, tableName, uid, tsid string, legacyID uint) (uint, error) {
	if uid != "" {
		var record struct {
			ID uint `gorm:"column:id"`
		}
		if err := tx.WithContext(ctx).
			Table(tableName).
			Select("id").
			Where("uid = ?", uid).
			Limit(1).
			Scan(&record).Error; err != nil {
			return 0, err
		}
		if record.ID > 0 {
			return record.ID, nil
		}
	}

	if tsid != "" {
		var record struct {
			ID uint `gorm:"column:id"`
		}
		if err := tx.WithContext(ctx).
			Table(tableName).
			Select("id").
			Where("tsid = ?", tsid).
			Limit(1).
			Scan(&record).Error; err != nil {
			return 0, err
		}
		if record.ID > 0 {
			return record.ID, nil
		}
	}

	if legacyID > 0 {
		var record struct {
			ID uint `gorm:"column:id"`
		}
		if err := tx.WithContext(ctx).
			Table(tableName).
			Select("id").
			Where("id = ?", legacyID).
			Limit(1).
			Scan(&record).Error; err != nil {
			return 0, err
		}
		if record.ID > 0 {
			return record.ID, nil
		}
	}

	return 0, nil
}

func syncImportedLegacyMapping(ctx context.Context, tx *gorm.DB, tableName string, legacyID uint, uid, tsid string) error {
	if legacyID == 0 || strings.TrimSpace(uid) == "" || strings.TrimSpace(tsid) == "" {
		return nil
	}

	entry := repository.IDLegacyMapping{
		Domain:      idkit.DomainForBucket(idkit.BucketForTable(tableName)),
		LegacyValue: strconv.FormatUint(uint64(legacyID), 10),
		UID:         strings.TrimSpace(uid),
		TSID:        strings.TrimSpace(tsid),
		CreatedAt:   time.Now(),
	}

	if err := tx.WithContext(ctx).
		Where("uid = ? OR tsid = ? OR (domain = ? AND legacy_value = ?)", entry.UID, entry.TSID, entry.Domain, entry.LegacyValue).
		Delete(&repository.IDLegacyMapping{}).Error; err != nil {
		return err
	}

	return tx.WithContext(ctx).Create(&entry).Error
}

func importRecordCreatedAt(item map[string]interface{}, existing time.Time) time.Time {
	if parsed := parseImportTime(item, "created_at", "createdAt"); !parsed.IsZero() {
		return parsed
	}
	if !existing.IsZero() {
		return existing
	}
	return time.Now()
}

func importRecordUpdatedAt(item map[string]interface{}, createdAt, existing time.Time) time.Time {
	if parsed := parseImportTime(item, "updated_at", "updatedAt"); !parsed.IsZero() {
		return parsed
	}
	if !existing.IsZero() {
		return existing
	}
	if !createdAt.IsZero() {
		return createdAt
	}
	return time.Now()
}

func saveImportedModel(ctx context.Context, tx *gorm.DB, tableName string, model interface{}, legacyID uint, uid, tsid string) error {
	if err := tx.WithContext(ctx).Session(&gorm.Session{SkipHooks: true}).Save(model).Error; err != nil {
		return err
	}
	return syncImportedLegacyMapping(ctx, tx, tableName, legacyID, uid, tsid)
}

func saveSettingWithDB(ctx context.Context, db *gorm.DB, key string, value interface{}) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}

	var existing repository.Setting
	err = db.WithContext(ctx).Where("key = ?", key).Limit(1).Find(&existing).Error
	if err != nil {
		return err
	}
	if existing.Key != "" {
		existing.Value = string(payload)
		return db.WithContext(ctx).Save(&existing).Error
	}

	setting := repository.Setting{Key: key, Value: string(payload)}
	return db.WithContext(ctx).Create(&setting).Error
}

func (s *AdminService) ImportSystemSettingsBundle(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	if err := normalizeImportScope(payload, "system_settings"); err != nil {
		return nil, err
	}

	keys := []string{
		"debug_mode",
		"service_settings",
		"charity_settings",
		"vip_settings",
		"coin_ratio",
		"app_download_config",
	}

	saved := 0
	for _, key := range keys {
		if value, ok := payload[key]; ok {
			if err := saveSettingWithDB(ctx, s.db, key, value); err != nil {
				return nil, err
			}
			saved++
		}
	}

	return map[string]interface{}{
		"scope":      "system_settings",
		"saved_keys": saved,
	}, nil
}

func (s *AdminService) ImportContentConfigBundle(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	if err := normalizeImportScope(payload, "content_config"); err != nil {
		return nil, err
	}

	carousels := parseImportItems(payload["carousels"])
	pushMessages := parseImportItems(payload["push_messages"])
	homeCampaigns := parseImportItems(payload["home_campaigns"])

	result := map[string]interface{}{
		"scope":               "content_config",
		"saved_settings":      0,
		"carousel_count":      0,
		"push_message_count":  0,
		"home_campaign_count": 0,
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if value, ok := payload["carousel_settings"]; ok {
			if err := saveSettingWithDB(ctx, tx, "carousel_settings", value); err != nil {
				return err
			}
			result["saved_settings"] = 1
		}

		for _, item := range carousels {
			uid := parseImportString(item, "id", "uid")
			tsid := parseImportString(item, "tsid")
			legacyID := parseImportLegacyID(item)
			existingID, err := findImportedRecordID(ctx, tx, "carousels", uid, tsid, legacyID)
			if err != nil {
				return err
			}

			record := repository.Carousel{}
			if existingID > 0 {
				if err := tx.WithContext(ctx).Where("id = ?", existingID).First(&record).Error; err != nil {
					return err
				}
			}

			record.CreatedAt = importRecordCreatedAt(item, record.CreatedAt)
			record.UpdatedAt = importRecordUpdatedAt(item, record.CreatedAt, record.UpdatedAt)
			uid, tsid, err = ensureImportedIdentity(ctx, tx, "carousels", uid, tsid, record.CreatedAt, record.UpdatedAt)
			if err != nil {
				return err
			}
			if existingID > 0 {
				record.ID = existingID
			} else if legacyID > 0 {
				record.ID = legacyID
			}
			record.UID = uid
			record.TSID = tsid
			record.Title = parseImportString(item, "title")
			record.ImageURL = parseImportString(item, "image_url")
			record.LinkURL = parseImportString(item, "link_url")
			record.LinkType = parseImportString(item, "link_type")
			record.SortOrder = int(parseInt64(item["sort_order"]))
			record.IsActive = parseBool(item["is_active"])

			if err := saveImportedModel(ctx, tx, "carousels", &record, record.ID, record.UID, record.TSID); err != nil {
				return err
			}
		}
		result["carousel_count"] = len(carousels)

		for _, item := range pushMessages {
			uid := parseImportString(item, "id", "uid")
			tsid := parseImportString(item, "tsid")
			legacyID := parseImportLegacyID(item)
			existingID, err := findImportedRecordID(ctx, tx, "push_messages", uid, tsid, legacyID)
			if err != nil {
				return err
			}

			record := repository.PushMessage{}
			if existingID > 0 {
				if err := tx.WithContext(ctx).Where("id = ?", existingID).First(&record).Error; err != nil {
					return err
				}
			}

			record.CreatedAt = importRecordCreatedAt(item, record.CreatedAt)
			record.UpdatedAt = importRecordUpdatedAt(item, record.CreatedAt, record.UpdatedAt)
			uid, tsid, err = ensureImportedIdentity(ctx, tx, "push_messages", uid, tsid, record.CreatedAt, record.UpdatedAt)
			if err != nil {
				return err
			}
			if existingID > 0 {
				record.ID = existingID
			} else if legacyID > 0 {
				record.ID = legacyID
			}
			record.UID = uid
			record.TSID = tsid
			record.Title = parseImportString(item, "title")
			record.Content = parseImportString(item, "content")
			record.ImageURL = parseImportString(item, "image_url")
			record.CompressImage = parseBool(item["compress_image"])
			record.IsActive = parseBool(item["is_active"])
			record.ScheduledStartTime = parseImportString(item, "scheduled_start_time")
			record.ScheduledEndTime = parseImportString(item, "scheduled_end_time")

			if err := saveImportedModel(ctx, tx, "push_messages", &record, record.ID, record.UID, record.TSID); err != nil {
				return err
			}
		}
		result["push_message_count"] = len(pushMessages)

		for _, item := range homeCampaigns {
			uid := parseImportString(item, "id", "uid")
			tsid := parseImportString(item, "tsid")
			legacyID := parseImportLegacyID(item)
			existingID, err := findImportedRecordID(ctx, tx, "home_promotion_campaigns", uid, tsid, legacyID)
			if err != nil {
				return err
			}

			record := repository.HomePromotionCampaign{}
			if existingID > 0 {
				if err := tx.WithContext(ctx).Where("id = ?", existingID).First(&record).Error; err != nil {
					return err
				}
			}

			record.CreatedAt = importRecordCreatedAt(item, record.CreatedAt)
			record.UpdatedAt = importRecordUpdatedAt(item, record.CreatedAt, record.UpdatedAt)
			uid, tsid, err = ensureImportedIdentity(ctx, tx, "home_promotion_campaigns", uid, tsid, record.CreatedAt, record.UpdatedAt)
			if err != nil {
				return err
			}
			if existingID > 0 {
				record.ID = existingID
			} else if legacyID > 0 {
				record.ID = legacyID
			}
			record.UID = uid
			record.TSID = tsid
			record.ObjectType = parseImportString(item, "objectType", "object_type")
			record.TargetLegacyID = parseImportLegacyID(map[string]interface{}{
				"legacy_id": item["targetLegacyId"],
			})
			record.TargetPublicID = parseImportString(item, "targetId", "target_id")
			record.SlotPosition = int(parseInt64(item["slotPosition"]))
			record.City = parseImportString(item, "city")
			record.BusinessCategory = parseImportString(item, "businessCategory")
			record.Status = parseImportString(item, "status")
			record.IsPositionLocked = parseBool(item["isPositionLocked"])
			record.PromoteLabel = parseImportString(item, "promoteLabel")
			record.ContractNo = parseImportString(item, "contractNo")
			record.ServiceRecordNo = parseImportString(item, "serviceRecordNo")
			record.Remark = parseImportString(item, "remark")
			record.StartAt = parseImportTime(item, "startAt", "start_at")
			record.EndAt = parseImportTime(item, "endAt", "end_at")
			record.ApprovedAt = parseImportTimePtr(item, "approvedAt", "approved_at")
			if hasImportKey(item, "approvedByAdminId", "approved_by_admin_id") {
				adminID := parseImportLegacyID(map[string]interface{}{
					"legacy_id": item["approvedByAdminId"],
				})
				if adminID > 0 {
					record.ApprovedByAdminID = &adminID
				} else {
					record.ApprovedByAdminID = nil
				}
			}

			if err := saveImportedModel(ctx, tx, "home_promotion_campaigns", &record, record.ID, record.UID, record.TSID); err != nil {
				return err
			}
		}
		result["home_campaign_count"] = len(homeCampaigns)

		return nil
	})
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *AdminService) ImportAPIConfigBundle(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	if err := normalizeImportScope(payload, "api_config"); err != nil {
		return nil, err
	}

	items := parseImportItems(payload["public_apis"])
	result := map[string]interface{}{
		"scope":            "api_config",
		"saved_settings":   0,
		"public_api_count": 0,
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		savedSettings := 0
		for _, key := range []string{"sms_config", "weather_config", "wechat_login_config"} {
			if value, ok := payload[key]; ok {
				if err := saveSettingWithDB(ctx, tx, key, value); err != nil {
					return err
				}
				savedSettings++
			}
		}
		result["saved_settings"] = savedSettings

		for _, item := range items {
			uid := parseImportString(item, "id", "uid")
			tsid := parseImportString(item, "tsid")
			legacyID := parseImportLegacyID(item)
			existingID, err := findImportedRecordID(ctx, tx, "public_apis", uid, tsid, legacyID)
			if err != nil {
				return err
			}

			record := repository.PublicAPI{}
			if existingID > 0 {
				if err := tx.WithContext(ctx).Where("id = ?", existingID).First(&record).Error; err != nil {
					return err
				}
			}

			record.CreatedAt = importRecordCreatedAt(item, record.CreatedAt)
			record.UpdatedAt = importRecordUpdatedAt(item, record.CreatedAt, record.UpdatedAt)
			uid, tsid, err = ensureImportedIdentity(ctx, tx, "public_apis", uid, tsid, record.CreatedAt, record.UpdatedAt)
			if err != nil {
				return err
			}
			if existingID > 0 {
				record.ID = existingID
			} else if legacyID > 0 {
				record.ID = legacyID
			}
			record.UID = uid
			record.TSID = tsid
			record.Name = parseImportString(item, "name")
			record.Path = parseImportString(item, "path")
			permsPayload, _ := json.Marshal(parseStringSliceValue(item["permissions"]))
			record.Permissions = string(permsPayload)
			record.APIKey = parseImportString(item, "api_key")
			record.Description = parseImportString(item, "description")
			record.IsActive = parseBool(item["is_active"])

			if err := saveImportedModel(ctx, tx, "public_apis", &record, record.ID, record.UID, record.TSID); err != nil {
				return err
			}
		}
		result["public_api_count"] = len(items)

		return nil
	})
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *AdminService) ImportPaymentConfigBundle(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	if err := normalizeImportScope(payload, "payment_config"); err != nil {
		return nil, err
	}

	saved := 0
	for _, key := range []string{"pay_mode", "wxpay_config", "alipay_config", "payment_notices"} {
		if value, ok := payload[key]; ok {
			if err := saveSettingWithDB(ctx, s.db, key, value); err != nil {
				return nil, err
			}
			saved++
		}
	}

	return map[string]interface{}{
		"scope":         "payment_config",
		"saved_configs": saved,
	}, nil
}
