package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

type FinancialOverviewQuery struct {
	PeriodType string
	StatDate   string
}

type FinancialStatisticsQuery struct {
	PeriodType string
	StartDate  string
	EndDate    string
}

type FinancialUserDetailsQuery struct {
	PeriodType string
	StartDate  string
	EndDate    string
	UserType   string
	Keyword    string
	SortBy     string
	SortOrder  string
	Page       int
	Limit      int
}

type FinancialExportQuery struct {
	PeriodType string
	StartDate  string
	EndDate    string
	UserType   string
	Format     string
}

type FinancialOverviewResult struct {
	PeriodType              string    `json:"periodType"`
	PeriodStart             time.Time `json:"periodStart"`
	PeriodEnd               time.Time `json:"periodEnd"`
	TotalTransactionAmount  int64     `json:"totalTransactionAmount"`
	TotalRefundAmount       int64     `json:"totalRefundAmount"`
	TotalCompensationAmount int64     `json:"totalCompensationAmount"`
	TotalRechargeAmount     int64     `json:"totalRechargeAmount"`
	TotalWithdrawAmount     int64     `json:"totalWithdrawAmount"`
	PlatformRevenue         int64     `json:"platformRevenue"`
	TotalOrderCount         int64     `json:"totalOrderCount"`
	TotalPaymentCount       int64     `json:"totalPaymentCount"`
	TotalRefundCount        int64     `json:"totalRefundCount"`
	TotalCompensationCount  int64     `json:"totalCompensationCount"`
	ActiveRiderCount        int64     `json:"activeRiderCount"`
	ActiveMerchantCount     int64     `json:"activeMerchantCount"`
	ActiveCustomerCount     int64     `json:"activeCustomerCount"`
}

type FinancialStatisticsPoint struct {
	Period                  string    `json:"period"`
	PeriodStart             time.Time `json:"periodStart"`
	PeriodEnd               time.Time `json:"periodEnd"`
	TotalTransactionAmount  int64     `json:"totalTransactionAmount"`
	TotalRefundAmount       int64     `json:"totalRefundAmount"`
	TotalCompensationAmount int64     `json:"totalCompensationAmount"`
	TotalRechargeAmount     int64     `json:"totalRechargeAmount"`
	TotalWithdrawAmount     int64     `json:"totalWithdrawAmount"`
	TransactionCount        int64     `json:"transactionCount"`
}

type FinancialStatisticsResult struct {
	PeriodType string                     `json:"periodType"`
	RangeStart time.Time                  `json:"rangeStart"`
	RangeEnd   time.Time                  `json:"rangeEnd"`
	Items      []FinancialStatisticsPoint `json:"items"`
}

type FinancialUserDetailItem struct {
	UserID              string `json:"userId"`
	UserType            string `json:"userType"`
	UserName            string `json:"userName"`
	UserPhone           string `json:"userPhone"`
	TotalIncome         int64  `json:"totalIncome"`
	OrderIncome         int64  `json:"orderIncome"`
	TipIncome           int64  `json:"tipIncome"`
	BonusIncome         int64  `json:"bonusIncome"`
	TotalExpense        int64  `json:"totalExpense"`
	OrderExpense        int64  `json:"orderExpense"`
	OrderCount          int    `json:"orderCount"`
	CompletedOrderCount int    `json:"completedOrderCount"`
	CancelledOrderCount int    `json:"cancelledOrderCount"`
	RefundAmount        int64  `json:"refundAmount"`
	CompensationAmount  int64  `json:"compensationAmount"`
}

type FinancialUserDetailsResult struct {
	PeriodType string                    `json:"periodType"`
	RangeStart time.Time                 `json:"rangeStart"`
	RangeEnd   time.Time                 `json:"rangeEnd"`
	Total      int                       `json:"total"`
	Page       int                       `json:"page"`
	Limit      int                       `json:"limit"`
	Items      []FinancialUserDetailItem `json:"items"`
}

type FinancialExportResult struct {
	ExportAt    time.Time                  `json:"exportAt"`
	PeriodType  string                     `json:"periodType"`
	RangeStart  time.Time                  `json:"rangeStart"`
	RangeEnd    time.Time                  `json:"rangeEnd"`
	Overview    FinancialOverviewResult    `json:"overview"`
	Statistics  []FinancialStatisticsPoint `json:"statistics"`
	UserDetails []FinancialUserDetailItem  `json:"userDetails"`
}

type transactionStatRow struct {
	Type      string
	Amount    int64
	CreatedAt time.Time
	UserID    string
	UserType  string
}

type userAggregate struct {
	FinancialUserDetailItem
}

type FinancialService struct {
	walletRepo repository.WalletRepository
}

type financialAuditActor struct {
	Role string
	ID   string
	Name string
}

func NewFinancialService(walletRepo repository.WalletRepository) *FinancialService {
	return &FinancialService{walletRepo: walletRepo}
}

