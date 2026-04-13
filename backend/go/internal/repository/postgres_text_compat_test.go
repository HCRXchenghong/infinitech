package repository

import (
	"reflect"
	"strings"
	"testing"
)

func TestCurrentPostgresStackAvoidsLongtextTags(t *testing.T) {
	models := []struct {
		name  string
		model interface{}
	}{
		{name: "FinancialLogAudit", model: FinancialLogAudit{}},
		{name: "PaymentCallback", model: PaymentCallback{}},
		{name: "IdempotencyRecord", model: IdempotencyRecord{}},
		{name: "ReconciliationTask", model: ReconciliationTask{}},
		{name: "SettlementRuleStep", model: SettlementRuleStep{}},
		{name: "OrderSettlementSnapshot", model: OrderSettlementSnapshot{}},
	}

	for _, item := range models {
		typ := reflect.TypeOf(item.model)
		for index := 0; index < typ.NumField(); index += 1 {
			field := typ.Field(index)
			tag := strings.ToLower(field.Tag.Get("gorm"))
			if strings.Contains(tag, "longtext") {
				t.Fatalf("%s.%s still uses unsupported postgres longtext tag: %s", item.name, field.Name, field.Tag.Get("gorm"))
			}
		}
	}
}
