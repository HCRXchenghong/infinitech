/**
 * Admin controller - 管理后台控制器
 */

const { logger } = require("../utils/logger");
const { proxyGet, proxyPost, proxyPut, proxyDelete } = require("../utils/goProxy");
const {
  verifyToken,
  createQrLoginSession,
  getQrLoginSessionStatus,
  scanQrLoginSession,
  confirmQrLoginSession,
} = require("./adminController/qrLogin");

function maskPhone(phone) {
  const raw = String(phone || "").trim();
  if (!/^1\d{10}$/.test(raw)) {
    return raw;
  }
  return `${raw.slice(0, 3)}****${raw.slice(-4)}`;
}

async function login(req, res, next) {
  const phone = maskPhone(req.body?.phone || "");
  const loginType = String(req.body?.loginType || "").trim() || (req.body?.code ? "code" : "password");
  logger.info(`📤 [BFF] 转发管理员登录请求到 Go 后端: /api/login (${phone}, ${loginType})`);
  await proxyPost(req, res, next, "/login", { timeout: 5000 });
}

async function sendAdminSMSCode(req, res, next) {
  const { scene } = req.body || {};
  const payload = {
    ...req.body,
    scene: scene || "login"
  };
  const phone = maskPhone(payload.phone || "");
  logger.info(`📤 [BFF] 转发管理员验证码请求到 Go 后端: /api/sms/request (${phone})`);
  await proxyPost(req, res, next, "/sms/request", {
    timeout: 5000,
    data: payload
  });
}

async function getAdmins(req, res, next) {
  await proxyGet(req, res, next, "/admins", { params: req.query });
}

async function createAdmin(req, res, next) {
  await proxyPost(req, res, next, "/admins");
}

async function updateAdmin(req, res, next) {
  await proxyPut(req, res, next, `/admins/${req.params.id}`);
}

async function deleteAdmin(req, res, next) {
  await proxyDelete(req, res, next, `/admins/${req.params.id}`);
}

async function resetAdminPassword(req, res, next) {
  await proxyPost(req, res, next, `/admins/${req.params.id}/reset-password`, {
    data: req.body || {}
  });
}

async function changeOwnPassword(req, res, next) {
  await proxyPost(req, res, next, "/admins/change-password", {
    data: req.body || {}
  });
}

module.exports = {
  login,
  verifyToken,
  sendAdminSMSCode,
  createQrLoginSession,
  getQrLoginSessionStatus,
  scanQrLoginSession,
  confirmQrLoginSession,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resetAdminPassword,
  changeOwnPassword
};
