package service

import "testing"

func TestBuildPublicRuntimeSettingsIncludesRTCConfig(t *testing.T) {
	settings := ServiceSettings{
		RTCEnabled:    true,
		RTCTimeoutSec: 48,
		RTCIceServers: []RTCIceServerItem{
			{URL: "turns:turn.example.com:5349?transport=tcp", Username: "rtc-user", Credential: "rtc-pass"},
		},
	}

	public := BuildPublicRuntimeSettings(settings)

	if !public.RTCEnabled {
		t.Fatal("expected rtc to remain enabled")
	}
	if public.RTCTimeoutSec != 48 {
		t.Fatalf("expected rtc timeout to be preserved, got %d", public.RTCTimeoutSec)
	}
	if len(public.RTCIceServers) != 1 {
		t.Fatalf("expected rtc ice servers to be preserved, got %d", len(public.RTCIceServers))
	}
	if public.RTCIceServers[0].URL != "turns:turn.example.com:5349?transport=tcp" {
		t.Fatalf("unexpected rtc ice server url: %q", public.RTCIceServers[0].URL)
	}
}

func TestValidateServiceSettingsRejectsInvalidRTCIceServer(t *testing.T) {
	settings := ServiceSettings{
		RTCEnabled:    true,
		RTCTimeoutSec: 35,
		RTCIceServers: []RTCIceServerItem{
			{URL: "ftp://turn.example.com"},
		},
		MapProvider:     "proxy",
		MapTileTemplate: DefaultMapTileTemplate,
		MapTimeoutSec:   DefaultMapTimeoutSec,
	}

	err := ValidateServiceSettings(settings)
	if err == nil {
		t.Fatal("expected invalid rtc ice server to be rejected")
	}
	if err.Error() != "rtc_ice_servers url scheme is invalid" {
		t.Fatalf("unexpected validation error: %v", err)
	}
}
