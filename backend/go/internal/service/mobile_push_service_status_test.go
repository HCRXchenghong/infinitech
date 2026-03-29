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
}
