package repository

import (
	"time"
)

// OpenClawConfig OpenClaw配置表
type OpenClawConfig struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Name          string    `gorm:"size:100;not null" json:"name"`                 // 配置名称
	ApiUrl        string    `gorm:"size:255;not null" json:"apiUrl"`               // API地址
	ApiKey        string    `gorm:"size:255" json:"apiKey"`                        // API密钥
	Model         string    `gorm:"size:100" json:"model"`                         // 模型名称
	ExecutionMode string    `gorm:"size:30;default:'direct'" json:"executionMode"` // direct/gateway
	GatewayUrl    string    `gorm:"size:255" json:"gatewayUrl"`                    // Gateway URL
	GatewayToken  string    `gorm:"size:255" json:"gatewayToken"`                  // Gateway Token
	IsActive      bool      `gorm:"default:false" json:"isActive"`                 // 是否激活
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// OpenClawMCP MCP配置表
type OpenClawMCP struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Name        string    `gorm:"size:100;not null" json:"name"`    // MCP名称
	Command     string    `gorm:"size:255;not null" json:"command"` // 启动命令
	Args        string    `gorm:"type:text" json:"args"`            // 参数（JSON数组）
	Env         string    `gorm:"type:text" json:"env"`             // 环境变量（JSON对象）
	Description string    `gorm:"type:text" json:"description"`     // 描述
	IsEnabled   bool      `gorm:"default:true" json:"isEnabled"`    // 是否启用
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// OpenClawSkill Skill配置表
type OpenClawSkill struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Name        string    `gorm:"size:100;not null;uniqueIndex" json:"name"` // Skill名称
	Path        string    `gorm:"size:255;not null" json:"path"`             // Skill文件路径
	Description string    `gorm:"type:text" json:"description"`              // 描述
	IsEnabled   bool      `gorm:"default:true" json:"isEnabled"`             // 是否启用
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// OpenClawTask 任务记录表
type OpenClawTask struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	TaskContent    string    `gorm:"type:text;not null" json:"taskContent"`   // 任务内容
	Status         string    `gorm:"size:50;default:'pending'" json:"status"` // pending, running, completed, failed
	Result         string    `gorm:"type:text" json:"result"`                 // 任务结果
	CreatedBy      string    `gorm:"size:100" json:"createdBy"`               // 创建者（管理员ID或app标识）
	StaffID        *uint     `json:"staffId"`                                 // 对应 AI 员工
	ConversationID *uint     `json:"conversationId"`                          // 会话ID
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// OpenClawStaff AI员工配置表
type OpenClawStaff struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Name                     string          `gorm:"size:100;not null" json:"name"`    // 员工名称
	Code                     string          `gorm:"size:100;uniqueIndex" json:"code"` // 员工编码
	Description              string          `gorm:"type:text" json:"description"`     // 描述
	ConfigID                 *uint           `json:"configId"`                         // 关联模型配置
	Config                   *OpenClawConfig `gorm:"foreignKey:ConfigID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"config,omitempty"`
	SystemPrompt             string          `gorm:"type:text" json:"systemPrompt"`                 // 系统提示词
	Background               string          `gorm:"type:text" json:"background"`                   // 背景知识
	IsDefaultCustomerService bool            `gorm:"default:false" json:"isDefaultCustomerService"` // 默认客服
	IsEnabled                bool            `gorm:"default:true" json:"isEnabled"`                 // 启用状态
	CreatedAt                time.Time       `json:"createdAt"`
	UpdatedAt                time.Time       `json:"updatedAt"`
}

// OpenClawConversation 会话表（按员工隔离）
type OpenClawConversation struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	StaffID       uint          `gorm:"index;not null" json:"staffId"` // 归属员工
	Staff         OpenClawStaff `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"staff,omitempty"`
	OwnerID       string        `gorm:"size:100;index" json:"ownerId"`              // 会话归属者
	Source        string        `gorm:"size:50;default:'admin_task'" json:"source"` // 来源：admin_task/support
	Title         string        `gorm:"size:255" json:"title"`                      // 会话标题
	LastMessageAt *time.Time    `gorm:"index" json:"lastMessageAt"`                 // 最近消息时间
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}

// OpenClawMessage 会话消息表
type OpenClawMessage struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ConversationID uint                 `gorm:"index;not null" json:"conversationId"` // 会话ID
	Conversation   OpenClawConversation `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"conversation,omitempty"`
	Role           string               `gorm:"size:20;not null" json:"role"` // user/assistant/system
	Content        string               `gorm:"type:text;not null" json:"content"`
	CreatedAt      time.Time            `json:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt"`
}
