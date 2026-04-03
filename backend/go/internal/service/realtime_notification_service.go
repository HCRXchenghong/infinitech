package service

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type RealtimeNotificationService struct {
	db            *gorm.DB
	mobilePush    *MobilePushService
	socketURL     string
	socketSecret  string
	requestClient *http.Client
}

type RealtimeRecipient struct {
	UserType string
	UserID   string
}

type RealtimeNotificationEnvelope struct {
	EventType      string
	Title          string
	Content        string
	Route          string
	MessageID      string
	RefreshTargets []string
	Payload        map[string]interface{}
}

func NewRealtimeNotificationService(db *gorm.DB, cfg *config.Config, mobilePush *MobilePushService) *RealtimeNotificationService {
	timeout := 5 * time.Second
	socketURL := ""
	socketSecret := ""
	if cfg != nil {
		socketURL = strings.TrimRight(strings.TrimSpace(cfg.Socket.ServerURL), "/")
		socketSecret = strings.TrimSpace(cfg.Socket.APISecret)
		if cfg.Socket.RequestTimeout > 0 {
			timeout = cfg.Socket.RequestTimeout
		}
	}
	return &RealtimeNotificationService{
		db:           db,
		mobilePush:   mobilePush,
		socketURL:    socketURL,
		socketSecret: socketSecret,
		requestClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (s *RealtimeNotificationService) NotifyBestEffort(ctx context.Context, recipients []RealtimeRecipient, envelope RealtimeNotificationEnvelope) {
	if s == nil {
		return
	}
	if err := s.Notify(ctx, recipients, envelope); err != nil {
		log.Printf("⚠️ realtime notification dispatch failed: %v", err)
	}
}

func (s *RealtimeNotificationService) Notify(ctx context.Context, recipients []RealtimeRecipient, envelope RealtimeNotificationEnvelope) error {
	if s == nil {
		return nil
	}
	normalizedRecipients := normalizeRealtimeRecipients(recipients)
	if len(normalizedRecipients) == 0 {
		return nil
	}

	envelope = normalizeRealtimeEnvelope(envelope, normalizedRecipients)
	if envelope.EventType == "" {
		return fmt.Errorf("%w: eventType is required", ErrInvalidArgument)
	}

	var errs []string
	if err := s.queuePushDeliveries(ctx, normalizedRecipients, envelope); err != nil {
		errs = append(errs, fmt.Sprintf("push: %v", err))
	}
	if err := s.publishSocketEvent(ctx, normalizedRecipients, envelope); err != nil {
		errs = append(errs, fmt.Sprintf("socket: %v", err))
	}
	if len(errs) > 0 {
		return fmt.Errorf("%w: %s", ErrInvalidArgument, strings.Join(errs, "; "))
	}
	return nil
}

func normalizeRealtimeRecipients(recipients []RealtimeRecipient) []RealtimeRecipient {
	if len(recipients) == 0 {
		return nil
	}
	normalized := make([]RealtimeRecipient, 0, len(recipients))
	seen := make(map[string]struct{}, len(recipients))
	for _, recipient := range recipients {
		userType := normalizeRealtimeUserType(recipient.UserType)
		userID := strings.TrimSpace(recipient.UserID)
		if userType == "" || userID == "" {
			continue
		}
		key := userType + "|" + userID
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, RealtimeRecipient{
			UserType: userType,
			UserID:   userID,
		})
	}
	return normalized
}

func normalizeRealtimeUserType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "customer", "user":
		return "customer"
	case "rider":
		return "rider"
	case "merchant":
		return "merchant"
	case "admin":
		return "admin"
	default:
		return ""
	}
}

func normalizeRealtimeRoute(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value
	}
	if strings.HasPrefix(value, "/") {
		return value
	}
	return "/" + value
}

