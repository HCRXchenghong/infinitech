package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

func authContextRole(ctx context.Context) string {
	return strings.ToLower(strings.TrimSpace(authContextString(ctx, "operator_role")))
}

func authContextString(ctx context.Context, key string) string {
	if ctx == nil || strings.TrimSpace(key) == "" {
		return ""
	}
	raw := ctx.Value(key)
	if raw == nil {
		return ""
	}
	switch v := raw.(type) {
	case string:
		return strings.TrimSpace(v)
	case fmt.Stringer:
		return strings.TrimSpace(v.String())
	case int:
		return strconv.Itoa(v)
	case int32:
		return strconv.FormatInt(int64(v), 10)
	case int64:
		return strconv.FormatInt(v, 10)
	case uint:
		return strconv.FormatUint(uint64(v), 10)
	case uint32:
		return strconv.FormatUint(uint64(v), 10)
	case uint64:
		return strconv.FormatUint(v, 10)
	case float64:
		return strconv.FormatInt(int64(v), 10)
	case float32:
		return strconv.FormatInt(int64(v), 10)
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
}

func authContextInt64(ctx context.Context, key string) int64 {
	value := authContextString(ctx, key)
	if value == "" {
		return 0
	}
	result, err := strconv.ParseInt(value, 10, 64)
	if err != nil || result <= 0 {
		return 0
	}
	return result
}
