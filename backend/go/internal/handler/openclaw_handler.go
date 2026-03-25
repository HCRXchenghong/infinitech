package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type OpenClawHandler struct {
	service *service.OpenClawService
}

func NewOpenClawHandler(service *service.OpenClawService) *OpenClawHandler {
	return &OpenClawHandler{service: service}
}

func parseUintFromAny(raw interface{}) (*uint, error) {
	if raw == nil {
		return nil, nil
	}

	switch v := raw.(type) {
	case float64:
		if v <= 0 {
			return nil, nil
		}
		id := uint(v)
		return &id, nil
	case int:
		if v <= 0 {
			return nil, nil
		}
		id := uint(v)
		return &id, nil
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return nil, nil
		}
		parsed, err := strconv.ParseUint(trimmed, 10, 64)
		if err != nil {
			return nil, err
		}
		if parsed == 0 {
			return nil, nil
		}
		id := uint(parsed)
		return &id, nil
	default:
		return nil, errors.New("invalid id")
	}
}

func (h *OpenClawHandler) parsePathID(c *gin.Context, key, tableName string) (uint, bool) {
	raw := strings.TrimSpace(c.Param(key))
	if raw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return 0, false
	}
	id, err := h.service.ResolveEntityID(tableName, raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return 0, false
	}
	return id, true
}

// Config
func (h *OpenClawHandler) GetConfig(c *gin.Context) {
	config, err := h.service.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

func (h *OpenClawHandler) ListConfigs(c *gin.Context) {
	configs, err := h.service.ListConfigs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, configs)
}

