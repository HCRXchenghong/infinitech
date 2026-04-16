package handler

import (
	"errors"
	"net/http"
	"reflect"
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

func respondDiningBuddyError(c *gin.Context, status int, message string) {
	respondErrorEnvelope(c, status, couponResponseCodeForStatus(status), message, nil)
}

func respondDiningBuddyPaginated(c *gin.Context, message, listKey string, items interface{}, total int64, limit int) {
	if limit < 0 {
		limit = 0
	}
	respondPaginatedEnvelope(c, responseCodeOK, message, listKey, items, total, 1, limit)
}

func writeDiningBuddyServiceError(c *gin.Context, err error, fallbackStatus int) {
	normalizedError := strings.ToLower(err.Error())

	if errors.Is(err, service.ErrUnauthorized) {
		respondDiningBuddyError(c, http.StatusUnauthorized, err.Error())
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		respondDiningBuddyError(c, http.StatusForbidden, err.Error())
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(normalizedError, "not found") {
		respondDiningBuddyError(c, http.StatusNotFound, err.Error())
		return
	}
	if strings.Contains(normalizedError, "required") ||
		strings.Contains(normalizedError, "too long") ||
		strings.Contains(normalizedError, "invalid") {
		respondDiningBuddyInvalidRequest(c, err.Error())
		return
	}
	respondDiningBuddyError(c, fallbackStatus, err.Error())
}

func countDiningBuddyItems(items interface{}) int64 {
	value := reflect.ValueOf(items)
	if !value.IsValid() {
		return 0
	}
	switch value.Kind() {
	case reflect.Array, reflect.Slice:
		return int64(value.Len())
	default:
		return 0
	}
}

func (h *DiningBuddyHandler) ListParties(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		respondDiningBuddyError(c, http.StatusUnauthorized, err.Error())
		return
	}

	limit := 50
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if parsed, parseErr := strconv.Atoi(raw); parseErr == nil && parsed > 0 {
			limit = parsed
		}
	}

	parties, err := h.service.ListParties(c.Request.Context(), currentUserID, c.Query("category"), limit)
	if err != nil {
		writeDiningBuddyServiceError(c, err, http.StatusInternalServerError)
		return
	}
	respondDiningBuddyPaginated(c, "同频饭友组局列表加载成功", "parties", parties, countDiningBuddyItems(parties), limit)
}

func (h *DiningBuddyHandler) CreateParty(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		respondDiningBuddyError(c, http.StatusUnauthorized, err.Error())
		return
	}

	var req service.DiningBuddyCreatePartyInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondDiningBuddyInvalidRequest(c, "invalid request payload")
		return
	}

	party, err := h.service.CreateParty(c.Request.Context(), currentUserID, req)
	if err != nil {
		writeDiningBuddyServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondDiningBuddySuccess(c, "同频饭友组局创建成功", party)
}

func (h *DiningBuddyHandler) JoinParty(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		respondDiningBuddyError(c, http.StatusUnauthorized, err.Error())
		return
	}

	party, err := h.service.JoinParty(c.Request.Context(), currentUserID, c.Param("id"))
	if err != nil {
		writeDiningBuddyServiceError(c, err, http.StatusBadRequest)
		return
	}

	respondDiningBuddySuccess(c, "同频饭友组局加入成功", party)
}

func (h *DiningBuddyHandler) ListMessages(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		respondDiningBuddyError(c, http.StatusUnauthorized, err.Error())
		return
	}

	messages, err := h.service.ListMessages(c.Request.Context(), currentUserID, c.Param("id"))
	if err != nil {
		writeDiningBuddyServiceError(c, err, http.StatusBadRequest)
		return
	}

	total := countDiningBuddyItems(messages)
	respondDiningBuddyPaginated(c, "同频饭友消息列表加载成功", "messages", messages, total, int(total))
}

func (h *DiningBuddyHandler) SendMessage(c *gin.Context) {
	currentUserID, err := diningBuddyCurrentUserID(c)
	if err != nil {
		respondDiningBuddyError(c, http.StatusUnauthorized, err.Error())
		return
	}

	var req service.DiningBuddySendMessageInput
	if err := c.ShouldBindJSON(&req); err != nil {
		respondDiningBuddyInvalidRequest(c, "invalid request payload")
		return
	}

	message, err := h.service.SendMessage(c.Request.Context(), currentUserID, c.Param("id"), req)
	if err != nil {
		writeDiningBuddyServiceError(c, err, http.StatusInternalServerError)
		return
	}

	respondDiningBuddySuccess(c, "同频饭友消息发送成功", message)
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
