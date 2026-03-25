package idkit

import (
	"context"
	"errors"
	"fmt"
	"log"
	"reflect"
	"sort"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/schema"
)

type idSequenceRow struct {
	ID            uint   `gorm:"primaryKey"`
	BucketCode    string `gorm:"size:2;uniqueIndex;not null"`
	CurrentSeq    int64  `gorm:"not null;default:0"`
	WarnThreshold int64  `gorm:"not null;default:950000"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (idSequenceRow) TableName() string {
	return "id_sequences"
}

type idCodebookRow struct {
	ID         uint   `gorm:"primaryKey"`
	BucketCode string `gorm:"size:2;uniqueIndex;not null"`
	Domain     string `gorm:"size:100;not null"`
	Status     string `gorm:"size:20;not null;default:'active'"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (idCodebookRow) TableName() string {
	return "id_codebook"
}

type idLegacyMappingRow struct {
	ID          uint   `gorm:"primaryKey"`
	Domain      string `gorm:"size:100;index;not null"`
	LegacyValue string `gorm:"size:100;index;not null"`
	UID         string `gorm:"size:14;index;not null"`
	TSID        string `gorm:"column:tsid;size:24;index;not null"`
	CreatedAt   time.Time
}

func (idLegacyMappingRow) TableName() string {
	return "id_legacy_mappings"
}

type idMigrationAnomalyRow struct {
	ID          uint   `gorm:"primaryKey"`
	Domain      string `gorm:"size:100;index;not null"`
	TableRef    string `gorm:"column:table_name;size:100;index;not null"`
	ColumnName  string `gorm:"size:100;index;not null"`
	LegacyValue string `gorm:"size:255;index"`
	Reason      string `gorm:"type:text;not null"`
	CreatedAt   time.Time
}

func (idMigrationAnomalyRow) TableName() string {
	return "id_migration_anomalies"
}

func locationShanghai() *time.Location {
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		return time.FixedZone("CST", 8*3600)
	}
	return loc
}

func nowShanghai() time.Time {
	return time.Now().In(locationShanghai())
}

var (
	defaultDBMu sync.RWMutex
	defaultDB   *gorm.DB
)

// SetDB sets the default DB used by NextUID(bucket).
func SetDB(db *gorm.DB) {
	defaultDBMu.Lock()
	defer defaultDBMu.Unlock()
	defaultDB = db
}

func getDefaultDB() *gorm.DB {
	defaultDBMu.RLock()
	defer defaultDBMu.RUnlock()
	return defaultDB
}

func formatUID(bucket string, seq int64) string {
	return fmt.Sprintf("%s%s%06d", Prefix, bucket, seq)
}

// BuildTSID builds a 24-char time-sensitive ID in Asia/Shanghai minute precision.
func BuildTSID(bucket string, seq int64, now time.Time) string {
	ts := now.In(locationShanghai()).Format("0601021504")
	return fmt.Sprintf("%s%s%s%06d", Prefix, bucket, ts, seq)
}

func isDuplicateError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate") || strings.Contains(msg, "unique constraint") || strings.Contains(msg, "already exists")
}

func normalizeIDString(value interface{}) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(v)
	case []byte:
		return strings.TrimSpace(string(v))
	default:
		return strings.TrimSpace(fmt.Sprint(v))
	}
}

func legacyMappingTSIDColumn(db *gorm.DB) string {
	if db == nil {
		return "tsid"
	}
	m := db.Migrator()
	if m.HasColumn("id_legacy_mappings", "tsid") {
		return "tsid"
	}
	if m.HasColumn("id_legacy_mappings", "ts_id") {
		return "ts_id"
	}
	return "tsid"
}

