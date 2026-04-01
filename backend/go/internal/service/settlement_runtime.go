package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type settlementPlanLine struct {
	SubjectUID  string `json:"subject_uid"`
	SubjectType string `json:"subject_type"`
	CalcType    string `json:"calc_type"`
	Amount      int64  `json:"amount"`
	Description string `json:"description"`
}

type settlementPlanResult struct {
	RuleSet   SettlementRuleSetInput `json:"rule_set"`
	Lines     []settlementPlanLine   `json:"lines"`
	Remaining int64                  `json:"remaining"`
}

func settlementOrderRef(order *repository.Order) string {
	if order == nil {
		return ""
	}
	if order.ID > 0 {
		return strconv.FormatUint(uint64(order.ID), 10)
	}
	if uid := strings.TrimSpace(order.UID); uid != "" {
		return uid
	}
	return strings.TrimSpace(order.DailyOrderID)
}

func settlementSubjectKey(subject repository.SettlementSubject) string {
	if uid := strings.TrimSpace(subject.UID); uid != "" {
		return uid
	}
	if uid := strings.TrimSpace(subject.SubjectType); uid != "" {
		return uid
	}
	return strings.TrimSpace(subject.Name)
}

func fallbackSettlementSubjectType(subjectUID string) string {
	switch strings.TrimSpace(subjectUID) {
	case "school", "platform", "rider", "merchant", "custom":
		return strings.TrimSpace(subjectUID)
	default:
		return "custom"
	}
}

func (s *WalletService) computeSettlementPlan(ctx context.Context, amount int64, ruleSetName string) (*settlementPlanResult, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("%w: amount must be greater than 0", ErrInvalidArgument)
	}

	rules, err := s.loadSettlementRuleSets(ctx)
	if err != nil {
		return nil, err
	}
	if len(rules) == 0 {
		return nil, fmt.Errorf("%w: settlement rule is not configured", ErrInvalidArgument)
	}

	var matched *SettlementRuleSetInput
	for i := range rules {
		current := rules[i]
		if !current.Enabled {
			continue
		}
		if key := strings.TrimSpace(ruleSetName); key != "" {
			if strings.TrimSpace(current.Name) == key || strings.TrimSpace(current.UID) == key {
				matched = &current
				break
			}
			continue
		}
		if current.IsDefault {
			matched = &current
			break
		}
	}
	if matched == nil {
		matched = &rules[0]
	}

	subjects, err := s.loadSettlementSubjects(ctx)
	if err != nil {
		return nil, err
	}
	subjectIndex := make(map[string]repository.SettlementSubject, len(subjects)*2)
	for _, subject := range subjects {
		if key := settlementSubjectKey(subject); key != "" {
			subjectIndex[key] = subject
		}
		if key := strings.TrimSpace(subject.SubjectType); key != "" {
			subjectIndex[key] = subject
		}
	}

	steps := append([]SettlementRuleStepInput(nil), matched.Steps...)
	sort.SliceStable(steps, func(i, j int) bool {
		return steps[i].StepOrder < steps[j].StepOrder
	})

	remaining := amount
	remainderUsed := false
	lines := make([]settlementPlanLine, 0, len(steps))
	for _, step := range steps {
		if !step.Enabled {
			continue
		}
		if step.MinOrderAmount > 0 && amount < step.MinOrderAmount {
			continue
		}
		if step.MaxOrderAmount > 0 && amount > step.MaxOrderAmount {
			continue
		}

		lineAmount := int64(0)
		switch step.CalcType {
		case "percent_of_gross":
			lineAmount = int64(math.Round(float64(amount*step.PercentBasisPoints) / 10000.0))
		case "fixed_amount":
			lineAmount = step.FixedAmount
		case "tiered_by_order_amount":
			for _, tier := range step.Tiers {
				if amount < tier.MinAmount {
					continue
				}
				if tier.MaxAmount > 0 && amount > tier.MaxAmount {
					continue
				}
				if tier.Amount > 0 {
					lineAmount = tier.Amount
				} else {
					lineAmount = int64(math.Round(float64(amount*tier.PercentBasisPoints) / 10000.0))
				}
				break
			}
		case "remainder":
			if remainderUsed {
				return nil, fmt.Errorf("%w: only one remainder settlement step is allowed", ErrInvalidArgument)
			}
			remainderUsed = true
			lineAmount = remaining
		default:
			return nil, fmt.Errorf("%w: unsupported settlement calc type %s", ErrInvalidArgument, step.CalcType)
		}

		if lineAmount < 0 {
			return nil, fmt.Errorf("%w: settlement amount cannot be negative", ErrInvalidArgument)
		}
		if step.CalcType != "remainder" {
			remaining -= lineAmount
			if remaining < 0 {
				return nil, fmt.Errorf("%w: settlement total exceeds order amount", ErrInvalidArgument)
			}
		} else {
			remaining = 0
		}

		subjectUID := strings.TrimSpace(step.SettlementSubjectUID)
		subjectType := fallbackSettlementSubjectType(subjectUID)
		if subject, ok := subjectIndex[subjectUID]; ok && strings.TrimSpace(subject.SubjectType) != "" {
			subjectType = strings.TrimSpace(subject.SubjectType)
		}

		lines = append(lines, settlementPlanLine{
			SubjectUID:  subjectUID,
			SubjectType: subjectType,
			CalcType:    step.CalcType,
			Amount:      lineAmount,
			Description: step.Notes,
		})
	}

	return &settlementPlanResult{
		RuleSet:   *matched,
		Lines:     lines,
		Remaining: remaining,
	}, nil
}

