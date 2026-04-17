const fs = require('fs');
const FormData = require('form-data');
const {
  proxyGet,
  proxyPost,
  proxyPut,
  proxyDelete,
  requestGoRaw,
  buildNormalizedErrorPayload,
} = require('../utils/goProxy');
const { buildErrorEnvelopePayload } = require('../utils/apiEnvelope');
const { logger } = require('../utils/logger');
const DEFAULT_PROXY_OPTIONS = {
  normalizeErrorResponse: true,
  defaultErrorMessage: '请求失败'
};

function withRiderProxyOptions(options = {}) {
  return {
    ...DEFAULT_PROXY_OPTIONS,
    ...options
  };
}

function forwardError(req, res, error, fallbackMessage) {
  const status = error.response?.status || 500;
  res.status(status).json(buildNormalizedErrorPayload(req, error, status, fallbackMessage));
}

function sendResolvedRiderResponse(req, res, response, fallbackMessage) {
  if (Number(response?.status || 200) < 400) {
    return res.status(response.status).json(response.data);
  }

  return res.status(response.status).json(
    buildNormalizedErrorPayload(
      req,
      {
        message:
          response?.data?.error ||
          response?.data?.message ||
          fallbackMessage,
        response,
      },
      response.status,
      fallbackMessage,
    ),
  );
}

// 更新骑手在线状态
exports.updateRiderStatus = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyPut(
    req,
    res,
    next,
    `/riders/${riderId}/online-status`,
    withRiderProxyOptions({ data: { is_online: req.body?.is_online } })
  );
};

// 骑手在线心跳
exports.heartbeatRiderStatus = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyPost(
    req,
    res,
    next,
    `/riders/${riderId}/heartbeat`,
    withRiderProxyOptions({ data: {} })
  );
};

// 获取骑手统计
exports.getRiderStats = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyGet(req, res, next, `/riders/${riderId}/stats`, withRiderProxyOptions());
};

// 获取骑手收入明细
exports.getRiderEarnings = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyGet(
    req,
    res,
    next,
    `/riders/${riderId}/earnings`,
    withRiderProxyOptions({ params: req.query })
  );
};

// 获取骑手订单
exports.getRiderOrders = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyGet(
    req,
    res,
    next,
    `/riders/${riderId}/orders`,
    withRiderProxyOptions({ params: req.query })
  );
};

// 获取可用订单
exports.getAvailableOrders = async (req, res, next) => {
  await proxyGet(req, res, next, '/riders/orders/available', withRiderProxyOptions());
};

exports.getRiderPreferences = async (req, res, next) => {
  await proxyGet(req, res, next, '/rider/preferences', withRiderProxyOptions());
};

exports.updateRiderPreferences = async (req, res, next) => {
  await proxyPost(req, res, next, '/rider/preferences', withRiderProxyOptions());
};

// 更新头像
exports.updateAvatar = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyPut(req, res, next, `/riders/${riderId}/avatar`, withRiderProxyOptions());
};

// 获取骑手资料
exports.getRiderProfile = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyGet(req, res, next, `/riders/${riderId}/profile`, withRiderProxyOptions());
};

exports.getRiderCert = async (req, res, next) => {
  const { riderId } = req.params;

  try {
    const response = await requestGoRaw(req, {
      method: "get",
      path: `/riders/${riderId}/cert`,
      params: req.query,
      responseType: "stream",
      timeout: 20000,
      validateStatus: () => true,
      preferExtraHeaders: true,
    });

    res.status(response.status);
    const hopByHopHeaders = new Set([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade",
    ]);

    Object.entries(response.headers || {}).forEach(([key, value]) => {
      if (!value || hopByHopHeaders.has(String(key).toLowerCase())) {
        return;
      }
      res.setHeader(key, value);
    });

    response.data.pipe(res);
  } catch (error) {
    next(error);
  }
};

// 更新骑手资料
exports.updateRiderProfile = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyPut(req, res, next, `/riders/${riderId}/profile`, withRiderProxyOptions());
};

// 上传证件
exports.uploadCert = async (req, res) => {
  const { riderId } = req.params;
  const tempFilePath = req.file?.path;

  if (!tempFilePath) {
    return res.status(400).json(buildErrorEnvelopePayload(req, 400, '未检测到上传文件'));
  }

  const formData = new FormData();
  formData.append('image', fs.createReadStream(tempFilePath));
  formData.append('field', req.body.field);

  try {
    const response = await requestGoRaw(req, {
      method: 'post',
      path: `/riders/${riderId}/cert`,
      data: formData,
      headers: formData.getHeaders(),
      timeout: 20000,
      preferExtraHeaders: true
    });
    return sendResolvedRiderResponse(req, res, response, '上传证件失败');
  } catch (error) {
    logger.error('上传证件失败:', error.message);
    return forwardError(req, res, error, '上传证件失败');
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      logger.warn('清理临时上传文件失败:', cleanupError.message);
    }
  }
};

// 修改手机号
exports.changePhone = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyPost(req, res, next, `/riders/${riderId}/change-phone`, withRiderProxyOptions());
};

// 修改密码
exports.changePassword = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyPost(req, res, next, `/riders/${riderId}/change-password`, withRiderProxyOptions());
};

// 获取骑手段位
exports.getRiderRank = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyGet(req, res, next, `/riders/${riderId}/rank`, withRiderProxyOptions());
};

// 获取排行榜
exports.getRankList = async (req, res, next) => {
  await proxyGet(req, res, next, '/riders/rank-list', withRiderProxyOptions({ params: req.query }));
};

// 获取骑手评分摘要
exports.getRiderRating = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyGet(req, res, next, `/riders/${riderId}/rating`, withRiderProxyOptions());
};

// 获取骑手评论（管理端）
exports.getRiderReviews = async (req, res, next) => {
  const { riderId } = req.params;
  await proxyGet(
    req,
    res,
    next,
    `/riders/${riderId}/reviews`,
    withRiderProxyOptions({
      params: req.query,
      defaultErrorMessage: '获取骑手评论失败'
    })
  );
};

// 新增骑手评论
exports.createRiderReview = async (req, res, next) => {
  await proxyPost(
    req,
    res,
    next,
    '/rider-reviews',
    withRiderProxyOptions({ defaultErrorMessage: '新增骑手评论失败' })
  );
};

// 用户提交骑手评论
exports.submitRiderReview = async (req, res, next) => {
  await proxyPost(
    req,
    res,
    next,
    '/rider-reviews/submit',
    withRiderProxyOptions({ defaultErrorMessage: '提交骑手评论失败' })
  );
};

// 修改骑手评论
exports.updateRiderReview = async (req, res, next) => {
  const { id } = req.params;
  await proxyPut(
    req,
    res,
    next,
    `/rider-reviews/${id}`,
    withRiderProxyOptions({ defaultErrorMessage: '修改骑手评论失败' })
  );
};

// 删除骑手评论
exports.deleteRiderReview = async (req, res, next) => {
  const { id } = req.params;
  await proxyDelete(
    req,
    res,
    next,
    `/rider-reviews/${id}`,
    withRiderProxyOptions({ defaultErrorMessage: '删除骑手评论失败' })
  );
};
