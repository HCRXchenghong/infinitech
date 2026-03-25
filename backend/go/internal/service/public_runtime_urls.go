package service

import (
	"os"
	"strings"
)

const defaultPublicLandingBaseURL = "https://api.yuexiang.com"

func resolvePublicLandingBaseURL(primaryEnv string) string {
	baseURL := strings.TrimSpace(os.Getenv(primaryEnv))
	if baseURL == "" {
		baseURL = strings.TrimSpace(os.Getenv("PUBLIC_LANDING_BASE_URL"))
	}
	if baseURL == "" {
		baseURL = defaultPublicLandingBaseURL
	}
	return strings.TrimRight(baseURL, "/")
}
