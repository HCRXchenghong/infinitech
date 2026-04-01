package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type AfterSalesService struct {
	repo           repository.AfterSalesRepository
	orderRepo      repository.OrderRepository
	db             *gorm.DB
	paymentSvc     *PaymentService
	opNotification *OpNotificationService
}

var afterSalesNoSeq atomic.Uint32

func NewAfterSalesService(
	repo repository.AfterSalesRepository,
	orderRepo repository.OrderRepository,
	db *gorm.DB,
	paymentSvc *PaymentService,
	opNotification *OpNotificationService,
) *AfterSalesService {
	return &AfterSalesService{
		repo:           repo,
		orderRepo:      orderRepo,
		db:             db,
		paymentSvc:     paymentSvc,
		opNotification: opNotification,
	}
}

func (s *AfterSalesService) Create(ctx context.Context, data interface{}) (interface{}, error) {
	req, ok := data.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid request payload")
	}

	role := authContextRole(ctx)
	if role == "" {
		role = "user"
	}

	orderIDRaw := afterSalesToString(afterSalesGetMapValue(req, "orderId", "order_id"))
	if orderIDRaw == "" {
		return nil, fmt.Errorf("orderId is required")
	}
	orderIDUint64, err := strconv.ParseUint(orderIDRaw, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid orderId")
	}

	userID := strings.TrimSpace(afterSalesToString(afterSalesGetMapValue(req, "userId", "user_id")))

	afterSalesType := strings.TrimSpace(strings.ToLower(afterSalesToString(afterSalesGetMapValue(req, "type"))))
	if afterSalesType == "" {
		afterSalesType = "refund"
	}
	if !isValidAfterSalesType(afterSalesType) {
		return nil, fmt.Errorf("invalid type")
	}

	problemDesc := strings.TrimSpace(afterSalesToString(afterSalesGetMapValue(req, "problemDesc", "problem_desc")))
	if problemDesc == "" {
		return nil, fmt.Errorf("problemDesc is required")
	}

	contactPhone := strings.TrimSpace(afterSalesToString(afterSalesGetMapValue(req, "contactPhone", "contact_phone")))
	selectedProducts := afterSalesToMapList(afterSalesGetMapValue(req, "selectedProducts", "selected_products"))
	evidenceImages := afterSalesToStringList(afterSalesGetMapValue(req, "evidenceImages", "evidence_images"))
	requestedRefundAmount := int64(0)
	if raw := afterSalesGetMapValue(req, "requestedRefundAmount", "requested_refund_amount"); raw != nil {
		amount, ok := afterSalesToInt64(raw)
		if !ok {
			return nil, fmt.Errorf("invalid requestedRefundAmount")
		}
		requestedRefundAmount = amount
	}
	if requestedRefundAmount < 0 {
		return nil, fmt.Errorf("requestedRefundAmount must be greater than or equal to 0")
	}

	order, err := s.orderRepo.GetByID(ctx, uint(orderIDUint64))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("order not found")
		}
		return nil, err
	}

	bizType := normalizeAfterSalesBizType(order.BizType)
	redeemStateSnapshot, err := s.resolveRedeemStateSnapshot(ctx, order)
	if err != nil {
		return nil, err
	}
	if bizType == "groupbuy" && redeemStateSnapshot == "redeemed" && role != "merchant" {
		return nil, fmt.Errorf("%w: redeemed groupbuy refund can only be initiated by merchant", ErrForbidden)
	}

	switch role {
	case "merchant":
		merchantID := authContextInt64(ctx, "merchant_id")
		if merchantID <= 0 {
			return nil, fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		owned, ownErr := s.repo.MerchantOwnsShop(ctx, merchantID, order.ShopID)
		if ownErr != nil {
			return nil, ownErr
		}
		if !owned {
			return nil, fmt.Errorf("%w: no permission for this order", ErrForbidden)
		}
		if userID == "" {
			userID = strings.TrimSpace(order.UserID)
		}
	case "admin":
		if userID == "" {
			userID = strings.TrimSpace(order.UserID)
		}
	case "user":
		fallthrough
	default:
		userCtx := strings.TrimSpace(authContextString(ctx, "user_id"))
		userPhone := strings.TrimSpace(authContextString(ctx, "user_phone"))
		if userCtx == "" && userPhone == "" && userID == "" {
			return nil, fmt.Errorf("%w: user identity is missing", ErrUnauthorized)
		}
		if userID == "" {
			if userCtx != "" {
				userID = userCtx
			} else {
				userID = userPhone
			}
		}
		if userCtx != "" && userID != userCtx && userID != userPhone {
			return nil, fmt.Errorf("%w: userId mismatched with current identity", ErrForbidden)
		}
	}

	if strings.TrimSpace(order.UserID) != "" && strings.TrimSpace(order.UserID) != userID {
		if strings.TrimSpace(order.CustomerPhone) == "" || strings.TrimSpace(order.CustomerPhone) != userID {
			return nil, fmt.Errorf("order does not belong to user")
		}
	}
	if userID == "" {
		userID = strings.TrimSpace(order.UserID)
	}
	if userID == "" {
		return nil, fmt.Errorf("userId is required")
	}

	if contactPhone == "" {
		contactPhone = order.CustomerPhone
	}
	orderTotalFen := int64(math.Round(order.TotalPrice * 100))
	if orderTotalFen > 0 && requestedRefundAmount > orderTotalFen {
		return nil, fmt.Errorf("requestedRefundAmount cannot exceed order amount")
	}
	if requestedRefundAmount <= 0 && role == "merchant" && bizType == "groupbuy" && redeemStateSnapshot == "redeemed" {
		requestedRefundAmount = orderTotalFen
	}

	selectedProductsRaw, _ := json.Marshal(selectedProducts)
	evidenceImagesRaw, _ := json.Marshal(evidenceImages)

	requestNo := generateAfterSalesNo()
	entity := &repository.AfterSalesRequest{
		RequestNo:             requestNo,
		OrderID:               uint(orderIDUint64),
		OrderNo:               order.DailyOrderID,
		UserID:                userID,
		ShopID:                order.ShopID,
		ShopName:              order.ShopName,
		BizType:               bizType,
		InitiatorRole:         role,
		RedeemStateSnapshot:   redeemStateSnapshot,
		Type:                  afterSalesType,
		Status:                "pending",
		ProblemDesc:           problemDesc,
		SelectedProducts:      string(selectedProductsRaw),
		EvidenceImages:        string(evidenceImagesRaw),
		ContactPhone:          contactPhone,
		RequestedRefundAmount: requestedRefundAmount,
	}

	if entity.OrderNo == "" {
		entity.OrderNo = strconv.FormatUint(uint64(order.ID), 10)
	}
	if s.db != nil {
		uid, tsid, idErr := idkit.NextIdentityForTable(ctx, s.db, entity.TableName(), time.Now())
		if idErr != nil {
			return nil, fmt.Errorf("allocate after-sales identity failed: %w", idErr)
		}
		entity.UID = uid
		entity.TSID = tsid
	}

	if err := s.repo.Create(ctx, entity); err != nil {
		return nil, err
	}
	if s.opNotification != nil {
		_ = s.opNotification.NotifyAfterSalesCreated(ctx, entity)
	}

	return s.toResponse(entity), nil
}

