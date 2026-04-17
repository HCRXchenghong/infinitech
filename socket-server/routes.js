import express from 'express';
import { generateToken } from './auth.js';
import {
  buildErrorEnvelopePayload,
  buildSuccessEnvelopePayload,
} from '../packages/contracts/src/http.js';

const router = express.Router();

function normalizeBearerToken(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^bearer\s+/i.test(raw) ? raw.replace(/^bearer\s+/i, '').trim() : raw;
}

function loadLegacyUsers() {
  const raw = String(process.env.SOCKET_LEGACY_LOGIN_USERS || '').trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce((acc, [username, value]) => {
      if (!value || typeof value !== 'object') {
        return acc;
      }

      const password = String(value.password || '').trim();
      const role = String(value.role || '').trim().toLowerCase();
      if (!password || !role) {
        return acc;
      }

      acc[String(username)] = { password, role };
      return acc;
    }, {});
  } catch (_err) {
    return {};
  }
}

function isLegacyLoginEnabled() {
  return String(process.env.SOCKET_ENABLE_LEGACY_LOGIN || '').trim().toLowerCase() === 'true';
}

function sendSuccess(res, req, statusCode, message, data, options = {}) {
  const payload = buildSuccessEnvelopePayload(req, message, data, {
    legacy: data && typeof data === 'object' ? data : {},
    ...options,
  });
  if (payload.request_id) {
    res.setHeader('X-Request-ID', payload.request_id);
  }
  return res.status(statusCode).json(payload);
}

function sendError(res, req, statusCode, message, options = {}) {
  const payload = buildErrorEnvelopePayload(req, statusCode, message, options);
  if (payload.request_id) {
    res.setHeader('X-Request-ID', payload.request_id);
  }
  return res.status(statusCode).json(payload);
}

router.post('/login', async (req, res) => {
  try {
    if (!isLegacyLoginEnabled()) {
      return sendError(res, req, 404, 'Legacy socket login is disabled');
    }

    const users = loadLegacyUsers();
    const { username, password } = req.body;
    const user = users[username];
    if (!user || user.password !== password) {
      return sendError(res, req, 401, '用户名或密码错误');
    }

    const token = await generateToken(username, user.role);
    return sendSuccess(res, req, 200, 'Socket legacy token issued successfully', {
      token,
      userId: username,
      role: user.role,
    });
  } catch (err) {
    return sendError(res, req, 500, err?.message || 'token generation failed');
  }
});

router.post('/generate-token', async (req, res) => {
  try {
    const apiSecret = String(process.env.TOKEN_API_SECRET || '').trim();
    if (!apiSecret) {
      return sendError(res, req, 503, 'TOKEN_API_SECRET is required for token issuance');
    }

    const authHeader = normalizeBearerToken(req.headers.authorization || '');
    if (authHeader !== apiSecret) {
      return sendError(res, req, 403, '未授权访问');
    }

    const { userId, role } = req.body;
    if (!userId || !role) {
      return sendError(res, req, 400, '缺少 userId 或 role');
    }

    const token = await generateToken(userId, role);
    return sendSuccess(res, req, 200, 'Socket token issued successfully', {
      token,
      userId,
      role,
    });
  } catch (err) {
    return sendError(res, req, 500, err?.message || 'token generation failed');
  }
});

export default router;
