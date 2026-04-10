/**
 * System Logs Controller - 系统日志聚合控制器
 * 聚合 BFF 与 Go 的日志，并生成面向运营人员的可读操作描述。
 */

const fs = require("fs");
const { logger } = require("../utils/logger");
const { verifyCriticalCredential } = require("../utils/criticalActionVerify");
const {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  ALLOWED_SOURCES,
  ALLOWED_ACTIONS,
  BFF_LOG_PATH,
  GO_LOG_PATH,
} = require("./systemLogs/constants");
const {
  toPositiveInt,
  parseDateToMs,
  normalizeSource,
  getFilePathBySource,
  summarizeAction,
  removeFirstMatchedLine,
  clearLogFile,
} = require("./systemLogs/helpers");
const { collectServiceStatus } = require("./systemLogs/healthStatus");
const { loadEntries } = require("./systemLogs/parsing");

const LOG_DELETE_VERIFY_ACCOUNT = String(process.env.SYSTEM_LOG_DELETE_ACCOUNT || "").trim();
const LOG_DELETE_VERIFY_PASSWORD = String(process.env.SYSTEM_LOG_DELETE_PASSWORD || "");

function isSystemLogMutationCredentialConfigured() {
  return Boolean(LOG_DELETE_VERIFY_ACCOUNT && LOG_DELETE_VERIFY_PASSWORD);
}

function handleControllerError(res, error, context, message) {
  logger.error(context, {
    code: error && error.code ? String(error.code) : "",
    message: error && error.message ? String(error.message) : "",
  });
  return res.status(500).json({
    success: false,
    error: message
  });
}

async function listSystemLogs(req, res) {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const source = ALLOWED_SOURCES.has(req.query.source) ? req.query.source : "all";
    const action = ALLOWED_ACTIONS.has(req.query.action) ? req.query.action : "all";
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    const startMs = parseDateToMs(req.query.startTime);
    const endMs = parseDateToMs(req.query.endTime);

    const entries = loadEntries(source).sort((a, b) => b.timestampMs - a.timestampMs);

    const filtered = entries.filter((item) => {
      if (action !== "all" && item.actionType !== action) {
        return false;
      }

      if (startMs !== null && item.timestampMs < startMs) {
        return false;
      }
      if (endMs !== null && item.timestampMs > endMs) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        item.source,
        item.sourceLabel,
        item.actionType,
        item.actionLabel,
        item.operation,
        item.method,
        item.path,
        item.operatorId,
        item.operatorName,
        item.actorType,
        item.actionScene,
        item.actionSubject,
        item.message,
        item.raw
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(keyword);
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paged = filtered.slice(startIndex, startIndex + limit);
    const serviceStatus = await collectServiceStatus();

    return res.json({
      success: true,
      items: paged,
      pagination: {
        page,
        limit,
        total
      },
      summary: summarizeAction(filtered),
      serviceStatus,
      files: {
        bffLog: BFF_LOG_PATH,
        goLog: GO_LOG_PATH,
        bffExists: fs.existsSync(BFF_LOG_PATH),
        goExists: fs.existsSync(GO_LOG_PATH)
      }
    });
  } catch (error) {
    return handleControllerError(res, error, "listSystemLogs", "加载系统日志失败");
  }
}

async function getSystemHealth(req, res) {
  try {
    const serviceStatus = await collectServiceStatus();
    return res.json({
      success: true,
      serviceStatus
    });
  } catch (error) {
    return handleControllerError(res, error, "getSystemHealth", "加载系统健康状态失败");
  }
}

function verifySystemLogMutation(req, action) {
  if (!isSystemLogMutationCredentialConfigured()) {
    logger.error("POST /api/system-logs/" + action, {
      action: `system_log_${action}_verify_unconfigured`,
    });
    return {
      ok: false,
      status: 503,
      error: "系统日志敏感操作未配置二次校验口令，请联系管理员",
      lockedUntil: null,
      operatorId: String(req.operator?.operatorId || ""),
      operatorName: String(req.operator?.operatorName || ""),
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
    expectedAccount: LOG_DELETE_VERIFY_ACCOUNT,
    expectedPassword: LOG_DELETE_VERIFY_PASSWORD,
  });

  if (!verified.ok) {
    const route = action === "clear" ? "clear" : "delete";
    const actionKey = action === "clear" ? "clear_system_logs" : "delete_system_log";
    logger.warn("POST /api/system-logs/" + route, {
      action: actionKey + "_verify_failed",
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
      status: verified.status || 401,
      error: verified.error || "二次验证失败，账号或密码错误",
      lockedUntil: verified.lockedUntil || null,
    };
  }

  return {
    ok: true,
    operatorId,
    operatorName,
    principal: verified.principal,
  };
}

async function deleteSystemLog(req, res) {
  try {
    const verify = verifySystemLogMutation(req, "delete");
    if (!verify.ok) {
      return res.status(verify.status).json({
        success: false,
        error: verify.error,
        lockedUntil: verify.lockedUntil,
      });
    }

    const source = normalizeSource(req.body?.source);
    const raw = String(req.body?.raw || "");
    if (!source || !raw) {
      return res.status(400).json({
        success: false,
        error: "缺少必要参数（source/raw）"
      });
    }

    const filePath = getFilePathBySource(source);
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "无效的日志来源"
      });
    }

    const result = removeFirstMatchedLine(filePath, raw);
    if (!result.removed) {
      return res.status(404).json({
        success: false,
        error: "未找到该条日志，可能已被删除"
      });
    }

    logger.info("POST /api/system-logs/delete", {
      action: "delete_system_log",
      targetSource: source,
      targetPreview: raw.slice(0, 200),
      operatorId: verify.operatorId,
      operatorName: verify.operatorName,
      ip: req.ip
    });

    return res.json({
      success: true
    });
  } catch (error) {
    return handleControllerError(res, error, "deleteSystemLog", "删除日志失败");
  }
}

async function clearSystemLogs(req, res) {
  try {
    const verify = verifySystemLogMutation(req, "clear");
    if (!verify.ok) {
      return res.status(verify.status).json({
        success: false,
        error: verify.error,
        lockedUntil: verify.lockedUntil,
      });
    }

    const source = ALLOWED_SOURCES.has(req.body?.source) ? req.body?.source : "";
    if (!source) {
      return res.status(400).json({
        success: false,
        error: "无效的日志来源"
      });
    }

    const targetSources = source === "all" ? ["bff", "go"] : [source];
    const details = targetSources.map((itemSource) => {
      const filePath = getFilePathBySource(itemSource);
      const result = clearLogFile(filePath);
      return {
        source: itemSource,
        filePath,
        exists: result.exists,
        cleared: result.cleared
      };
    });

    const cleared = details.reduce((sum, item) => sum + Number(item.cleared || 0), 0);

    logger.info("POST /api/system-logs/clear", {
      action: "clear_system_logs",
      targetSource: source,
      cleared,
      details,
      operatorId: verify.operatorId,
      operatorName: verify.operatorName,
      ip: req.ip
    });


    return res.json({
      success: true,
      cleared,
      details
    });
  } catch (error) {
    return handleControllerError(res, error, "clearSystemLogs", "清空日志失败");
  }
}

module.exports = {
  listSystemLogs,
  getSystemHealth,
  deleteSystemLog,
  clearSystemLogs
};