func (s *FinancialService) GetOverview(ctx context.Context, query FinancialOverviewQuery) (FinancialOverviewResult, error) {
	periodType, err := normalizePeriodType(query.PeriodType)
	if err != nil {
		return FinancialOverviewResult{}, err
	}
	start, end, err := resolvePeriodRange(periodType, query.StatDate)
	if err != nil {
		return FinancialOverviewResult{}, err
	}

	db := s.walletRepo.DB().WithContext(ctx)
	if _, err := repository.SyncExpiredCouponsAndPlatformBudget(ctx, db); err != nil {
		return FinancialOverviewResult{}, err
	}

	result := FinancialOverviewResult{
		PeriodType:  periodType,
		PeriodStart: start,
		PeriodEnd:   end,
	}

	base := func() *gorm.DB {
		return db.Model(&repository.WalletTransaction{}).
			Where("status = ? AND created_at >= ? AND created_at < ?", "success", start, end)
	}
	base().Where("type = ?", "payment").Select("COALESCE(SUM(amount), 0)").Scan(&result.TotalTransactionAmount)
	base().Where("type = ?", "refund").Select("COALESCE(SUM(amount), 0)").Scan(&result.TotalRefundAmount)
	base().Where("type = ?", "compensation").Select("COALESCE(SUM(amount), 0)").Scan(&result.TotalCompensationAmount)
	base().Where("type = ?", "recharge").Select("COALESCE(SUM(amount), 0)").Scan(&result.TotalRechargeAmount)
	base().Where("type = ?", "withdraw").Select("COALESCE(SUM(amount), 0)").Scan(&result.TotalWithdrawAmount)

	base().Where("type = ?", "payment").Count(&result.TotalPaymentCount)
	base().Where("type = ?", "refund").Count(&result.TotalRefundCount)
	base().Where("type = ?", "compensation").Count(&result.TotalCompensationCount)

	db.Model(&repository.Order{}).
		Where("created_at >= ? AND created_at < ?", start, end).
		Count(&result.TotalOrderCount)
	db.Model(&repository.Order{}).
		Where("created_at >= ? AND created_at < ?", start, end).
		Select("COALESCE(SUM(platform_commission), 0)").
		Scan(&result.PlatformRevenue)

	var couponIssueDeduct int64
	var couponExpireRefund int64
	db.Model(&repository.WalletTransaction{}).
		Where("status = ? AND user_id = ? AND user_type = ? AND type = ? AND created_at >= ? AND created_at < ?",
			"success", "platform_revenue", "platform", "coupon_issue_deduct", start, end).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&couponIssueDeduct)
	db.Model(&repository.WalletTransaction{}).
		Where("status = ? AND user_id = ? AND user_type = ? AND type = ? AND created_at >= ? AND created_at < ?",
			"success", "platform_revenue", "platform", "coupon_expire_refund", start, end).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&couponExpireRefund)
	result.PlatformRevenue = result.PlatformRevenue - couponIssueDeduct + couponExpireRefund

	db.Model(&repository.WalletAccount{}).Where("user_type = ? AND status = ?", "rider", "active").Count(&result.ActiveRiderCount)
	db.Model(&repository.WalletAccount{}).Where("user_type = ? AND status = ?", "merchant", "active").Count(&result.ActiveMerchantCount)
	db.Model(&repository.WalletAccount{}).Where("user_type = ? AND status = ?", "customer", "active").Count(&result.ActiveCustomerCount)

	return result, nil
}

func (s *FinancialService) GetStatistics(ctx context.Context, query FinancialStatisticsQuery) (FinancialStatisticsResult, error) {
	periodType, err := normalizePeriodType(query.PeriodType)
	if err != nil {
		return FinancialStatisticsResult{}, err
	}

	start, end, err := resolveStatisticsRange(periodType, query.StartDate, query.EndDate)
	if err != nil {
		return FinancialStatisticsResult{}, err
	}

	var rows []transactionStatRow
	db := s.walletRepo.DB().WithContext(ctx)
	if err := db.Model(&repository.WalletTransaction{}).
		Select("type, amount, created_at").
		Where("status = ? AND created_at >= ? AND created_at < ?", "success", start, end).
		Order("created_at ASC").
		Find(&rows).Error; err != nil {
		return FinancialStatisticsResult{}, err
	}

	bucketMap := map[string]*FinancialStatisticsPoint{}
	for _, row := range rows {
		bucketStart := bucketStartForPeriod(periodType, row.CreatedAt)
		bucketEnd := nextBucketStart(periodType, bucketStart)
		key := periodLabel(periodType, bucketStart)
		point, exists := bucketMap[key]
		if !exists {
			point = &FinancialStatisticsPoint{
				Period:      key,
				PeriodStart: bucketStart,
				PeriodEnd:   bucketEnd,
			}
			bucketMap[key] = point
		}

		switch row.Type {
		case "payment":
			point.TotalTransactionAmount += row.Amount
		case "refund":
			point.TotalRefundAmount += row.Amount
		case "compensation":
			point.TotalCompensationAmount += row.Amount
		case "recharge":
			point.TotalRechargeAmount += row.Amount
		case "withdraw":
			point.TotalWithdrawAmount += row.Amount
		}
		point.TransactionCount++
	}

	items := make([]FinancialStatisticsPoint, 0, len(bucketMap))
	for _, point := range bucketMap {
		items = append(items, *point)
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].PeriodStart.Before(items[j].PeriodStart)
	})

	return FinancialStatisticsResult{
		PeriodType: periodType,
		RangeStart: start,
		RangeEnd:   end,
		Items:      items,
	}, nil
}

