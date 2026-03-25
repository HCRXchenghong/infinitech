package repository

import "time"

// UnifiedIdentity is embedded in business entities to expose unified IDs.
//
// UID format: 250724 + R + M + 6-digit sequence (14 chars)
// TSID format: 250724 + R + M + yymmddHHMM + 6-digit sequence (24 chars)
type UnifiedIdentity struct {
	UID  string `gorm:"column:uid;size:14;index;uniqueIndex" json:"id,omitempty"`
	TSID string `gorm:"column:tsid;size:24;index;uniqueIndex" json:"tsid,omitempty"`
}

// IDCodebook stores bucket code definitions.
type IDCodebook struct {
	ID         uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	BucketCode string    `gorm:"size:2;uniqueIndex;not null" json:"bucket_code"`
	Domain     string    `gorm:"size:100;not null" json:"domain"`
	Status     string    `gorm:"size:20;not null;default:'active'" json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (IDCodebook) TableName() string {
	return "id_codebook"
}

// IDSequence stores sequence states by bucket code.
type IDSequence struct {
	ID            uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	BucketCode    string    `gorm:"size:2;uniqueIndex;not null" json:"bucket_code"`
	CurrentSeq    int64     `gorm:"default:0;not null" json:"current_seq"`
	WarnThreshold int64     `gorm:"default:950000;not null" json:"warn_threshold"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (IDSequence) TableName() string {
	return "id_sequences"
}

// IDLegacyMapping keeps old/new ID mapping during migration window.
type IDLegacyMapping struct {
	ID          uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	Domain      string    `gorm:"size:100;index;not null;uniqueIndex:uk_legacy_domain,priority:1" json:"domain"`
	LegacyValue string    `gorm:"size:100;index;not null;uniqueIndex:uk_legacy_domain,priority:2" json:"legacy_value"`
	UID         string    `gorm:"column:uid;size:14;index;not null;uniqueIndex" json:"uid"`
	TSID        string    `gorm:"column:tsid;size:24;index;uniqueIndex" json:"tsid"`
	CreatedAt   time.Time `json:"created_at"`
}

func (IDLegacyMapping) TableName() string {
	return "id_legacy_mappings"
}

// IDMigrationAnomaly records rows that cannot be deterministically backfilled.
type IDMigrationAnomaly struct {
	ID          uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	Domain      string    `gorm:"size:100;index;not null" json:"domain"`
	TableRef    string    `gorm:"column:table_name;size:100;index;not null" json:"table_name"`
	ColumnName  string    `gorm:"size:100;index;not null" json:"column_name"`
	LegacyValue string    `gorm:"size:255;index" json:"legacy_value"`
	Reason      string    `gorm:"type:text;not null" json:"reason"`
	CreatedAt   time.Time `json:"created_at"`
}

func (IDMigrationAnomaly) TableName() string {
	return "id_migration_anomalies"
}