func normalizeRealtimeRefreshTargets(raw []string) []string {
	if len(raw) == 0 {
		return nil
	}
	result := make([]string, 0, len(raw))
	seen := make(map[string]struct{}, len(raw))
	for _, item := range raw {
		value := strings.TrimSpace(strings.ToLower(item))
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func normalizeRealtimeEnvelope(envelope RealtimeNotificationEnvelope, recipients []RealtimeRecipient) RealtimeNotificationEnvelope {
	envelope.EventType = strings.TrimSpace(envelope.EventType)
	envelope.Title = strings.TrimSpace(envelope.Title)
	envelope.Content = strings.TrimSpace(envelope.Content)
	envelope.Route = normalizeRealtimeRoute(envelope.Route)
	envelope.RefreshTargets = normalizeRealtimeRefreshTargets(envelope.RefreshTargets)
	if envelope.Payload == nil {
		envelope.Payload = map[string]interface{}{}
	}
	if strings.TrimSpace(envelope.MessageID) == "" {
		envelope.MessageID = buildRealtimeMessageID(envelope.EventType, envelope.Route, recipients, envelope.Payload)
	}
	envelope.Payload["eventType"] = envelope.EventType
	envelope.Payload["title"] = envelope.Title
	envelope.Payload["content"] = envelope.Content
	envelope.Payload["route"] = envelope.Route
	envelope.Payload["messageId"] = envelope.MessageID
	if len(envelope.RefreshTargets) > 0 {
		envelope.Payload["refreshTargets"] = envelope.RefreshTargets
	}
	return envelope
}

func buildRealtimeMessageID(eventType, route string, recipients []RealtimeRecipient, payload map[string]interface{}) string {
	recipientKeys := make([]string, 0, len(recipients))
	for _, recipient := range recipients {
		recipientKeys = append(recipientKeys, recipient.UserType+":"+recipient.UserID)
	}
	payloadJSON, _ := json.Marshal(payload)
	sum := sha1.Sum([]byte(strings.Join([]string{
		strings.TrimSpace(eventType),
		strings.TrimSpace(route),
		strings.Join(recipientKeys, ","),
		string(payloadJSON),
	}, "|")))
	return hex.EncodeToString(sum[:])
}

func buildRealtimeRecipientKey(userType, userID string) string {
	userType = normalizeRealtimeUserType(userType)
	userID = strings.TrimSpace(userID)
	if userType == "" || userID == "" {
		return ""
	}
	return userType + "|" + userID
}

func (s *RealtimeNotificationService) queuePushDeliveries(ctx context.Context, recipients []RealtimeRecipient, envelope RealtimeNotificationEnvelope) error {
	if s == nil || s.db == nil || s.mobilePush == nil {
		return nil
	}

	recipientKeys := make(map[string]struct{}, len(recipients))
	for _, recipient := range recipients {
		key := buildRealtimeRecipientKey(recipient.UserType, recipient.UserID)
		if key == "" {
			continue
		}
		recipientKeys[key] = struct{}{}
	}
	if len(recipientKeys) == 0 {
		return nil
	}

	var devices []repository.PushDevice
	if err := s.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("last_registered_at DESC").
		Order("updated_at DESC").
		Order("id DESC").
		Find(&devices).Error; err != nil {
		return err
	}

	latestDevices := make(map[string]repository.PushDevice, len(recipientKeys))
	for _, device := range devices {
		key := buildRealtimeRecipientKey(device.UserType, device.UserID)
		if key == "" {
			continue
		}
		if _, ok := recipientKeys[key]; !ok {
			continue
		}
		if _, exists := latestDevices[key]; exists {
			continue
		}
		latestDevices[key] = device
	}
	if len(latestDevices) == 0 {
		return nil
	}

	payloadJSON, _ := json.Marshal(envelope.Payload)
	now := time.Now()
	for _, device := range latestDevices {
		record := repository.PushDelivery{
			MessageID:   envelope.MessageID,
			UserID:      strings.TrimSpace(device.UserID),
			UserType:    strings.TrimSpace(device.UserType),
			DeviceToken: strings.TrimSpace(device.DeviceToken),
			AppEnv:      strings.TrimSpace(device.AppEnv),
			EventType:   envelope.EventType,
			Status:      "queued",
			Payload:     string(payloadJSON),
		}
		if err := s.db.WithContext(ctx).
			Clauses(clause.OnConflict{
				Columns: []clause.Column{
					{Name: "message_id"},
					{Name: "user_id"},
					{Name: "user_type"},
				},
				DoUpdates: clause.Assignments(map[string]interface{}{
					"device_token":        record.DeviceToken,
					"app_env":             record.AppEnv,
					"event_type":          record.EventType,
					"status":              "queued",
					"payload":             record.Payload,
					"retry_count":         0,
					"next_retry_at":       nil,
					"dispatch_provider":   "",
					"provider_message_id": "",
					"error_code":          "",
					"error_message":       "",
					"sent_at":             nil,
					"updated_at":          now,
				}),
			}).
			Create(&record).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s *RealtimeNotificationService) publishSocketEvent(ctx context.Context, recipients []RealtimeRecipient, envelope RealtimeNotificationEnvelope) error {
	if s == nil || s.socketURL == "" || s.socketSecret == "" || s.requestClient == nil {
		return nil
	}

	type socketRecipient struct {
		Role   string `json:"role"`
		UserID string `json:"userId"`
	}

	socketRecipients := make([]socketRecipient, 0, len(recipients))
	for _, recipient := range recipients {
		role := normalizeRealtimeSocketRole(recipient.UserType)
		if role == "" {
			continue
		}
		socketRecipients = append(socketRecipients, socketRecipient{
			Role:   role,
			UserID: strings.TrimSpace(recipient.UserID),
		})
	}
	if len(socketRecipients) == 0 {
		return nil
	}

	body, err := json.Marshal(map[string]interface{}{
		"eventName":  "business_notification",
		"recipients": socketRecipients,
		"payload":    envelope.Payload,
	})
	if err != nil {
		return err
	}

	requestCtx := ctx
	if requestCtx == nil {
		requestCtx = context.Background()
	}
	req, err := http.NewRequestWithContext(requestCtx, http.MethodPost, s.socketURL+"/api/realtime/publish", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Authorization", "Bearer "+s.socketSecret)

	resp, err := s.requestClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("socket realtime publish failed with status %d", resp.StatusCode)
}

func normalizeRealtimeSocketRole(userType string) string {
	switch normalizeRealtimeUserType(userType) {
	case "customer":
		return "user"
	case "rider":
		return "rider"
	case "merchant":
		return "merchant"
	case "admin":
		return "admin"
	default:
		return ""
	}
}

func customerWalletRoute() string {
	return "/pages/profile/wallet/bills/index"
}

func customerOrderRoute(orderID string) string {
	return "/pages/order/detail/index?id=" + urlQueryEscape(orderID)
}

func customerAfterSalesRoute(orderID string) string {
	return "/pages/order/refund/index?id=" + urlQueryEscape(orderID)
}

func customerOrderRecipients(order *repository.Order) []RealtimeRecipient {
	if order == nil {
		return nil
	}
	return []RealtimeRecipient{{
		UserType: "customer",
		UserID:   firstTrimmed(order.UserID, order.CustomerPhone),
	}}
}

func merchantOrderRecipients(order *repository.Order) []RealtimeRecipient {
	if order == nil || strings.TrimSpace(order.MerchantID) == "" {
		return nil
	}
	return []RealtimeRecipient{{
		UserType: "merchant",
		UserID:   strings.TrimSpace(order.MerchantID),
	}}
}

func riderOrderRecipients(order *repository.Order) []RealtimeRecipient {
	if order == nil {
		return nil
	}
	return []RealtimeRecipient{{
		UserType: "rider",
		UserID:   firstTrimmed(order.RiderID, order.RiderPhone),
	}}
}

func merchantOrderRoute(orderID string) string {
	return "/pages/orders/detail?id=" + urlQueryEscape(orderID)
}

func merchantWalletRoute() string {
	return "/pages/store/wallet"
}

func riderWalletRoute() string {
	return "/pages/profile/wallet-bills/index"
}

func riderOrderHallRoute() string {
	return "/pages/tasks/index"
}

func (s *RealtimeNotificationService) NotifyWithdrawStatus(ctx context.Context, record *repository.WithdrawRequest, status, reason string) {
	if s == nil || record == nil {
		return
	}
	status = strings.ToLower(strings.TrimSpace(status))
	reason = strings.TrimSpace(reason)
	title := "提现状态更新"
	content := "你的提现状态已更新，请及时查看。"
	switch status {
	case "pending_transfer":
		title = "提现审核已通过"
		content = "你的提现申请已审核通过，等待打款。"
	case "transferring":
		title = "提现处理中"
		content = "你的提现已进入打款流程，请留意到账情况。"
	case "success", "completed":
		title = "提现成功"
		content = "你的提现已处理成功。"
	case "rejected":
		title = "提现已驳回"
		content = firstTrimmed(reason, strings.TrimSpace(record.RejectReason), "你的提现申请已被驳回，可重新申请或联系客服。")
	case "failed":
		title = "提现失败"
		content = firstTrimmed(reason, strings.TrimSpace(record.TransferResult), "你的提现处理失败，金额已退回，可重新申请或联系客服。")
	}

	route := customerWalletRoute()
	refreshTargets := []string{"wallet", "withdraw"}
	switch normalizeRealtimeUserType(record.UserType) {
	case "rider":
		route = riderWalletRoute()
	case "merchant":
		route = merchantWalletRoute()
	}

	s.NotifyBestEffort(ctx, []RealtimeRecipient{{
		UserType: record.UserType,
		UserID:   strings.TrimSpace(record.UserID),
	}}, RealtimeNotificationEnvelope{
		EventType:      "wallet.withdraw." + status,
		Title:          title,
		Content:        content,
		Route:          route,
		RefreshTargets: refreshTargets,
		Payload: map[string]interface{}{
			"requestId":      strings.TrimSpace(record.RequestID),
			"status":         status,
			"withdrawMethod": strings.TrimSpace(record.WithdrawMethod),
			"reason":         firstTrimmed(reason, strings.TrimSpace(record.RejectReason), strings.TrimSpace(record.TransferResult)),
		},
	})
}

func (s *RealtimeNotificationService) NotifyRechargeStatus(ctx context.Context, userType, userID, rechargeOrderID, status, reason string) {
	if s == nil || strings.TrimSpace(userID) == "" {
		return
	}
	status = strings.ToLower(strings.TrimSpace(status))
	title := "充值状态更新"
	content := "你的充值状态已更新，请及时查看。"
	switch status {
	case "success", "completed", "paid":
		title = "充值成功"
		content = "你的充值已到账。"
	case "failed":
		title = "充值失败"
		content = firstTrimmed(strings.TrimSpace(reason), "你的充值失败，请稍后重试。")
	}

	route := customerWalletRoute()
	if normalizeRealtimeUserType(userType) == "merchant" {
		route = merchantWalletRoute()
	} else if normalizeRealtimeUserType(userType) == "rider" {
		route = riderWalletRoute()
	}

	s.NotifyBestEffort(ctx, []RealtimeRecipient{{
		UserType: userType,
		UserID:   userID,
	}}, RealtimeNotificationEnvelope{
		EventType:      "wallet.recharge." + status,
		Title:          title,
		Content:        content,
		Route:          route,
		RefreshTargets: []string{"wallet", "recharge"},
		Payload: map[string]interface{}{
			"rechargeOrderId": strings.TrimSpace(rechargeOrderID),
			"status":          status,
			"reason":          strings.TrimSpace(reason),
		},
	})
}

func (s *RealtimeNotificationService) NotifyRiderDepositStatus(ctx context.Context, riderID, rechargeOrderID, status, reason string) {
	if s == nil || strings.TrimSpace(riderID) == "" {
		return
	}
	status = strings.ToLower(strings.TrimSpace(status))
	title := "保证金状态更新"
	content := "你的保证金状态已更新。"
	switch status {
	case "success", "paid":
		title = "保证金已缴纳"
		content = "你的接单保证金已缴纳成功。"
	case "failed":
		title = "保证金缴纳失败"
		content = firstTrimmed(strings.TrimSpace(reason), "你的保证金缴纳失败，请稍后重试。")
	}

	s.NotifyBestEffort(ctx, []RealtimeRecipient{{
		UserType: "rider",
		UserID:   strings.TrimSpace(riderID),
	}}, RealtimeNotificationEnvelope{
		EventType:      "wallet.rider_deposit." + status,
		Title:          title,
		Content:        content,
		Route:          "/pages/profile/wallet",
		RefreshTargets: []string{"wallet", "rider_deposit"},
		Payload: map[string]interface{}{
			"rechargeOrderId": strings.TrimSpace(rechargeOrderID),
			"status":          status,
			"reason":          strings.TrimSpace(reason),
		},
	})
}

func (s *RealtimeNotificationService) NotifyOrderEvent(ctx context.Context, order *repository.Order, eventType, title, content string, includeUser, includeMerchant, includeRider bool) {
	if s == nil || order == nil {
		return
	}
	recipients := make([]RealtimeRecipient, 0, 3)
	if includeUser {
		recipients = append(recipients, customerOrderRecipients(order)...)
	}
	if includeMerchant {
		recipients = append(recipients, merchantOrderRecipients(order)...)
	}
	if includeRider {
		recipients = append(recipients, riderOrderRecipients(order)...)
	}
	s.NotifyBestEffort(ctx, recipients, RealtimeNotificationEnvelope{
		EventType:      eventType,
		Title:          title,
		Content:        content,
		Route:          customerOrderRoute(fmt.Sprint(order.ID)),
		RefreshTargets: []string{"orders"},
		Payload: map[string]interface{}{
			"orderId":        fmt.Sprint(order.ID),
			"dailyOrderId":   strings.TrimSpace(order.DailyOrderID),
			"status":         strings.TrimSpace(order.Status),
			"paymentStatus":  strings.TrimSpace(order.PaymentStatus),
			"customerRoute":  customerOrderRoute(fmt.Sprint(order.ID)),
			"merchantRoute":  merchantOrderRoute(fmt.Sprint(order.ID)),
			"riderRoute":     riderOrderHallRoute(),
			"defaultRoute":   customerOrderRoute(fmt.Sprint(order.ID)),
			"customerUserId": firstTrimmed(order.UserID, order.CustomerPhone),
			"merchantUserId": strings.TrimSpace(order.MerchantID),
			"riderUserId":    firstTrimmed(order.RiderID, order.RiderPhone),
			"shopName":       strings.TrimSpace(order.ShopName),
			"customerPhone":  strings.TrimSpace(order.CustomerPhone),
			"riderName":      strings.TrimSpace(order.RiderName),
			"title":          title,
			"content":        content,
			"routeByUserType": map[string]string{
				"customer": customerOrderRoute(fmt.Sprint(order.ID)),
				"merchant": merchantOrderRoute(fmt.Sprint(order.ID)),
				"rider":    riderOrderHallRoute(),
			},
		},
	})
}

func (s *RealtimeNotificationService) NotifyAfterSalesStatus(ctx context.Context, req *repository.AfterSalesRequest, title, content string) {
	if s == nil || req == nil {
		return
	}
	recipients := make([]RealtimeRecipient, 0, 2)
	if strings.TrimSpace(req.UserID) != "" {
		recipients = append(recipients, RealtimeRecipient{UserType: "customer", UserID: strings.TrimSpace(req.UserID)})
	}
	merchantIDs := make([]string, 0)
	if req.ShopID != "" && s.db != nil {
		rows := []struct {
			MerchantID uint `gorm:"column:merchant_id"`
		}{}
		if err := s.db.WithContext(ctx).Table("shops").Select("merchant_id").Where("id = ?", req.ShopID).Find(&rows).Error; err == nil {
			for _, row := range rows {
				if row.MerchantID > 0 {
					merchantIDs = append(merchantIDs, fmt.Sprint(row.MerchantID))
				}
			}
		}
	}
	for _, merchantID := range merchantIDs {
		recipients = append(recipients, RealtimeRecipient{UserType: "merchant", UserID: merchantID})
	}
	s.NotifyBestEffort(ctx, recipients, RealtimeNotificationEnvelope{
		EventType:      "after_sales." + strings.ToLower(strings.TrimSpace(req.Status)),
		Title:          title,
		Content:        content,
		Route:          customerAfterSalesRoute(fmt.Sprint(req.OrderID)),
		RefreshTargets: []string{"orders", "after_sales"},
		Payload: map[string]interface{}{
			"afterSalesId": fmt.Sprint(req.ID),
			"orderId":      fmt.Sprint(req.OrderID),
			"requestNo":    strings.TrimSpace(req.RequestNo),
			"status":       strings.TrimSpace(req.Status),
			"routeByUserType": map[string]string{
				"customer": customerAfterSalesRoute(fmt.Sprint(req.OrderID)),
				"merchant": merchantOrderRoute(fmt.Sprint(req.OrderID)),
			},
		},
	})
}

func urlQueryEscape(value string) string {
	replacer := strings.NewReplacer("%", "%25", " ", "%20", "#", "%23", "&", "%26", "?", "%3F", "=", "%3D")
	return replacer.Replace(strings.TrimSpace(value))
}