func (s *FinancialService) GetUserDetails(ctx context.Context, query FinancialUserDetailsQuery) (FinancialUserDetailsResult, error) {
	periodType, err := normalizePeriodType(query.PeriodType)
	if err != nil {
		return FinancialUserDetailsResult{}, err
	}

	start, end, err := resolveStatisticsRange(periodType, query.StartDate, query.EndDate)
	if err != nil {
		return FinancialUserDetailsResult{}, err
	}

	if query.Page <= 0 {
		query.Page = 1
	}
	if query.Limit <= 0 {
		query.Limit = 20
	}
	if query.Limit > 200 {
		query.Limit = 200
	}

	normalizedUserType := ""
	if strings.TrimSpace(query.UserType) != "" {
		normalizedUserType, err = normalizeUserType(query.UserType)
		if err != nil {
			return FinancialUserDetailsResult{}, err
		}
	}

	var rows []transactionStatRow
	db := s.walletRepo.DB().WithContext(ctx)
	txQuery := db.Model(&repository.WalletTransaction{}).
		Select("user_id, user_type, type, amount").
		Where("status = ? AND created_at >= ? AND created_at < ?", "success", start, end)
	if normalizedUserType != "" {
		txQuery = txQuery.Where("user_type = ?", normalizedUserType)
	}
	if strings.TrimSpace(query.Keyword) != "" {
		like := "%" + strings.TrimSpace(query.Keyword) + "%"
		txQuery = txQuery.Where("user_id LIKE ?", like)
	}
	if err := txQuery.Find(&rows).Error; err != nil {
		return FinancialUserDetailsResult{}, err
	}

	aggMap := make(map[string]*userAggregate)
	for _, row := range rows {
		key := row.UserType + ":" + row.UserID
		agg, exists := aggMap[key]
		if !exists {
			agg = &userAggregate{FinancialUserDetailItem: FinancialUserDetailItem{
				UserID:   row.UserID,
				UserType: row.UserType,
			}}
			aggMap[key] = agg
		}
		switch row.Type {
		case "payment":
			agg.TotalExpense += row.Amount
			agg.OrderExpense += row.Amount
		case "withdraw", "admin_deduct_balance":
			agg.TotalExpense += row.Amount
		case "refund":
			agg.TotalIncome += row.Amount
			agg.RefundAmount += row.Amount
		case "compensation":
			agg.TotalIncome += row.Amount
			agg.CompensationAmount += row.Amount
		case "recharge", "admin_add_balance", "income":
			agg.TotalIncome += row.Amount
		default:
			if strings.Contains(row.Type, "income") {
				agg.TotalIncome += row.Amount
			}
		}
	}

	s.enrichOrderStats(ctx, start, end, aggMap)

	items := make([]FinancialUserDetailItem, 0, len(aggMap))
	keyword := strings.ToLower(strings.TrimSpace(query.Keyword))
	for _, agg := range aggMap {
		name, phone := s.resolveUserProfile(ctx, agg.UserType, agg.UserID)
		agg.UserName = name
		agg.UserPhone = phone
		if keyword != "" {
			joined := strings.ToLower(agg.UserID + " " + agg.UserName + " " + agg.UserPhone)
			if !strings.Contains(joined, keyword) {
				continue
			}
		}
		items = append(items, agg.FinancialUserDetailItem)
	}

	s.sortUserDetails(items, query.SortBy, query.SortOrder)

	total := len(items)
	startIdx := (query.Page - 1) * query.Limit
	if startIdx > total {
		startIdx = total
	}
	endIdx := startIdx + query.Limit
	if endIdx > total {
		endIdx = total
	}
	paged := items[startIdx:endIdx]

	return FinancialUserDetailsResult{
		PeriodType: periodType,
		RangeStart: start,
		RangeEnd:   end,
		Total:      total,
		Page:       query.Page,
		Limit:      query.Limit,
		Items:      paged,
	}, nil
}

func (s *FinancialService) Export(ctx context.Context, query FinancialExportQuery) (FinancialExportResult, error) {
	periodType, err := normalizePeriodType(query.PeriodType)
	if err != nil {
		return FinancialExportResult{}, err
	}

	overview, err := s.GetOverview(ctx, FinancialOverviewQuery{
		PeriodType: periodType,
		StatDate:   query.StartDate,
	})
	if err != nil {
		return FinancialExportResult{}, err
	}

	stats, err := s.GetStatistics(ctx, FinancialStatisticsQuery{
		PeriodType: periodType,
		StartDate:  query.StartDate,
		EndDate:    query.EndDate,
	})
	if err != nil {
		return FinancialExportResult{}, err
	}

	userDetails, err := s.GetUserDetails(ctx, FinancialUserDetailsQuery{
		PeriodType: periodType,
		StartDate:  query.StartDate,
		EndDate:    query.EndDate,
		UserType:   query.UserType,
		SortBy:     "total_income",
		SortOrder:  "desc",
		Page:       1,
		Limit:      10000,
	})
	if err != nil {
		return FinancialExportResult{}, err
	}

	return FinancialExportResult{
		ExportAt:    time.Now(),
		PeriodType:  periodType,
		RangeStart:  stats.RangeStart,
		RangeEnd:    stats.RangeEnd,
		Overview:    overview,
		Statistics:  stats.Items,
		UserDetails: userDetails.Items,
	}, nil
}

