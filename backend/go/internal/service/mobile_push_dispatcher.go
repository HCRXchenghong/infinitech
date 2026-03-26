package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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

type pushWebhookDispatcher struct {
	url    string
	client *http.Client
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
			url: strings.TrimSpace(options.WebhookURL),
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
		log.Println("[push-dispatch] worker disabled")
		return
	}

	if err := s.RunDispatchCycle(ctx, s.dispatchBatchSize); err != nil {
		log.Printf("[push-dispatch] initial cycle failed: %v", err)
	}

	ticker := time.NewTicker(s.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[push-dispatch] worker stopped")
			return
		case <-ticker.C:
			if err := s.RunDispatchCycle(ctx, s.dispatchBatchSize); err != nil {
				log.Printf("[push-dispatch] cycle failed: %v", err)
			}
		}
	}
}

func (s *MobilePushService) RunDispatchCycle(ctx context.Context, limit int) error {
	if s == nil || s.db == nil || !s.dispatchEnabled {
		return nil
	}
	if limit <= 0 {
		limit = s.dispatchBatchSize
	}
	if limit <= 0 {
		limit = 100
	}

	if err := s.syncActiveAdminPushMessages(ctx); err != nil {
		return err
	}

	processed, err := s.dispatchDueDeliveries(ctx, limit)
	if err != nil {
		return err
	}
	if processed > 0 {
		log.Printf("[push-dispatch] processed deliveries=%d", processed)
	}
	return nil
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
