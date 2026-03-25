package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type FinancialHandler struct {
	financial *service.FinancialService
}

func NewFinancialHandler(financial *service.FinancialService) *FinancialHandler {
	return &FinancialHandler{financial: financial}
}

func (h *FinancialHandler) GetOverview(c *gin.Context) {
	result, err := h.financial.GetOverview(c.Request.Context(), service.FinancialOverviewQuery{
		PeriodType: strings.TrimSpace(c.Query("periodType")),
		StatDate:   strings.TrimSpace(c.Query("statDate")),
	})
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *FinancialHandler) GetStatistics(c *gin.Context) {
	result, err := h.financial.GetStatistics(c.Request.Context(), service.FinancialStatisticsQuery{
		PeriodType: strings.TrimSpace(c.Query("periodType")),
		StartDate:  strings.TrimSpace(c.Query("startDate")),
		EndDate:    strings.TrimSpace(c.Query("endDate")),
	})
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *FinancialHandler) GetUserDetails(c *gin.Context) {
	result, err := h.financial.GetUserDetails(c.Request.Context(), service.FinancialUserDetailsQuery{
		PeriodType: strings.TrimSpace(c.Query("periodType")),
		StartDate:  strings.TrimSpace(c.Query("startDate")),
		EndDate:    strings.TrimSpace(c.Query("endDate")),
		UserType:   strings.TrimSpace(c.Query("userType")),
		Keyword:    strings.TrimSpace(c.Query("keyword")),
		SortBy:     strings.TrimSpace(c.Query("sortBy")),
		SortOrder:  strings.TrimSpace(c.Query("sortOrder")),
		Page:       parsePositiveInt(c.Query("page"), 1),
		Limit:      parsePositiveInt(c.Query("limit"), 20),
	})
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *FinancialHandler) Export(c *gin.Context) {
	result, err := h.financial.Export(c.Request.Context(), service.FinancialExportQuery{
		PeriodType: strings.TrimSpace(c.Query("periodType")),
		StartDate:  strings.TrimSpace(c.Query("startDate")),
		EndDate:    strings.TrimSpace(c.Query("endDate")),
		UserType:   strings.TrimSpace(c.Query("userType")),
		Format:     strings.TrimSpace(c.Query("format")),
	})
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *FinancialHandler) GetTransactionLogs(c *gin.Context) {
	result, err := h.financial.GetTransactionLogs(c.Request.Context(), service.TransactionLogsQuery{
		UserID:    strings.TrimSpace(c.Query("userId")),
		UserType:  strings.TrimSpace(c.Query("userType")),
		Type:      strings.TrimSpace(c.Query("type")),
		Status:    strings.TrimSpace(c.Query("status")),
		StartDate: strings.TrimSpace(c.Query("startDate")),
		EndDate:   strings.TrimSpace(c.Query("endDate")),
		Page:      parsePositiveInt(c.Query("page"), 1),
		Limit:     parsePositiveInt(c.Query("limit"), 50),
	})
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type deleteTransactionLogRequest struct {
	ID         interface{} `json:"id"`
	RecordID   interface{} `json:"recordId"`
	SourceType string      `json:"sourceType"`
	Reason     string      `json:"reason"`
}

func parseRecordID(value interface{}) uint {
	switch v := value.(type) {
	case float64:
		if v > 0 {
			return uint(v)
		}
	case int:
		if v > 0 {
			return uint(v)
		}
	case int64:
		if v > 0 {
			return uint(v)
		}
	case string:
		if parsed, err := strconv.ParseUint(strings.TrimSpace(v), 10, 64); err == nil && parsed > 0 {
			return uint(parsed)
		}
	}
	return 0
}

func (h *FinancialHandler) DeleteTransactionLog(c *gin.Context) {
	var req deleteTransactionLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid request"})
		return
	}

	recordID := parseRecordID(req.RecordID)
	if recordID == 0 {
		recordID = parseRecordID(req.ID)
	}

	deleted, err := h.financial.DeleteTransactionLog(c.Request.Context(), strings.TrimSpace(req.SourceType), recordID, strings.TrimSpace(req.Reason))
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	if !deleted {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "未找到该条财务日志，可能已被删除"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *FinancialHandler) ClearTransactionLogs(c *gin.Context) {
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid request"})
		return
	}

	cleared, err := h.financial.ClearTransactionLogs(c.Request.Context(), strings.TrimSpace(req.Reason))
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"cleared": cleared,
	})
}
