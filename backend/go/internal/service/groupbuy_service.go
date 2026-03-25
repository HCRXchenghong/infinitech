package service

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	defaultGroupbuyVoucherDays = 30
	defaultScanTokenTTL        = 60 * time.Second
)

type GroupbuyService struct {
	db         *gorm.DB
	signSecret string
}

func NewGroupbuyService(db *gorm.DB, signSecret string) *GroupbuyService {
	return &GroupbuyService{
		db:         db,
		signSecret: strings.TrimSpace(signSecret),
	}
}

type voucherScanPayload struct {
	VoucherID uint   `json:"voucherId"`
	VoucherNo string `json:"voucherNo"`
	ShopID    string `json:"shopId"`
	OrderID   uint   `json:"orderId"`
	Exp       int64  `json:"exp"`
	Nonce     string `json:"nonce"`
}

func normalizeBizType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "", "takeout", "waimai", "delivery":
		return "takeout"
	case "groupbuy", "tuangou":
		return "groupbuy"
	default:
		return value
	}
}

func (s *GroupbuyService) IssueVouchersForOrder(ctx context.Context, order *repository.Order, quantity int, expireAt *time.Time) ([]repository.GroupbuyVoucher, error) {
	if s == nil || s.db == nil || order == nil || order.ID == 0 {
		return nil, nil
	}
	if normalizeBizType(order.BizType) != "groupbuy" {
		return nil, nil
	}

	var existing []repository.GroupbuyVoucher
	if err := s.db.WithContext(ctx).
		Where("order_id = ?", order.ID).
		Order("id ASC").
		Find(&existing).Error; err != nil {
		return nil, err
	}
	if len(existing) > 0 {
		return existing, nil
	}

	if quantity <= 0 {
		quantity = 1
	}

	totalFen := int64(math.Round(order.TotalPrice * 100))
	if totalFen < 0 {
		totalFen = 0
	}
	amounts := splitAmountByCount(totalFen, quantity)

	voucherExpireAt := expireAt
	if voucherExpireAt == nil {
		defaultExpiry := time.Now().AddDate(0, 0, defaultGroupbuyVoucherDays)
		voucherExpireAt = &defaultExpiry
	}

	vouchers := make([]repository.GroupbuyVoucher, 0, quantity)
	for i := 0; i < quantity; i++ {
		voucherNo, err := generateVoucherNo()
		if err != nil {
			return nil, err
		}
		amountFen := int64(0)
		if i < len(amounts) {
			amountFen = amounts[i]
		}
		vouchers = append(vouchers, repository.GroupbuyVoucher{
			VoucherNo: voucherNo,
			OrderID:   order.ID,
			UserID:    strings.TrimSpace(order.UserID),
			ShopID:    strings.TrimSpace(order.ShopID),
			AmountFen: amountFen,
			Status:    "issued",
			ExpireAt:  voucherExpireAt,
			Version:   1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		})
	}

	if err := s.db.WithContext(ctx).Create(&vouchers).Error; err != nil {
		return nil, err
	}
	return vouchers, nil
}