func (s *AfterSalesService) CreateMerchantGroupbuyRefund(ctx context.Context, data interface{}) (interface{}, error) {
	req, ok := data.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid request payload")
	}
	if authContextRole(ctx) != "merchant" {
		return nil, fmt.Errorf("%w: only merchant can create redeemed groupbuy refund", ErrForbidden)
	}

	orderIDRaw := strings.TrimSpace(afterSalesToString(afterSalesGetMapValue(req, "orderId", "order_id")))
	if orderIDRaw == "" {
		return nil, fmt.Errorf("orderId is required")
	}
	orderIDUint64, err := strconv.ParseUint(orderIDRaw, 10, 64)
	if err != nil || orderIDUint64 == 0 {
		return nil, fmt.Errorf("invalid orderId")
	}

	order, err := s.orderRepo.GetByID(ctx, uint(orderIDUint64))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("order not found")
		}
		return nil, err
	}
	if normalizeAfterSalesBizType(order.BizType) != "groupbuy" {
		return nil, fmt.Errorf("order is not a groupbuy order")
	}
	redeemState, err := s.resolveRedeemStateSnapshot(ctx, order)
	if err != nil {
		return nil, err
	}
	if redeemState != "redeemed" {
		return nil, fmt.Errorf("only redeemed groupbuy order can use this refund entry")
	}

	if _, ok := req["orderId"]; !ok {
		req["orderId"] = strconv.FormatUint(uint64(order.ID), 10)
	}
	if _, ok := req["userId"]; !ok {
		req["userId"] = strings.TrimSpace(order.UserID)
	}
	if _, ok := req["type"]; !ok {
		req["type"] = "refund"
	}
	if _, ok := req["problemDesc"]; !ok {
		if reason := strings.TrimSpace(afterSalesToString(afterSalesGetMapValue(req, "refundReason", "refund_reason", "reason"))); reason != "" {
			req["problemDesc"] = reason
		} else {
			req["problemDesc"] = "商户发起已核销团购退款"
		}
	}
	if _, ok := req["contactPhone"]; !ok {
		req["contactPhone"] = strings.TrimSpace(order.CustomerPhone)
	}
	if _, ok := req["selectedProducts"]; !ok {
		req["selectedProducts"] = []map[string]interface{}{}
	}
	if _, ok := req["evidenceImages"]; !ok {
		req["evidenceImages"] = []string{}
	}
	if _, ok := req["requestedRefundAmount"]; !ok {
		if value := afterSalesGetMapValue(req, "refundAmount", "refund_amount"); value != nil {
			req["requestedRefundAmount"] = value
		} else {
			req["requestedRefundAmount"] = int64(math.Round(order.TotalPrice * 100))
		}
	}

	return s.Create(ctx, req)
}

