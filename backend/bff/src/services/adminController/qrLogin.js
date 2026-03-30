const crypto = require("crypto");
const { createClient } = require("redis");
const config = require("../../config");
const { logger } = require("../../utils/logger");
const { extractVerifiedAdminIdentity } = require("../../utils/authIdentity");
const {
  QR_LOGIN_SESSION_TTL_MS,
  QR_LOGIN_POLL_INTERVAL_MS,
  QR_LOGIN_FINAL_KEEP_MS,
  QR_LOGIN_DOWNLOAD_PATH,
  QR_LOGIN_PAYLOAD_PARAM,
  buildQrLoginEncryptedPayload,
  resolveQrTicketFromRequest,
  resolveWebBaseUrl,
  nowMs,
  buildFallbackAdminUser,
  isAllowedAdminType,
  validateAdminToken,
  buildVerifiedAdminUser,
  verifyToken,
} = require("./qrCommon");

const localQrLoginSessions = new Map();
const QR_LOGIN_REDIS_PREFIX = "bff:admin:qr-login";
const REDIS_RETRY_DELAY_MS = 30_000;

let redisClient = null;
let redisConnectionAttempt = null;
let redisDisabledUntil = 0;

function createQrTicket() {
  return `${Date.now().toString(36)}${crypto.randomBytes(12).toString("hex")}`;
}

function normalizeSessionTicket(ticket) {
  return String(ticket || "").trim();
}

function getRedisKey(ticket) {
  const normalizedTicket = normalizeSessionTicket(ticket);
  return normalizedTicket ? `${QR_LOGIN_REDIS_PREFIX}:${normalizedTicket}` : "";
}

function cloneSession(session) {
  return session ? JSON.parse(JSON.stringify(session)) : null;
}

function markSessionExpired(session, currentTime) {
  if (!session) {
    return false;
  }
  if (
    currentTime > session.expiresAt
    && (session.status === "pending" || session.status === "scanned")
  ) {
    session.status = "expired";
    session.expiredAt = currentTime;
    return true;
  }
  return false;
}

function getFinalAt(session) {
  return session?.consumedAt || session?.confirmedAt || session?.rejectedAt || session?.expiredAt || 0;
}

function getSessionTtlSeconds(session, currentTime = nowMs()) {
  const finalAt = getFinalAt(session);
  const expiryDeadline = Math.max(
    Number(session?.expiresAt || 0) + QR_LOGIN_FINAL_KEEP_MS,
    finalAt > 0 ? finalAt + QR_LOGIN_FINAL_KEEP_MS : 0
  );
  const ttlMs = Math.max(expiryDeadline - currentTime, 0);
  return Math.ceil(ttlMs / 1000);
}

async function connectRedis() {
  if (!config.redis?.enabled) {
    return null;
  }
  if (redisClient?.isOpen) {
    return redisClient;
  }
  if (redisConnectionAttempt) {
    return redisConnectionAttempt;
  }
  if (Date.now() < redisDisabledUntil) {
    return null;
  }

  const client = createClient({
    socket: {
      host: config.redis.host,
      port: Number(config.redis.port || 2550),
      connectTimeout: 1000,
      reconnectStrategy: false,
    },
    password: config.redis.password || undefined,
    database: Number(config.redis.db || 0),
  });

  client.on("error", (err) => {
    logger.warn("BFF qr-login redis client error", { message: err.message });
  });

  redisConnectionAttempt = client.connect()
    .then(() => {
      redisClient = client;
      redisDisabledUntil = 0;
      return redisClient;
    })
    .catch((err) => {
      redisDisabledUntil = Date.now() + REDIS_RETRY_DELAY_MS;
      logger.warn("BFF qr-login redis store falling back to in-memory sessions", {
        message: err.message,
      });
      try {
        client.disconnect();
      } catch (_error) {
        // ignore cleanup errors
      }
      return null;
    })
    .finally(() => {
      redisConnectionAttempt = null;
    });

  return redisConnectionAttempt;
}

