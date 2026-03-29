package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

type PushDispatchProvider interface {
	Name() string
	Send(ctx context.Context, req PushDispatchRequest) (*PushDispatchResult, error)
}

type PushDispatchRequest struct {
	DeliveryID       string                 `json:"deliveryId"`
	MessageID        string                 `json:"messageId"`
	UserID           string                 `json:"userId"`
	UserType         string                 `json:"userType"`
	DeviceToken      string                 `json:"deviceToken"`
	AppEnv           string                 `json:"appEnv"`
	EventType        string                 `json:"eventType"`
	Title            string                 `json:"title"`
	Content          string                 `json:"content"`
	ImageURL         string                 `json:"imageUrl"`
	Route            string                 `json:"route"`
	Payload          map[string]interface{} `json:"payload"`
	RawPayload       string                 `json:"rawPayload"`
	RetryCount       int                    `json:"retryCount"`
	DispatchProvider string                 `json:"dispatchProvider"`
}

type PushDispatchResult struct {
	Provider          string
	ProviderMessageID string
}

type pushDispatchHTTPError struct {
	statusCode int
	body       string
}

func (e *pushDispatchHTTPError) Error() string {
	return fmt.Sprintf("push dispatcher returned status %d: %s", e.statusCode, strings.TrimSpace(e.body))
}

type pushDispatchRejectedError struct {
	code    string
	message string
}

func (e *pushDispatchRejectedError) Error() string {
	message := strings.TrimSpace(e.message)
	if message == "" {
		message = "provider rejected dispatch request"
	}
	if strings.TrimSpace(e.code) == "" {
		return message
	}
	return fmt.Sprintf("%s: %s", strings.TrimSpace(e.code), message)
}

type pushWebhookDispatcher struct {
	url        string
	secret     string
	authHeader string
	authValue  string
	client     *http.Client
}

func (d *pushWebhookDispatcher) Name() string {
	return "webhook"
}

func (d *pushWebhookDispatcher) Send(ctx context.Context, req PushDispatchRequest) (*PushDispatchResult, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, d.url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Push-Delivery-Id", req.DeliveryID)
	httpReq.Header.Set("X-Push-Message-Id", req.MessageID)

	if d.authHeader != "" && d.authValue != "" {
		httpReq.Header.Set(d.authHeader, d.authValue)
	}
	if d.secret != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		httpReq.Header.Set("X-Push-Timestamp", timestamp)
		httpReq.Header.Set("X-Push-Signature", signPushWebhookPayload(d.secret, timestamp, body))
	}

	resp, err := d.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 32*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &pushDispatchHTTPError{
			statusCode: resp.StatusCode,
			body:       string(respBody),
		}
	}

	result := &PushDispatchResult{Provider: d.Name()}
	if len(respBody) == 0 {
		return result, nil
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(respBody, &payload); err == nil {
		if rejected, rejectionCode, rejectionMessage := detectPushWebhookRejection(payload); rejected {
			return nil, &pushDispatchRejectedError{
				code:    rejectionCode,
				message: rejectionMessage,
			}
		}
		result.ProviderMessageID = strings.TrimSpace(parseString(
			firstNonNil(
				payload["providerMessageId"],
				payload["provider_message_id"],
				payload["messageId"],
				payload["message_id"],
				payload["id"],
			),
		))
	}
	return result, nil
}

type pushLogDispatcher struct{}

func (d *pushLogDispatcher) Name() string {
	return "log"
}

func (d *pushLogDispatcher) Send(ctx context.Context, req PushDispatchRequest) (*PushDispatchResult, error) {
	log.Printf(
		"[push-dispatch] simulated provider=log delivery=%s message=%s user=%s/%s token=%s title=%s",
		req.DeliveryID,
		req.MessageID,
		req.UserType,
		req.UserID,
		req.DeviceToken,
		req.Title,
	)
	return &PushDispatchResult{
		Provider:          d.Name(),
		ProviderMessageID: req.DeliveryID,
	}, nil
}

func newPushDispatchProvider(options MobilePushOptions) PushDispatchProvider {
	name := strings.ToLower(strings.TrimSpace(options.ProviderName))
	if name == "" {
		name = "log"
	}

	switch name {
	case "webhook":
		timeout := options.RequestTimeout
		if timeout <= 0 {
			timeout = 5 * time.Second
		}
		return &pushWebhookDispatcher{
			url:        strings.TrimSpace(options.WebhookURL),
			secret:     strings.TrimSpace(options.WebhookSecret),
			authHeader: strings.TrimSpace(options.WebhookAuthHeader),
			authValue:  strings.TrimSpace(options.WebhookAuthValue),
			client: &http.Client{
				Timeout: timeout,
			},
		}
	default:
		return &pushLogDispatcher{}
	}
}