func (s *AfterSalesService) List(ctx context.Context, page int, limit int, status string, search string) (interface{}, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	status = strings.TrimSpace(strings.ToLower(status))
	role := authContextRole(ctx)
	merchantID := authContextInt64(ctx, "merchant_id")

	params := repository.ListAfterSalesParams{
		Search: strings.TrimSpace(search),
		Status: status,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
	if role == "merchant" {
		if merchantID <= 0 {
			return nil, fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		params.MerchantID = merchantID
	}
	list, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(list))
	for i := range list {
		result = append(result, s.toResponse(&list[i]))
	}

	return map[string]interface{}{
		"list":  result,
		"total": total,
		"page":  page,
		"limit": limit,
	}, nil
}

func (s *AfterSalesService) ListByUserID(ctx context.Context, userID string) (interface{}, error) {
	if strings.TrimSpace(userID) == "" {
		return []map[string]interface{}{}, nil
	}

	list, err := s.repo.ListByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(list))
	for i := range list {
		result = append(result, s.toResponse(&list[i]))
	}
	return result, nil
}

func (s *AfterSalesService) Clear(ctx context.Context, data interface{}) (interface{}, error) {
	role := authContextRole(ctx)
	if role == "" {
		return nil, fmt.Errorf("%w: admin identity is missing", ErrUnauthorized)
	}
	if role != "admin" {
		return nil, fmt.Errorf("%w: only admin can clear after-sales requests", ErrForbidden)
	}

	req := map[string]interface{}{}
	if data != nil {
		parsed, ok := data.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid request payload")
		}
		req = parsed
	}

	scope := strings.TrimSpace(strings.ToLower(afterSalesToString(afterSalesGetMapValue(req, "scope"))))
	if scope == "" {
		scope = "processed"
	}

	var (
		deleted int64
		err     error
	)
	switch scope {
	case "processed":
		deleted, err = s.repo.ClearProcessed(ctx)
	case "all":
		deleted, err = s.repo.ClearAll(ctx)
	default:
		return nil, fmt.Errorf("invalid scope")
	}
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success": true,
		"scope":   scope,
		"deleted": deleted,
	}, nil
}

