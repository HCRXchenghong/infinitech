const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_FAILED_ATTEMPTS = 2;
const DEFAULT_LOCK_HOURS = 24;
const ONE_HOUR_MS = 60 * 60 * 1000;

function toPositiveInt(raw, fallback) {
  const value = Number.parseInt(String(raw || ''), 10);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

const MAX_FAILED_ATTEMPTS = toPositiveInt(
  process.env.CRITICAL_VERIFY_MAX_FAILED_ATTEMPTS,
  DEFAULT_MAX_FAILED_ATTEMPTS
);
const LOCK_DURATION_HOURS = toPositiveInt(
  process.env.CRITICAL_VERIFY_LOCK_HOURS,
  DEFAULT_LOCK_HOURS
);
const LOCK_DURATION_MS = LOCK_DURATION_HOURS * ONE_HOUR_MS;
const STATE_PATH = path.resolve(__dirname, '../../logs/critical-verify-state.json');

let loaded = false;
let state = { principals: {} };

function normalizeIp(rawIp) {
  const text = String(rawIp || '').trim();
  if (!text) {
    return '';
  }
  if (text.startsWith('::ffff:')) {
    return text.slice(7);
  }
  if (text === '::1') {
    return '127.0.0.1';
  }
  return text;
}

function extractClientIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '')
    .split(',')
    .map((item) => item.trim())
    .find(Boolean);
  const candidate = forwarded || req?.ip || req?.socket?.remoteAddress || '';
  return normalizeIp(candidate);
}

function buildPrincipalKey(req) {
  const operatorId = String(req?.operator?.operatorId || '').trim();
  if (operatorId) {
    return `operator:${operatorId}`;
  }
  const ip = extractClientIp(req);
  if (ip) {
    return `ip:${ip}`;
  }
  return 'anonymous';
}

function ensureStateLoaded() {
  if (loaded) {
    return;
  }
  loaded = true;
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return;
    }
    const text = fs.readFileSync(STATE_PATH, 'utf8');
    if (!text) {
      return;
    }
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && parsed.principals && typeof parsed.principals === 'object') {
      state = parsed;
    }
  } catch (error) {
    state = { principals: {} };
  }
}

function persistState() {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function resetExpiredRecords(nowMs) {
  const principals = state.principals || {};
  Object.keys(principals).forEach((key) => {
    const record = principals[key];
    if (!record || typeof record !== 'object') {
      delete principals[key];
      return;
    }

    const lockedUntil = Number(record.lockedUntil || 0);
    const windowStart = Number(record.windowStart || 0);
    if (lockedUntil > 0 && lockedUntil <= nowMs) {
      delete principals[key];
      return;
    }
    if (lockedUntil <= 0 && windowStart > 0 && nowMs-windowStart > LOCK_DURATION_MS) {
      delete principals[key];
    }
  });
}

function formatLockTime(timestampMs) {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return '未知时间';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function verifyCriticalCredential({
  req,
  verifyAccount,
  verifyPassword,
  expectedAccount,
  expectedPassword,
}) {
  ensureStateLoaded();
  const nowMs = Date.now();
  resetExpiredRecords(nowMs);

  const principal = buildPrincipalKey(req);
  const principals = state.principals || {};
  const current = principals[principal] || {
    failedCount: 0,
    windowStart: 0,
    lockedUntil: 0,
    updatedAt: 0,
  };

  if (Number(current.lockedUntil || 0) > nowMs) {
    const lockedUntil = Number(current.lockedUntil);
    return {
      ok: false,
      status: 423,
      error: `验证已锁定，请于 ${formatLockTime(lockedUntil)} 后重试`,
      principal,
      lockedUntil,
      remainingAttempts: 0,
    };
  }

  const accountMatched = String(verifyAccount || '').trim() === String(expectedAccount || '').trim();
  const passwordMatched = String(verifyPassword || '') === String(expectedPassword || '');
  if (accountMatched && passwordMatched) {
    delete principals[principal];
    state.principals = principals;
    persistState();
    return {
      ok: true,
      status: 200,
      principal,
      lockedUntil: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
    };
  }

  let failedCount = Number(current.failedCount || 0);
  let windowStart = Number(current.windowStart || 0);
  if (windowStart <= 0 || nowMs-windowStart > LOCK_DURATION_MS) {
    failedCount = 0;
    windowStart = nowMs;
  }

  failedCount += 1;
  let lockedUntil = 0;
  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = nowMs + LOCK_DURATION_MS;
  }

  principals[principal] = {
    failedCount,
    windowStart,
    lockedUntil,
    updatedAt: nowMs,
  };
  state.principals = principals;
  persistState();

  if (lockedUntil > 0) {
    return {
      ok: false,
      status: 423,
      error: `二次验证失败次数已达上限，已锁定24小时（至 ${formatLockTime(lockedUntil)}）`,
      principal,
      lockedUntil,
      remainingAttempts: 0,
    };
  }

  const remainingAttempts = Math.max(MAX_FAILED_ATTEMPTS - failedCount, 0);
  return {
    ok: false,
    status: 401,
    error: `二次验证失败，账号或密码错误（24小时内剩余 ${remainingAttempts} 次）`,
    principal,
    lockedUntil: 0,
    remainingAttempts,
  };
}

module.exports = {
  verifyCriticalCredential,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_HOURS,
  LOCK_DURATION_MS,
};
