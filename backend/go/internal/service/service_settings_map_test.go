package service

import "testing"

func TestValidateServiceSettingsRequiresTiandituKey(t *testing.T) {
	err := ValidateServiceSettings(ServiceSettings{
		MapProvider: "tianditu",
	})
	if err == nil {
		t.Fatal("expected tianditu provider to require map api key")
	}

	if err := ValidateServiceSettings(ServiceSettings{
		MapProvider: "tianditu",
		MapAPIKey:   "test-key",
	}); err != nil {
		t.Fatalf("expected tianditu provider with key to be valid, got %v", err)
	}
}