func (s *GroupbuyService) ListUserVouchers(ctx context.Context, status string, orderID string) (interface{}, error) {
	if s == nil || s.db == nil {
		return []map[string]interface{}{}, nil
	}

	role := authContextRole(ctx)
	userID := strings.TrimSpace(authContextString(ctx, "user_id"))
	userPhone := strings.TrimSpace(authContextString(ctx, "user_phone"))
	if role != "admin" && role != "user" {
		return nil, fmt.Errorf("%w: only user or admin can list vouchers", ErrForbidden)
	}
	if role == "user" && userID == "" && userPhone == "" {
		return nil, fmt.Errorf("%w: user identity is missing", ErrUnauthorized)
	}

	query := s.db.WithContext(ctx).Model(&repository.GroupbuyVoucher{})
	if role == "user" {
		identities := make([]string, 0, 2)
		if userID != "" {
			identities = append(identities, userID)
		}
		if userPhone != "" && userPhone != userID {
			identities = append(identities, userPhone)
		}
		if len(identities) == 1 {
			query = query.Where("user_id = ?", identities[0])
		} else {
			query = query.Where("user_id IN ?", identities)
		}
	}

	status = strings.TrimSpace(strings.ToLower(status))
	if status != "" {
		query = query.Where("status = ?", status)
	}
	resolvedOrderID, err := resolveOptionalEntityID(ctx, s.db, "orders", orderID)
	if err != nil {
		return nil, err
	}
	if resolvedOrderID > 0 {
		query = query.Where("order_id = ?", resolvedOrderID)
	}

	var vouchers []repository.GroupbuyVoucher
	if err := query.Order("created_at DESC").Find(&vouchers).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	result := make([]map[string]interface{}, 0, len(vouchers))
	for i := range vouchers {
		voucher := vouchers[i]
		isExpired := voucher.ExpireAt != nil && now.After(*voucher.ExpireAt)
		displayStatus := voucher.Status
		if voucher.Status == "issued" && isExpired {
			displayStatus = "expired"
		}
		result = append(result, map[string]interface{}{
			"id":            voucher.UID,
			"tsid":          voucher.TSID,
			"legacyId":      voucher.ID,
			"voucherNo":     voucher.VoucherNo,
			"voucher_no":    voucher.VoucherNo,
			"orderId":       voucher.OrderID,
			"order_id":      voucher.OrderID,
			"userId":        voucher.UserID,
			"user_id":       voucher.UserID,
			"shopId":        voucher.ShopID,
			"shop_id":       voucher.ShopID,
			"amountFen":     voucher.AmountFen,
			"amount_fen":    voucher.AmountFen,
			"status":        displayStatus,
			"expireAt":      voucher.ExpireAt,
			"expire_at":     voucher.ExpireAt,
			"redeemedAt":    voucher.RedeemedAt,
			"redeemed_at":   voucher.RedeemedAt,
			"redeemedBy":    voucher.RedeemedBy,
			"redeemed_by":   voucher.RedeemedBy,
			"canRedeem":     displayStatus == "issued",
			"canRefund":     displayStatus == "issued",
			"canUserRefund": displayStatus == "issued",
			"isExpired":     isExpired,
			"createdAt":     voucher.CreatedAt.Format(time.RFC3339),
			"created_at":    voucher.CreatedAt,
			"updatedAt":     voucher.UpdatedAt.Format(time.RFC3339),
			"updated_at":    voucher.UpdatedAt,
		})
	}

	return result, nil
}

func (s *GroupbuyService) GetVoucherQRCode(ctx context.Context, id string) (interface{}, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("service unavailable")
	}
	resolvedID, err := resolveEntityID(ctx, s.db, "groupbuy_vouchers", id)
	if err != nil {
		return nil, fmt.Errorf("invalid voucher id")
	}

	var voucher repository.GroupbuyVoucher
	if err := s.db.WithContext(ctx).Where("id = ?", resolvedID).First(&voucher).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("voucher not found")
		}
		return nil, err
	}

	role := authContextRole(ctx)
	userID := strings.TrimSpace(authContextString(ctx, "user_id"))
	userPhone := strings.TrimSpace(authContextString(ctx, "user_phone"))
	if role == "user" {
		if userID == "" && userPhone == "" {
			return nil, fmt.Errorf("%w: user identity is missing", ErrUnauthorized)
		}
		owner := strings.TrimSpace(voucher.UserID)
		if owner != userID && owner != userPhone {
			return nil, fmt.Errorf("%w: voucher does not belong to current user", ErrForbidden)
		}
	}

	if strings.TrimSpace(voucher.Status) != "issued" {
		return nil, fmt.Errorf("voucher is not available for redemption")
	}

	token, expAt, err := s.buildScanToken(voucher, defaultScanTokenTTL)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":         voucher.UID,
		"tsid":       voucher.TSID,
		"legacyId":   voucher.ID,
		"voucherId":  voucher.UID,
		"voucherNo":  voucher.VoucherNo,
		"status":     voucher.Status,
		"scanToken":  token,
		"qrContent":  token,
		"expiresAt":  expAt.Format(time.RFC3339),
		"expireAt":   voucher.ExpireAt,
		"expire_at":  voucher.ExpireAt,
		"createdAt":  voucher.CreatedAt.Format(time.RFC3339),
		"updatedAt":  voucher.UpdatedAt.Format(time.RFC3339),
		"amountFen":  voucher.AmountFen,
		"amount_fen": voucher.AmountFen,
	}, nil
}