func (s *FinancialService) enrichOrderStats(ctx context.Context, start, end time.Time, aggMap map[string]*userAggregate) {
	if len(aggMap) == 0 {
		return
	}

	var orders []repository.Order
	if err := s.walletRepo.DB().WithContext(ctx).
		Model(&repository.Order{}).
		Select("user_id, rider_id, merchant_id, status, rider_income, merchant_income").
		Where("created_at >= ? AND created_at < ?", start, end).
		Find(&orders).Error; err != nil {
		return
	}

	for _, order := range orders {
		if agg, ok := aggMap["customer:"+order.UserID]; ok {
			agg.OrderCount++
			switch order.Status {
			case "completed":
				agg.CompletedOrderCount++
			case "cancelled":
				agg.CancelledOrderCount++
			}
		}
		if order.RiderID != "" {
			if agg, ok := aggMap["rider:"+order.RiderID]; ok {
				agg.OrderCount++
				switch order.Status {
				case "completed":
					agg.CompletedOrderCount++
					agg.OrderIncome += order.RiderIncome
				case "cancelled":
					agg.CancelledOrderCount++
				}
			}
		}
		if order.MerchantID != "" {
			if agg, ok := aggMap["merchant:"+order.MerchantID]; ok {
				agg.OrderCount++
				switch order.Status {
				case "completed":
					agg.CompletedOrderCount++
					agg.OrderIncome += order.MerchantIncome
				case "cancelled":
					agg.CancelledOrderCount++
				}
			}
		}
	}
}

func (s *FinancialService) sortUserDetails(items []FinancialUserDetailItem, sortBy, sortOrder string) {
	field := strings.ToLower(strings.TrimSpace(sortBy))
	if field == "" {
		field = "total_income"
	}
	desc := strings.ToLower(strings.TrimSpace(sortOrder)) != "asc"

	sort.Slice(items, func(i, j int) bool {
		left := extractSortMetric(items[i], field)
		right := extractSortMetric(items[j], field)
		if left == right {
			return items[i].UserID < items[j].UserID
		}
		if desc {
			return left > right
		}
		return left < right
	})
}

func extractSortMetric(item FinancialUserDetailItem, sortField string) int64 {
	switch sortField {
	case "total_income", "totalincome":
		return item.TotalIncome
	case "order_income", "orderincome":
		return item.OrderIncome
	case "total_expense", "totalexpense":
		return item.TotalExpense
	case "refund_amount", "refundamount":
		return item.RefundAmount
	case "compensation_amount", "compensationamount":
		return item.CompensationAmount
	case "order_count", "ordercount":
		return int64(item.OrderCount)
	case "completed_order_count", "completedordercount":
		return int64(item.CompletedOrderCount)
	default:
		return item.TotalIncome
	}
}

func (s *FinancialService) resolveUserProfile(ctx context.Context, userType, userID string) (string, string) {
	db := s.walletRepo.DB().WithContext(ctx)
	switch userType {
	case "customer":
		var user repository.User
		if err := db.Where("phone = ?", userID).First(&user).Error; err == nil {
			return user.Name, user.Phone
		}
		if id, err := strconv.ParseUint(userID, 10, 64); err == nil {
			if err := db.First(&user, uint(id)).Error; err == nil {
				return user.Name, user.Phone
			}
		}
	case "rider":
		var rider repository.Rider
		if err := db.Where("phone = ?", userID).First(&rider).Error; err == nil {
			return rider.Name, rider.Phone
		}
		if id, err := strconv.ParseUint(userID, 10, 64); err == nil {
			if err := db.First(&rider, uint(id)).Error; err == nil {
				return rider.Name, rider.Phone
			}
		}
	case "merchant":
		var merchant repository.Merchant
		if err := db.Where("phone = ?", userID).First(&merchant).Error; err == nil {
			return merchant.Name, merchant.Phone
		}
		if id, err := strconv.ParseUint(userID, 10, 64); err == nil {
			if err := db.First(&merchant, uint(id)).Error; err == nil {
				return merchant.Name, merchant.Phone
			}
		}
	}
	return "", ""
}

func normalizePeriodType(periodType string) (string, error) {
	value := strings.ToLower(strings.TrimSpace(periodType))
	if value == "" {
		return "daily", nil
	}
	switch value {
	case "daily", "weekly", "monthly", "quarterly", "yearly":
		return value, nil
	default:
		return "", fmt.Errorf("%w: unsupported periodType", ErrInvalidArgument)
	}
}

func resolvePeriodRange(periodType, statDate string) (time.Time, time.Time, error) {
	anchor := time.Now()
	if strings.TrimSpace(statDate) != "" {
		parsed, err := time.ParseInLocation("2006-01-02", statDate, time.Local)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("%w: invalid statDate format", ErrInvalidArgument)
		}
		anchor = parsed
	}
	start, end := periodStartEnd(periodType, anchor)
	return start, end, nil
}

func resolveStatisticsRange(periodType, startDate, endDate string) (time.Time, time.Time, error) {
	if strings.TrimSpace(startDate) != "" && strings.TrimSpace(endDate) != "" {
		start, err := time.ParseInLocation("2006-01-02", startDate, time.Local)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("%w: invalid startDate format", ErrInvalidArgument)
		}
		end, err := time.ParseInLocation("2006-01-02", endDate, time.Local)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("%w: invalid endDate format", ErrInvalidArgument)
		}
		if end.Before(start) {
			return time.Time{}, time.Time{}, fmt.Errorf("%w: endDate cannot be earlier than startDate", ErrInvalidArgument)
		}
		return dayStart(start), dayStart(end).AddDate(0, 0, 1), nil
	}

	now := time.Now()
	start, end := periodStartEnd(periodType, now)
	switch periodType {
	case "daily":
		start = start.AddDate(0, 0, -6)
	case "weekly":
		start = start.AddDate(0, 0, -7*11)
	case "monthly":
		start = start.AddDate(0, -11, 0)
	case "quarterly":
		start = start.AddDate(0, -3*7, 0)
	case "yearly":
		start = start.AddDate(-4, 0, 0)
	}
	return start, end, nil
}

