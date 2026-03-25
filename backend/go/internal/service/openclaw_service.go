package service

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	defaultOpenClawConfigName = "默认直连配置"
	defaultOpenClawApiURL     = "https://api.anthropic.com"
	defaultOpenClawModel      = "claude-opus-4-6"

	defaultStaffName = "AI客服"
	defaultStaffCode = "ai_customer_service"

	defaultTaskConversationSource = "admin_task"
)

type GatewayEnableResult struct {
	ConfigID      uint   `json:"configId"`
	GatewayURL    string `json:"gatewayUrl"`
	GatewayToken  string `json:"gatewayToken"`
	StartedBy     string `json:"startedBy"`
	HealthOK      bool   `json:"healthOk"`
	HealthMessage string `json:"healthMessage"`
	EnvFile       string `json:"envFile"`
}

type OpenClawService struct {
	db *gorm.DB

	ensureDefaultsMu sync.Mutex
}

func NewOpenClawService(db *gorm.DB) *OpenClawService {
	return &OpenClawService{db: db}
}

func (s *OpenClawService) ResolveEntityID(tableName, rawID string) (uint, error) {
	return resolveEntityID(context.Background(), s.db, tableName, rawID)
}

func normalizeExecutionMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "gateway":
		return "gateway"
	default:
		return "direct"
	}
}

func trimToDefault(value string, defaultValue string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return defaultValue
	}
	return trimmed
}

func shortTitle(content string) string {
	content = strings.TrimSpace(strings.ReplaceAll(content, "\n", " "))
	if content == "" {
		return "新会话"
	}
	runes := []rune(content)
	if len(runes) <= 32 {
		return content
	}
	return string(runes[:32]) + "..."
}

func normalizeMessageRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "assistant":
		return "assistant"
	case "system":
		return "system"
	default:
		return "user"
	}
}