func buildSettlementSnapshotJSON(order *repository.Order, plan *settlementPlanResult, stage string, occurredAt time.Time, extra map[string]interface{}) string {
	payload := map[string]interface{}{
		"stage":       stage,
		"occurred_at": occurredAt,
		"rule_set": map[string]interface{}{
			"uid":       plan.RuleSet.UID,
			"name":      plan.RuleSet.Name,
			"scopeType": plan.RuleSet.ScopeType,
			"scopeId":   plan.RuleSet.ScopeID,
			"version":   plan.RuleSet.Version,
		},
		"order": map[string]interface{}{
			"id":            settlementOrderRef(order),
			"uid":           strings.TrimSpace(order.UID),
			"tsid":          strings.TrimSpace(order.TSID),
			"dailyOrderId":  strings.TrimSpace(order.DailyOrderID),
			"amount":        int64(math.Round(order.TotalPrice * 100)),
			"paymentStatus": strings.TrimSpace(order.PaymentStatus),
			"status":        strings.TrimSpace(order.Status),
			"userId":        strings.TrimSpace(order.UserID),
			"merchantId":    strings.TrimSpace(order.MerchantID),
			"riderId":       strings.TrimSpace(order.RiderID),
		},
		"remaining": plan.Remaining,
		"entries":   plan.Lines,
	}
	for key, value := range extra {
		payload[key] = value
	}
	encoded, _ := json.Marshal(payload)
	return string(encoded)
}

func settlementAmountsByType(lines []settlementPlanLine) (platformAmount, riderAmount, merchantAmount int64) {
	for _, line := range lines {
		switch strings.TrimSpace(line.SubjectType) {
		case "platform":
			platformAmount += line.Amount
		case "rider":
			riderAmount += line.Amount
		case "merchant":
			merchantAmount += line.Amount
		}
	}
	return
}