func periodStartEnd(periodType string, anchor time.Time) (time.Time, time.Time) {
	base := dayStart(anchor)
	switch periodType {
	case "daily":
		return base, base.AddDate(0, 0, 1)
	case "weekly":
		weekday := int(base.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		start := base.AddDate(0, 0, -(weekday - 1))
		return start, start.AddDate(0, 0, 7)
	case "monthly":
		start := time.Date(base.Year(), base.Month(), 1, 0, 0, 0, 0, base.Location())
		return start, start.AddDate(0, 1, 0)
	case "quarterly":
		quarter := (int(base.Month()) - 1) / 3
		startMonth := time.Month(quarter*3 + 1)
		start := time.Date(base.Year(), startMonth, 1, 0, 0, 0, 0, base.Location())
		return start, start.AddDate(0, 3, 0)
	case "yearly":
		start := time.Date(base.Year(), time.January, 1, 0, 0, 0, 0, base.Location())
		return start, start.AddDate(1, 0, 0)
	default:
		return base, base.AddDate(0, 0, 1)
	}
}

func bucketStartForPeriod(periodType string, t time.Time) time.Time {
	start, _ := periodStartEnd(periodType, t)
	return start
}

func nextBucketStart(periodType string, bucketStart time.Time) time.Time {
	switch periodType {
	case "daily":
		return bucketStart.AddDate(0, 0, 1)
	case "weekly":
		return bucketStart.AddDate(0, 0, 7)
	case "monthly":
		return bucketStart.AddDate(0, 1, 0)
	case "quarterly":
		return bucketStart.AddDate(0, 3, 0)
	case "yearly":
		return bucketStart.AddDate(1, 0, 0)
	default:
		return bucketStart.AddDate(0, 0, 1)
	}
}

func periodLabel(periodType string, start time.Time) string {
	switch periodType {
	case "daily":
		return start.Format("2006-01-02")
	case "weekly":
		year, week := start.ISOWeek()
		return fmt.Sprintf("%d-W%02d", year, week)
	case "monthly":
		return start.Format("2006-01")
	case "quarterly":
		quarter := (int(start.Month())-1)/3 + 1
		return fmt.Sprintf("%d-Q%d", start.Year(), quarter)
	case "yearly":
		return start.Format("2006")
	default:
		return start.Format("2006-01-02")
	}
}

type TransactionLogsQuery struct {
	UserID    string
	UserType  string
	Type      string
	Status    string
	StartDate string
	EndDate   string
	Page      int
	Limit     int
}

func (s *FinancialService) GetTransactionLogs(ctx context.Context, query TransactionLogsQuery) (map[string]interface{}, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 {
		query.Limit = 50
	}
	if query.Limit > 200 {
		query.Limit = 200
	}

	normalizedUserType := ""
	if query.UserType != "" {
		var err error
		normalizedUserType, err = normalizeUserType(query.UserType)
		if err != nil {
			return nil, err
		}
	}

	startAt := time.Time{}
	hasStartAt := false
	if query.StartDate != "" {
		var err error
		startAt, err = parseTransactionLogsDateBoundary(query.StartDate, false)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid startDate format", ErrInvalidArgument)
		}
		hasStartAt = true
	}
	endAt := time.Time{}
	hasEndAt := false
	if query.EndDate != "" {
		var err error
		endAt, err = parseTransactionLogsDateBoundary(query.EndDate, true)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid endDate format", ErrInvalidArgument)
		}
		hasEndAt = true
	}

	db := s.walletRepo.DB().WithContext(ctx).Model(&repository.WalletTransaction{})
	if query.UserID != "" {
		db = db.Where("user_id = ?", query.UserID)
	}
	if normalizedUserType != "" {
		db = db.Where("user_type = ?", normalizedUserType)
	}
	if query.Type != "" {
		db = db.Where("type = ?", query.Type)
	}
	if query.Status != "" {
		db = db.Where("status = ?", query.Status)
	}
	if hasStartAt {
		db = db.Where("created_at >= ?", startAt)
	}
	if hasEndAt {
		db = db.Where("created_at < ?", endAt)
	}

	var txTotal int64
	if err := db.Count(&txTotal).Error; err != nil {
		return nil, err
	}

	offset := (query.Page - 1) * query.Limit
	fetchLimit := offset + query.Limit
	if fetchLimit < query.Limit {
		fetchLimit = query.Limit
	}

	var transactions []repository.WalletTransaction
	if err := db.Order("created_at DESC").Limit(fetchLimit).Find(&transactions).Error; err != nil {
		return nil, err
	}

	mergedItems := make([]financialTransactionLogItem, 0, len(transactions)+16)
	for _, tx := range transactions {
		mergedItems = append(mergedItems, financialTransactionLogItem{
			ID:             tx.ID,
			UID:            tx.UID,
			SourceType:     "wallet_transaction",
			TransactionID:  tx.TransactionID,
			UserID:         tx.UserID,
			UserType:       tx.UserType,
			Type:           tx.Type,
			BusinessType:   tx.BusinessType,
			BusinessID:     tx.BusinessID,
			Amount:         tx.Amount,
			BalanceBefore:  tx.BalanceBefore,
			BalanceAfter:   tx.BalanceAfter,
			PaymentMethod:  tx.PaymentMethod,
			PaymentChannel: tx.PaymentChannel,
			Status:         tx.Status,
			Description:    tx.Description,
			Remark:         tx.Remark,
			OperatorID:     tx.OperatorID,
			OperatorName:   tx.OperatorName,
			CreatedAt:      tx.CreatedAt,
			CompletedAt:    tx.CompletedAt,
		})
	}

	opTypeFilter, allowAdminOpsByType := mapOperationTypeFilter(query.Type)
	allowAdminOpsByStatus := query.Status == "" || strings.EqualFold(query.Status, "success")
	var opTotal int64
	if allowAdminOpsByType && allowAdminOpsByStatus {
		opDB := s.walletRepo.DB().WithContext(ctx).Model(&repository.AdminWalletOperation{})
		if query.UserID != "" {
			opDB = opDB.Where("target_user_id = ?", query.UserID)
		}
		if normalizedUserType != "" {
			opDB = opDB.Where("target_user_type = ?", normalizedUserType)
		}
		if opTypeFilter != "" {
			opDB = opDB.Where("operation_type = ?", opTypeFilter)
		}
		if hasStartAt {
			opDB = opDB.Where("created_at >= ?", startAt)
		}
		if hasEndAt {
			opDB = opDB.Where("created_at < ?", endAt)
		}

		if err := opDB.Count(&opTotal).Error; err != nil {
			return nil, err
		}

		var operations []repository.AdminWalletOperation
		if err := opDB.Order("created_at DESC").Limit(fetchLimit).Find(&operations).Error; err != nil {
			return nil, err
		}

		linkedTransactionIDs := make([]string, 0, len(operations))
		for _, op := range operations {
			txID := strings.TrimSpace(op.TransactionID)
			if txID != "" {
				linkedTransactionIDs = append(linkedTransactionIDs, txID)
			}
		}
		linkedTxMap := map[string]repository.WalletTransaction{}
		if len(linkedTransactionIDs) > 0 {
			var linkedTransactions []repository.WalletTransaction
			if err := s.walletRepo.DB().WithContext(ctx).
				Where("transaction_id IN ? OR transaction_id_raw IN ?", linkedTransactionIDs, linkedTransactionIDs).
				Find(&linkedTransactions).Error; err == nil {
				for _, linked := range linkedTransactions {
					linkedTxMap[linked.TransactionID] = linked
					if strings.TrimSpace(linked.TransactionIDRaw) != "" {
						linkedTxMap[linked.TransactionIDRaw] = linked
					}
				}
			}
		}

		for _, op := range operations {
			linkedTx, hasLinkedTx := linkedTxMap[op.TransactionID]
			logType := mapAdminOperationToLogType(op.OperationType)
			if logType == "" {
				logType = strings.TrimSpace(op.OperationType)
			}
			if query.Type != "" {
				if logType != query.Type {
					continue
				}
			}

			amount := op.Amount
			balanceBefore := int64(0)
			balanceAfter := int64(0)
			paymentMethod := "admin"
			paymentChannel := ""
			status := "success"
			description := strings.TrimSpace(op.Reason)
			remark := strings.TrimSpace(op.Remark)
			operatorID := op.AdminID
			operatorName := op.AdminName
			completedAt := (*time.Time)(nil)
			businessType := "admin_wallet_operation"
			businessID := op.OperationID

			if hasLinkedTx {
				if linkedTx.Amount > 0 {
					amount = linkedTx.Amount
				}
				balanceBefore = linkedTx.BalanceBefore
				balanceAfter = linkedTx.BalanceAfter
				if strings.TrimSpace(linkedTx.PaymentMethod) != "" {
					paymentMethod = linkedTx.PaymentMethod
				}
				paymentChannel = linkedTx.PaymentChannel
				if strings.TrimSpace(linkedTx.Status) != "" {
					status = linkedTx.Status
				}
				if strings.TrimSpace(linkedTx.Description) != "" {
					description = linkedTx.Description
				}
				if strings.TrimSpace(linkedTx.Remark) != "" {
					remark = linkedTx.Remark
				}
				if strings.TrimSpace(linkedTx.OperatorID) != "" {
					operatorID = linkedTx.OperatorID
				}
				if strings.TrimSpace(linkedTx.OperatorName) != "" {
					operatorName = linkedTx.OperatorName
				}
				if strings.TrimSpace(linkedTx.BusinessType) != "" {
					businessType = linkedTx.BusinessType
				}
				if strings.TrimSpace(linkedTx.BusinessID) != "" {
					businessID = linkedTx.BusinessID
				}
				completedAt = linkedTx.CompletedAt
			}

			mergedItems = append(mergedItems, financialTransactionLogItem{
				ID:             op.ID,
				UID:            op.UID,
				SourceType:     "admin_operation",
				TransactionID:  op.TransactionID,
				UserID:         op.TargetUserID,
				UserType:       op.TargetUserType,
				Type:           logType,
				BusinessType:   businessType,
				BusinessID:     businessID,
				Amount:         amount,
				BalanceBefore:  balanceBefore,
				BalanceAfter:   balanceAfter,
				PaymentMethod:  paymentMethod,
				PaymentChannel: paymentChannel,
				Status:         status,
				Description:    description,
				Remark:         remark,
				OperatorID:     operatorID,
				OperatorName:   operatorName,
				CreatedAt:      op.CreatedAt,
				CompletedAt:    completedAt,
			})
		}
	}

	sort.Slice(mergedItems, func(i, j int) bool {
		left := mergedItems[i]
		right := mergedItems[j]
		if left.CreatedAt.Equal(right.CreatedAt) {
			if left.ID == right.ID {
				return left.SourceType < right.SourceType
			}
			return left.ID > right.ID
		}
		return left.CreatedAt.After(right.CreatedAt)
	})

	total := txTotal + opTotal
	if offset > len(mergedItems) {
		offset = len(mergedItems)
	}
	endIdx := offset + query.Limit
	if endIdx > len(mergedItems) {
		endIdx = len(mergedItems)
	}
	pagedItems := mergedItems[offset:endIdx]

	items := make([]map[string]interface{}, len(pagedItems))
	for i, item := range pagedItems {
		items[i] = map[string]interface{}{
			"id":             item.UID,
			"recordId":       item.ID,
			"sourceType":     item.SourceType,
			"transactionId":  item.TransactionID,
			"userId":         item.UserID,
			"userType":       item.UserType,
			"type":           item.Type,
			"businessType":   item.BusinessType,
			"businessId":     item.BusinessID,
			"amount":         item.Amount,
			"balanceBefore":  item.BalanceBefore,
			"balanceAfter":   item.BalanceAfter,
			"paymentMethod":  item.PaymentMethod,
			"paymentChannel": item.PaymentChannel,
			"status":         item.Status,
			"description":    item.Description,
			"remark":         item.Remark,
			"operatorId":     item.OperatorID,
			"operatorName":   item.OperatorName,
			"createdAt":      item.CreatedAt,
			"completedAt":    item.CompletedAt,
		}
	}

	return map[string]interface{}{
		"items": items,
		"pagination": map[string]interface{}{
			"page":  query.Page,
			"limit": query.Limit,
			"total": total,
		},
	}, nil
}

