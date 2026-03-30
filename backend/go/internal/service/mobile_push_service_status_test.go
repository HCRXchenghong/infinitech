package service

import (
	"context"
	"testing"
)

func TestMobilePushServiceWorkerStatusIncludesFCMEndpointSignals(t *testing.T) {
	svc, _ := newMobilePushServiceForDispatchTest(t, MobilePushOptions{
		DispatchEnabled: true,
		ProviderName:    "fcm",
		FCMProjectID:    "demo-project",
		FCMClientEmail:  "firebase-adminsdk@example.iam.gserviceaccount.com",
		FCMPrivateKey:   "-----BEGIN PRIVATE KEY-----\nMIIBVwIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAx\n-----END PRIVATE KEY-----",
		FCMTokenURL:     "https://oauth2.googleapis.com/token",
		FCMAPIBaseURL:   "https://fcm.googleapis.com",
	})

	status := svc.WorkerStatusSnapshot(context.Background())
	if status.Provider != "fcm" {
		t.Fatalf("expected fcm provider, got %q", status.Provider)
	}
	if status.FCMConfigured != true {
		t.Fatal("expected fcm provider to be marked configured")
	}
	if status.FCMTokenTarget != "https://oauth2.googleapis.com" {
		t.Fatalf("expected fcm token target, got %q", status.FCMTokenTarget)
	}
	if status.FCMTokenSecureTransport != true {
		t.Fatal("expected secure fcm token transport")
	}
	if status.FCMTokenPrivateTarget {
		t.Fatal("expected public fcm token target")
	}
	if status.FCMAPIBaseTarget != "https://fcm.googleapis.com" {
		t.Fatalf("expected fcm api base target, got %q", status.FCMAPIBaseTarget)
	}
	if status.FCMAPIBaseSecureTransport != true {
		t.Fatal("expected secure fcm api transport")
	}
	if status.FCMAPIBasePrivateTarget {
		t.Fatal("expected public fcm api target")
	}
	if status.ProductionReady != true {
		t.Fatalf("expected fcm provider to be production ready, got issues: %v", status.ProductionIssues)
	}
	if len(status.ProductionIssues) != 0 {
		t.Fatalf("expected no production issues, got %v", status.ProductionIssues)
	}
}

func TestMobilePushServiceWorkerStatusMarksLogProviderNotProductionReady(t *testing.T) {
	svc, _ := newMobilePushServiceForDispatchTest(t, MobilePushOptions{
		DispatchEnabled: true,
		ProviderName:    "log",
	})

	status := svc.WorkerStatusSnapshot(context.Background())
	if status.ProductionReady {
		t.Fatal("expected log provider to be blocked from production readiness")
	}
	if len(status.ProductionIssues) == 0 {
		t.Fatal("expected production issues for log provider")
	}
	found := false
	for _, issue := range status.ProductionIssues {
		if issue == "log_provider_not_allowed" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected log_provider_not_allowed issue, got %v", status.ProductionIssues)
	}
}