func (h *OpenClawHandler) CreateConfig(c *gin.Context) {
	var config repository.OpenClawConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(config.ExecutionMode) == "" {
		config.ExecutionMode = "direct"
	}

	if err := h.service.CreateConfig(&config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}

func (h *OpenClawHandler) UpdateConfig(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_configs")
	if !ok {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if v, ok := req["name"].(string); ok {
		updates["name"] = strings.TrimSpace(v)
	}
	if v, ok := req["apiUrl"].(string); ok {
		updates["api_url"] = strings.TrimSpace(v)
	}
	if v, ok := req["apiKey"].(string); ok {
		updates["api_key"] = strings.TrimSpace(v)
	}
	if v, ok := req["model"].(string); ok {
		updates["model"] = strings.TrimSpace(v)
	}
	if v, ok := req["executionMode"].(string); ok {
		updates["execution_mode"] = strings.TrimSpace(v)
	}
	if v, ok := req["gatewayUrl"].(string); ok {
		updates["gateway_url"] = strings.TrimSpace(v)
	}
	if v, ok := req["gatewayToken"].(string); ok {
		updates["gateway_token"] = strings.TrimSpace(v)
	}
	if v, ok := req["isActive"].(bool); ok {
		updates["is_active"] = v
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}

	if err := h.service.UpdateConfig(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OpenClawHandler) DeleteConfig(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_configs")
	if !ok {
		return
	}

	if err := h.service.DeleteConfig(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OpenClawHandler) EnableGateway(c *gin.Context) {
	var req struct {
		ConfigID   uint   `json:"configId"`
		GatewayURL string `json:"gatewayUrl"`
		Port       int    `json:"port"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.service.EnableGateway(req.ConfigID, req.GatewayURL, req.Port)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// Staff
func (h *OpenClawHandler) ListStaffs(c *gin.Context) {
	staffs, err := h.service.ListStaffs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, staffs)
}

func (h *OpenClawHandler) CreateStaff(c *gin.Context) {
	var staff repository.OpenClawStaff
	if err := c.ShouldBindJSON(&staff); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.TrimSpace(staff.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	if err := h.service.CreateStaff(&staff); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, staff)
}

func (h *OpenClawHandler) UpdateStaff(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_staffs")
	if !ok {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if v, ok := req["name"].(string); ok {
		updates["name"] = strings.TrimSpace(v)
	}
	if v, ok := req["code"].(string); ok {
		updates["code"] = strings.TrimSpace(v)
	}
	if v, ok := req["description"].(string); ok {
		updates["description"] = v
	}
	if v, ok := req["systemPrompt"].(string); ok {
		updates["system_prompt"] = v
	}
	if v, ok := req["background"].(string); ok {
		updates["background"] = v
	}
	if v, ok := req["isEnabled"].(bool); ok {
		updates["is_enabled"] = v
	}
	if v, ok := req["isDefaultCustomerService"].(bool); ok {
		updates["is_default_customer_service"] = v
	}
	if raw, exists := req["configId"]; exists {
		if raw == nil {
			updates["config_id"] = nil
		} else {
			configID, err := parseUintFromAny(raw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid configId"})
				return
			}
			if configID == nil {
				updates["config_id"] = nil
			} else {
				updates["config_id"] = *configID
			}
		}
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}

	if err := h.service.UpdateStaff(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OpenClawHandler) DeleteStaff(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_staffs")
	if !ok {
		return
	}

	if err := h.service.DeleteStaff(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// MCP
func (h *OpenClawHandler) ListMCPs(c *gin.Context) {
	mcps, err := h.service.ListMCPs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, mcps)
}

func (h *OpenClawHandler) CreateMCP(c *gin.Context) {
	var mcp repository.OpenClawMCP
	if err := c.ShouldBindJSON(&mcp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.CreateMCP(&mcp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mcp)
}

func (h *OpenClawHandler) UpdateMCP(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_mcps")
	if !ok {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if v, ok := req["name"].(string); ok {
		updates["name"] = v
	}
	if v, ok := req["command"].(string); ok {
		updates["command"] = v
	}
	if v, ok := req["args"].(string); ok {
		updates["args"] = v
	}
	if v, ok := req["env"].(string); ok {
		updates["env"] = v
	}
	if v, ok := req["description"].(string); ok {
		updates["description"] = v
	}
	if v, ok := req["isEnabled"].(bool); ok {
		updates["is_enabled"] = v
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}

	if err := h.service.UpdateMCP(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OpenClawHandler) DeleteMCP(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_mcps")
	if !ok {
		return
	}

	if err := h.service.DeleteMCP(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Skill
func (h *OpenClawHandler) ListSkills(c *gin.Context) {
	skills, err := h.service.ListSkills()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, skills)
}

func (h *OpenClawHandler) CreateSkill(c *gin.Context) {
	var skill repository.OpenClawSkill
	if err := c.ShouldBindJSON(&skill); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.CreateSkill(&skill); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, skill)
}

func (h *OpenClawHandler) UpdateSkill(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_skills")
	if !ok {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if v, ok := req["name"].(string); ok {
		updates["name"] = v
	}
	if v, ok := req["path"].(string); ok {
		updates["path"] = v
	}
	if v, ok := req["description"].(string); ok {
		updates["description"] = v
	}
	if v, ok := req["isEnabled"].(bool); ok {
		updates["is_enabled"] = v
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}

	if err := h.service.UpdateSkill(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OpenClawHandler) DeleteSkill(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_skills")
	if !ok {
		return
	}

	if err := h.service.DeleteSkill(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Conversation
func (h *OpenClawHandler) ListStaffConversations(c *gin.Context) {
	staffID, ok := h.parsePathID(c, "id", "open_claw_staffs")
	if !ok {
		return
	}

	ownerID := strings.TrimSpace(c.Query("ownerId"))
	limit := 50
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil {
			limit = parsed
		}
	}

	conversations, err := h.service.ListStaffConversations(staffID, ownerID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, conversations)
}

func (h *OpenClawHandler) CreateConversation(c *gin.Context) {
	var req struct {
		StaffID uint   `json:"staffId"`
		OwnerID string `json:"ownerId"`
		Source  string `json:"source"`
		Title   string `json:"title"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.StaffID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "staffId is required"})
		return
	}

	conversation := repository.OpenClawConversation{
		StaffID: req.StaffID,
		OwnerID: strings.TrimSpace(req.OwnerID),
		Source:  strings.TrimSpace(req.Source),
		Title:   strings.TrimSpace(req.Title),
	}

	if err := h.service.CreateConversation(&conversation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, conversation)
}

func (h *OpenClawHandler) ListConversationMessages(c *gin.Context) {
	conversationID, ok := h.parsePathID(c, "id", "open_claw_conversations")
	if !ok {
		return
	}

	limit := 200
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil {
			limit = parsed
		}
	}

	messages, err := h.service.ListConversationMessages(conversationID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, messages)
}

func (h *OpenClawHandler) CreateConversationMessage(c *gin.Context) {
	conversationID, ok := h.parsePathID(c, "id", "open_claw_conversations")
	if !ok {
		return
	}

	var req struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	message, err := h.service.AddConversationMessage(conversationID, req.Role, req.Content)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "conversation not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, message)
}

// Task
func (h *OpenClawHandler) ListTasks(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	tasks, err := h.service.ListTasks(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (h *OpenClawHandler) CreateTask(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	taskContent, _ := req["taskContent"].(string)
	taskContent = strings.TrimSpace(taskContent)
	if taskContent == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "taskContent is required"})
		return
	}

	createdBy := "admin"
	if v, ok := req["createdBy"]; ok && v != nil {
		switch val := v.(type) {
		case string:
			if strings.TrimSpace(val) != "" {
				createdBy = strings.TrimSpace(val)
			}
		case float64:
			createdBy = strconv.FormatInt(int64(val), 10)
		}
	}

	staffID, err := parseUintFromAny(req["staffId"])
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "staffId 格式不正确"})
		return
	}
	conversationID, err := parseUintFromAny(req["conversationId"])
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "conversationId 格式不正确"})
		return
	}

	task, err := h.service.CreateTaskWithContext(taskContent, createdBy, staffID, conversationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}

func (h *OpenClawHandler) UpdateTaskStatus(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_tasks")
	if !ok {
		return
	}

	var req struct {
		Status string `json:"status"`
		Result string `json:"result"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateTaskStatus(id, req.Status, req.Result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OpenClawHandler) GetTask(c *gin.Context) {
	id, ok := h.parsePathID(c, "id", "open_claw_tasks")
	if !ok {
		return
	}

	task, err := h.service.GetTask(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}
