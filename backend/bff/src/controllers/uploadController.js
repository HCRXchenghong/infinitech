/**
 * 文件上传代理控制器
 */

const fs = require('fs');
const FormData = require('form-data');
const { requestGoRaw } = require('../utils/goProxy');
const { logger } = require('../utils/logger');

function getRequestOrigin(req) {
  const headerOrigin = String(req.headers.origin || '').trim();
  if (/^https?:\/\//i.test(headerOrigin)) {
    return headerOrigin;
  }

  const referer = String(req.headers.referer || '').trim();
  if (/^https?:\/\//i.test(referer)) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.origin;
    } catch (_error) {
      // ignore invalid referer and continue fallback
    }
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const forwardedPort = String(req.headers['x-forwarded-port'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = appendForwardedPort(forwardedHost || req.get('host'), forwardedPort, protocol);
  return `${protocol}://${host}`;
}

function appendForwardedPort(host, port, protocol) {
  const normalizedHost = String(host || '').trim();
  const normalizedPort = String(port || '').trim();
  if (!normalizedHost || !normalizedPort) {
    return normalizedHost;
  }

  const defaultPort = protocol === 'https' ? '443' : '80';
  if (normalizedPort === defaultPort) {
    return normalizedHost;
  }

  if (normalizedHost.startsWith('[')) {
    return normalizedHost.includes(']:') ? normalizedHost : `${normalizedHost}:${normalizedPort}`;
  }

  const colonCount = (normalizedHost.match(/:/g) || []).length;
  if (colonCount === 0) {
    return `${normalizedHost}:${normalizedPort}`;
  }

  return normalizedHost;
}

function normalizeUploadUrl(url, req) {
  if (!url || typeof url !== 'string') {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    return `${getRequestOrigin(req)}${url}`;
  }
  const uploadPathMatch = url.match(/\/uploads\/.+$/);
  if (uploadPathMatch) {
    return `${getRequestOrigin(req)}${uploadPathMatch[0]}`;
  }
  return url;
}

async function uploadFile(req, res, next) {
  if (!req.file) {
    res.status(400).json({ success: false, error: '没有上传文件' });
    return;
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    const response = await requestGoRaw(req, {
      method: 'post',
      path: '/upload',
      data: form,
      headers: form.getHeaders(),
      timeout: 20000,
      validateStatus: (status) => status < 500,
      preferExtraHeaders: true
    });

    const data = response.data && typeof response.data === 'object'
      ? { ...response.data }
      : response.data;

    if (data && typeof data === 'object' && data.url) {
      data.url = normalizeUploadUrl(data.url, req);
    }

    res.status(response.status).json(data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
      return;
    }
    logger.error('Upload file proxy error:', error);
    next(error);
  } finally {
    fs.unlink(req.file.path, () => {});
  }
}

module.exports = {
  uploadFile
};