func (s *MobilePushService) StartDeliveryWorker(ctx context.Context) {
	if s == nil || s.db == nil {
		return
	}
	if !s.dispatchEnabled {
		s.setWorkerRunning(false)
		s.recordDispatchCycle("disabled", 0, nil)
		log.Println("[push-dispatch] worker disabled")
		return
	}

	s.setWorkerRunning(true)
	processed, err := s.RunDispatchCycle(ctx, s.dispatchBatchSize)
	if err != nil {
		s.recordDispatchCycle("error", processed, err)
		log.Printf("[push-dispatch] initial cycle failed: %v", err)
	} else {
		s.recordDispatchCycle("ok", processed, nil)
	}

	ticker := time.NewTicker(s.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.setWorkerRunning(false)
			s.recordDispatchCycle("stopped", 0, nil)
			log.Println("[push-dispatch] worker stopped")
			return
		case <-ticker.C:
			processed, err := s.RunDispatchCycle(ctx, s.dispatchBatchSize)
			if err != nil {
				s.recordDispatchCycle("error", processed, err)
				log.Printf("[push-dispatch] cycle failed: %v", err)
				continue
			}
			s.recordDispatchCycle("ok", processed, nil)
		}
	}
}

func (s *MobilePushService) RunDispatchCycle(ctx context.Context, limit int) (int, error) {
	if s == nil || s.db == nil || !s.dispatchEnabled {
		return 0, nil
	}
	if limit <= 0 {
		limit = s.dispatchBatchSize
	}
	if limit <= 0 {
		limit = 100
	}

	if err := s.syncActiveAdminPushMessages(ctx); err != nil {
		return 0, err
	}

	processed, err := s.dispatchDueDeliveries(ctx, limit)
	if err != nil {
		return processed, err
	}
	if processed > 0 {
		log.Printf("[push-dispatch] processed deliveries=%d", processed)
	}
	return processed, nil
}

func (s *MobilePushService) dispatchDueDeliveries(ctx context.Context, limit int) (int, error) {
	now := time.Now()
	var deliveries []repository.PushDelivery
	if err := s.db.WithContext(ctx).
		Where("status = ?", "queued").
		Or("(status = ? OR status = ?) AND (next_retry_at IS NULL OR next_retry_at <= ?)", "retry_pending", "pending", now).
		Order("created_at ASC").
		Limit(limit).
		Find(&deliveries).Error; err != nil {
		return 0, err
	}

	processed := 0
	for _, delivery := range deliveries {
		claimed, current, err := s.claimPushDelivery(ctx, delivery.ID, now)
		if err != nil {
			return processed, err
		}
		if !claimed || current == nil {
			continue
		}

		if err := s.dispatchSingleDelivery(ctx, current, now); err != nil {
			return processed, err
		}
		processed++
	}
	return processed, nil
}

func (s *MobilePushService) claimPushDelivery(ctx context.Context, id uint, now time.Time) (bool, *repository.PushDelivery, error) {
	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return false, nil, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	result := tx.Model(&repository.PushDelivery{}).
		Where("id = ?", id).
		Where("status = ?", "queued").
		Or("id = ? AND (status = ? OR status = ?) AND (next_retry_at IS NULL OR next_retry_at <= ?)", id, "retry_pending", "pending", now).
		Updates(map[string]interface{}{
			"status":     "dispatching",
			"updated_at": now,
		})
	if result.Error != nil {
		tx.Rollback()
		return false, nil, result.Error
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return false, nil, nil
	}

	var delivery repository.PushDelivery
	if err := tx.Where("id = ?", id).Take(&delivery).Error; err != nil {
		tx.Rollback()
		return false, nil, err
	}
	if err := tx.Commit().Error; err != nil {
		return false, nil, err
	}
	return true, &delivery, nil
}

func (s *MobilePushService) dispatchSingleDelivery(ctx context.Context, delivery *repository.PushDelivery, now time.Time) error {
	if delivery == nil {
		return nil
	}

	req := buildPushDispatchRequest(*delivery)
	result, err := s.dispatchProvider.Send(ctx, req)
	if err == nil {
		updates := map[string]interface{}{
			"status":              "sent",
			"dispatch_provider":   strings.TrimSpace(result.Provider),
			"provider_message_id": strings.TrimSpace(result.ProviderMessageID),
			"sent_at":             now,
			"next_retry_at":       nil,
			"error_code":          "",
			"error_message":       "",
			"updated_at":          now,
		}
		return s.db.WithContext(ctx).
			Model(&repository.PushDelivery{}).
			Where("id = ?", delivery.ID).
			Updates(updates).Error
	}

	nextRetryCount := delivery.RetryCount + 1
	nextStatus := "failed"
	var nextRetryAt *time.Time
	if nextRetryCount <= s.dispatchMaxRetries {
		retryAt := now.Add(s.retryBackoff)
		nextRetryAt = &retryAt
		nextStatus = "retry_pending"
	}

	errorCode, errorMessage := classifyPushDispatchError(err)
	updates := map[string]interface{}{
		"status":            nextStatus,
		"retry_count":       nextRetryCount,
		"next_retry_at":     nextRetryAt,
		"error_code":        errorCode,
		"error_message":     errorMessage,
		"updated_at":        now,
		"dispatch_provider": strings.TrimSpace(s.dispatchProvider.Name()),
	}
	return s.db.WithContext(ctx).
		Model(&repository.PushDelivery{}).
		Where("id = ?", delivery.ID).
		Updates(updates).Error
}

