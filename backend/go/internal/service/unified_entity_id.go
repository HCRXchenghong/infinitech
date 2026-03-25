package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/yuexiang/go-api/internal/idkit"
	"gorm.io/gorm"
)

// resolveEntityID converts external string ID (uid/tsid/legacy) into legacy uint PK.
func resolveEntityID(ctx context.Context, db *gorm.DB, tableName, rawID string) (uint, error) {
	if db == nil {
		return 0, fmt.Errorf("database unavailable")
	}
	idText := strings.TrimSpace(rawID)
	if idText == "" {
		return 0, fmt.Errorf("invalid id")
	}

	if parsed, err := strconv.ParseUint(idText, 10, 64); err == nil && parsed > 0 {
		return uint(parsed), nil
	}

	var lookup struct {
		ID uint `gorm:"column:id"`
	}
	query := db.WithContext(ctx).Table(tableName).Select("id").Limit(1)
	switch {
	case idkit.UIDPattern.MatchString(idText):
		query = query.Where("uid = ?", idText)
	case idkit.TSIDPattern.MatchString(idText):
		query = query.Where("tsid = ?", idText)
	default:
		return 0, fmt.Errorf("invalid id")
	}

	if err := query.Scan(&lookup).Error; err != nil {
		return 0, err
	}
	if lookup.ID == 0 {
		return 0, gorm.ErrRecordNotFound
	}
	return lookup.ID, nil
}

func resolveOptionalEntityID(ctx context.Context, db *gorm.DB, tableName, rawID string) (uint, error) {
	idText := strings.TrimSpace(rawID)
	if idText == "" {
		return 0, nil
	}
	return resolveEntityID(ctx, db, tableName, idText)
}
