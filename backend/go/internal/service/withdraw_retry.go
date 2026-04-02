package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
)

const defaultWithdrawAutoRetryMaxCount = 3

var defaultWithdrawAutoRetryBackoffs = []time.Duration{
	5 * time.Minute,
	15 * time.Minute,
	30 * time.Minute,
}

type withdrawRetryState struct {
	Eligible          bool
	RetryCount        int
	MaxRetryCount     int
	NextRetryAt       *time.Time
	LastRetryAt       *time.Time
	LastFailureAt     *time.Time
	LastFailureReason string
	Exhausted         bool
	LastRetryMode     string
}

func withdrawSupportsAutoRetry(method string) bool {
	switch normalizeChannel(method) {
	case "wechat", "alipay":
		return true
	default:
		return false
	}
}

func nextWithdrawRetryDelay(retryCount, maxRetryCount int) (time.Duration, bool) {
	if maxRetryCount <= 0 {
		maxRetryCount = defaultWithdrawAutoRetryMaxCount
	}
	if retryCount >= maxRetryCount {
		return 0, false
	}
	index := retryCount
	if index < 0 {
		index = 0
	}
	if index >= len(defaultWithdrawAutoRetryBackoffs) {
		index = len(defaultWithdrawAutoRetryBackoffs) - 1
	}
	if index < 0 {
		return 0, false
	}
	return defaultWithdrawAutoRetryBackoffs[index], true
}

func parseWithdrawRetryState(transaction *repository.WalletTransaction, method string) withdrawRetryState {
	state := withdrawRetryState{
		Eligible:      withdrawSupportsAutoRetry(method),
		MaxRetryCount: defaultWithdrawAutoRetryMaxCount,
	}
	payload := walletTransactionResponseMap(transaction)
	if len(payload) == 0 {
		return state
	}
	if value, ok := payload["autoRetryEligible"]; ok {
		state.Eligible = withdrawSupportsAutoRetry(method) && toBool(value)
	}
	if value, ok := payload["retryCount"]; ok {
		state.RetryCount = toInt(value)
	}
	if value, ok := payload["maxRetryCount"]; ok {
		if parsed := toInt(value); parsed > 0 {
			state.MaxRetryCount = parsed
		}
	}
	state.NextRetryAt = parseWalletRFC3339Time(payload["nextRetryAt"])
	state.LastRetryAt = parseWalletRFC3339Time(payload["lastRetryAt"])
	state.LastFailureAt = parseWalletRFC3339Time(payload["lastFailureAt"])
	if value, ok := payload["lastFailureReason"]; ok {
		state.LastFailureReason = strings.TrimSpace(fmt.Sprint(value))
	}
	if value, ok := payload["retryExhausted"]; ok {
		state.Exhausted = toBool(value)
	}
	if value, ok := payload["lastRetryMode"]; ok {
		state.LastRetryMode = strings.TrimSpace(fmt.Sprint(value))
	}
	if state.MaxRetryCount <= 0 {
		state.MaxRetryCount = defaultWithdrawAutoRetryMaxCount
	}
	return state
}

func walletTransactionResponseMap(transaction *repository.WalletTransaction) map[string]interface{} {
	if transaction == nil {
		return map[string]interface{}{}
	}
	payload, ok := parseWalletResponsePayload(transaction.ResponseData).(map[string]interface{})
	if !ok || len(payload) == 0 {
		return map[string]interface{}{}
	}
	result := make(map[string]interface{}, len(payload))
	for key, value := range payload {
		result[key] = value
	}
	return result
}

func mergeWalletResponseData(base map[string]interface{}, overlays ...map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{}, len(base))
	for key, value := range base {
		result[key] = value
	}
	for _, overlay := range overlays {
		for key, value := range overlay {
			result[key] = value
		}
	}
	return result
}

func applyWithdrawRetryState(payload map[string]interface{}, state withdrawRetryState) map[string]interface{} {
	if payload == nil {
		payload = map[string]interface{}{}
	}
	payload["autoRetryEligible"] = state.Eligible
	payload["retryCount"] = state.RetryCount
	payload["maxRetryCount"] = state.MaxRetryCount
	payload["retryExhausted"] = state.Exhausted
	payload["lastFailureReason"] = strings.TrimSpace(state.LastFailureReason)
	payload["lastRetryMode"] = strings.TrimSpace(state.LastRetryMode)
	if state.NextRetryAt != nil && !state.NextRetryAt.IsZero() {
		payload["nextRetryAt"] = state.NextRetryAt.Format(time.RFC3339)
	} else {
		payload["nextRetryAt"] = ""
	}
	if state.LastRetryAt != nil && !state.LastRetryAt.IsZero() {
		payload["lastRetryAt"] = state.LastRetryAt.Format(time.RFC3339)
	} else {
		payload["lastRetryAt"] = ""
	}
	if state.LastFailureAt != nil && !state.LastFailureAt.IsZero() {
		payload["lastFailureAt"] = state.LastFailureAt.Format(time.RFC3339)
	} else {
		payload["lastFailureAt"] = ""
	}
	return payload
}