func (s *GroupbuyService) RedeemByScan(ctx context.Context, req map[string]interface{}) (interface{}, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("service unavailable")
	}

	role := authContextRole(ctx)
	if role != "merchant" {
		return nil, fmt.Errorf("%w: only merchant can redeem voucher", ErrForbidden)
	}
	merchantID := authContextInt64(ctx, "merchant_id")
	if merchantID <= 0 {
		return nil, fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
	}

	voucherID := uint(parsePositiveInt64(pickValue(req, "voucherId", "voucher_id")))
	voucherNo := strings.TrimSpace(toStringValue(pickValue(req, "voucherNo", "voucher_no")))
	qrCode := strings.TrimSpace(toStringValue(pickValue(req, "qrCode", "qr_code", "scanToken", "scan_token")))
	idempotencyKey := strings.TrimSpace(toStringValue(pickValue(req, "idempotencyKey", "idempotency_key")))
	idempotencyKeyRaw := ""
	if idempotencyKey != "" {
		normalized, raw, err := normalizeUnifiedRefID(ctx, s.db, bucketIdempotency, idempotencyKey)
		if err != nil {
			return nil, err
		}
		idempotencyKey = normalized
		idempotencyKeyRaw = raw
	}
	deviceID := strings.TrimSpace(toStringValue(pickValue(req, "deviceId", "device_id")))

	var scanTokenHash string
	if qrCode != "" {
		if payload, ok := tryParseScanToken(qrCode, s.signSecret); ok {
			if payload.Exp < time.Now().Unix() {
				return nil, fmt.Errorf("scan token expired")
			}
			voucherID = payload.VoucherID
			voucherNo = payload.VoucherNo
			hash := sha256.Sum256([]byte(qrCode))
			scanTokenHash = hex.EncodeToString(hash[:])
		} else if voucherNo == "" {
			voucherNo = qrCode
		}
	}

	var voucher repository.GroupbuyVoucher
	query := s.db.WithContext(ctx).Model(&repository.GroupbuyVoucher{})
	if voucherID > 0 {
		query = query.Where("id = ?", voucherID)
	} else if voucherNo != "" {
		query = query.Where("voucher_no = ?", voucherNo)
	} else {
		return nil, fmt.Errorf("voucher identifier is required")
	}
	if err := query.First(&voucher).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("voucher not found")
		}
		return nil, err
	}

	owned, err := s.merchantOwnsShop(ctx, merchantID, voucher.ShopID)
	if err != nil {
		return nil, err
	}
	if !owned {
		return nil, fmt.Errorf("%w: merchant cannot redeem this voucher", ErrForbidden)
	}

	now := time.Now()
	if voucher.ExpireAt != nil && now.After(*voucher.ExpireAt) {
		_ = s.db.WithContext(ctx).
			Model(&repository.GroupbuyVoucher{}).
			Where("id = ? AND status = ?", voucher.ID, "issued").
			Updates(map[string]interface{}{"status": "expired", "updated_at": now}).Error
		return nil, fmt.Errorf("voucher expired")
	}

	if idempotencyKey != "" {
		var existedLog repository.GroupbuyRedemptionLog
		find := s.db.WithContext(ctx).
			Where("voucher_id = ? AND (idempotency_key = ? OR idempotency_key_raw = ?)", voucher.ID, idempotencyKey, idempotencyKeyRaw).
			Limit(1).
			Find(&existedLog)
		if find.Error != nil {
			return nil, find.Error
		}
		if find.RowsAffected > 0 {
			return map[string]interface{}{
				"success":   true,
				"duplicate": true,
				"id":        voucher.UID,
				"tsid":      voucher.TSID,
				"legacyId":  voucher.ID,
				"voucherId": voucher.UID,
				"voucherNo": voucher.VoucherNo,
				"status":    "redeemed",
			}, nil
		}
	}

	var finalVoucher repository.GroupbuyVoucher
	var duplicate bool
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&repository.GroupbuyVoucher{}).
			Where("id = ? AND status = ?", voucher.ID, "issued").
			Updates(map[string]interface{}{
				"status":               "redeemed",
				"redeemed_at":          now,
				"redeemed_by":          strconv.FormatInt(merchantID, 10),
				"redeem_device_id":     deviceID,
				"last_scan_token_hash": scanTokenHash,
				"version":              gorm.Expr("version + 1"),
				"updated_at":           now,
			})
		if result.Error != nil {
			return result.Error
		}

		if result.RowsAffected == 0 {
			if err := tx.Where("id = ?", voucher.ID).First(&finalVoucher).Error; err != nil {
				return err
			}
			if finalVoucher.Status == "redeemed" {
				duplicate = true
				return nil
			}
			return fmt.Errorf("voucher cannot be redeemed in current status")
		}

		logRecord := &repository.GroupbuyRedemptionLog{
			VoucherID:         voucher.ID,
			OrderID:           voucher.OrderID,
			ShopID:            voucher.ShopID,
			OperatorID:        strconv.FormatInt(merchantID, 10),
			DeviceID:          deviceID,
			ScanTokenHash:     scanTokenHash,
			IdempotencyKey:    idempotencyKey,
			IdempotencyKeyRaw: idempotencyKeyRaw,
			Result:            "success",
			Reason:            "",
			CreatedAt:         now,
			UpdatedAt:         now,
		}
		if err := tx.Create(logRecord).Error; err != nil {
			return err
		}

		if err := tx.Model(&repository.Order{}).
			Where("id = ? AND (status = ? OR status = ?)", voucher.OrderID, "paid_unused", "pending_payment").
			Updates(map[string]interface{}{
				"status":     "redeemed",
				"updated_at": now,
			}).Error; err != nil {
			return err
		}

		return tx.Where("id = ?", voucher.ID).First(&finalVoucher).Error
	}); err != nil {
		return nil, err
	}

	if duplicate {
		return map[string]interface{}{
			"success":   true,
			"duplicate": true,
			"id":        finalVoucher.UID,
			"tsid":      finalVoucher.TSID,
			"legacyId":  finalVoucher.ID,
			"voucherId": finalVoucher.UID,
			"voucherNo": finalVoucher.VoucherNo,
			"status":    finalVoucher.Status,
		}, nil
	}

	return map[string]interface{}{
		"success":        true,
		"id":             finalVoucher.UID,
		"tsid":           finalVoucher.TSID,
		"legacyId":       finalVoucher.ID,
		"voucherId":      finalVoucher.UID,
		"voucherNo":      finalVoucher.VoucherNo,
		"status":         finalVoucher.Status,
		"redeemedAt":     finalVoucher.RedeemedAt,
		"redeemedBy":     finalVoucher.RedeemedBy,
		"redeemDeviceId": finalVoucher.RedeemDeviceID,
	}, nil
}