func (s *AfterSalesService) UpdateStatus(ctx context.Context, id string, data interface{}) (interface{}, error) {
	afterSalesID, err := strconv.ParseUint(strings.TrimSpace(id), 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid after-sales id")
	}

	req, ok := data.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid request payload")
	}

	status := strings.TrimSpace(strings.ToLower(afterSalesToString(afterSalesGetMapValue(req, "status"))))
	if status == "" {
		return nil, fmt.Errorf("status is required")
	}
	if !isValidAfterSalesStatus(status) {
		return nil, fmt.Errorf("invalid status")
	}

	entity, err := s.repo.GetByID(ctx, uint(afterSalesID))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("after-sales request not found")
		}
		return nil, err
	}
	role := authContextRole(ctx)
	merchantID := authContextInt64(ctx, "merchant_id")
	if role == "merchant" {
		if merchantID <= 0 {
			return nil, fmt.Errorf("%w: merchant identity is missing", ErrUnauthorized)
		}
		owned, ownErr := s.repo.MerchantOwnsShop(ctx, merchantID, entity.ShopID)
		if ownErr != nil {
			return nil, ownErr
		}
		if !owned {
			return nil, fmt.Errorf("%w: no permission to update this after-sales request", ErrForbidden)
		}
	}

	adminRemark := strings.TrimSpace(afterSalesToString(afterSalesGetMapValue(req, "adminRemark", "admin_remark")))
	processedBy := strings.TrimSpace(afterSalesToString(afterSalesGetMapValue(req, "processedBy", "processed_by")))
	if processedBy == "" {
		switch role {
		case "merchant":
			processedBy = fmt.Sprintf("merchant_%d", merchantID)
		case "admin":
			processedBy = "admin"
		default:
			processedBy = "system"
		}
	}
	refundReason := strings.TrimSpace(afterSalesToString(afterSalesGetMapValue(req, "refundReason", "refund_reason")))
	if refundReason == "" {
		refundReason = strings.TrimSpace(entity.RefundReason)
	}

	shouldRefund := entity.ShouldRefund
	hasShouldRefund := false
	if raw := afterSalesGetMapValue(req, "shouldRefund", "should_refund"); raw != nil {
		hasShouldRefund = true
		parsed, ok := afterSalesToBool(raw)
		if !ok {
			return nil, fmt.Errorf("invalid shouldRefund")
		}
		shouldRefund = parsed
	}

	refundAmount := entity.RefundAmount
	hasRefundAmount := false
	if raw := afterSalesGetMapValue(req, "refundAmount", "refund_amount"); raw != nil {
		hasRefundAmount = true
		parsed, ok := afterSalesToInt64(raw)
		if !ok {
			return nil, fmt.Errorf("invalid refundAmount")
		}
		refundAmount = parsed
	}
	if !hasShouldRefund && hasRefundAmount && refundAmount > 0 {
		// Backward compatibility: some old admin pages only send refundAmount.
		shouldRefund = true
	}
	if refundAmount < 0 {
		return nil, fmt.Errorf("refundAmount must be greater than or equal to 0")
	}

	if normalizeAfterSalesBizType(entity.BizType) == "groupbuy" &&
		strings.EqualFold(strings.TrimSpace(entity.RedeemStateSnapshot), "redeemed") &&
		shouldRefund && role != "merchant" &&
		strings.TrimSpace(entity.RefundTransactionID) == "" {
		return nil, fmt.Errorf("%w: redeemed groupbuy refund can only be processed by merchant", ErrForbidden)
	}

	if shouldRefund && (status == "pending" || status == "rejected") {
		return nil, fmt.Errorf("this status does not support refund")
	}
	if !shouldRefund && strings.TrimSpace(entity.RefundTransactionID) != "" {
		return nil, fmt.Errorf("refund has been completed and cannot be cancelled")
	}

	orderTotalFen := int64(0)
	if order, orderErr := s.orderRepo.GetByID(ctx, entity.OrderID); orderErr == nil {
		orderTotalFen = int64(math.Round(order.TotalPrice * 100))
	} else if shouldRefund {
		if orderErr == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("order not found")
		}
		return nil, orderErr
	}
	if shouldRefund && orderTotalFen > 0 && refundAmount > orderTotalFen {
		return nil, fmt.Errorf("refundAmount cannot exceed order amount")
	}

	var refundedAt interface{} = nil
	refundTransactionID := strings.TrimSpace(entity.RefundTransactionID)
	if shouldRefund {
		if refundAmount <= 0 {
			refundAmount = entity.RequestedRefundAmount
		}
		if refundAmount <= 0 && orderTotalFen > 0 {
			refundAmount = orderTotalFen
		}
		if refundAmount <= 0 {
			return nil, fmt.Errorf("refundAmount must be greater than 0")
		}
		if orderTotalFen > 0 && refundAmount > orderTotalFen {
			return nil, fmt.Errorf("refundAmount cannot exceed order amount")
		}
		if refundReason == "" {
			refundReason = strings.TrimSpace(adminRemark)
		}
		if refundReason == "" {
			refundReason = "售后退款"
		}

		if refundTransactionID == "" {
			if s.paymentSvc == nil {
				return nil, fmt.Errorf("refund service is unavailable")
			}
			refundResult, refundErr := s.paymentSvc.RefundOrder(ctx, RefundOrderRequest{
				UserID:         entity.UserID,
				UserType:       "customer",
				OrderID:        strconv.FormatUint(uint64(entity.OrderID), 10),
				Amount:         refundAmount,
				Reason:         refundReason,
				IdempotencyKey: fmt.Sprintf("after_sales_refund_%d", entity.ID),
			})
			if refundErr != nil {
				return nil, refundErr
			}
			refundTransactionID = strings.TrimSpace(afterSalesToString(refundResult["transactionId"]))
			if refundTransactionID == "" {
				refundTransactionID = strings.TrimSpace(afterSalesToString(refundResult["transaction_id"]))
			}
			refundStatus := strings.ToLower(strings.TrimSpace(afterSalesToString(refundResult["status"])))
			if refundStatus == "success" || refundStatus == "refunded" {
				refundedAt = time.Now()
			}
		}

		if refundedAt == nil && entity.RefundedAt != nil {
			refundedAt = *entity.RefundedAt
		} else if refundedAt == nil && refundTransactionID != "" {
			// Third-party refunds now enter refund_pending first and should only get refundedAt after callback success.
			refundedAt = nil
		} else if refundedAt == nil {
			refundedAt = time.Now()
		}
	} else {
		refundAmount = 0
		refundReason = ""
		refundTransactionID = ""
	}

	updates := map[string]interface{}{
		"status":                status,
		"admin_remark":          adminRemark,
		"processed_by":          processedBy,
		"processed_at":          time.Now(),
		"should_refund":         shouldRefund,
		"refund_amount":         refundAmount,
		"refund_reason":         refundReason,
		"refund_transaction_id": refundTransactionID,
		"refunded_at":           refundedAt,
	}
	if status == "pending" {
		if refundTransactionID != "" {
			return nil, fmt.Errorf("refund has been completed and status cannot be reset to pending")
		}
		updates["processed_at"] = nil
		updates["should_refund"] = false
		updates["refund_amount"] = int64(0)
		updates["refund_reason"] = ""
		updates["refund_transaction_id"] = ""
		updates["refunded_at"] = nil
	}

	if err := s.repo.UpdateStatus(ctx, uint(afterSalesID), updates); err != nil {
		return nil, err
	}

	entity, err = s.repo.GetByID(ctx, uint(afterSalesID))
	if err != nil {
		return nil, err
	}
	if s.opNotification != nil {
		_ = s.opNotification.NotifyAfterSalesUpdated(ctx, entity)
	}
	return s.toResponse(entity), nil
}