async function loadRedisSession(ticket) {
  const redisKey = getRedisKey(ticket);
  if (!redisKey) {
    return null;
  }

  try {
    const client = await connectRedis();
    if (!client) {
      return null;
    }
    const raw = await client.get(redisKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    logger.warn("BFF qr-login redis read failed", {
      ticket: normalizeSessionTicket(ticket),
      message: err?.message || err,
    });
    return null;
  }
}

async function saveRedisSession(session) {
  const redisKey = getRedisKey(session?.ticket);
  if (!redisKey) {
    return false;
  }

  try {
    const client = await connectRedis();
    if (!client) {
      return false;
    }

    const ttlSeconds = getSessionTtlSeconds(session);
    if (ttlSeconds <= 0) {
      await client.del(redisKey);
      return true;
    }

    await client.set(redisKey, JSON.stringify(session), { EX: ttlSeconds });
    return true;
  } catch (err) {
    logger.warn("BFF qr-login redis write failed", {
      ticket: normalizeSessionTicket(session?.ticket),
      message: err?.message || err,
    });
    return false;
  }
}

async function cleanupLocalSessions() {
  const currentTime = nowMs();
  for (const [ticket, session] of localQrLoginSessions.entries()) {
    markSessionExpired(session, currentTime);
    const finalAt = getFinalAt(session);
    const keepDeadline = Math.max(
      Number(session?.expiresAt || 0) + QR_LOGIN_FINAL_KEEP_MS,
      finalAt > 0 ? finalAt + QR_LOGIN_FINAL_KEEP_MS : 0
    );
    if (!keepDeadline || currentTime > keepDeadline) {
      localQrLoginSessions.delete(ticket);
    }
  }
}

async function getQrLoginSession(ticket) {
  await cleanupLocalSessions();
  const normalizedTicket = normalizeSessionTicket(ticket);
  if (!normalizedTicket) {
    return null;
  }

  let session = await loadRedisSession(normalizedTicket);
  if (!session) {
    session = localQrLoginSessions.get(normalizedTicket) || null;
  }
  if (!session) {
    return null;
  }

  const changed = markSessionExpired(session, nowMs());
  localQrLoginSessions.set(normalizedTicket, cloneSession(session));
  if (changed) {
    await saveRedisSession(session);
  }
  return session;
}

async function persistQrLoginSession(session) {
  const normalizedTicket = normalizeSessionTicket(session?.ticket);
  if (!normalizedTicket) {
    return;
  }
  localQrLoginSessions.set(normalizedTicket, cloneSession(session));
  await saveRedisSession(session);
}

function buildQrSessionPublicData(session) {
  const remainMs = Math.max(0, session.expiresAt - nowMs());
  return {
    ticket: session.ticket,
    status: session.status,
    expiresAt: session.expiresAt,
    remainSeconds: Math.ceil(remainMs / 1000),
    pollIntervalMs: QR_LOGIN_POLL_INTERVAL_MS,
    scannedByName: session.scannedBy?.name || "",
  };
}

function resolveAuthorizedAdminIdentity(req) {
  const identity = req.adminAuth || extractVerifiedAdminIdentity(req, { normalizeType: true });
  if (!identity?.token) {
    return { ok: false, status: 401, error: "未登录，请先在管理端 App 登录" };
  }

  if (!req.adminAuth) {
    if (!identity.verification?.valid) {
      return { ok: false, status: 401, error: "登录状态已失效，请重新登录" };
    }
    if (!isAllowedAdminType(identity.type)) {
      return { ok: false, status: 403, error: "权限不足" };
    }
    if (!identity.id) {
      return { ok: false, status: 401, error: "无效凭证，缺少身份标识" };
    }
  }

  return { ok: true, identity };
}

async function ensureValidAdminIdentity(req, res) {
  const auth = resolveAuthorizedAdminIdentity(req);
  if (!auth.ok) {
    res.status(auth.status).json({
      success: false,
      error: auth.error,
    });
    return null;
  }

  const valid = await validateAdminToken(auth.identity.token);
  if (!valid) {
    res.status(401).json({
      success: false,
      error: "登录状态已失效，请重新登录",
    });
    return null;
  }

  return auth.identity;
}

async function createQrLoginSession(req, res) {
  const ticket = createQrTicket();
  const createdAt = nowMs();
  const webBaseUrl = resolveWebBaseUrl(req);
  const session = {
    ticket,
    createdAt,
    expiresAt: createdAt + QR_LOGIN_SESSION_TTL_MS,
    status: "pending",
    scannedAt: 0,
    scannedBy: null,
    confirmedAt: 0,
    rejectedAt: 0,
    expiredAt: 0,
    consumedAt: 0,
    authorizedToken: "",
    authorizedUser: null,
  };

  await persistQrLoginSession(session);
  const encryptedPayload = buildQrLoginEncryptedPayload(ticket, session.expiresAt);
  const qrText = `${webBaseUrl}${QR_LOGIN_DOWNLOAD_PATH}?${QR_LOGIN_PAYLOAD_PARAM}=${encodeURIComponent(encryptedPayload)}`;

  res.json({
    success: true,
    data: {
      ...buildQrSessionPublicData(session),
      qrText,
      encryptedPayload,
      expiresIn: Math.ceil(QR_LOGIN_SESSION_TTL_MS / 1000),
    },
  });
}

async function getQrLoginSessionStatus(req, res) {
  const ticket = String(req.params.ticket || "").trim();
  if (!ticket) {
    return res.status(400).json({
      success: false,
      error: "缺少二维码会话编号",
    });
  }

  const session = await getQrLoginSession(ticket);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: "二维码已失效，请刷新后重试",
    });
  }

  if (session.status === "confirmed" && session.authorizedToken) {
    session.status = "consumed";
    session.consumedAt = nowMs();
    await persistQrLoginSession(session);
    return res.json({
      success: true,
      data: {
        ...buildQrSessionPublicData(session),
        status: "confirmed",
        token: session.authorizedToken,
        user: session.authorizedUser,
      },
    });
  }

  return res.json({
    success: true,
    data: buildQrSessionPublicData(session),
  });
}

