package service

import (
	"context"
	"strings"

	"github.com/yuexiang/go-api/internal/idkit"
	"gorm.io/gorm"
)

const (
	bucketWalletTransaction = "72"
	bucketRechargeOrder     = "71"
	bucketWithdrawRequest   = "73"
	bucketAdminOperation    = "74"
	bucketPaymentCallback   = "76"
	bucketIdempotency       = "77"
	bucketRTCCallAudit      = "83"
)

func nextUnifiedRefID(ctx context.Context, db *gorm.DB, bucketCode string) (string, error) {
	uid, _, err := idkit.NextUIDWithDB(ctx, db, bucketCode)
	if err != nil {
		return "", err
	}
	return uid, nil
}

// normalizeUnifiedRefID converts an external/custom ID to unified 14-digit ID.
// Returns (unifiedID, rawOriginalID).
func normalizeUnifiedRefID(ctx context.Context, db *gorm.DB, bucketCode, raw string) (string, string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		unified, err := nextUnifiedRefID(ctx, db, bucketCode)
		if err != nil {
			return "", "", err
		}
		return unified, "", nil
	}

	if idkit.UIDPattern.MatchString(value) {
		return value, "", nil
	}

	unified, err := nextUnifiedRefID(ctx, db, bucketCode)
	if err != nil {
		return "", "", err
	}
	return unified, value, nil
}