func (s *AfterSalesService) toResponse(entity *repository.AfterSalesRequest) map[string]interface{} {
	selectedProducts := []map[string]interface{}{}
	_ = afterSalesDecodeJSONList(entity.SelectedProducts, &selectedProducts)

	evidenceImages := []string{}
	_ = afterSalesDecodeJSONList(entity.EvidenceImages, &evidenceImages)

	refundedAtText := ""
	if entity.RefundedAt != nil {
		refundedAtText = entity.RefundedAt.Format(time.RFC3339)
	}

	publicID := interface{}(entity.ID)
	if uid := strings.TrimSpace(entity.UID); uid != "" {
		publicID = uid
	}

	return map[string]interface{}{
		"id":                      publicID,
		"request_no":              entity.RequestNo,
		"requestNo":               entity.RequestNo,
		"order_id":                entity.OrderID,
		"orderId":                 entity.OrderID,
		"order_no":                entity.OrderNo,
		"orderNo":                 entity.OrderNo,
		"user_id":                 entity.UserID,
		"userId":                  entity.UserID,
		"shop_id":                 entity.ShopID,
		"shopId":                  entity.ShopID,
		"shop_name":               entity.ShopName,
		"shopName":                entity.ShopName,
		"biz_type":                entity.BizType,
		"bizType":                 entity.BizType,
		"initiator_role":          entity.InitiatorRole,
		"initiatorRole":           entity.InitiatorRole,
		"redeem_state_snapshot":   entity.RedeemStateSnapshot,
		"redeemStateSnapshot":     entity.RedeemStateSnapshot,
		"type":                    entity.Type,
		"typeText":                afterSalesTypeText(entity.Type),
		"status":                  entity.Status,
		"statusText":              afterSalesStatusText(entity.Status),
		"problem_desc":            entity.ProblemDesc,
		"problemDesc":             entity.ProblemDesc,
		"selected_products":       selectedProducts,
		"selectedProducts":        selectedProducts,
		"evidence_images":         evidenceImages,
		"evidenceImages":          evidenceImages,
		"contact_phone":           entity.ContactPhone,
		"contactPhone":            entity.ContactPhone,
		"requested_refund_amount": entity.RequestedRefundAmount,
		"requestedRefundAmount":   entity.RequestedRefundAmount,
		"should_refund":           entity.ShouldRefund,
		"shouldRefund":            entity.ShouldRefund,
		"refund_amount":           entity.RefundAmount,
		"refundAmount":            entity.RefundAmount,
		"refund_reason":           entity.RefundReason,
		"refundReason":            entity.RefundReason,
		"refund_transaction_id":   entity.RefundTransactionID,
		"refundTransactionId":     entity.RefundTransactionID,
		"refunded_at":             entity.RefundedAt,
		"refundedAt":              refundedAtText,
		"admin_remark":            entity.AdminRemark,
		"adminRemark":             entity.AdminRemark,
		"processed_by":            entity.ProcessedBy,
		"processedBy":             entity.ProcessedBy,
		"processed_at":            entity.ProcessedAt,
		"created_at":              entity.CreatedAt,
		"createdAt":               entity.CreatedAt.Format(time.RFC3339),
		"updated_at":              entity.UpdatedAt,
		"updatedAt":               entity.UpdatedAt.Format(time.RFC3339),
	}
}