func (s *FinancialService) DeleteTransactionLog(ctx context.Context, sourceType string, id uint, reason string) (bool, error) {
	if id == 0 {
		return false, fmt.Errorf("%w: id is required", ErrInvalidArgument)
	}

	actor := resolveFinancialAuditActor(ctx)
	reason = normalizeFinancialAuditReason(reason, "管理员手动删除单条财务日志")

	switch strings.TrimSpace(sourceType) {
	case "", "wallet_transaction":
		err := s.walletRepo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			var record repository.WalletTransaction
			if err := tx.Where("id = ?", id).First(&record).Error; err != nil {
				return err
			}
			if err := createFinancialLogAudit(tx, buildFinancialLogAuditRecord("delete", "wallet_transaction", record.ID, record.UID, record, actor, "", reason)); err != nil {
				return err
			}
			return tx.Where("id = ?", id).Delete(&repository.WalletTransaction{}).Error
		})
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return false, nil
			}
			return false, err
		}
		return true, nil
	case "admin_operation":
		err := s.walletRepo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			var record repository.AdminWalletOperation
			if err := tx.Where("id = ?", id).First(&record).Error; err != nil {
				return err
			}
			if err := createFinancialLogAudit(tx, buildFinancialLogAuditRecord("delete", "admin_operation", record.ID, record.UID, record, actor, "", reason)); err != nil {
				return err
			}
			return tx.Where("id = ?", id).Delete(&repository.AdminWalletOperation{}).Error
		})
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return false, nil
			}
			return false, err
		}
		return true, nil
	default:
		return false, fmt.Errorf("%w: unsupported sourceType", ErrInvalidArgument)
	}
}

