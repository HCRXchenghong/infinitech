const crypto = require("crypto");
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

const qrLoginSessions = new Map();

function createQrTicket() {
  return `${Date.now().toString(36)}${crypto.randomBytes(12).toString("hex")}`;
}

function markSessionExpired(session, currentTime) {
  if (!session) {
    return;
  }
  if (currentTime > session.expiresAt && (session.status === "pending" || session.status === "scanned")) {
    session.status = "expired";
    session.expiredAt = currentTime;
  }
}

function cleanupQrLoginSessions() {
  const currentTime = nowMs();
  for (const [ticket, session] of qrLoginSessions.entries()) {
    markSessionExpired(session, currentTime);

    const finalAt = session.consumedAt || session.confirmedAt || session.rejectedAt || session.expiredAt;
    if (finalAt && currentTime - finalAt > QR_LOGIN_FINAL_KEEP_MS) {
      qrLoginSessions.delete(ticket);
    }
  }
}

function getQrLoginSession(ticket) {
  cleanupQrLoginSessions();
  const key = String(ticket || "").trim();
  if (!key) {
    return null;
  }
  const session = qrLoginSessions.get(key);
  if (!session) {
    return null;
  }
  markSessionExpired(session, nowMs());
  return session;
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

function createQrLoginSession(req, res) {
  cleanupQrLoginSessions();

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

  qrLoginSessions.set(ticket, session);
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

function getQrLoginSessionStatus(req, res) {
  const ticket = String(req.params.ticket || "").trim();
  if (!ticket) {
    return res.status(400).json({
      success: false,
      error: "缺少二维码会话编号",
    });
  }

  const session = getQrLoginSession(ticket);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: "二维码已失效，请刷新后重试",
    });
  }

  if (session.status === "confirmed" && session.authorizedToken) {
    session.status = "consumed";
    session.consumedAt = nowMs();
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

  const session = getQrLoginSession(ticket);
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

  const session = getQrLoginSession(ticket);
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