func normalizeAfterSalesBizType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "", "takeout", "waimai", "delivery", "外卖", "外卖类":
		return "takeout"
	case "groupbuy", "tuangou", "团购", "团购类":
		return "groupbuy"
	default:
		return value
	}
}

func (s *AfterSalesService) resolveRedeemStateSnapshot(ctx context.Context, order *repository.Order) (string, error) {
	if order == nil {
		return "unknown", nil
	}
	if normalizeAfterSalesBizType(order.BizType) != "groupbuy" {
		return "not_applicable", nil
	}
	if s == nil || s.db == nil {
		if strings.EqualFold(strings.TrimSpace(order.Status), "redeemed") {
			return "redeemed", nil
		}
		return "unredeemed", nil
	}

	var redeemedCount int64
	if err := s.db.WithContext(ctx).
		Model(&repository.GroupbuyVoucher{}).
		Where("order_id = ? AND status = ?", order.ID, "redeemed").
		Count(&redeemedCount).Error; err != nil {
		return "", err
	}
	if redeemedCount > 0 {
		return "redeemed", nil
	}

	var voucherCount int64
	if err := s.db.WithContext(ctx).
		Model(&repository.GroupbuyVoucher{}).
		Where("order_id = ?", order.ID).
		Count(&voucherCount).Error; err != nil {
		return "", err
	}
	if voucherCount == 0 && strings.EqualFold(strings.TrimSpace(order.Status), "redeemed") {
		return "redeemed", nil
	}
	return "unredeemed", nil
}

func generateAfterSalesNo() string {
	now := time.Now()
	seq := afterSalesNoSeq.Add(1) % 1000
	return fmt.Sprintf("AS%s%09d%03d", now.Format("20060102150405"), now.Nanosecond(), seq)
}

func isValidAfterSalesType(v string) bool {
	switch v {
	case "refund", "refund_return", "exchange":
		return true
	default:
		return false
	}
}

func isValidAfterSalesStatus(v string) bool {
	switch v {
	case "pending", "processing", "approved", "rejected", "completed":
		return true
	default:
		return false
	}
}