async function scanQrLoginSession(req, res) {
  const ticket = resolveQrTicketFromRequest(req);
  if (!ticket) {
    return res.status(400).json({
      success: false,
      error: "二维码内容无效或已过期",
    });
  }

  const identity = await ensureValidAdminIdentity(req, res);
  if (!identity) {
    return null;
  }

  const session = await getQrLoginSession(ticket);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: "二维码已失效，请刷新后重试",
    });
  }

  if (session.status === "expired") {
    return res.status(409).json({
      success: false,
      error: "二维码已过期，请刷新后重试",
    });
  }

  if (session.status === "rejected") {
    return res.status(409).json({
      success: false,
      error: "该二维码已被拒绝，请刷新后重试",
    });
  }

  if (session.status === "confirmed" || session.status === "consumed") {
    return res.status(409).json({
      success: false,
      error: "该二维码已完成登录",
    });
  }

  const scanUser = buildFallbackAdminUser(identity, req.body?.user);
  session.status = "scanned";
  session.scannedAt = nowMs();
  session.scannedBy = {
    id: scanUser.id,
    name: scanUser.name,
    type: scanUser.type,
  };
  await persistQrLoginSession(session);

  return res.json({
    success: true,
    data: buildQrSessionPublicData(session),
  });
}

async function confirmQrLoginSession(req, res) {
  const ticket = resolveQrTicketFromRequest(req);
  const approve = req.body?.approve !== false;

  if (!ticket) {
    return res.status(400).json({
      success: false,
      error: "二维码内容无效或已过期",
    });
  }

  const identity = await ensureValidAdminIdentity(req, res);
  if (!identity) {
    return null;
  }

  const session = await getQrLoginSession(ticket);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: "二维码已失效，请刷新后重试",
    });
  }

  if (session.status === "expired") {
    return res.status(409).json({
      success: false,
      error: "二维码已过期，请刷新后重试",
    });
  }

  if (session.status === "consumed") {
    return res.status(409).json({
      success: false,
      error: "该二维码已完成登录",
    });
  }

  const currentUser = buildFallbackAdminUser(identity, req.body?.user);
  if (session.scannedBy?.id && currentUser.id && session.scannedBy.id !== currentUser.id) {
    return res.status(403).json({
      success: false,
      error: "请使用同一账号完成扫码确认",
    });
  }

  if (!approve) {
    session.status = "rejected";
    session.rejectedAt = nowMs();
    session.authorizedToken = "";
    session.authorizedUser = null;
    await persistQrLoginSession(session);
    return res.json({
      success: true,
      data: buildQrSessionPublicData(session),
    });
  }

  const upstreamUser = buildVerifiedAdminUser(identity);
  session.status = "confirmed";
  session.confirmedAt = nowMs();
  session.scannedAt = session.scannedAt || session.confirmedAt;
  session.scannedBy = session.scannedBy || {
    id: currentUser.id,
    name: currentUser.name,
    type: currentUser.type,
  };
  session.authorizedToken = identity.token;
  session.authorizedUser = upstreamUser || currentUser;
  await persistQrLoginSession(session);

  return res.json({
    success: true,
    data: buildQrSessionPublicData(session),
  });
}

module.exports = {
  verifyToken,
  createQrLoginSession,
  getQrLoginSessionStatus,
  scanQrLoginSession,
  confirmQrLoginSession,
};