func (s *OpenClawService) EnsureDefaults() error {
	s.ensureDefaultsMu.Lock()
	defer s.ensureDefaultsMu.Unlock()

	return s.db.Transaction(func(tx *gorm.DB) error {
		var configCount int64
		if err := tx.Model(&repository.OpenClawConfig{}).Count(&configCount).Error; err != nil {
			return err
		}

		var activeConfig repository.OpenClawConfig
		activeConfigExists := true
		if err := tx.Where("is_active = ?", true).First(&activeConfig).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			activeConfigExists = false
		}

		if configCount == 0 {
			cfg := repository.OpenClawConfig{
				Name:          defaultOpenClawConfigName,
				ApiUrl:        defaultOpenClawApiURL,
				Model:         defaultOpenClawModel,
				ExecutionMode: "direct",
				IsActive:      true,
			}
			if err := tx.Create(&cfg).Error; err != nil {
				return err
			}
			activeConfig = cfg
			activeConfigExists = true
		} else if !activeConfigExists {
			var firstConfig repository.OpenClawConfig
			if err := tx.Order("id ASC").First(&firstConfig).Error; err != nil {
				return err
			}
			if err := tx.Model(&repository.OpenClawConfig{}).
				Where("id = ?", firstConfig.ID).
				Update("is_active", true).Error; err != nil {
				return err
			}
			firstConfig.IsActive = true
			activeConfig = firstConfig
			activeConfigExists = true
		}

		var defaultStaff repository.OpenClawStaff
		err := tx.Where("is_default_customer_service = ?", true).First(&defaultStaff).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			var existingStaff repository.OpenClawStaff
			if err := tx.Order("id ASC").First(&existingStaff).Error; err == nil {
				updates := map[string]interface{}{
					"is_default_customer_service": true,
					"is_enabled":                  true,
				}
				if existingStaff.ConfigID == nil && activeConfigExists {
					updates["config_id"] = activeConfig.ID
				}
				if err := tx.Model(&repository.OpenClawStaff{}).
					Where("id = ?", existingStaff.ID).
					Updates(updates).Error; err != nil {
					return err
				}
			} else {
				staff := repository.OpenClawStaff{
					Name:                     defaultStaffName,
					Code:                     defaultStaffCode,
					Description:              "默认开启的 AI 客服，可用于管理端任务与客服问答。",
					SystemPrompt:             "你是悦享e食平台的 AI 客服员工，负责帮助用户与运营团队快速解决问题。",
					Background:               "你熟悉平台订单、售后、商户、骑手、用户常见场景，回答要简洁可执行。",
					IsDefaultCustomerService: true,
					IsEnabled:                true,
				}
				if activeConfigExists {
					configID := activeConfig.ID
					staff.ConfigID = &configID
				}
				if err := tx.Create(&staff).Error; err != nil {
					return err
				}
			}
		} else if err != nil {
			return err
		} else {
			updates := map[string]interface{}{}
			if !defaultStaff.IsEnabled {
				updates["is_enabled"] = true
			}
			if defaultStaff.ConfigID == nil && activeConfigExists {
				updates["config_id"] = activeConfig.ID
			}
			if len(updates) > 0 {
				if err := tx.Model(&repository.OpenClawStaff{}).
					Where("id = ?", defaultStaff.ID).
					Updates(updates).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

// Config
func (s *OpenClawService) GetConfig() (*repository.OpenClawConfig, error) {
	if err := s.EnsureDefaults(); err != nil {
		return nil, err
	}

	var config repository.OpenClawConfig
	err := s.db.Where("is_active = ?", true).First(&config).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &config, nil
}

func (s *OpenClawService) CreateConfig(config *repository.OpenClawConfig) error {
	if err := s.EnsureDefaults(); err != nil {
		return err
	}

	config.Name = trimToDefault(config.Name, "新配置")
	config.ApiUrl = trimToDefault(config.ApiUrl, defaultOpenClawApiURL)
	config.Model = trimToDefault(config.Model, defaultOpenClawModel)
	config.ExecutionMode = normalizeExecutionMode(config.ExecutionMode)

	if config.IsActive {
		s.db.Model(&repository.OpenClawConfig{}).Where("is_active = ?", true).Update("is_active", false)
	} else {
		var activeCount int64
		if err := s.db.Model(&repository.OpenClawConfig{}).Where("is_active = ?", true).Count(&activeCount).Error; err != nil {
			return err
		}
		if activeCount == 0 {
			config.IsActive = true
		}
	}

	return s.db.Create(config).Error
}

func (s *OpenClawService) UpdateConfig(id uint, updates map[string]interface{}) error {
	if err := s.EnsureDefaults(); err != nil {
		return err
	}
	if len(updates) == 0 {
		return nil
	}

	if rawMode, ok := updates["execution_mode"]; ok {
		if mode, okCast := rawMode.(string); okCast {
			updates["execution_mode"] = normalizeExecutionMode(mode)
		}
	}

	if isActive, ok := updates["is_active"].(bool); ok && isActive {
		s.db.Model(&repository.OpenClawConfig{}).Where("id != ? AND is_active = ?", id, true).Update("is_active", false)
	}

	if err := s.db.Model(&repository.OpenClawConfig{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return err
	}

	return s.EnsureDefaults()
}

func (s *OpenClawService) DeleteConfig(id uint) error {
	if err := s.db.Delete(&repository.OpenClawConfig{}, id).Error; err != nil {
		return err
	}
	return s.EnsureDefaults()
}

func (s *OpenClawService) ListConfigs() ([]repository.OpenClawConfig, error) {
	if err := s.EnsureDefaults(); err != nil {
		return nil, err
	}

	var configs []repository.OpenClawConfig
	err := s.db.Order("created_at DESC").Find(&configs).Error
	return configs, err
}

func (s *OpenClawService) getConfigByID(id uint) (*repository.OpenClawConfig, error) {
	var config repository.OpenClawConfig
	if err := s.db.First(&config, id).Error; err != nil {
		return nil, err
	}
	return &config, nil
}

// Staff
func (s *OpenClawService) ListStaffs() ([]repository.OpenClawStaff, error) {
	if err := s.EnsureDefaults(); err != nil {
		return nil, err
	}

	var staffs []repository.OpenClawStaff
	err := s.db.Preload("Config").
		Order("is_default_customer_service DESC").
		Order("is_enabled DESC").
		Order("created_at ASC").
		Find(&staffs).Error
	return staffs, err
}

func (s *OpenClawService) GetStaffByID(id uint) (*repository.OpenClawStaff, error) {
	if err := s.EnsureDefaults(); err != nil {
		return nil, err
	}

	var staff repository.OpenClawStaff
	err := s.db.Preload("Config").First(&staff, id).Error
	if err != nil {
		return nil, err
	}
	return &staff, nil
}

func (s *OpenClawService) getDefaultStaff() (*repository.OpenClawStaff, error) {
	var staff repository.OpenClawStaff
	err := s.db.Preload("Config").Where("is_default_customer_service = ?", true).First(&staff).Error
	if err != nil {
		return nil, err
	}
	return &staff, nil
}

func (s *OpenClawService) CreateStaff(staff *repository.OpenClawStaff) error {
	if err := s.EnsureDefaults(); err != nil {
		return err
	}

	staff.Name = strings.TrimSpace(staff.Name)
	if staff.Name == "" {
		return errors.New("name is required")
	}

	if strings.TrimSpace(staff.Code) == "" {
		staff.Code = fmt.Sprintf("staff_%d", time.Now().UnixNano())
	}

	if staff.ConfigID == nil {
		activeConfig, err := s.GetConfig()
		if err != nil {
			return err
		}
		if activeConfig != nil {
			configID := activeConfig.ID
			staff.ConfigID = &configID
		}
	}

	if staff.IsDefaultCustomerService {
		s.db.Model(&repository.OpenClawStaff{}).
			Where("is_default_customer_service = ?", true).
			Update("is_default_customer_service", false)
	}

	if err := s.db.Create(staff).Error; err != nil {
		return err
	}

	return s.EnsureDefaults()
}

func (s *OpenClawService) UpdateStaff(id uint, updates map[string]interface{}) error {
	if err := s.EnsureDefaults(); err != nil {
		return err
	}
	if len(updates) == 0 {
		return nil
	}

	if rawName, ok := updates["name"].(string); ok {
		name := strings.TrimSpace(rawName)
		if name == "" {
			return errors.New("name is required")
		}
		updates["name"] = name
	}

	if rawCode, ok := updates["code"].(string); ok {
		updates["code"] = strings.TrimSpace(rawCode)
	}

	if isDefault, ok := updates["is_default_customer_service"].(bool); ok && isDefault {
		s.db.Model(&repository.OpenClawStaff{}).
			Where("id != ?", id).
			Update("is_default_customer_service", false)
	}

	if err := s.db.Model(&repository.OpenClawStaff{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return err
	}

	return s.EnsureDefaults()
}

func (s *OpenClawService) DeleteStaff(id uint) error {
	if err := s.db.Delete(&repository.OpenClawStaff{}, id).Error; err != nil {
		return err
	}
	return s.EnsureDefaults()
}

// MCP
func (s *OpenClawService) ListMCPs() ([]repository.OpenClawMCP, error) {
	var mcps []repository.OpenClawMCP
	err := s.db.Order("created_at DESC").Find(&mcps).Error
	return mcps, err
}

func (s *OpenClawService) CreateMCP(mcp *repository.OpenClawMCP) error {
	return s.db.Create(mcp).Error
}

func (s *OpenClawService) UpdateMCP(id uint, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}
	return s.db.Model(&repository.OpenClawMCP{}).Where("id = ?", id).Updates(updates).Error
}

func (s *OpenClawService) DeleteMCP(id uint) error {
	return s.db.Delete(&repository.OpenClawMCP{}, id).Error
}

// Skill
func (s *OpenClawService) ListSkills() ([]repository.OpenClawSkill, error) {
	var skills []repository.OpenClawSkill
	err := s.db.Order("created_at DESC").Find(&skills).Error
	return skills, err
}

func (s *OpenClawService) CreateSkill(skill *repository.OpenClawSkill) error {
	return s.db.Create(skill).Error
}

func (s *OpenClawService) UpdateSkill(id uint, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}
	return s.db.Model(&repository.OpenClawSkill{}).Where("id = ?", id).Updates(updates).Error
}

func (s *OpenClawService) DeleteSkill(id uint) error {
	return s.db.Delete(&repository.OpenClawSkill{}, id).Error
}

// Conversation
func (s *OpenClawService) CreateConversation(conversation *repository.OpenClawConversation) error {
	if err := s.EnsureDefaults(); err != nil {
		return err
	}

	if conversation.StaffID == 0 {
		return errors.New("staffId is required")
	}
	var staffCount int64
	if err := s.db.Model(&repository.OpenClawStaff{}).Where("id = ?", conversation.StaffID).Count(&staffCount).Error; err != nil {
		return err
	}
	if staffCount == 0 {
		return errors.New("staff not found")
	}
	if strings.TrimSpace(conversation.Source) == "" {
		conversation.Source = defaultTaskConversationSource
	}
	if strings.TrimSpace(conversation.Title) == "" {
		conversation.Title = "新会话"
	}

	return s.db.Create(conversation).Error
}

func (s *OpenClawService) ListStaffConversations(staffID uint, ownerID string, limit int) ([]repository.OpenClawConversation, error) {
	var conversations []repository.OpenClawConversation
	query := s.db.Where("staff_id = ?", staffID)
	if strings.TrimSpace(ownerID) != "" {
		query = query.Where("owner_id = ?", strings.TrimSpace(ownerID))
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Preload("Staff").Order("COALESCE(last_message_at, created_at) DESC").Find(&conversations).Error
	return conversations, err
}

func (s *OpenClawService) GetConversation(id uint) (*repository.OpenClawConversation, error) {
	var conversation repository.OpenClawConversation
	err := s.db.Preload("Staff").First(&conversation, id).Error
	if err != nil {
		return nil, err
	}
	return &conversation, nil
}

func (s *OpenClawService) ListConversationMessages(conversationID uint, limit int) ([]repository.OpenClawMessage, error) {
	var messages []repository.OpenClawMessage
	query := s.db.Where("conversation_id = ?", conversationID).Order("created_at ASC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&messages).Error
	return messages, err
}

func (s *OpenClawService) AddConversationMessage(conversationID uint, role string, content string) (*repository.OpenClawMessage, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, errors.New("content is required")
	}

	message := &repository.OpenClawMessage{
		ConversationID: conversationID,
		Role:           normalizeMessageRole(role),
		Content:        content,
	}

	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&repository.OpenClawConversation{}, conversationID).Error; err != nil {
			return err
		}
		if err := tx.Create(message).Error; err != nil {
			return err
		}
		if err := tx.Model(&repository.OpenClawConversation{}).
			Where("id = ?", conversationID).
			Updates(map[string]interface{}{
				"last_message_at": now,
				"updated_at":      now,
			}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return message, nil
}

func (s *OpenClawService) ensureTaskConversation(staffID uint, createdBy string, taskContent string, conversationID *uint) (*uint, error) {
	if conversationID != nil && *conversationID > 0 {
		var conversation repository.OpenClawConversation
		if err := s.db.First(&conversation, *conversationID).Error; err != nil {
			return nil, err
		}
		if conversation.StaffID != staffID {
			conversation.StaffID = staffID
			if err := s.db.Model(&repository.OpenClawConversation{}).
				Where("id = ?", conversation.ID).
				Updates(map[string]interface{}{"staff_id": staffID}).Error; err != nil {
				return nil, err
			}
		}
		return conversationID, nil
	}

	conversation := repository.OpenClawConversation{
		StaffID: staffID,
		OwnerID: createdBy,
		Source:  defaultTaskConversationSource,
		Title:   shortTitle(taskContent),
	}
	if err := s.db.Create(&conversation).Error; err != nil {
		return nil, err
	}
	newID := conversation.ID
	return &newID, nil
}

func (s *OpenClawService) resolveTaskStaffID(staffID *uint) (*uint, error) {
	if staffID != nil && *staffID > 0 {
		var count int64
		if err := s.db.Model(&repository.OpenClawStaff{}).Where("id = ?", *staffID).Count(&count).Error; err != nil {
			return nil, err
		}
		if count == 0 {
			return nil, errors.New("staff not found")
		}
		return staffID, nil
	}

	defaultStaff, err := s.getDefaultStaff()
	if err != nil {
		return nil, err
	}
	id := defaultStaff.ID
	return &id, nil
}

// Task
func (s *OpenClawService) ListTasks(limit int) ([]repository.OpenClawTask, error) {
	var tasks []repository.OpenClawTask
	query := s.db.Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&tasks).Error
	return tasks, err
}

func (s *OpenClawService) CreateTaskWithContext(taskContent string, createdBy string, staffID *uint, conversationID *uint) (*repository.OpenClawTask, error) {
	if err := s.EnsureDefaults(); err != nil {
		return nil, err
	}

	taskContent = strings.TrimSpace(taskContent)
	if taskContent == "" {
		return nil, errors.New("taskContent is required")
	}

	createdBy = strings.TrimSpace(createdBy)
	if createdBy == "" {
		createdBy = "admin"
	}

	resolvedStaffID, err := s.resolveTaskStaffID(staffID)
	if err != nil {
		return nil, err
	}
	if resolvedStaffID == nil || *resolvedStaffID == 0 {
		return nil, errors.New("unable to resolve staff")
	}

	resolvedConversationID, err := s.ensureTaskConversation(*resolvedStaffID, createdBy, taskContent, conversationID)
	if err != nil {
		return nil, err
	}

	task := &repository.OpenClawTask{
		TaskContent:    taskContent,
		Status:         "pending",
		CreatedBy:      createdBy,
		StaffID:        resolvedStaffID,
		ConversationID: resolvedConversationID,
	}
	if err := s.db.Create(task).Error; err != nil {
		return nil, err
	}

	if resolvedConversationID != nil {
		if _, err := s.AddConversationMessage(*resolvedConversationID, "user", taskContent); err != nil {
			return nil, err
		}
	}

	return task, nil
}

func (s *OpenClawService) CreateTask(task *repository.OpenClawTask) error {
	createdTask, err := s.CreateTaskWithContext(task.TaskContent, task.CreatedBy, task.StaffID, task.ConversationID)
	if err != nil {
		return err
	}
	*task = *createdTask
	return nil
}

func (s *OpenClawService) UpdateTaskStatus(id uint, status string, result string) error {
	return s.db.Model(&repository.OpenClawTask{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status": status,
		"result": result,
	}).Error
}

func (s *OpenClawService) GetTask(id uint) (*repository.OpenClawTask, error) {
	var task repository.OpenClawTask
	err := s.db.First(&task, id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func generateGatewayToken() (string, error) {
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "gw_" + hex.EncodeToString(bytes), nil
}

func pathExists(target string) bool {
	_, err := os.Stat(target)
	return err == nil
}

func detectProjectRoot() (string, error) {
	if envRoot := strings.TrimSpace(os.Getenv("PROJECT_ROOT")); envRoot != "" {
		if pathExists(filepath.Join(envRoot, "openclaw")) && pathExists(filepath.Join(envRoot, "backend")) {
			return envRoot, nil
		}
	}

	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	current := cwd
	for {
		if pathExists(filepath.Join(current, "openclaw")) && pathExists(filepath.Join(current, "backend")) {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}

	return "", errors.New("cannot locate project root")
}

func upsertEnvFile(filePath string, updates map[string]string) error {
	if err := os.MkdirAll(filepath.Dir(filePath), 0o755); err != nil {
		return err
	}

	lines := []string{}
	existing := map[string]bool{}

	if data, err := os.ReadFile(filePath); err == nil {
		scanner := bufio.NewScanner(strings.NewReader(string(data)))
		for scanner.Scan() {
			line := scanner.Text()
			trimmed := strings.TrimSpace(line)
			if trimmed == "" || strings.HasPrefix(trimmed, "#") || !strings.Contains(line, "=") {
				lines = append(lines, line)
				continue
			}

			parts := strings.SplitN(line, "=", 2)
			key := strings.TrimSpace(parts[0])
			if value, ok := updates[key]; ok {
				lines = append(lines, fmt.Sprintf("%s=%s", key, value))
				existing[key] = true
			} else {
				lines = append(lines, line)
			}
		}
	}

	for key, value := range updates {
		if existing[key] {
			continue
		}
		lines = append(lines, fmt.Sprintf("%s=%s", key, value))
	}

	content := strings.Join(lines, "\n")
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	return os.WriteFile(filePath, []byte(content), 0o644)
}

func runOpenClawCommand(timeout time.Duration, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "openclaw", args...)
	output, err := cmd.CombinedOutput()
	outputText := strings.TrimSpace(string(output))
	if ctx.Err() == context.DeadlineExceeded {
		return outputText, fmt.Errorf("openclaw %s timed out", strings.Join(args, " "))
	}
	if err != nil {
		if outputText != "" {
			return outputText, fmt.Errorf("openclaw %s failed: %s", strings.Join(args, " "), outputText)
		}
		return outputText, err
	}
	return outputText, nil
}

func gatewayProviderKey(configID uint) string {
	if configID == 0 {
		return "yuexiang_cfg_default"
	}
	return fmt.Sprintf("yuexiang_cfg_%d", configID)
}

func gatewayModelID(model string) string {
	trimmed := strings.TrimSpace(model)
	if trimmed == "" {
		return defaultOpenClawModel
	}

	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts) == 2 {
		if tail := strings.TrimSpace(parts[1]); tail != "" {
			return tail
		}
	}
	return trimmed
}

func gatewayModelRef(configID uint, model string) string {
	return fmt.Sprintf("%s/%s", gatewayProviderKey(configID), gatewayModelID(model))
}

func inferGatewayProviderAPI(apiURL string) string {
	normalized := strings.ToLower(strings.TrimSpace(apiURL))
	if strings.Contains(normalized, "anthropic") || strings.Contains(normalized, "/anthropic") {
		return "anthropic-messages"
	}
	return "openai-completions"
}

func normalizeGatewayProviderBaseURL(apiURL string, providerAPI string) string {
	normalized := strings.TrimRight(strings.TrimSpace(apiURL), "/")
	if normalized == "" {
		return normalized
	}

	if providerAPI == "openai-completions" {
		if strings.HasSuffix(strings.ToLower(normalized), "/v1") {
			return normalized
		}
		return normalized + "/v1"
	}

	if providerAPI == "anthropic-messages" {
		if strings.HasSuffix(strings.ToLower(normalized), "/v1") {
			return strings.TrimSuffix(normalized, "/v1")
		}
	}

	return normalized
}

func configureGatewayRuntime(config repository.OpenClawConfig, port int, token string) (string, error) {
	apiURL := strings.TrimSpace(config.ApiUrl)
	if apiURL == "" {
		return "", errors.New("当前配置缺少 API 地址，无法启用 Gateway")
	}

	modelRef := gatewayModelRef(config.ID, config.Model)
	providerKey := gatewayProviderKey(config.ID)
	modelID := gatewayModelID(config.Model)
	providerAPI := inferGatewayProviderAPI(apiURL)
	normalizedProviderBaseURL := normalizeGatewayProviderBaseURL(apiURL, providerAPI)
	providerPayload := map[string]interface{}{
		"baseUrl": normalizedProviderBaseURL,
		"api":     providerAPI,
		"models": []map[string]string{
			{
				"id":   modelID,
				"name": modelID,
			},
		},
	}
	if providerAPI == "openai-completions" {
		// Some upstream OpenAI-compatible proxies apply stricter WAF checks to non-browser clients.
		providerPayload["headers"] = map[string]string{
			"User-Agent": "curl/8.7.1",
			"Accept":     "application/json",
		}
	}
	if apiKey := strings.TrimSpace(config.ApiKey); apiKey != "" {
		providerPayload["apiKey"] = apiKey
	}

	providerJSON, err := json.Marshal(providerPayload)
	if err != nil {
		return "", err
	}

	type configSetCommand struct {
		path   string
		value  string
		strict bool
	}

	commands := []configSetCommand{
		{path: "gateway.port", value: strconv.Itoa(port), strict: true},
		{path: "gateway.bind", value: "loopback"},
		{path: "gateway.auth.mode", value: "token"},
		{path: "gateway.auth.token", value: token},
		{path: "gateway.http.endpoints.chatCompletions.enabled", value: "true", strict: true},
		{path: "models.mode", value: "merge"},
		{
			path:   fmt.Sprintf("models.providers.%s", providerKey),
			value:  string(providerJSON),
			strict: true,
		},
		{path: "agents.defaults.model.primary", value: modelRef},
	}

	for _, command := range commands {
		args := []string{"config", "set", command.path, command.value}
		if command.strict {
			args = append(args, "--strict-json")
		}
		if _, err := runOpenClawCommand(8*time.Second, args...); err != nil {
			return "", fmt.Errorf("更新 OpenClaw 配置失败（%s）: %w", command.path, err)
		}
	}

	return modelRef, nil
}

func startGatewayDetached(port int, token string, config *repository.OpenClawConfig) error {
	logPath := filepath.Join(os.TempDir(), "openclaw-gateway.log")
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}

	cmd := exec.Command(
		"openclaw",
		"gateway",
		"run",
		"--allow-unconfigured",
		"--bind",
		"loopback",
		"--port",
		strconv.Itoa(port),
		"--token",
		token,
		"--force",
	)
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	envVars := append(os.Environ(),
		fmt.Sprintf("OPENCLAW_GATEWAY_TOKEN=%s", token),
		fmt.Sprintf("OPENCLAW_GATEWAY_PORT=%d", port),
	)
	if config != nil {
		apiKey := strings.TrimSpace(config.ApiKey)
		if apiKey != "" {
			envVars = append(envVars, fmt.Sprintf("ANTHROPIC_API_KEY=%s", apiKey))
			envVars = append(envVars, fmt.Sprintf("OPENAI_API_KEY=%s", apiKey))
		}
	}
	cmd.Env = envVars
	applyDetachedProcessAttrs(cmd)

	if err := cmd.Start(); err != nil {
		_ = logFile.Close()
		return err
	}
	_ = cmd.Process.Release()
	_ = logFile.Close()
	return nil
}

func checkGatewayHealth(gatewayURL string, gatewayToken string, model string) error {
	client := &http.Client{Timeout: 3 * time.Second}
	completionURL := strings.TrimRight(gatewayURL, "/") + "/v1/chat/completions"
	if strings.TrimSpace(model) == "" {
		model = defaultOpenClawModel
	}

	var lastErr error
	for i := 0; i < 6; i++ {
		body := strings.NewReader(fmt.Sprintf(`{"model":%q,"messages":[{"role":"user","content":"health check"}],"max_tokens":16}`, model))
		req, _ := http.NewRequest(http.MethodPost, completionURL, body)
		if strings.TrimSpace(gatewayToken) != "" {
			req.Header.Set("Authorization", "Bearer "+gatewayToken)
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req)
		if err == nil {
			respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
			_ = resp.Body.Close()
			detail := strings.TrimSpace(strings.ReplaceAll(string(respBody), "\n", " "))
			if len(detail) > 220 {
				detail = detail[:220] + "..."
			}
			lowerDetail := strings.ToLower(detail)
			if strings.Contains(lowerDetail, "<!doctype html") || strings.Contains(lowerDetail, "attention required! | cloudflare") {
				lastErr = errors.New("gateway upstream returned Cloudflare challenge page, please verify provider base URL / key / headers")
				time.Sleep(1 * time.Second)
				continue
			}

			if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
				if detail != "" {
					lastErr = fmt.Errorf("gateway auth failed: status %d, detail: %s", resp.StatusCode, detail)
				} else {
					lastErr = fmt.Errorf("gateway auth failed: status %d", resp.StatusCode)
				}
				time.Sleep(1 * time.Second)
				continue
			}
			if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusMethodNotAllowed {
				if detail != "" {
					lastErr = fmt.Errorf("gateway endpoint unavailable: status %d, detail: %s", resp.StatusCode, detail)
				} else {
					lastErr = fmt.Errorf("gateway endpoint unavailable: status %d", resp.StatusCode)
				}
				time.Sleep(1 * time.Second)
				continue
			}
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				return nil
			}
			if resp.StatusCode >= 400 && resp.StatusCode < 500 {
				if detail != "" {
					lastErr = fmt.Errorf("gateway model request failed: status %d, detail: %s", resp.StatusCode, detail)
				} else {
					lastErr = fmt.Errorf("gateway model request failed: status %d", resp.StatusCode)
				}
			} else {
				if detail != "" {
					lastErr = fmt.Errorf("gateway returned status %d, detail: %s", resp.StatusCode, detail)
				} else {
					lastErr = fmt.Errorf("gateway returned status %d", resp.StatusCode)
				}
			}
		} else {
			lastErr = err
		}
		time.Sleep(1 * time.Second)
	}

	if lastErr == nil {
		lastErr = errors.New("gateway health check failed")
	}
	return lastErr
}

func (s *OpenClawService) EnableGateway(configID uint, gatewayURL string, port int) (*GatewayEnableResult, error) {
	if err := s.EnsureDefaults(); err != nil {
		return nil, err
	}

	if _, err := exec.LookPath("openclaw"); err != nil {
		return nil, errors.New("未找到 openclaw 命令，请先安装 OpenClaw CLI")
	}

	if port <= 0 {
		port = 18789
	}
	gatewayURL = strings.TrimSpace(gatewayURL)
	if gatewayURL == "" {
		gatewayURL = fmt.Sprintf("http://127.0.0.1:%d", port)
	}

	var config repository.OpenClawConfig
	if configID > 0 {
		configPtr, err := s.getConfigByID(configID)
		if err != nil {
			return nil, err
		}
		config = *configPtr
	} else {
		activeConfig, err := s.GetConfig()
		if err != nil {
			return nil, err
		}
		if activeConfig == nil {
			return nil, errors.New("未找到可用配置")
		}
		config = *activeConfig
	}

	token := strings.TrimSpace(config.GatewayToken)
	if token == "" {
		generatedToken, genErr := generateGatewayToken()
		if genErr != nil {
			return nil, genErr
		}
		token = generatedToken
	}

	if err := s.UpdateConfig(config.ID, map[string]interface{}{
		"execution_mode": "gateway",
		"gateway_url":    gatewayURL,
		"gateway_token":  token,
		"is_active":      true,
	}); err != nil {
		return nil, err
	}

	projectRoot, err := detectProjectRoot()
	if err != nil {
		return nil, err
	}
	envPath := filepath.Join(projectRoot, "openclaw", "suchpeople.env.local")
	if err := upsertEnvFile(envPath, map[string]string{
		"OPENCLAW_GATEWAY_URL":   gatewayURL,
		"OPENCLAW_GATEWAY_TOKEN": token,
	}); err != nil {
		return nil, err
	}

	resolvedGatewayModel := gatewayModelRef(config.ID, config.Model)
	modelRef, configErr := configureGatewayRuntime(config, port, token)
	if configErr != nil {
		return nil, configErr
	}
	resolvedGatewayModel = modelRef

	startedBy := "restart"
	_, restartErr := runOpenClawCommand(10*time.Second, "gateway", "restart")
	healthErr := checkGatewayHealth(gatewayURL, token, resolvedGatewayModel)
	if restartErr != nil || healthErr != nil {
		if err := startGatewayDetached(port, token, &config); err != nil {
			if healthErr == nil {
				healthErr = err
			}
		} else {
			startedBy = "run"
			healthErr = checkGatewayHealth(gatewayURL, token, resolvedGatewayModel)
		}
	}
	result := &GatewayEnableResult{
		ConfigID:      config.ID,
		GatewayURL:    gatewayURL,
		GatewayToken:  token,
		StartedBy:     startedBy,
		HealthOK:      healthErr == nil,
		HealthMessage: "ok",
		EnvFile:       envPath,
	}
	if healthErr != nil {
		result.HealthMessage = healthErr.Error()
	}
	return result, nil
}
