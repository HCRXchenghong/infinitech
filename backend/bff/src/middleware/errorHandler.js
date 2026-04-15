/**
 * 错误处理中间件
 */

const { buildErrorEnvelopePayload } = require('../utils/apiEnvelope');
const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(buildErrorEnvelopePayload(req, 413, '文件大小不能超过10MB', {
        legacy: { statusCode: 413 },
      }));
      return;
    }

    res.status(400).json(buildErrorEnvelopePayload(req, 400, err.message || '上传参数错误', {
      legacy: { statusCode: 400 },
    }));
    return;
  }

  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json(buildErrorEnvelopePayload(req, statusCode, message, {
    legacy: {
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  }));
}

module.exports = { errorHandler };