func (s *WalletService) prepareOrderSettlementTx(ctx context.Context, tx *gorm.DB, order *repository.Order, stage string, occurredAt time.Time, extra map[string]interface{}) (*repository.OrderSettlementSnapshot, *settlementPlanResult, error) {
	if order == nil {
		return nil, nil, fmt.Errorf("%w: order is required", ErrInvalidArgument)
	}
	amount := int64(math.Round(order.TotalPrice * 100))
	if amount <= 0 {
		return nil, nil, fmt.Errorf("%w: order amount must be greater than 0", ErrInvalidArgument)
	}

	plan, err := s.computeSettlementPlan(ctx, amount, "")
	if err != nil {
		return nil, nil, err
	}
	orderRef := settlementOrderRef(order)
	if orderRef == "" {
		return nil, nil, fmt.Errorf("%w: order settlement reference is missing", ErrInvalidArgument)
	}

	var snapshot repository.OrderSettlementSnapshot
	snapshotQuery := tx.WithContext(ctx).
		Where("order_id = ?", orderRef).
		Order("created_at DESC, id DESC").
		First(&snapshot)
	snapshotJSON := buildSettlementSnapshotJSON(order, plan, stage, occurredAt, extra)
	if snapshotQuery.Error != nil {
		if snapshotQuery.Error != gorm.ErrRecordNotFound {
			return nil, nil, snapshotQuery.Error
		}
		uid, tsid, err := idkit.NextIdentityForTable(ctx, tx, (&repository.OrderSettlementSnapshot{}).TableName(), occurredAt)
		if err != nil {
			return nil, nil, err
		}
		snapshot = repository.OrderSettlementSnapshot{
			UnifiedIdentity: repository.UnifiedIdentity{UID: uid, TSID: tsid},
			OrderID:         orderRef,
			RuleSetUID:      strings.TrimSpace(plan.RuleSet.UID),
			OrderAmount:     amount,
			Status:          "pending_settlement",
			SnapshotJSON:    snapshotJSON,
		}
		if err := tx.WithContext(ctx).Create(&snapshot).Error; err != nil {
			return nil, nil, err
		}
		return &snapshot, plan, nil
	}

	updates := map[string]interface{}{
		"rule_set_uid":  strings.TrimSpace(plan.RuleSet.UID),
		"order_amount":  amount,
		"snapshot_json": snapshotJSON,
		"updated_at":    occurredAt,
	}
	if snapshot.Status == "" {
		updates["status"] = "pending_settlement"
	}
	if err := tx.WithContext(ctx).Model(&repository.OrderSettlementSnapshot{}).Where("id = ?", snapshot.ID).Updates(updates).Error; err != nil {
		return nil, nil, err
	}
	snapshot.RuleSetUID = strings.TrimSpace(plan.RuleSet.UID)
	snapshot.OrderAmount = amount
	snapshot.SnapshotJSON = snapshotJSON
	return &snapshot, plan, nil
}

func (s *WalletService) PrepareOrderSettlementTx(ctx context.Context, tx *gorm.DB, order *repository.Order) error {
	_, _, err := s.prepareOrderSettlementTx(ctx, tx, order, "payment_confirmed", time.Now(), nil)
	return err
}

func (s *WalletService) SettleCompletedOrderTx(ctx context.Context, tx *gorm.DB, order *repository.Order, completedAt time.Time) error {
	snapshot, plan, err := s.prepareOrderSettlementTx(ctx, tx, order, "completed", completedAt, nil)
	if err != nil {
		return err
	}
	if snapshot.Status == "settled" {
		return nil
	}
	if snapshot.Status == "reversed" {
		return nil
	}

	orderRef := settlementOrderRef(order)
	for _, line := range plan.Lines {
		if line.Amount == 0 {
			continue
		}
		uid, tsid, err := idkit.NextIdentityForTable(ctx, tx, (&repository.SettlementLedgerEntry{}).TableName(), completedAt)
		if err != nil {
			return err
		}
		entry := repository.SettlementLedgerEntry{
			UnifiedIdentity:      repository.UnifiedIdentity{UID: uid, TSID: tsid},
			OrderID:              orderRef,
			SettlementSubjectUID: line.SubjectUID,
			SubjectType:          line.SubjectType,
			EntryType:            "settlement",
			Amount:               line.Amount,
			Status:               "settled",
			OccurredAt:           &completedAt,
		}
		if err := tx.WithContext(ctx).Create(&entry).Error; err != nil {
			return err
		}
	}

	platformAmount, riderAmount, merchantAmount := settlementAmountsByType(plan.Lines)
	if err := tx.WithContext(ctx).
		Model(&repository.Order{}).
		Where("id = ?", order.ID).
		Updates(map[string]interface{}{
			"platform_commission": platformAmount,
			"rider_income":        riderAmount,
			"merchant_income":     merchantAmount,
			"updated_at":          completedAt,
		}).Error; err != nil {
		return err
	}
	if err := tx.WithContext(ctx).
		Model(&repository.OrderSettlementSnapshot{}).
		Where("id = ?", snapshot.ID).
		Updates(map[string]interface{}{
			"status":     "settled",
			"settled_at": completedAt,
			"updated_at": completedAt,
		}).Error; err != nil {
		return err
	}
	return nil
}