func buildWithdrawRetrySubmittedPayload(
	transaction *repository.WalletTransaction,
	method string,
	base map[string]interface{},
	retriedAt time.Time,
	retryMode string,
) map[string]interface{} {
	payload := mergeWalletResponseData(walletTransactionResponseMap(transaction), base)
	if !withdrawSupportsAutoRetry(method) {
		return payload
	}
	state := parseWithdrawRetryState(transaction, method)
	state.Eligible = true
	state.Exhausted = false
	state.NextRetryAt = nil
	state.RetryCount++
	state.LastRetryAt = &retriedAt
	state.LastRetryMode = firstTrimmed(strings.TrimSpace(retryMode), "manual")
	return applyWithdrawRetryState(payload, state)
}

func buildWithdrawRetryFailurePayload(
	transaction *repository.WalletTransaction,
	method string,
	base map[string]interface{},
	failedAt time.Time,
	failureReason string,
) map[string]interface{} {
	payload := mergeWalletResponseData(walletTransactionResponseMap(transaction), base)
	if !withdrawSupportsAutoRetry(method) {
		return payload
	}
	state := parseWithdrawRetryState(transaction, method)
	state.Eligible = true
	state.LastFailureAt = &failedAt
	state.LastFailureReason = firstTrimmed(strings.TrimSpace(failureReason), state.LastFailureReason)
	if delay, ok := nextWithdrawRetryDelay(state.RetryCount, state.MaxRetryCount); ok {
		nextRetryAt := failedAt.Add(delay)
		state.NextRetryAt = &nextRetryAt
		state.Exhausted = false
	} else {
		state.NextRetryAt = nil
		state.Exhausted = true
	}
	return applyWithdrawRetryState(payload, state)
}

func buildWithdrawRetryExecutionPayload(
	transaction *repository.WalletTransaction,
	method string,
	base map[string]interface{},
) map[string]interface{} {
	payload := mergeWalletResponseData(walletTransactionResponseMap(transaction), base)
	if !withdrawSupportsAutoRetry(method) {
		return payload
	}
	state := parseWithdrawRetryState(transaction, method)
	state.Eligible = true
	state.NextRetryAt = nil
	state.Exhausted = false
	return applyWithdrawRetryState(payload, state)
}

func shouldAutoRetryWithdraw(record *repository.WithdrawRequest, transaction *repository.WalletTransaction, now time.Time) bool {
	if record == nil || transaction == nil {
		return false
	}
	if !strings.EqualFold(strings.TrimSpace(record.Status), "failed") {
		return false
	}
	if !withdrawSupportsAutoRetry(record.WithdrawMethod) {
		return false
	}
	state := parseWithdrawRetryState(transaction, record.WithdrawMethod)
	if !state.Eligible || state.Exhausted || state.NextRetryAt == nil {
		return false
	}
	return !state.NextRetryAt.After(now)
}

func parseWalletRFC3339Time(value interface{}) *time.Time {
	text := strings.TrimSpace(fmt.Sprint(value))
	if text == "" || strings.EqualFold(text, "<nil>") {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339, text)
	if err != nil {
		return nil
	}
	return &parsed
}

func withdrawAutoRetrySummary(transaction *repository.WalletTransaction, method string) map[string]interface{} {
	if transaction == nil || !withdrawSupportsAutoRetry(method) {
		return nil
	}
	state := parseWithdrawRetryState(transaction, method)
	payload := map[string]interface{}{
		"eligible":          state.Eligible,
		"retryCount":        state.RetryCount,
		"maxRetryCount":     state.MaxRetryCount,
		"retryExhausted":    state.Exhausted,
		"lastFailureReason": state.LastFailureReason,
		"lastRetryMode":     state.LastRetryMode,
	}
	if state.NextRetryAt != nil && !state.NextRetryAt.IsZero() {
		payload["nextRetryAt"] = state.NextRetryAt.Format(time.RFC3339)
	}
	if state.LastRetryAt != nil && !state.LastRetryAt.IsZero() {
		payload["lastRetryAt"] = state.LastRetryAt.Format(time.RFC3339)
	}
	if state.LastFailureAt != nil && !state.LastFailureAt.IsZero() {
		payload["lastFailureAt"] = state.LastFailureAt.Format(time.RFC3339)
	}
	return payload
}