func (s *FinancialService) ClearTransactionLogs(ctx context.Context, reason string) (int64, error) {
	actor := resolveFinancialAuditActor(ctx)
	reason = normalizeFinancialAuditReason(reason, "管理员批量清空财务日志")
	batchID := strconv.FormatInt(time.Now().UnixNano(), 10)

	var cleared int64
	err := s.walletRepo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		walletCleared, err := archiveAndDeleteWalletTransactions(tx, actor, batchID, reason)
		if err != nil {
			return err
		}
		operationCleared, err := archiveAndDeleteAdminWalletOperations(tx, actor, batchID, reason)
		if err != nil {
			return err
		}
		cleared = walletCleared + operationCleared
		return nil
	})
	if err != nil {
		return 0, err
	}

	return cleared, nil
}

func resolveFinancialAuditActor(ctx context.Context) financialAuditActor {
	role := authContextRole(ctx)
	actor := financialAuditActor{
		Role: role,
		ID:   "",
		Name: "",
	}

	switch role {
	case "admin":
		actor.ID = authContextString(ctx, "admin_id")
		actor.Name = authContextString(ctx, "admin_name")
	case "merchant":
		actor.ID = authContextString(ctx, "merchant_id")
		actor.Name = authContextString(ctx, "merchant_phone")
	case "rider":
		actor.ID = authContextString(ctx, "rider_id")
		actor.Name = authContextString(ctx, "rider_phone")
	case "user":
		actor.ID = authContextString(ctx, "user_id")
		actor.Name = authContextString(ctx, "user_phone")
	default:
		actor.Role = "system"
	}

	if strings.TrimSpace(actor.ID) == "" {
		actor.ID = "unknown"
	}
	if strings.TrimSpace(actor.Name) == "" {
		actor.Name = actor.ID
	}

	return actor
}