func (s *MobilePushService) syncActiveAdminPushMessages(ctx context.Context) error {
	if s == nil || s.admin == nil || s.db == nil {
		return nil
	}

	var messages []repository.PushMessage
	if err := s.db.WithContext(ctx).
		Where("is_active = ?", true).
		Find(&messages).Error; err != nil {
		return err
	}

	for i := range messages {
		if err := s.admin.syncPushMessageDeliveries(ctx, &messages[i]); err != nil {
			return err
		}
	}
	return nil
}

func buildPushDispatchRequest(delivery repository.PushDelivery) PushDispatchRequest {
	payloadMap := make(map[string]interface{})
	if raw := strings.TrimSpace(delivery.Payload); raw != "" {
		_ = json.Unmarshal([]byte(raw), &payloadMap)
	}
	title := strings.TrimSpace(parseString(firstNonNil(payloadMap["title"], payloadMap["Title"])))
	content := strings.TrimSpace(parseString(firstNonNil(payloadMap["content"], payloadMap["body"], payloadMap["Content"])))
	imageURL := strings.TrimSpace(parseString(firstNonNil(payloadMap["imageUrl"], payloadMap["image_url"])))
	route := strings.TrimSpace(parseString(firstNonNil(payloadMap["route"], payloadMap["path"], payloadMap["url"])))

	return PushDispatchRequest{
		DeliveryID:       strings.TrimSpace(delivery.UID),
		MessageID:        strings.TrimSpace(delivery.MessageID),
		UserID:           strings.TrimSpace(delivery.UserID),
		UserType:         strings.TrimSpace(delivery.UserType),
		DeviceToken:      strings.TrimSpace(delivery.DeviceToken),
		AppEnv:           strings.TrimSpace(delivery.AppEnv),
		EventType:        strings.TrimSpace(delivery.EventType),
		Title:            title,
		Content:          content,
		ImageURL:         imageURL,
		Route:            route,
		Payload:          payloadMap,
		RawPayload:       strings.TrimSpace(delivery.Payload),
		RetryCount:       delivery.RetryCount,
		DispatchProvider: strings.TrimSpace(delivery.DispatchProvider),
	}
}

func classifyPushDispatchError(err error) (string, string) {
	if err == nil {
		return "", ""
	}

	if httpErr, ok := err.(*pushDispatchHTTPError); ok {
		return fmt.Sprintf("http_%d", httpErr.statusCode), strings.TrimSpace(httpErr.body)
	}
	if rejectedErr, ok := err.(*pushDispatchRejectedError); ok {
		code := strings.TrimSpace(rejectedErr.code)
		if code == "" {
			code = "provider_rejected"
		}
		return code, strings.TrimSpace(rejectedErr.message)
	}
	return "dispatch_error", strings.TrimSpace(err.Error())
}

func firstNonNil(values ...interface{}) interface{} {
	for _, value := range values {
		if value == nil {
			continue
		}
		return value
	}
	return nil
}

func signPushWebhookPayload(secret, timestamp string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(timestamp))
	_, _ = mac.Write([]byte("."))
	_, _ = mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func detectPushWebhookRejection(payload map[string]interface{}) (bool, string, string) {
	if payload == nil {
		return false, "", ""
	}

	if value, exists := payload["success"]; exists {
		if success, ok := parseBoolish(value); ok && !success {
			return true, extractPushWebhookCode(payload), extractPushWebhookMessage(payload)
		}
	}
	if value, exists := payload["ok"]; exists {
		if success, ok := parseBoolish(value); ok && !success {
			return true, extractPushWebhookCode(payload), extractPushWebhookMessage(payload)
		}
	}
	return false, "", ""
}

func parseBoolish(value interface{}) (bool, bool) {
	switch typed := value.(type) {
	case bool:
		return typed, true
	case string:
		normalized := strings.TrimSpace(strings.ToLower(typed))
		switch normalized {
		case "true", "1", "yes", "ok":
			return true, true
		case "false", "0", "no":
			return false, true
		}
	case float64:
		if typed == 1 {
			return true, true
		}
		if typed == 0 {
			return false, true
		}
	case int:
		if typed == 1 {
			return true, true
		}
		if typed == 0 {
			return false, true
		}
	}
	return false, false
}

func extractPushWebhookCode(payload map[string]interface{}) string {
	return strings.TrimSpace(parseString(firstNonNil(
		payload["code"],
		payload["errorCode"],
		payload["error_code"],
	)))
}

func extractPushWebhookMessage(payload map[string]interface{}) string {
	return strings.TrimSpace(parseString(firstNonNil(
		payload["message"],
		payload["error"],
		payload["errorMessage"],
		payload["error_message"],
	)))
}
