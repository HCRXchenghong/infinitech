package repository

import "time"

// SupportConversation stores metadata for admin support chats.
type SupportConversation struct {
	ID              uint       `gorm:"primaryKey" json:"legacyId,omitempty"`
	ChatID          string     `gorm:"size:64;uniqueIndex;not null" json:"chatId"`
	TargetType      string     `gorm:"size:20;index;not null" json:"targetType"`
	TargetUID       string     `gorm:"size:28;index" json:"targetUid"`
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

// MessageConversation stores per-actor conversation snapshots and unread state.
type MessageConversation struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	OwnerRole       string     `gorm:"size:20;not null;index:idx_message_conversations_owner_chat,unique;index" json:"ownerRole"`
	OwnerID         string     `gorm:"size:64;not null;index:idx_message_conversations_owner_chat,unique;index" json:"ownerId"`
	OwnerPhone      string     `gorm:"size:20;index" json:"ownerPhone"`
	ChatID          string     `gorm:"size:64;not null;index:idx_message_conversations_owner_chat,unique;index" json:"chatId"`
	PeerRole        string     `gorm:"size:20;not null;index" json:"peerRole"`
	PeerID          string     `gorm:"size:64;index" json:"peerId"`
	PeerPhone       string     `gorm:"size:20;index" json:"peerPhone"`
	PeerName        string     `gorm:"size:100" json:"peerName"`
	PeerAvatar      string     `gorm:"size:500" json:"peerAvatar"`
	LastMessage     string     `gorm:"type:text" json:"lastMessage"`
	LastMessageType string     `gorm:"size:20" json:"lastMessageType"`
	LastSenderRole  string     `gorm:"size:20" json:"lastSenderRole"`
	LastMessageAt   *time.Time `gorm:"index" json:"lastMessageAt"`
	LastReadAt      *time.Time `gorm:"index" json:"lastReadAt"`
	UnreadCount     int64      `gorm:"not null;default:0" json:"unreadCount"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

func (MessageConversation) TableName() string {
	return "message_conversations"
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