func normalizeFinancialAuditReason(raw, fallback string) string {
	reason := strings.TrimSpace(raw)
	if reason != "" {
		return reason
	}
	return fallback
}

func buildFinancialLogAuditRecord(action, sourceType string, recordID uint, recordUID string, snapshot interface{}, actor financialAuditActor, batchID, reason string) repository.FinancialLogAudit {
	return repository.FinancialLogAudit{
		Action:          strings.TrimSpace(action),
		SourceType:      strings.TrimSpace(sourceType),
		SourceRecordID:  recordID,
		SourceRecordUID: strings.TrimSpace(recordUID),
		BatchID:         strings.TrimSpace(batchID),
		OperatorRole:    strings.TrimSpace(actor.Role),
		OperatorID:      strings.TrimSpace(actor.ID),
		OperatorName:    strings.TrimSpace(actor.Name),
		Reason:          normalizeFinancialAuditReason(reason, "未提供操作原因"),
		Snapshot:        marshalFinancialAuditSnapshot(snapshot),
	}
}

func marshalFinancialAuditSnapshot(snapshot interface{}) string {
	if snapshot == nil {
		return "{}"
	}
	data, err := json.Marshal(snapshot)
	if err != nil {
		return fmt.Sprintf(`{"marshal_error":%q}`, err.Error())
	}
	return string(data)
}

func createFinancialLogAudit(tx *gorm.DB, record repository.FinancialLogAudit) error {
	return tx.Create(&record).Error
}

func archiveAndDeleteWalletTransactions(tx *gorm.DB, actor financialAuditActor, batchID, reason string) (int64, error) {
	var cleared int64

	for {
		var rows []repository.WalletTransaction
		if err := tx.Order("id ASC").Limit(200).Find(&rows).Error; err != nil {
			return 0, err
		}
		if len(rows) == 0 {
			return cleared, nil
		}

		audits := make([]repository.FinancialLogAudit, 0, len(rows))
		ids := make([]uint, 0, len(rows))
		for _, row := range rows {
			audits = append(audits, buildFinancialLogAuditRecord("clear", "wallet_transaction", row.ID, row.UID, row, actor, batchID, reason))
			ids = append(ids, row.ID)
		}

		if err := tx.Create(&audits).Error; err != nil {
			return 0, err
		}
		if err := tx.Where("id IN ?", ids).Delete(&repository.WalletTransaction{}).Error; err != nil {
			return 0, err
		}
		cleared += int64(len(ids))
	}
}

func archiveAndDeleteAdminWalletOperations(tx *gorm.DB, actor financialAuditActor, batchID, reason string) (int64, error) {
	var cleared int64

	for {
		var rows []repository.AdminWalletOperation
		if err := tx.Order("id ASC").Limit(200).Find(&rows).Error; err != nil {
			return 0, err
		}
		if len(rows) == 0 {
			return cleared, nil
		}

		audits := make([]repository.FinancialLogAudit, 0, len(rows))
		ids := make([]uint, 0, len(rows))
		for _, row := range rows {
			audits = append(audits, buildFinancialLogAuditRecord("clear", "admin_operation", row.ID, row.UID, row, actor, batchID, reason))
			ids = append(ids, row.ID)
		}

		if err := tx.Create(&audits).Error; err != nil {
			return 0, err
		}
		if err := tx.Where("id IN ?", ids).Delete(&repository.AdminWalletOperation{}).Error; err != nil {
			return 0, err
		}
		cleared += int64(len(ids))
	}
}

type financialTransactionLogItem struct {
	ID             uint
	UID            string
	SourceType     string
	TransactionID  string
	UserID         string
	UserType       string
	Type           string
	BusinessType   string
	BusinessID     string
	Amount         int64
	BalanceBefore  int64
	BalanceAfter   int64
	PaymentMethod  string
	PaymentChannel string
	Status         string
	Description    string
	Remark         string
	OperatorID     string
	OperatorName   string
	CreatedAt      time.Time
	CompletedAt    *time.Time
}

func mapOperationTypeFilter(logType string) (string, bool) {
	switch strings.TrimSpace(logType) {
	case "":
		return "", true
	case "admin_add_balance":
		return "add_balance", true
	case "admin_deduct_balance":
		return "deduct_balance", true
	default:
		return "", false
	}
}

func mapAdminOperationToLogType(operationType string) string {
	switch strings.TrimSpace(operationType) {
	case "add_balance":
		return "admin_add_balance"
	case "deduct_balance":
		return "admin_deduct_balance"
	default:
		return strings.TrimSpace(operationType)
	}
}

func parseTransactionLogsDateBoundary(raw string, isEnd bool) (time.Time, error) {
	text := strings.TrimSpace(raw)
	if text == "" {
		return time.Time{}, fmt.Errorf("empty date")
	}

	layouts := []struct {
		layout   string
		dateOnly bool
	}{
		{time.RFC3339, false},
		{"2006-01-02 15:04:05", false},
		{"2006-01-02 15:04", false},
		{"2006/01/02 15:04:05", false},
		{"2006/01/02 15:04", false},
		{"2006-01-02", true},
		{"2006/01/02", true},
	}

	for _, item := range layouts {
		value, err := time.ParseInLocation(item.layout, text, time.Local)
		if err != nil {
			continue
		}
		if item.dateOnly {
			value = dayStart(value)
			if isEnd {
				value = value.AddDate(0, 0, 1)
			}
		}
		return value, nil
	}

	return time.Time{}, fmt.Errorf("invalid date format")
}
