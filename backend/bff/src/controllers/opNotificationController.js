/**
 * 运营通知控制器
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

function withAdminPreferredHeaders(options = {}) {
  return {
    preferExtraHeaders: true,
    ...options
  };
}

async function list(req, res, next) {
  await proxyGet(
    req,
    res,
    next,
    '/op-notifications',
    withAdminPreferredHeaders({ params: req.query || {} })
  );
}

async function markRead(req, res, next) {
  const { id } = req.params;
  await proxyPost(
    req,
    res,
    next,
    `/op-notifications/${encodeURIComponent(id)}/read`,
    withAdminPreferredHeaders()
  );
}

module.exports = {
  list,
  markRead
};
