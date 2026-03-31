package main

import (
	"strings"
	"testing"

	"github.com/yuexiang/go-api/internal/repository"
)

func TestValidateManualPassword(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{name: "empty", password: "", wantErr: true},
		{name: "too short", password: "Ab1!short", wantErr: true},
		{name: "weak default", password: "123456", wantErr: true},
		{name: "not enough categories", password: "alllowercasepassword", wantErr: true},
		{name: "strong enough", password: "StrongPass123!", wantErr: false},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateManualPassword(tc.password)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error for password %q", tc.password)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error for password %q: %v", tc.password, err)
			}
		})
	}
}

func TestGenerateSecurePassword(t *testing.T) {
	t.Parallel()

	password, err := generateSecurePassword(20)
	if err != nil {
		t.Fatalf("generateSecurePassword returned error: %v", err)
	}
	if len(password) != 20 {
		t.Fatalf("expected generated password length 20, got %d", len(password))
	}
	if !containsRange(password, 'a', 'z') {
		t.Fatal("expected generated password to contain lowercase letters")
	}
	if !containsRange(password, 'A', 'Z') {
		t.Fatal("expected generated password to contain uppercase letters")
	}
	if !containsRange(password, '0', '9') {
		t.Fatal("expected generated password to contain digits")
	}
	if !containsSymbol(password) {
		t.Fatal("expected generated password to contain symbols")
	}
}

func TestConfirmationMatches(t *testing.T) {
	t.Parallel()

	admin := &repository.Admin{
		ID:    42,
		Phone: "13800138000",
	}
	admin.UID = "ADMIN-UID"
	admin.TSID = "ADMIN-TSID"

	values := []string{"42", "13800138000", "ADMIN-UID", "ADMIN-TSID"}
	for _, value := range values {
		if !confirmationMatches(admin, value) {
			t.Fatalf("expected confirmation %q to match admin", value)
		}
	}
	if confirmationMatches(admin, "other") {
		t.Fatal("unexpected confirmation match")
	}
}

func TestMaskHelpers(t *testing.T) {
	t.Parallel()

	if got := maskPhone("13800138000"); got != "138****8000" {
		t.Fatalf("unexpected masked phone: %s", got)
	}
	if got := maskName("管理员"); !strings.HasPrefix(got, "管") || got == "管理员" {
		t.Fatalf("unexpected masked name: %s", got)
	}
}
