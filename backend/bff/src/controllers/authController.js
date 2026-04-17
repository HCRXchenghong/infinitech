/**
 * 认证控制器
 */

const { goUrl, proxyPost, requestGoRaw, buildNormalizedErrorPayload } = require('../utils/goProxy');
const { logger } = require('../utils/logger');
const { buildErrorEnvelopePayload } = require('../utils/apiEnvelope');

function isHTMLPayload(payload) {
  return typeof payload === 'string' && payload.includes('<!DOCTYPE html>');
}

function mergeLegacyFields(payload, legacy = {}) {
  const next = { ...(payload || {}) };
  for (const [key, value] of Object.entries(legacy)) {
    if (next[key] === undefined) {
      next[key] = value;
    }
  }
  return next;
}

function resolveGoAuthErrorMessage(status, payload, fallbackMessage) {
  if (isHTMLPayload(payload) && Number(status) === 404) {
    return 'Go 后端路由不存在，请检查路由配置';
  }

  if (payload && typeof payload === 'object') {
    return payload.error || payload.message || fallbackMessage;
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return fallbackMessage;
}

function buildResolvedGoErrorPayload(req, status, payload, fallbackMessage, options = {}) {
  const message = resolveGoAuthErrorMessage(status, payload, fallbackMessage);
  if (isHTMLPayload(payload)) {
    return buildErrorEnvelopePayload(req, status, message, {
      legacy: options.legacy,
    });
  }

  return mergeLegacyFields(
    buildNormalizedErrorPayload(
      req,
      {
        message,
        response: {
          status,
          data: payload,
        },
      },
      status,
      message,
    ),
    options.legacy,
  );
}

function sendResolvedGoResponse(req, res, response, fallbackMessage, options = {}) {
  if (Number(response?.status || 200) < 400) {
    return res.status(response.status).json(response.data);
  }

  return res.status(response.status).json(
    buildResolvedGoErrorPayload(
      req,
      response.status,
      response.data,
      fallbackMessage,
      options,
    ),
  );
}

/**
 * 用户登录
 */
async function login(req, res, next) {
  await proxyPost(req, res, next, '/auth/login', { timeout: 5000 });
}

/**
 * 用户注册
 */
async function register(req, res, next) {
  await proxyPost(req, res, next, '/auth/register', { timeout: 5000 });
}

function redirectToGoWechatPath(req, res, path) {
  const target = new URL(goUrl(path));
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => target.searchParams.append(key, String(item)));
      return;
    }
    if (value !== undefined && value !== null) {
      target.searchParams.set(key, String(value));
    }
  });
  return res.redirect(302, target.toString());
}

async function wechatStart(req, res) {
  return redirectToGoWechatPath(req, res, '/auth/wechat/start');
}

async function wechatCallback(req, res) {
  return redirectToGoWechatPath(req, res, '/auth/wechat/callback');
}

async function consumeWechatSession(req, res, next) {
  try {
    const response = await requestGoRaw(req, {
      method: 'get',
      path: '/auth/wechat/session',
      params: req.query || {},
      timeout: 5000,
      validateStatus(status) {
        return status < 500;
      }
    });
    return sendResolvedGoResponse(req, res, response, '微信登录会话不存在或已失效');
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(
        buildResolvedGoErrorPayload(
          req,
          error.response.status,
          error.response.data,
          '微信登录会话不存在或已失效',
        ),
      );
    }
    return next(error);
  }
}

async function wechatBindLogin(req, res, next) {
  await proxyPost(req, res, next, '/auth/wechat/bind-login', { timeout: 5000 });
}

/**
 * 发送短信验证码
 */
async function requestSMSCode(req, res, next) {
  const targetUrl = goUrl('/sms/request');

  function sendClientError(status, message) {
    return res.status(status).json(
      buildResolvedGoErrorPayload(req, status, null, message, {
        legacy: { statusCode: status },
      }),
    );
  }

  try {
    const response = await requestGoRaw(req, {
      method: 'post',
      path: '/sms/request',
      data: req.body || {},
      timeout: 5000,
      validateStatus: function validateStatus(status) {
        return status < 500;
      }
    });
    return sendResolvedGoResponse(req, res, response, `Go 后端错误: ${response.status}`, {
      legacy: { statusCode: response.status },
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(
        buildResolvedGoErrorPayload(
          req,
          error.response.status,
          error.response.data,
          `Go 后端错误: ${error.response.status}`,
          {
            legacy: { statusCode: error.response.status },
          },
        ),
      );
    }

    if (error.code === 'ECONNREFUSED') {
      return sendClientError(503, 'Go 后端服务未启动，请检查 Go 后端服务状态');
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return sendClientError(504, '请求 Go 后端超时，请检查 Go 后端服务状态');
    }

    logger.error('Request SMS code unexpected error:', {
      code: error.code,
      message: error.message,
      url: targetUrl
    });

    return next(error);

  }
}

async function getCaptcha(req, res, next) {
  try {
    const response = await requestGoRaw(req, {
      method: 'get',
      path: '/captcha',
      params: req.query || {},
      responseType: 'arraybuffer',
      timeout: 5000,
      validateStatus(status) {
        return status < 500;
      }
    });

    const contentType = response.headers && response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    const cacheControl = response.headers && response.headers['cache-control'];
    if (cacheControl) {
      res.setHeader('Cache-Control', cacheControl);
    }
    const pragma = response.headers && response.headers.pragma;
    if (pragma) {
      res.setHeader('Pragma', pragma);
    }

    return res.status(response.status).send(response.data);
  } catch (error) {
    return next(error);
  }
}

/**
 * 验证短信验证码（验证后删除）
 */
async function verifySMSCode(req, res, next) {
  await proxyPost(req, res, next, '/sms/verify', { timeout: 5000 });
}

/**
 * 验证短信验证码（验证后不删除，用于重置密码等场景）
 */
async function verifySMSCodeCheck(req, res, next) {
  await proxyPost(req, res, next, '/sms/verify-check', { timeout: 5000 });
}

/**
 * 骑手登录
 */
async function riderLogin(req, res, next) {
  await proxyPost(req, res, next, '/auth/rider/login', { timeout: 5000 });
}

/**
 * 商户登录
 */
async function merchantLogin(req, res, next) {
  await proxyPost(req, res, next, '/auth/merchant/login', { timeout: 5000 });
}

async function setNewPassword(req, res, next) {
  await proxyPost(req, res, next, '/auth/set-new-password', { timeout: 5000 });
}

async function riderSetNewPassword(req, res, next) {
  await proxyPost(req, res, next, '/auth/rider/set-new-password', { timeout: 5000 });
}

async function merchantSetNewPassword(req, res, next) {
  await proxyPost(req, res, next, '/auth/merchant/set-new-password', { timeout: 5000 });
}

module.exports = {
  login,
  register,
  wechatStart,
  wechatCallback,
  consumeWechatSession,
  wechatBindLogin,
  getCaptcha,
  requestSMSCode,
  verifySMSCode,
  verifySMSCodeCheck,
  riderLogin,
  merchantLogin,
  setNewPassword,
  riderSetNewPassword,
  merchantSetNewPassword
};
