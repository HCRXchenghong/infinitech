package handler

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestBuildTemporaryCredentialResponseOmitsLegacyPasswordField(t *testing.T) {
	payload := buildTemporaryCredentialResponse("TempPass123!")

	if _, exists := payload["newPassword"]; exists {
		t.Fatal("expected temporary credential response to omit newPassword")
	}

	credential, ok := payload["temporaryCredential"].(gin.H)
	if !ok {
		t.Fatalf("expected temporaryCredential payload map, got %T", payload["temporaryCredential"])
	}
	if credential["temporaryPassword"] != "TempPass123!" {
		t.Fatalf("expected temporary password in credential payload, got %#v", credential["temporaryPassword"])
	}
	if credential["deliveryMode"] != "operator_receipt" {
		t.Fatalf("expected operator receipt delivery mode, got %#v", credential["deliveryMode"])
	}
}
