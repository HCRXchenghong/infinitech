/**
 * Financial center controller (admin)
 */

const { proxyGet, requestGoRaw, buildNormalizedErrorPayload } = require("../utils/goProxy");
const { logger } = require("../utils/logger");
const { verifyCriticalCredential } = require("../utils/criticalActionVerify");
const { buildErrorEnvelopePayload } = require("../utils/apiEnvelope");

const FINANCIAL_LOG_VERIFY_ACCOUNT = String(
  process.env.FINANCIAL_LOG_VERIFY_ACCOUNT ||
  process.env.SYSTEM_LOG_DELETE_ACCOUNT ||
  ""
).trim();
const FINANCIAL_LOG_VERIFY_PASSWORD = String(
  process.env.FINANCIAL_LOG_VERIFY_PASSWORD ||
  process.env.SYSTEM_LOG_DELETE_PASSWORD ||
  ""
);

function isMutationCredentialConfigured() {
  return Boolean(FINANCIAL_LOG_VERIFY_ACCOUNT && FINANCIAL_LOG_VERIFY_PASSWORD);
}

function respondFinancialError(req, res, status, message, options = {}) {
  return res.status(status).json(
    buildErrorEnvelopePayload(req, status, message, {
      code: options.code,
      data: options.data,
      legacy: options.legacy,
    }),
  );
}

function sendNormalizedFinancialUpstreamError(req, res, error, defaultErrorMessage) {
  const status = Number(error.response?.status || 500);
  return res.status(status).json(
    buildNormalizedErrorPayload(req, error, status, defaultErrorMessage),
  );
}

function verifyMutationCredential(req, action) {
  if (!isMutationCredentialConfigured()) {
    logger.error(`POST /api/admin/financial/transaction-logs/${action}`, {
      action: `financial_log_${action}_verify_unconfigured`
    });
    return {
      ok: false,
      status: 503,
      error: "\u8d22\u52a1\u65e5\u5fd7\u654f\u611f\u64cd\u4f5c\u672a\u914d\u7f6e\u4e8c\u6b21\u6821\u9a8c\u53e3\u4ee4\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458"
    };
  }

  const verifyAccount = String(req.body?.verifyAccount || "").trim();
  const verifyPassword = String(req.body?.verifyPassword || "");
  const operatorId = String(req.operator?.operatorId || "");
  const operatorName = String(req.operator?.operatorName || "");
  const verified = verifyCriticalCredential({
    req,
    verifyAccount,
    verifyPassword,
    expectedAccount: FINANCIAL_LOG_VERIFY_ACCOUNT,
    expectedPassword: FINANCIAL_LOG_VERIFY_PASSWORD,
  });

  if (!verified.ok) {
    logger.warn(`POST /api/admin/financial/transaction-logs/${action}`, {
      action: `financial_log_${action}_verify_failed`,
      operatorId,
      operatorName,
      ip: req.ip,
      principal: verified.principal,
      remainingAttempts: verified.remainingAttempts,
      lockedUntil: verified.lockedUntil || null,
    });
    return {
      ok: false,
      operatorId,
      operatorName,
      status: verified.status,
      error: verified.error,
      lockedUntil: verified.lockedUntil || 0,
    };
  }

  return {
    ok: true,
    operatorId,
    operatorName,
    principal: verified.principal,
  };
}

async function getOverview(req, res, next) {
  await proxyGet(req, res, next, "/admin/financial/overview");
}

async function getStatistics(req, res, next) {
  await proxyGet(req, res, next, "/admin/financial/statistics");
}

async function getUserDetails(req, res, next) {
  await proxyGet(req, res, next, "/admin/financial/user-details");
}

async function exportData(req, res, next) {
  await proxyGet(req, res, next, "/admin/financial/export");
}

async function getTransactionLogs(req, res, next) {
  await proxyGet(req, res, next, "/admin/financial/transaction-logs");
}

function forwardMutationRequest(req, path, payload = {}) {
  return requestGoRaw(req, {
    method: "post",
    path,
    data: payload,
    timeout: 15000,
    validateStatus: (status) => status < 500,
  });
}

async function deleteTransactionLog(req, res, next) {
  const verify = verifyMutationCredential(req, "delete");
  if (!verify.ok) {
    return respondFinancialError(
      req,
      res,
      verify.status || 401,
      verify.error || "\u4e8c\u6b21\u9a8c\u8bc1\u5931\u8d25\uff0c\u8d26\u53f7\u6216\u5bc6\u7801\u9519\u8bef",
      {
        data: { lockedUntil: verify.lockedUntil || null },
        legacy: { lockedUntil: verify.lockedUntil || null },
      },
    );
  }

  const sourceType = String(req.body?.sourceType || "wallet_transaction").trim() || "wallet_transaction";
  const recordId = String(req.body?.recordId || req.body?.id || "").trim();
  const reason = String(req.body?.reason || "").trim();
  if (!recordId) {
    return respondFinancialError(req, res, 400, "\u7f3a\u5c11\u5fc5\u8981\u53c2\u6570\uff08recordId\uff09");
  }

  try {
    const response = await forwardMutationRequest(req, "/admin/financial/transaction-logs/delete", {
      id: recordId,
      recordId,
      sourceType,
      reason,
    });

    if (response.status >= 200 && response.status < 300) {
      logger.info("POST /api/admin/financial/transaction-logs/delete", {
        action: "delete_financial_log",
        targetId: recordId,
        sourceType,
        reason: reason || "未提供",
        operatorId: verify.operatorId,
        operatorName: verify.operatorName,
        ip: req.ip,
      });
    }

    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return sendNormalizedFinancialUpstreamError(req, res, error, "删除财务日志失败");
    }
    return next(error);
  }
}

async function clearTransactionLogs(req, res, next) {
  const verify = verifyMutationCredential(req, "clear");
  if (!verify.ok) {
    return respondFinancialError(
      req,
      res,
      verify.status || 401,
      verify.error || "\u4e8c\u6b21\u9a8c\u8bc1\u5931\u8d25\uff0c\u8d26\u53f7\u6216\u5bc6\u7801\u9519\u8bef",
      {
        data: { lockedUntil: verify.lockedUntil || null },
        legacy: { lockedUntil: verify.lockedUntil || null },
      },
    );
  }

  try {
    const reason = String(req.body?.reason || "").trim();
    const response = await forwardMutationRequest(req, "/admin/financial/transaction-logs/clear", { reason });

    if (response.status >= 200 && response.status < 300) {
      logger.info("POST /api/admin/financial/transaction-logs/clear", {
        action: "clear_financial_logs",
        cleared: Number(response.data?.cleared || 0),
        reason: reason || "未提供",
        operatorId: verify.operatorId,
        operatorName: verify.operatorName,
        ip: req.ip,
      });
    }

    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return sendNormalizedFinancialUpstreamError(req, res, error, "清空财务日志失败");
    }
    return next(error);
  }
}

module.exports = {
  getOverview,
  getStatistics,
  getUserDetails,
  exportData,
  getTransactionLogs,
  deleteTransactionLog,
  clearTransactionLogs,
};
