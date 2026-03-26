import express from 'express';
import { generateToken } from './auth.js';

const router = express.Router();

// 临时用户数据库，真实生产环境应改成对接正式用户系统。
const users = {
  admin: { password: 'admin123', role: 'admin' },
  rider_001: { password: 'rider123', role: 'rider' },
  merchant_001: { password: 'merchant123', role: 'merchant' }
};

router.post('/login', async (req, res) => {
  try {
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
    const apiSecret = process.env.TOKEN_API_SECRET || '';
    const authHeader = req.headers.authorization || '';
    if (apiSecret && authHeader !== `Bearer ${apiSecret}`) {
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
