package service

import (
	"fmt"
	"net/http"
	"strings"
)

const sidecarSecretHeader = "X-Sidecar-Secret"

func applySidecarSecretHeader(request *http.Request, rawSecret string, sidecarName string) error {
	if request == nil {
		return fmt.Errorf("%w: sidecar request is nil", ErrInvalidArgument)
	}

	secret := strings.TrimSpace(rawSecret)
	if secret == "" {
		return fmt.Errorf("%w: %s api secret is required", ErrInvalidArgument, sidecarName)
	}

	request.Header.Set(sidecarSecretHeader, secret)
	return nil
}
