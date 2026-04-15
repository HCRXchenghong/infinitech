package handler

import (
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/service"
)

type AdminWalletHandler struct {
	wallet *service.WalletService
}

func NewAdminWalletHandler(wallet *service.WalletService) *AdminWalletHandler {
	return &AdminWalletHandler{wallet: wallet}
}

func respondAdminWalletInvalidRequest(c *gin.Context) {
	respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "invalid request", nil)
}

func extractAdminActor(c *gin.Context) service.AdminWalletActor {
	adminID := strings.TrimSpace(c.GetHeader("X-Admin-ID"))
	if adminID == "" {
		adminID = strings.TrimSpace(c.Query("adminId"))
	}
	adminName := strings.TrimSpace(c.GetHeader("X-Admin-Name"))
	ip := c.ClientIP()
	return service.AdminWalletActor{
		AdminID:   adminID,
		AdminName: adminName,
		AdminIP:   ip,
	}
}

func (h *AdminWalletHandler) AddBalance(c *gin.Context) {
	var req service.AdminBalanceOperationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminWalletInvalidRequest(c)
		return
	}
	actor := extractAdminActor(c)
	result, err := h.wallet.AdminAddBalance(c.Request.Context(), req, actor)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "管理端加款成功", result)
}

func (h *AdminWalletHandler) DeductBalance(c *gin.Context) {
	var req service.AdminBalanceOperationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminWalletInvalidRequest(c)
		return
	}
	actor := extractAdminActor(c)
	result, err := h.wallet.AdminDeductBalance(c.Request.Context(), req, actor)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "管理端扣款成功", result)
}

func (h *AdminWalletHandler) FreezeAccount(c *gin.Context) {
	var req service.AdminFreezeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminWalletInvalidRequest(c)
		return
	}
	actor := extractAdminActor(c)
	result, err := h.wallet.FreezeAccount(c.Request.Context(), req, actor)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "账户冻结成功", result)
}

func (h *AdminWalletHandler) UnfreezeAccount(c *gin.Context) {
	var req service.AdminFreezeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminWalletInvalidRequest(c)
		return
	}
	actor := extractAdminActor(c)
	result, err := h.wallet.UnfreezeAccount(c.Request.Context(), req, actor)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "账户解冻成功", result)
}

func (h *AdminWalletHandler) ListOperations(c *gin.Context) {
	result, err := h.wallet.ListAdminOperations(c.Request.Context(), service.AdminOperationListQuery{
		TransactionID:  strings.TrimSpace(c.Query("transactionId")),
		TargetUserID:   strings.TrimSpace(c.Query("targetUserId")),
		TargetUserType: strings.TrimSpace(c.Query("targetUserType")),
		OperationType:  strings.TrimSpace(c.Query("operationType")),
		AdminID:        strings.TrimSpace(c.Query("adminId")),
		Page:           parsePositiveInt(c.Query("page"), 1),
		Limit:          parsePositiveInt(c.Query("limit"), 20),
	})
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "管理端资金操作记录加载成功", result)
}

func (h *AdminWalletHandler) ReviewWithdraw(c *gin.Context) {
	var req service.WithdrawReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminWalletInvalidRequest(c)
		return
	}
	actor := extractAdminActor(c)
	result, err := h.wallet.ReviewWithdraw(c.Request.Context(), req, actor)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "提现审核处理成功", result)
}

func (h *AdminWalletHandler) ListWithdrawRequests(c *gin.Context) {
	result, err := h.wallet.ListWithdrawRecords(
		c.Request.Context(),
		strings.TrimSpace(c.Query("userId")),
		strings.TrimSpace(c.Query("userType")),
		strings.TrimSpace(c.Query("status")),
		parsePositiveInt(c.Query("page"), 1),
		parsePositiveInt(c.Query("limit"), 20),
	)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "提现记录加载成功", result)
}

