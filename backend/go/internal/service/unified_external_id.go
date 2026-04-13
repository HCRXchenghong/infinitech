package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"gorm.io/gorm"
)

const (
	bucketDailyOrderNo      = "54"
	bucketAfterSalesRequest = "55"
	bucketInviteCode        = "62"
	bucketWalletTransaction = "72"
	bucketRechargeOrder     = "71"
	bucketWithdrawRequest   = "73"
	bucketAdminOperation    = "74"
	bucketPaymentCallback   = "76"
	bucketIdempotency       = "77"
	bucketRTCCallAudit      = "83"
)

var businessIDLocation = time.FixedZone("Asia/Shanghai", 8*60*60)

func nextUnifiedRefID(ctx context.Context, db *gorm.DB, bucketCode string) (string, error) {
	uid, _, err := idkit.NextUIDWithDB(ctx, db, bucketCode)
	if err != nil {
		return "", err
	}
	return uid, nil
}

func nextUnifiedRefSequence(ctx context.Context, db *gorm.DB, bucketCode string) (string, int64, error) {
	return idkit.NextUIDWithDB(ctx, db, bucketCode)
}

// normalizeUnifiedRefID converts an external/custom ID to unified UID.
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

func normalizeBusinessIDTime(now time.Time) time.Time {
	if now.IsZero() {
		return time.Now().In(businessIDLocation)
	}
	return now.In(businessIDLocation)
}

func businessCodeSuffixFromUID(uid string) string {
	value := strings.TrimSpace(uid)
	if len(value) <= len(idkit.Prefix) {
		return value
	}
	return value[len(idkit.Prefix):]
}

func buildDailyOrderID(now time.Time, sequence int64) string {
	if sequence < 0 {
		sequence = -sequence
	}
	return fmt.Sprintf("%s%010d", normalizeBusinessIDTime(now).Format("20060102"), sequence)
}

func buildAfterSalesNoFromUID(uid string) string {
	suffix := businessCodeSuffixFromUID(uid)
	if suffix == "" {
		return ""
	}
	return "AS" + suffix
}

func buildInviteCodeFromUID(uid string) string {
	suffix := businessCodeSuffixFromUID(uid)
	if suffix == "" {
		return ""
	}
	return "YX" + suffix
}

func fallbackAfterSalesNo(now time.Time) string {
	stamp := normalizeBusinessIDTime(now)
	return fmt.Sprintf("AS%s%06d", stamp.Format("060102150405"), stamp.Nanosecond()/1000%1000000)
}

func fallbackInviteCode(now time.Time) string {
	stamp := normalizeBusinessIDTime(now)
	return fmt.Sprintf("YX%s%04d", stamp.Format("060102150405"), stamp.Nanosecond()/100000%10000)
}