func nextUIDTx(tx *gorm.DB, bucket string) (string, int64, error) {
	if strings.TrimSpace(bucket) == "" {
		bucket = DefaultBucket
	}

	for i := 0; i < 8; i++ {
		var row idSequenceRow
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("bucket_code = ?", bucket).
			First(&row).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				createErr := tx.Create(&idSequenceRow{
					BucketCode:    bucket,
					CurrentSeq:    0,
					WarnThreshold: 950000,
				}).Error
				if createErr != nil && !isDuplicateError(createErr) {
					return "", 0, createErr
				}
				continue
			}
			return "", 0, err
		}

		next := row.CurrentSeq + 1
		if next > MaxSequence {
			if bucket != DefaultBucket {
				return nextUIDTx(tx, DefaultBucket)
			}
			return "", 0, fmt.Errorf("bucket %s sequence overflow (%d)", bucket, MaxSequence)
		}
		if row.WarnThreshold > 0 && next >= row.WarnThreshold {
			log.Printf("⚠️ unified-id sequence near overflow: bucket=%s seq=%d threshold=%d", bucket, next, row.WarnThreshold)
		}

		res := tx.Model(&idSequenceRow{}).
			Where("bucket_code = ? AND current_seq = ?", bucket, row.CurrentSeq).
			Updates(map[string]interface{}{
				"current_seq": next,
				"updated_at":  nowShanghai(),
			})
		if res.Error != nil {
			return "", 0, res.Error
		}
		if res.RowsAffected == 0 {
			continue
		}
		return formatUID(bucket, next), next, nil
	}

	return "", 0, fmt.Errorf("allocate uid failed for bucket=%s after retries", bucket)
}

// NextUID allocates a unified 14-digit uid using the default DB set by Bootstrap/SetDB.
func NextUID(bucketCode string) (string, int64, error) {
	db := getDefaultDB()
	if db == nil {
		return "", 0, fmt.Errorf("idkit default db is nil")
	}
	return NextUIDWithDB(context.Background(), db, bucketCode)
}

// NextUIDWithDB allocates a unified 14-digit uid with the given DB handle.
func NextUIDWithDB(ctx context.Context, db *gorm.DB, bucketCode string) (string, int64, error) {
	if db == nil {
		return "", 0, fmt.Errorf("nil db")
	}

	bucket := strings.TrimSpace(bucketCode)
	if bucket == "" {
		bucket = DefaultBucket
	}

	var (
		uid string
		seq int64
	)
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var txErr error
		uid, seq, txErr = nextUIDTx(tx, bucket)
		return txErr
	})
	if err != nil {
		return "", 0, err
	}
	return uid, seq, nil
}

// NextIdentityForTable allocates uid/tsid pair for a business table.
func NextIdentityForTable(ctx context.Context, db *gorm.DB, table string, now time.Time) (string, string, error) {
	bucket := BucketForTable(table)
	uid, seq, err := NextUIDWithDB(ctx, db, bucket)
	if err != nil {
		return "", "", err
	}
	if now.IsZero() {
		now = time.Now()
	}
	return uid, BuildTSID(bucket, seq, now), nil
}

func foreachModelValue(rv reflect.Value, fn func(reflect.Value) error) error {
	if !rv.IsValid() {
		return nil
	}
	if rv.Kind() == reflect.Interface {
		if rv.IsNil() {
			return nil
		}
		return foreachModelValue(rv.Elem(), fn)
	}
	if rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return nil
		}
		return foreachModelValue(rv.Elem(), fn)
	}

	switch rv.Kind() {
	case reflect.Struct:
		return fn(rv)
	case reflect.Slice, reflect.Array:
		for i := 0; i < rv.Len(); i++ {
			if err := foreachModelValue(rv.Index(i), fn); err != nil {
				return err
			}
		}
	}
	return nil
}

func shouldSkipCallbackTable(table string) bool {
	switch strings.TrimSpace(strings.ToLower(table)) {
	case "", "id_codebook", "id_sequences", "id_legacy_mappings", "id_migration_anomalies":
		return true
	default:
		return false
	}
}

func shouldProcessCallback(tx *gorm.DB) bool {
	if tx == nil || tx.Statement == nil || tx.Statement.Schema == nil {
		return false
	}
	table := tx.Statement.Schema.Table
	if shouldSkipCallbackTable(table) {
		return false
	}
	return true
}