func (s *WalletService) ReverseOrderSettlementTx(ctx context.Context, tx *gorm.DB, order *repository.Order, refundAmount int64, reversedAt time.Time, reason string) error {
	if order == nil {
		return nil
	}
	orderRef := settlementOrderRef(order)
	if orderRef == "" {
		return nil
	}

	var snapshot repository.OrderSettlementSnapshot
	if err := tx.WithContext(ctx).
		Where("order_id = ?", orderRef).
		Order("created_at DESC, id DESC").
		First(&snapshot).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil
		}
		return err
	}
	if snapshot.Status == "reversed" {
		return nil
	}

	var reversalCount int64
	if err := tx.WithContext(ctx).
		Model(&repository.SettlementLedgerEntry{}).
		Where("order_id = ? AND entry_type = ?", orderRef, "reversal").
		Count(&reversalCount).Error; err != nil {
		return err
	}
	if reversalCount > 0 {
		return nil
	}

	var settledEntries []repository.SettlementLedgerEntry
	if err := tx.WithContext(ctx).
		Where("order_id = ? AND entry_type = ?", orderRef, "settlement").
		Order("id ASC").
		Find(&settledEntries).Error; err != nil {
		return err
	}
	if len(settledEntries) == 0 {
		return tx.WithContext(ctx).
			Model(&repository.OrderSettlementSnapshot{}).
			Where("id = ?", snapshot.ID).
			Updates(map[string]interface{}{
				"status":      "reversed",
				"reversed_at": reversedAt,
				"updated_at":  reversedAt,
			}).Error
	}

	orderAmount := int64(math.Round(order.TotalPrice * 100))
	fullReversal := orderAmount <= 0 || refundAmount <= 0 || refundAmount >= orderAmount
	ratio := 1.0
	if !fullReversal {
		ratio = float64(refundAmount) / float64(orderAmount)
	}

	var reversedPlatform int64
	var reversedRider int64
	var reversedMerchant int64
	for _, entry := range settledEntries {
		reversalAmount := entry.Amount
		if !fullReversal {
			reversalAmount = int64(math.Round(float64(entry.Amount) * ratio))
		}
		if reversalAmount == 0 {
			continue
		}

		uid, tsid, err := idkit.NextIdentityForTable(ctx, tx, (&repository.SettlementLedgerEntry{}).TableName(), reversedAt)
		if err != nil {
			return err
		}
		reversal := repository.SettlementLedgerEntry{
			UnifiedIdentity:      repository.UnifiedIdentity{UID: uid, TSID: tsid},
			OrderID:              orderRef,
			SettlementSubjectUID: entry.SettlementSubjectUID,
			SubjectType:          entry.SubjectType,
			EntryType:            "reversal",
			Amount:               -reversalAmount,
			Status:               "reversed",
			OccurredAt:           &reversedAt,
		}
		if err := tx.WithContext(ctx).Create(&reversal).Error; err != nil {
			return err
		}

		switch strings.TrimSpace(entry.SubjectType) {
		case "platform":
			reversedPlatform += reversalAmount
		case "rider":
			reversedRider += reversalAmount
		case "merchant":
			reversedMerchant += reversalAmount
		}
	}

	orderUpdates := map[string]interface{}{
		"platform_commission": settlementMaxInt64(0, order.PlatformCommission-reversedPlatform),
		"rider_income":        settlementMaxInt64(0, order.RiderIncome-reversedRider),
		"merchant_income":     settlementMaxInt64(0, order.MerchantIncome-reversedMerchant),
		"updated_at":          reversedAt,
	}
	if err := tx.WithContext(ctx).Model(&repository.Order{}).Where("id = ?", order.ID).Updates(orderUpdates).Error; err != nil {
		return err
	}

	snapshotUpdates := map[string]interface{}{
		"updated_at": reversedAt,
	}
	if fullReversal {
		snapshotUpdates["status"] = "reversed"
		snapshotUpdates["reversed_at"] = reversedAt
	}
	if strings.TrimSpace(reason) != "" {
		plan, err := s.computeSettlementPlan(ctx, int64(math.Round(order.TotalPrice*100)), "")
		if err == nil {
			snapshotUpdates["snapshot_json"] = buildSettlementSnapshotJSON(order, plan, "reversed", reversedAt, map[string]interface{}{
				"reverse_reason": reason,
				"refund_amount":  refundAmount,
			})
		}
	}
	return tx.WithContext(ctx).
		Model(&repository.OrderSettlementSnapshot{}).
		Where("id = ?", snapshot.ID).
		Updates(snapshotUpdates).Error
}

func settlementMaxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
