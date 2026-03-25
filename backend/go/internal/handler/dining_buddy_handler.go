package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
)

type DiningBuddyHandler struct {
	service *service.DiningBuddyService
}

func NewDiningBuddyHandler(service *service.DiningBuddyService) *DiningBuddyHandler {
	return &DiningBuddyHandler{service: service}
}

func (h *DiningBuddyHandler) ListParties(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	limit := 50
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if parsed, parseErr := strconv.Atoi(raw); parseErr == nil {
			limit = parsed
		}
	}

	parties, err := h.service.ListParties(c.Request.Context(), currentUserID, c.Query("category"), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"parties": parties})
}

func (h *DiningBuddyHandler) CreateParty(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req service.DiningBuddyCreatePartyInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	party, err := h.service.CreateParty(c.Request.Context(), currentUserID, req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case strings.Contains(err.Error(), "required"), strings.Contains(err.Error(), "too long"):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, party)
}

func (h *DiningBuddyHandler) JoinParty(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	party, err := h.service.JoinParty(c.Request.Context(), currentUserID, c.Param("id"))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "party not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, party)
}

func (h *DiningBuddyHandler) ListMessages(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	messages, err := h.service.ListMessages(c.Request.Context(), currentUserID, c.Param("id"))
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "party not found"})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

func (h *DiningBuddyHandler) SendMessage(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req service.DiningBuddySendMessageInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	message, err := h.service.SendMessage(c.Request.Context(), currentUserID, c.Param("id"), req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUnauthorized):
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		case errors.Is(err, service.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "party not found"})
		case strings.Contains(err.Error(), "required"), strings.Contains(err.Error(), "too long"):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, message)
}

func diningBuddyCurrentUserID(c *gin.Context) (uint, error) {
	rawUserID, ok := c.Get("user_id")
	if !ok {
		return 0, service.ErrUnauthorized
	}

	switch value := rawUserID.(type) {
	case int64:
		if value > 0 {
			return uint(value), nil
		}
	case int:
		if value > 0 {
			return uint(value), nil
		}
	case uint:
		if value > 0 {
			return value, nil
		}
	case uint64:
		if value > 0 {
			return uint(value), nil
		}
	case string:
		if parsed, err := strconv.ParseUint(strings.TrimSpace(value), 10, 64); err == nil && parsed > 0 {
			return uint(parsed), nil
		}
	}

	return 0, service.ErrUnauthorized
}
