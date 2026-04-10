import express from 'express';
import { generateToken } from './auth.js';

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

router.post('/login', async (req, res) => {
  try {
    if (!isLegacyLoginEnabled()) {
      return res.status(404).json({ error: 'Legacy socket login is disabled' });
    }

    const users = loadLegacyUsers();
    const { username, password } = req.body;
    const user = users[username];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = await generateToken(username, user.role);
    res.json({ token, userId: username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'token generation failed' });
  }
});

router.post('/generate-token', async (req, res) => {
  try {
    const apiSecret = String(process.env.TOKEN_API_SECRET || '').trim();
    if (!apiSecret) {
      return res.status(503).json({ error: 'TOKEN_API_SECRET is required for token issuance' });
    }

    const authHeader = normalizeBearerToken(req.headers.authorization || '');
    if (authHeader !== apiSecret) {
      return res.status(403).json({ error: '未授权访问' });
    }

    const { userId, role } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ error: '缺少 userId 或 role' });
    }

    const token = await generateToken(userId, role);
    res.json({ token, userId, role });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'token generation failed' });
  }
});

export default router;