func afterSalesTypeText(v string) string {
	switch strings.ToLower(v) {
	case "refund":
		return "仅退款"
	case "refund_return":
		return "退款退货"
	case "exchange":
		return "换货"
	default:
		return v
	}
}

func afterSalesStatusText(v string) string {
	switch strings.ToLower(v) {
	case "pending":
		return "待处理"
	case "processing":
		return "处理中"
	case "approved":
		return "已通过"
	case "rejected":
		return "已拒绝"
	case "completed":
		return "已完成"
	default:
		return v
	}
}

func afterSalesGetMapValue(data map[string]interface{}, keys ...string) interface{} {
	for _, key := range keys {
		if value, ok := data[key]; ok {
			return value
		}
	}
	return nil
}

func afterSalesToString(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case bool:
		if t {
			return "true"
		}
		return "false"
	case float64:
		return strconv.FormatInt(int64(t), 10)
	case float32:
		return strconv.FormatInt(int64(t), 10)
	case int:
		return strconv.Itoa(t)
	case int32:
		return strconv.FormatInt(int64(t), 10)
	case int64:
		return strconv.FormatInt(t, 10)
	case uint:
		return strconv.FormatUint(uint64(t), 10)
	case uint64:
		return strconv.FormatUint(t, 10)
	case json.Number:
		return t.String()
	default:
		return ""
	}
}

func afterSalesToInt64(v interface{}) (int64, bool) {
	switch t := v.(type) {
	case int:
		return int64(t), true
	case int8:
		return int64(t), true
	case int16:
		return int64(t), true
	case int32:
		return int64(t), true
	case int64:
		return t, true
	case uint:
		return int64(t), true
	case uint8:
		return int64(t), true
	case uint16:
		return int64(t), true
	case uint32:
		return int64(t), true
	case uint64:
		if t > uint64(^uint64(0)>>1) {
			return 0, false
		}
		return int64(t), true
	case float32:
		return int64(math.Round(float64(t))), true
	case float64:
		return int64(math.Round(t)), true
	case json.Number:
		if value, err := t.Int64(); err == nil {
			return value, true
		}
		if value, err := t.Float64(); err == nil {
			return int64(math.Round(value)), true
		}
		return 0, false
	case string:
		text := strings.TrimSpace(t)
		if text == "" {
			return 0, false
		}
		if value, err := strconv.ParseInt(text, 10, 64); err == nil {
			return value, true
		}
		if value, err := strconv.ParseFloat(text, 64); err == nil {
			return int64(math.Round(value)), true
		}
		return 0, false
	default:
		return 0, false
	}
}

func afterSalesToBool(v interface{}) (bool, bool) {
	switch t := v.(type) {
	case bool:
		return t, true
	case int:
		return t != 0, true
	case int8:
		return t != 0, true
	case int16:
		return t != 0, true
	case int32:
		return t != 0, true
	case int64:
		return t != 0, true
	case uint:
		return t != 0, true
	case uint8:
		return t != 0, true
	case uint16:
		return t != 0, true
	case uint32:
		return t != 0, true
	case uint64:
		return t != 0, true
	case float32:
		return t != 0, true
	case float64:
		return t != 0, true
	case string:
		text := strings.TrimSpace(strings.ToLower(t))
		switch text {
		case "1", "true", "yes", "y":
			return true, true
		case "0", "false", "no", "n":
			return false, true
		default:
			return false, false
		}
	default:
		return false, false
	}
}

func afterSalesToMapList(v interface{}) []map[string]interface{} {
	switch items := v.(type) {
	case []map[string]interface{}:
		return items
	case []interface{}:
		result := make([]map[string]interface{}, 0, len(items))
		for _, item := range items {
			if m, ok := item.(map[string]interface{}); ok {
				result = append(result, m)
			}
		}
		return result
	default:
		return []map[string]interface{}{}
	}
}

func afterSalesToStringList(v interface{}) []string {
	switch items := v.(type) {
	case []string:
		return items
	case []interface{}:
		result := make([]string, 0, len(items))
		for _, item := range items {
			text := strings.TrimSpace(afterSalesToString(item))
			if text != "" {
				result = append(result, text)
			}
		}
		return result
	default:
		return []string{}
	}
}

func afterSalesDecodeJSONList(raw string, out interface{}) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	return json.Unmarshal([]byte(raw), out)
}