func isSchemaCompatibleValue(s *schema.Schema, rv reflect.Value) bool {
	if s == nil || !rv.IsValid() {
		return false
	}
	modelType := s.ModelType
	if modelType == nil {
		return false
	}
	rvType := rv.Type()
	if rvType == modelType {
		return true
	}
	if modelType.Kind() == reflect.Ptr && rvType == modelType.Elem() {
		return true
	}
	if rv.CanAddr() && rv.Addr().Type() == modelType {
		return true
	}
	return false
}

func assignUnifiedIDForValue(tx *gorm.DB, s *schema.Schema, rv reflect.Value) error {
	if !rv.IsValid() || rv.Kind() != reflect.Struct {
		return nil
	}
	if shouldSkipCallbackTable(s.Table) {
		return nil
	}
	if !isSchemaCompatibleValue(s, rv) {
		return nil
	}
	uidField := s.LookUpField("UID")
	tsidField := s.LookUpField("TSID")
	if uidField == nil || tsidField == nil {
		return nil
	}

	uidValue, _ := uidField.ValueOf(tx.Statement.Context, rv)
	tsidValue, _ := tsidField.ValueOf(tx.Statement.Context, rv)
	uidText := normalizeIDString(uidValue)
	tsidText := normalizeIDString(tsidValue)
	if uidText != "" && tsidText != "" {
		return nil
	}

	bucket := BucketForTable(s.Table)
	idTx := tx.Session(&gorm.Session{NewDB: true, SkipHooks: true})
	uid, seq, err := nextUIDTx(idTx, bucket)
	if err != nil {
		return err
	}
	tsid := BuildTSID(bucket, seq, nowShanghai())

	if uidText == "" {
		if err := uidField.Set(tx.Statement.Context, rv, uid); err != nil {
			return err
		}
	}
	if tsidText == "" {
		if err := tsidField.Set(tx.Statement.Context, rv, tsid); err != nil {
			return err
		}
	}
	return nil
}

func recordLegacyMappingForValue(tx *gorm.DB, s *schema.Schema, rv reflect.Value) error {
	if !rv.IsValid() || rv.Kind() != reflect.Struct {
		return nil
	}
	if shouldSkipCallbackTable(s.Table) {
		return nil
	}
	if !isSchemaCompatibleValue(s, rv) {
		return nil
	}
	uidField := s.LookUpField("UID")
	tsidField := s.LookUpField("TSID")
	if uidField == nil || tsidField == nil {
		return nil
	}

	pkField := s.PrioritizedPrimaryField
	if pkField == nil {
		return nil
	}

	uidValue, _ := uidField.ValueOf(tx.Statement.Context, rv)
	tsidValue, _ := tsidField.ValueOf(tx.Statement.Context, rv)
	pkValue, _ := pkField.ValueOf(tx.Statement.Context, rv)
	uid := normalizeIDString(uidValue)
	tsid := normalizeIDString(tsidValue)
	legacy := normalizeIDString(pkValue)
	if uid == "" || tsid == "" || legacy == "" {
		return nil
	}

	entry := idLegacyMappingRow{
		Domain:      DomainForBucket(BucketForTable(s.Table)),
		LegacyValue: legacy,
		UID:         uid,
		TSID:        tsid,
		CreatedAt:   nowShanghai(),
	}
	mappingTx := tx.Session(&gorm.Session{NewDB: true, SkipHooks: true})
	tsidColumn := legacyMappingTSIDColumn(mappingTx)
	insertPayload := map[string]interface{}{
		"domain":       entry.Domain,
		"legacy_value": entry.LegacyValue,
		"uid":          entry.UID,
		tsidColumn:     entry.TSID,
		"created_at":   entry.CreatedAt,
	}
	return mappingTx.Table(entry.TableName()).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "domain"}, {Name: "legacy_value"}},
			DoUpdates: clause.Assignments(map[string]interface{}{"uid": entry.UID, tsidColumn: entry.TSID}),
		}).
		Create(insertPayload).Error
}

