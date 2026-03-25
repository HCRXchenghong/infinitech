package repository

import "time"

// SupportConversation stores metadata for admin support chats.
type SupportConversation struct {
	ID              uint       `gorm:"primaryKey" json:"legacyId,omitempty"`
	ChatID          string     `gorm:"size:64;uniqueIndex;not null" json:"chatId"`
	TargetType      string     `gorm:"size:20;index;not null" json:"targetType"`
	TargetUID       string     `gorm:"size:24;index" json:"targetUid"`
	TargetLegacyID  uint       `gorm:"index" json:"targetLegacyId"`
	TargetPhone     string     `gorm:"size:20;index" json:"targetPhone"`
	TargetName      string     `gorm:"size:100" json:"targetName"`
	TargetAvatar    string     `gorm:"size:500" json:"targetAvatar"`
	LastMessage     string     `gorm:"type:text" json:"lastMessage"`
	LastMessageType string     `gorm:"size:20" json:"lastMessageType"`
	LastSenderRole  string     `gorm:"size:20" json:"lastSenderRole"`
	LastMessageAt   *time.Time `gorm:"index" json:"lastMessageAt"`
	CreatedBy       string     `gorm:"size:64" json:"createdBy"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (SupportConversation) TableName() string {
	return "support_conversations"
}

// SupportMessage stores persisted support messages.
type SupportMessage struct {
	ID                uint      `gorm:"primaryKey" json:"legacyId,omitempty"`
	ChatID            string    `gorm:"size:64;index;not null" json:"chatId"`
	ExternalMessageID string    `gorm:"size:64;index" json:"externalMessageId"`
	SenderID          string    `gorm:"size:64;index" json:"senderId"`
	SenderRole        string    `gorm:"size:20;index;not null" json:"senderRole"`
	SenderName        string    `gorm:"size:100" json:"senderName"`
	Content           string    `gorm:"type:text" json:"content"`
	MessageType       string    `gorm:"size:20;index;not null" json:"messageType"`
	CouponData        string    `gorm:"type:text" json:"couponData"`
	OrderData         string    `gorm:"type:text" json:"orderData"`
	ImageURL          string    `gorm:"size:1000" json:"imageUrl"`
	Avatar            string    `gorm:"size:500" json:"avatar"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (SupportMessage) TableName() string {
	return "support_messages"
}
