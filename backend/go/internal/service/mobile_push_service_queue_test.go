package service

import (
	"context"
	"testing"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestMobilePushServiceQueueSnapshotIncludesRecentLifecycleSignals(t *testing.T) {
	ctx := context.Background()
	svc, db := newMobilePushServiceForDispatchTest(t, MobilePushOptions{
		DispatchEnabled: true,
		ProviderName:    "log",
		PollInterval:    15 * time.Second,
		BatchSize:       10,
		MaxRetries:      2,
		RetryBackoff:    time.Minute,
	})

	now := time.Now().UTC().Truncate(time.Second)
	queuedCreatedAt := now.Add(-30 * time.Minute)
	retryDueAt := now.Add(-5 * time.Minute)
	dispatchingAt := now.Add(-2 * time.Minute)
	sentAt := now.Add(-90 * time.Second)
	failedAt := now.Add(-45 * time.Second)
	ackAt := now.Add(-15 * time.Second)

	deliveries := []repository.PushDelivery{
		{
			MessageID:   "26032900010001",
			UserID:      "1001",
			UserType:    "customer",
			DeviceToken: "token-1",
			EventType:   "admin_push_message",
			Status:      "queued",
			CreatedAt:   queuedCreatedAt,
			UpdatedAt:   queuedCreatedAt,
		},
		{
			MessageID:   "26032900010002",
			UserID:      "1002",
			UserType:    "customer",
			DeviceToken: "token-2",
			EventType:   "admin_push_message",
			Status:      "retry_pending",
			CreatedAt:   now.Add(-20 * time.Minute),
			UpdatedAt:   now.Add(-10 * time.Minute),
			NextRetryAt: &retryDueAt,
		},
		{
			MessageID:   "26032900010003",
			UserID:      "1003",
			UserType:    "customer",
			DeviceToken: "token-3",
			EventType:   "admin_push_message",
			Status:      "dispatching",
			CreatedAt:   now.Add(-10 * time.Minute),
			UpdatedAt:   dispatchingAt,
		},
		{
			MessageID:   "26032900010004",
			UserID:      "1004",
			UserType:    "customer",
			DeviceToken: "token-4",
			EventType:   "admin_push_message",
			Status:      "sent",
			CreatedAt:   now.Add(-5 * time.Minute),
			UpdatedAt:   sentAt,
			SentAt:      &sentAt,
		},
		{
			MessageID:    "26032900010005",
			UserID:       "1005",
			UserType:     "customer",
			DeviceToken:  "token-5",
			EventType:    "admin_push_message",
			Status:       "failed",
			CreatedAt:    now.Add(-4 * time.Minute),
			UpdatedAt:    failedAt,
			ErrorCode:    "http_502",
			ErrorMessage: "temporary outage",
		},
		{
			MessageID:      "26032900010006",
			UserID:         "1006",
			UserType:       "customer",
			DeviceToken:    "token-6",
			EventType:      "admin_push_message",
			Status:         "acknowledged",
			CreatedAt:      now.Add(-3 * time.Minute),
			UpdatedAt:      ackAt,
			SentAt:         &sentAt,
			AcknowledgedAt: &ackAt,
		},
	}

	for _, delivery := range deliveries {
		item := delivery
		if err := db.Create(&item).Error; err != nil {
			t.Fatalf("create delivery %s failed: %v", delivery.MessageID, err)
		}
	}

	snapshot := svc.QueueSnapshot(ctx)
	if snapshot.Total != 6 {
		t.Fatalf("expected total 6, got %d", snapshot.Total)
	}
	if snapshot.Queued != 1 || snapshot.RetryPending != 1 || snapshot.Dispatching != 1 || snapshot.Sent != 1 || snapshot.Failed != 1 || snapshot.Acknowledged != 1 {
		t.Fatalf("unexpected queue counters: %+v", snapshot)
	}
	if snapshot.OldestQueuedAt == "" {
		t.Fatal("expected oldest queued timestamp")
	}
	if snapshot.OldestQueuedAgeSeconds <= 0 {
		t.Fatalf("expected oldest queued age > 0, got %d", snapshot.OldestQueuedAgeSeconds)
	}
	if snapshot.OldestRetryPendingAt == "" {
		t.Fatal("expected oldest retry pending timestamp")
	}
	if snapshot.OldestRetryPendingAgeSeconds <= 0 {
		t.Fatalf("expected oldest retry pending age > 0, got %d", snapshot.OldestRetryPendingAgeSeconds)
	}
	if snapshot.OldestDispatchingAt == "" {
		t.Fatal("expected oldest dispatching timestamp")
	}
	if snapshot.OldestDispatchingAgeSeconds <= 0 {
		t.Fatalf("expected oldest dispatching age > 0, got %d", snapshot.OldestDispatchingAgeSeconds)
	}
	if snapshot.LatestSentAt == "" {
		t.Fatal("expected latest sent timestamp")
	}
	if snapshot.LatestFailedAt == "" {
		t.Fatal("expected latest failed timestamp")
	}
	if snapshot.LatestAcknowledgedAt == "" {
		t.Fatal("expected latest acknowledged timestamp")
	}
}
