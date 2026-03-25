package repository

import "time"

type HomePromotionCampaign struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ObjectType        string     `gorm:"size:20;index;not null" json:"objectType"`
	TargetLegacyID    uint       `gorm:"index;not null" json:"targetLegacyId"`
	TargetPublicID    string     `gorm:"size:64;index;not null" json:"targetPublicId"`
	SlotPosition      int        `gorm:"index;not null" json:"slotPosition"`
	City              string     `gorm:"size:64;index" json:"city"`
	BusinessCategory  string     `gorm:"size:64;index" json:"businessCategory"`
	Status            string     `gorm:"size:20;index;not null" json:"status"`
	IsPositionLocked  bool       `gorm:"default:false" json:"isPositionLocked"`
	PromoteLabel      string     `gorm:"size:32;default:'推广'" json:"promoteLabel"`
	ContractNo        string     `gorm:"size:120" json:"contractNo"`
	ServiceRecordNo   string     `gorm:"size:120" json:"serviceRecordNo"`
	Remark            string     `gorm:"type:text" json:"remark"`
	StartAt           time.Time  `gorm:"index;not null" json:"startAt"`
	EndAt             time.Time  `gorm:"index;not null" json:"endAt"`
	ApprovedAt        *time.Time `gorm:"type:datetime" json:"approvedAt"`
	ApprovedByAdminID *uint      `gorm:"index" json:"approvedByAdminId"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (HomePromotionCampaign) TableName() string {
	return "home_promotion_campaigns"
}
