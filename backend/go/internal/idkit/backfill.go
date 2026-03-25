package idkit

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func parseDBTime(raw interface{}) (time.Time, bool) {
	switch v := raw.(type) {
	case nil:
		return time.Time{}, false
	case time.Time:
		return v.In(locationShanghai()), true
	case *time.Time:
		if v == nil {
			return time.Time{}, false
		}
		return v.In(locationShanghai()), true
	case string:
		text := strings.TrimSpace(v)
		if text == "" {
			return time.Time{}, false
		}
		layouts := []string{
			time.RFC3339Nano,
			time.RFC3339,
			"2006-01-02 15:04:05",
			"2006-01-02 15:04:05.999999999",
			"2006-01-02T15:04:05.999999999Z07:00",
			"2006-01-02T15:04:05Z07:00",
		}
		for _, layout := range layouts {
			if parsed, err := time.Parse(layout, text); err == nil {
				return parsed.In(locationShanghai()), true
			}
			if parsed, err := time.ParseInLocation(layout, text, locationShanghai()); err == nil {
				return parsed.In(locationShanghai()), true
			}
		}
	case []byte:
		return parseDBTime(string(v))
	}
	return time.Time{}, false
}

func writeAnomaly(db *gorm.DB, domain, tableName, columnName, legacyValue, reason string) error {
	entry := idMigrationAnomalyRow{
		Domain:      domain,
		TableRef:    tableName,
		ColumnName:  columnName,
		LegacyValue: legacyValue,
		Reason:      reason,
		CreatedAt:   nowShanghai(),
	}
	return db.Table(entry.TableName()).Create(&entry).Error
}

func choosePrimaryColumn(db *gorm.DB, tableName string) string {
	if db.Migrator().HasColumn(tableName, "id") {
		return "id"
	}
	if db.Migrator().HasColumn(tableName, "key") {
		return "key"
	}
	return ""
}

func chooseBackfillTime(row map[string]interface{}, hasCreatedAt, hasUpdatedAt bool) (time.Time, bool) {
	if hasCreatedAt {
		if t, ok := parseDBTime(row["created_at"]); ok {
			return t, true
		}
	}
	if hasUpdatedAt {
		if t, ok := parseDBTime(row["updated_at"]); ok {
			return t, true
		}
	}
	// Legacy rows may not have either timestamp; fallback to now to avoid
	// repeatedly scanning the same rows forever during backfill.
	return nowShanghai(), true
}

// BackfillMissing scans all mapped business tables and fills missing uid/tsid.
func BackfillMissing(db *gorm.DB, batchSize int) (map[string]int64, error) {
	if batchSize <= 0 {
		batchSize = 200
	}

	tables := make([]string, 0, len(TableBuckets))
	for table := range TableBuckets {
		tables = append(tables, table)
	}
	sort.Strings(tables)

	result := make(map[string]int64, len(tables))

	for _, table := range tables {
		if !db.Migrator().HasTable(table) {
			continue
		}
		if !db.Migrator().HasColumn(table, "uid") || !db.Migrator().HasColumn(table, "tsid") {
			continue
		}

		pkColumn := choosePrimaryColumn(db, table)
		domain := DomainForBucket(BucketForTable(table))
		if pkColumn == "" {
			if err := writeAnomaly(db, domain, table, "", "", "no supported primary column (id/key)"); err != nil {
				return result, err
			}
			continue
		}

		hasCreatedAt := db.Migrator().HasColumn(table, "created_at")
		hasUpdatedAt := db.Migrator().HasColumn(table, "updated_at")

		for {
			cols := []string{pkColumn, "uid", "tsid"}
			orderBy := fmt.Sprintf("%s ASC", pkColumn)
			if hasCreatedAt {
				cols = append(cols, "created_at")
				orderBy = fmt.Sprintf("created_at ASC, %s ASC", pkColumn)
			} else if hasUpdatedAt {
				cols = append(cols, "updated_at")
				orderBy = fmt.Sprintf("updated_at ASC, %s ASC", pkColumn)
			}

			rows := make([]map[string]interface{}, 0, batchSize)
			if err := db.Table(table).
				Select(strings.Join(cols, ",")).
				Where("COALESCE(uid, '') = '' OR COALESCE(tsid, '') = ''").
				Order(orderBy).
				Limit(batchSize).
				Find(&rows).Error; err != nil {
				return result, err
			}
			if len(rows) == 0 {
				break
			}

			for _, row := range rows {
				legacyValue := normalizeIDString(row[pkColumn])
				if legacyValue == "" {
					if err := writeAnomaly(db, domain, table, pkColumn, "", "empty primary key value"); err != nil {
						return result, err
					}
					continue
				}

				createdAt, ok := chooseBackfillTime(row, hasCreatedAt, hasUpdatedAt)
				if !ok {
					if err := writeAnomaly(db, domain, table, "created_at", legacyValue, "missing both created_at and updated_at values"); err != nil {
						return result, err
					}
					continue
				}
				createdAt = createdAt.In(locationShanghai())

				existingUID := normalizeIDString(row["uid"])
				existingTSID := normalizeIDString(row["tsid"])

				if err := db.Transaction(func(tx *gorm.DB) error {
					finalUID := existingUID
					finalTSID := existingTSID
					if finalUID == "" || finalTSID == "" {
						uid, seq, err := nextUIDTx(tx, BucketForTable(table))
						if err != nil {
							return err
						}
						tsid := BuildTSID(BucketForTable(table), seq, createdAt)
						if finalUID == "" {
							finalUID = uid
						}
						if finalTSID == "" {
							finalTSID = tsid
						}
					}

					updates := map[string]interface{}{}
					if existingUID == "" {
						updates["uid"] = finalUID
					}
					if existingTSID == "" {
						updates["tsid"] = finalTSID
					}
					if len(updates) > 0 {
						if err := tx.Table(table).Where(fmt.Sprintf("%s = ?", pkColumn), row[pkColumn]).Updates(updates).Error; err != nil {
							return err
						}
					}

					tsidColumn := legacyMappingTSIDColumn(tx)
					insertPayload := map[string]interface{}{
						"domain":       domain,
						"legacy_value": legacyValue,
						"uid":          finalUID,
						tsidColumn:     finalTSID,
						"created_at":   nowShanghai(),
					}
					return tx.Table("id_legacy_mappings").Clauses(clause.OnConflict{
						Columns:   []clause.Column{{Name: "domain"}, {Name: "legacy_value"}},
						DoUpdates: clause.Assignments(map[string]interface{}{"uid": finalUID, tsidColumn: finalTSID}),
					}).Create(insertPayload).Error
				}); err != nil {
					return result, err
				}

				result[table]++
			}
		}
	}

	return result, nil
}
