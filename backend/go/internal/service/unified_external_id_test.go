package service

import (
	"testing"
	"time"
)

func TestBuildDailyOrderID(t *testing.T) {
	now := time.Date(2026, 4, 12, 10, 0, 0, 0, time.FixedZone("Asia/Shanghai", 8*60*60))
	got := buildDailyOrderID(now, 123)
	want := "202604120000000123"
	if got != want {
		t.Fatalf("expected daily order id %q, got %q", want, got)
	}
}

func TestBuildAfterSalesNoFromUID(t *testing.T) {
	got := buildAfterSalesNoFromUID("250724550000000123")
	want := "AS550000000123"
	if got != want {
		t.Fatalf("expected after-sales no %q, got %q", want, got)
	}
}

func TestBuildInviteCodeFromUID(t *testing.T) {
	got := buildInviteCodeFromUID("250724620000000123")
	want := "YX620000000123"
	if got != want {
		t.Fatalf("expected invite code %q, got %q", want, got)
	}
}