func (h *AdminWalletHandler) ListPaymentCallbacks(c *gin.Context) {
	result, err := h.wallet.ListPaymentCallbacks(c.Request.Context(), service.PaymentCallbackListQuery{
		Channel:           strings.TrimSpace(c.Query("channel")),
		EventType:         strings.TrimSpace(c.Query("eventType")),
		Status:            strings.TrimSpace(c.Query("status")),
		Verified:          strings.TrimSpace(c.Query("verified")),
		ThirdPartyOrderID: strings.TrimSpace(c.Query("thirdPartyOrderId")),
		TransactionID:     strings.TrimSpace(c.Query("transactionId")),
		Page:              parsePositiveInt(c.Query("page"), 1),
		Limit:             parsePositiveInt(c.Query("limit"), 20),
	})
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "支付回调记录加载成功", result)
}

func (h *AdminWalletHandler) GetPaymentCallbackDetail(c *gin.Context) {
	result, err := h.wallet.GetPaymentCallbackDetail(c.Request.Context(), strings.TrimSpace(c.Param("id")))
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "支付回调详情加载成功", result)
}

func (h *AdminWalletHandler) ReplayPaymentCallback(c *gin.Context) {
	var req service.PaymentCallbackReplayRequest
	if err := c.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
		respondAdminWalletInvalidRequest(c)
		return
	}
	actor := extractAdminActor(c)
	result, err := h.wallet.ReplayPaymentCallback(c.Request.Context(), strings.TrimSpace(c.Param("id")), actor, req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "支付回调重放成功", result)
}

func (h *AdminWalletHandler) GetPaymentCenterConfig(c *gin.Context) {
	result, err := h.wallet.GetPaymentCenterConfig(c.Request.Context())
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "支付中心配置加载成功", result)
}

func (h *AdminWalletHandler) SavePaymentCenterConfig(c *gin.Context) {
	var req service.PaymentCenterConfigPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminWalletInvalidRequest(c)
		return
	}
	result, err := h.wallet.SavePaymentCenterConfig(c.Request.Context(), req)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "支付中心配置保存成功", result)
}

func (h *AdminWalletHandler) PreviewSettlement(c *gin.Context) {
	var req struct {
		Amount      int64  `json:"amount"`
		RuleSetName string `json:"ruleSetName"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondAdminWalletInvalidRequest(c)
		return
	}
	result, err := h.wallet.PreviewSettlement(c.Request.Context(), req.Amount, req.RuleSetName)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "分账试算成功", result)
}

func (h *AdminWalletHandler) GetSettlementOrder(c *gin.Context) {
	result, err := h.wallet.GetOrderSettlement(c.Request.Context(), strings.TrimSpace(c.Param("id")))
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "订单分账详情加载成功", result)
}

func (h *AdminWalletHandler) GetRiderDepositOverview(c *gin.Context) {
	result, err := h.wallet.GetRiderDepositOverview(c.Request.Context())
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "骑手保证金概览加载成功", result)
}

func (h *AdminWalletHandler) ListRiderDepositRecords(c *gin.Context) {
	result, err := h.wallet.ListRiderDepositRecords(
		c.Request.Context(),
		strings.TrimSpace(c.Query("status")),
		parsePositiveInt(c.Query("page"), 1),
		parsePositiveInt(c.Query("limit"), 20),
	)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "骑手保证金记录加载成功", result)
}

func (h *AdminWalletHandler) AdminRecharge(c *gin.Context) {
	var req struct {
		UserID   string `json:"user_id"`
		UserType string `json:"user_type"`
		Amount   int64  `json:"amount"`
		Note     string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.UserID == "" || req.Amount <= 0 {
		respondErrorEnvelope(c, http.StatusBadRequest, responseCodeInvalidArgument, "参数错误", nil)
		return
	}
	actor := extractAdminActor(c)
	result, err := h.wallet.AdminAddBalance(c.Request.Context(), service.AdminBalanceOperationRequest{
		TargetUserID:   req.UserID,
		TargetUserType: req.UserType,
		Amount:         req.Amount,
		Reason:         "recharge",
		Remark:         req.Note,
	}, actor)
	if err != nil {
		writeWalletServiceError(c, err)
		return
	}
	respondMirroredSuccessEnvelope(c, "管理端充值成功", result)
}
