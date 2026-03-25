/**
 * 文件上传代理控制器
 */

const fs = require('fs');
const FormData = require('form-data');
const { requestGoRaw } = require('../utils/goProxy');
const { logger } = require('../utils/logger');

function getRequestOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
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
