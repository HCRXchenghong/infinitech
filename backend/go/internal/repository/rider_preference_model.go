package repository

import "time"

type RiderPreference struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	RiderID           uint      `gorm:"not null;uniqueIndex" json:"rider_id"`
	MaxDistanceKM     float64   `gorm:"type:decimal(6,2);default:3" json:"max_distance_km"`
	AutoAcceptEnabled bool      `gorm:"default:false" json:"auto_accept_enabled"`
	PreferRoute       bool      `gorm:"default:true" json:"prefer_route"`
	PreferHighPrice   bool      `gorm:"default:true" json:"prefer_high_price"`
	PreferNearby      bool      `gorm:"default:false" json:"prefer_nearby"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (RiderPreference) TableName() string {
	return "rider_preferences"
}
