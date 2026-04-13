package repository

import "time"

type DiningBuddyParty struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Category     string                   `gorm:"size:20;index;not null" json:"category"`
	Title        string                   `gorm:"size:120;not null" json:"title"`
	Location     string                   `gorm:"size:255;not null" json:"location"`
	ActivityTime string                   `gorm:"size:80" json:"activityTime"`
	Description  string                   `gorm:"size:255" json:"description"`
	MaxPeople    int                      `gorm:"not null;default:4" json:"maxPeople"`
	Status       string                   `gorm:"size:20;index;not null;default:'open'" json:"status"`
	HostUserID   uint                     `gorm:"index;not null" json:"-"`
	HostUserUID  string                   `gorm:"size:18;index" json:"hostUserId,omitempty"`
	HostName     string                   `gorm:"size:50" json:"host"`
	HostAvatar   string                   `gorm:"size:255" json:"hostAvatar,omitempty"`
	CreatedAt    time.Time                `json:"created_at"`
	UpdatedAt    time.Time                `json:"updated_at"`
	Members      []DiningBuddyPartyMember `gorm:"foreignKey:PartyID" json:"-"`
}

func (DiningBuddyParty) TableName() string {
	return "dining_buddy_parties"
}

type DiningBuddyPartyMember struct {
	ID         uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	PartyID    uint      `gorm:"index;not null;uniqueIndex:uk_dining_buddy_party_user,priority:1" json:"partyId"`
	UserID     uint      `gorm:"index;not null;uniqueIndex:uk_dining_buddy_party_user,priority:2" json:"-"`
	UserUID    string    `gorm:"size:18;index" json:"userId,omitempty"`
	UserName   string    `gorm:"size:50" json:"userName"`
	UserAvatar string    `gorm:"size:255" json:"userAvatar,omitempty"`
	IsHost     bool      `gorm:"default:false" json:"isHost"`
	JoinedAt   time.Time `json:"joinedAt"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (DiningBuddyPartyMember) TableName() string {
	return "dining_buddy_party_members"
}

type DiningBuddyMessage struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	PartyID       uint      `gorm:"index;not null" json:"partyId"`
	SenderType    string    `gorm:"size:20;index;not null;default:'user'" json:"senderType"`
	SenderUserID  uint      `gorm:"index" json:"-"`
	SenderUserUID string    `gorm:"size:18;index" json:"senderUserId,omitempty"`
	SenderName    string    `gorm:"size:50" json:"senderName"`
	SenderAvatar  string    `gorm:"size:255" json:"senderAvatar,omitempty"`
	MessageType   string    `gorm:"size:20;not null;default:'text'" json:"messageType"`
	Content       string    `gorm:"size:500;not null" json:"content"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (DiningBuddyMessage) TableName() string {
	return "dining_buddy_messages"
}