func (s *GroupbuyService) merchantOwnsShop(ctx context.Context, merchantID int64, shopID string) (bool, error) {
	shopID = strings.TrimSpace(shopID)
	if merchantID <= 0 || shopID == "" {
		return false, nil
	}
	shopIDInt, err := strconv.ParseUint(shopID, 10, 64)
	if err != nil || shopIDInt == 0 {
		return false, nil
	}

	var total int64
	if err := s.db.WithContext(ctx).
		Table("shops").
		Where("id = ? AND merchant_id = ?", uint(shopIDInt), merchantID).
		Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}

func (s *GroupbuyService) buildScanToken(voucher repository.GroupbuyVoucher, ttl time.Duration) (string, time.Time, error) {
	if ttl <= 0 {
		ttl = defaultScanTokenTTL
	}
	expAt := time.Now().Add(ttl)
	nonce, err := randomHex(8)
	if err != nil {
		return "", time.Time{}, err
	}
	payload := voucherScanPayload{
		VoucherID: voucher.ID,
		VoucherNo: voucher.VoucherNo,
		ShopID:    voucher.ShopID,
		OrderID:   voucher.OrderID,
		Exp:       expAt.Unix(),
		Nonce:     nonce,
	}
	payloadBytes, _ := json.Marshal(payload)
	payloadSegment := base64.RawURLEncoding.EncodeToString(payloadBytes)

	mac := hmac.New(sha256.New, []byte(s.signSecret))
	if s.signSecret == "" {
		mac = hmac.New(sha256.New, []byte("groupbuy-scan-secret"))
	}
	_, _ = mac.Write([]byte(payloadSegment))
	sign := hex.EncodeToString(mac.Sum(nil))
	return payloadSegment + "." + sign, expAt, nil
}