// SeedCodebook ensures bucket dictionary and sequence rows exist.
func SeedCodebook(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		buckets := make([]string, 0, len(BucketDomains))
		for bucket := range BucketDomains {
			buckets = append(buckets, bucket)
		}
		sort.Strings(buckets)

		for _, bucket := range buckets {
			domain := BucketDomains[bucket]
			if err := tx.Table("id_codebook").
				Clauses(clause.OnConflict{
					Columns:   []clause.Column{{Name: "bucket_code"}},
					DoUpdates: clause.Assignments(map[string]interface{}{"domain": domain, "status": "active", "updated_at": nowShanghai()}),
				}).
				Create(&idCodebookRow{
					BucketCode: bucket,
					Domain:     domain,
					Status:     "active",
					CreatedAt:  nowShanghai(),
					UpdatedAt:  nowShanghai(),
				}).Error; err != nil {
				return err
			}

			if err := tx.Table("id_sequences").
				Clauses(clause.OnConflict{DoNothing: true}).
				Create(&idSequenceRow{
					BucketCode:    bucket,
					CurrentSeq:    0,
					WarnThreshold: 950000,
					CreatedAt:     nowShanghai(),
					UpdatedAt:     nowShanghai(),
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// RegisterGormCallbacks registers create hooks that auto-fill uid/tsid and mapping.
func RegisterGormCallbacks(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("nil db")
	}

	const beforeName = "idkit:before_create_assign_unified_ids"
	if db.Callback().Create().Get(beforeName) == nil {
		if err := db.Callback().Create().Before("gorm:create").Register(beforeName, func(tx *gorm.DB) {
			if !shouldProcessCallback(tx) {
				return
			}
			if err := foreachModelValue(tx.Statement.ReflectValue, func(rv reflect.Value) error {
				return assignUnifiedIDForValue(tx, tx.Statement.Schema, rv)
			}); err != nil {
				_ = tx.AddError(err)
			}
		}); err != nil {
			return err
		}
	}

	const afterName = "idkit:after_create_upsert_legacy_mapping"
	if db.Callback().Create().Get(afterName) == nil {
		if err := db.Callback().Create().After("gorm:create").Register(afterName, func(tx *gorm.DB) {
			if !shouldProcessCallback(tx) {
				return
			}
			if err := foreachModelValue(tx.Statement.ReflectValue, func(rv reflect.Value) error {
				return recordLegacyMappingForValue(tx, tx.Statement.Schema, rv)
			}); err != nil {
				_ = tx.AddError(err)
			}
		}); err != nil {
			return err
		}
	}

	return nil
}

// Bootstrap runs dictionary seeding and callback registration.
func Bootstrap(db *gorm.DB) error {
	SetDB(db)
	if err := SeedCodebook(db); err != nil {
		return err
	}
	return RegisterGormCallbacks(db)
}

// ResolveLegacyByUID resolves a unified uid back to legacy primary key string.
func ResolveLegacyByUID(ctx context.Context, db *gorm.DB, uid string) (domain string, legacy string, ok bool, err error) {
	value := strings.TrimSpace(uid)
	if !UIDPattern.MatchString(value) {
		return "", "", false, nil
	}

	var row idLegacyMappingRow
	if err = db.WithContext(ctx).Table("id_legacy_mappings").Where("uid = ?", value).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", "", false, nil
		}
		return "", "", false, err
	}
	return row.Domain, row.LegacyValue, true, nil
}

// ResolveLegacyByTSID resolves a tsid back to legacy primary key string.
func ResolveLegacyByTSID(ctx context.Context, db *gorm.DB, tsid string) (domain string, legacy string, ok bool, err error) {
	value := strings.TrimSpace(tsid)
	if !TSIDPattern.MatchString(value) {
		return "", "", false, nil
	}

	var row idLegacyMappingRow
	tsidColumn := legacyMappingTSIDColumn(db)
	if err = db.WithContext(ctx).Table("id_legacy_mappings").Where(fmt.Sprintf("%s = ?", tsidColumn), value).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", "", false, nil
		}
		return "", "", false, err
	}
	return row.Domain, row.LegacyValue, true, nil
}
