package admincli

import "testing"

func TestValidateManualPassword(t *testing.T) {
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
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateManualPassword(tc.password)
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
	password, err := GenerateSecurePassword(20)
	if err != nil {
		t.Fatalf("generate secure password: %v", err)
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

func TestSelectorValidateSingle(t *testing.T) {
	if err := (Selector{}).ValidateSingle(); err == nil {
		t.Fatal("expected selector validation error when empty")
	}
	if err := (Selector{ID: 1, Phone: "13800138000"}).ValidateSingle(); err == nil {
		t.Fatal("expected selector validation error when multiple selectors are set")
	}
	if err := (Selector{Phone: "13800138000"}).ValidateSingle(); err != nil {
		t.Fatalf("unexpected selector validation error: %v", err)
	}
}

func TestIsValidPhone(t *testing.T) {
	if !IsValidPhone("13800138000") {
		t.Fatal("expected standard mainland phone to be valid")
	}
	if IsValidPhone("23800138000") {
		t.Fatal("expected phone with invalid prefix to be rejected")
	}
	if IsValidPhone("1380013800") {
		t.Fatal("expected phone with invalid length to be rejected")
	}
}

func TestNormalizeAdminType(t *testing.T) {
	value, err := NormalizeAdminType("")
	if err != nil {
		t.Fatalf("unexpected error for empty admin type: %v", err)
	}
	if value != "admin" {
		t.Fatalf("expected empty admin type to default to admin, got %q", value)
	}

	value, err = NormalizeAdminType("ADMIN")
	if err != nil {
		t.Fatalf("unexpected error for admin type: %v", err)
	}
	if value != "admin" {
		t.Fatalf("expected normalized admin type admin, got %q", value)
	}

	if _, err := NormalizeAdminType("owner"); err == nil {
		t.Fatal("expected unsupported admin type to fail")
	}
}

func TestBuildDatabaseConfigUsesRuntimeEnv(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("DB_HOST", "db.internal")
	t.Setenv("DB_PORT", "5433")
	t.Setenv("POSTGRES_USER", "runtime_user")
	t.Setenv("POSTGRES_PASSWORD", "runtime_password")
	t.Setenv("POSTGRES_DB", "runtime_db")
	t.Setenv("DB_DRIVER", "postgres")

	cfg := BuildDatabaseConfig()
	if cfg.Env != "production" {
		t.Fatalf("expected env production, got %q", cfg.Env)
	}
	if cfg.Database.Host != "db.internal" {
		t.Fatalf("expected db host db.internal, got %q", cfg.Database.Host)
	}
	if cfg.Database.Port != "5433" {
		t.Fatalf("expected db port 5433, got %q", cfg.Database.Port)
	}
	if cfg.Database.User != "runtime_user" {
		t.Fatalf("expected db user runtime_user, got %q", cfg.Database.User)
	}
	if cfg.Database.Password != "runtime_password" {
		t.Fatalf("expected db password runtime_password, got %q", cfg.Database.Password)
	}
	if cfg.Database.DBName != "runtime_db" {
		t.Fatalf("expected db name runtime_db, got %q", cfg.Database.DBName)
	}
}