func tryParseScanToken(token string, secret string) (*voucherScanPayload, bool) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, false
	}
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, false
	}
	payloadSegment := parts[0]
	signature := strings.ToLower(strings.TrimSpace(parts[1]))
	if payloadSegment == "" || signature == "" {
		return nil, false
	}

	verify := func(key string) bool {
		mac := hmac.New(sha256.New, []byte(key))
		_, _ = mac.Write([]byte(payloadSegment))
		expected := hex.EncodeToString(mac.Sum(nil))
		return hmac.Equal([]byte(expected), []byte(signature))
	}
	if !verify(secret) && !verify("groupbuy-scan-secret") {
		return nil, false
	}

	raw, err := base64.RawURLEncoding.DecodeString(payloadSegment)
	if err != nil {
		return nil, false
	}
	var payload voucherScanPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, false
	}
	if payload.VoucherID == 0 || strings.TrimSpace(payload.VoucherNo) == "" {
		return nil, false
	}
	return &payload, true
}

func splitAmountByCount(total int64, count int) []int64 {
	if count <= 0 {
		return []int64{}
	}
	if total <= 0 {
		out := make([]int64, count)
		return out
	}
	base := total / int64(count)
	remainder := total % int64(count)
	out := make([]int64, count)
	for i := 0; i < count; i++ {
		out[i] = base
		if int64(i) < remainder {
			out[i] += 1
		}
	}
	return out
}

func generateVoucherNo() (string, error) {
	suffix, err := randomHex(5)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("GV%s%s", time.Now().Format("20060102150405"), strings.ToUpper(suffix)), nil
}

func randomHex(byteLen int) (string, error) {
	if byteLen <= 0 {
		byteLen = 8
	}
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func pickValue(data map[string]interface{}, keys ...string) interface{} {
	for _, key := range keys {
		if value, ok := data[key]; ok {
			return value
		}
	}
	return nil
}

func toStringValue(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case fmt.Stringer:
		return t.String()
	case float64:
		return strconv.FormatInt(int64(t), 10)
	case float32:
		return strconv.FormatInt(int64(t), 10)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case uint:
		return strconv.FormatUint(uint64(t), 10)
	case uint64:
		return strconv.FormatUint(t, 10)
	default:
		if v == nil {
			return ""
		}
		return fmt.Sprintf("%v", v)
	}
}

func parsePositiveInt64(v interface{}) int64 {
	text := strings.TrimSpace(toStringValue(v))
	if text == "" {
		return 0
	}
	parsed, err := strconv.ParseInt(text, 10, 64)
	if err != nil || parsed <= 0 {
		return 0
	}
	return parsed
}
