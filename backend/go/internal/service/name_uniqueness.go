package service

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

const duplicateNameResolutionHint = "请换个名称或在后面加编号"

type scopedNameUniquenessSpec struct {
	TableName     string
	ColumnName    string
	RawValue      string
	ExcludeID     uint
	Scope         map[string]interface{}
	ConflictLabel string
}

func ensureScopedNameUnique(ctx context.Context, db *gorm.DB, spec scopedNameUniquenessSpec) error {
	if db == nil {
		return fmt.Errorf("database unavailable")
	}

	normalizedValue := normalizeUniqueNameValue(spec.RawValue)
	if normalizedValue == "" {
		return nil
	}

	query := db.WithContext(ctx).
		Table(spec.TableName).
		Where(fmt.Sprintf("LOWER(TRIM(%s)) = ?", spec.ColumnName), normalizedValue)

	for key, value := range spec.Scope {
		query = query.Where(fmt.Sprintf("%s = ?", key), value)
	}

	if spec.ExcludeID > 0 {
		query = query.Where("id <> ?", spec.ExcludeID)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return nil
	}

	conflictLabel := strings.TrimSpace(spec.ConflictLabel)
	if conflictLabel == "" {
		conflictLabel = "名称"
	}
	return fmt.Errorf("%w: %s已存在，%s", ErrInvalidArgument, conflictLabel, duplicateNameResolutionHint)
}

func normalizeUniqueNameValue(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

func extractTrimmedStringUpdate(updates map[string]interface{}, keys ...string) (string, bool) {
	if len(updates) == 0 || len(keys) == 0 {
		return "", false
	}

	for _, key := range keys {
		raw, ok := updates[key]
		if !ok {
			continue
		}

		value := strings.TrimSpace(fmt.Sprintf("%v", raw))
		updates[key] = value
		return value, true
	}

	return "", false
}
