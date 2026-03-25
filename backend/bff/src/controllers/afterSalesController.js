/**
 * 售后申请控制器
 */

const { proxyGet, proxyPost, proxyPut } = require('../utils/goProxy');

function withAdminPreferredHeaders(options = {}) {
  return {
    preferExtraHeaders: true,
    ...options
  };
}

async function createAfterSales(req, res, next) {
  await proxyPost(req, res, next, '/after-sales', withAdminPreferredHeaders());
}

async function listAfterSales(req, res, next) {
  await proxyGet(
    req,
    res,
    next,
    '/after-sales',
    withAdminPreferredHeaders({ params: req.query || {} })
  );
}

async function listUserAfterSales(req, res, next) {
  const { userId } = req.params;
  await proxyGet(
    req,
    res,
    next,
    `/after-sales/user/${encodeURIComponent(userId)}`,
    withAdminPreferredHeaders()
  );
}

async function updateAfterSalesStatus(req, res, next) {
  const { id } = req.params;
  await proxyPut(
    req,
    res,
    next,
    `/after-sales/${encodeURIComponent(id)}/status`,
    withAdminPreferredHeaders()
  );
}

async function clearAfterSales(req, res, next) {
  await proxyPost(req, res, next, '/after-sales/clear', withAdminPreferredHeaders());
}

async function createMerchantGroupbuyRefund(req, res, next) {
  await proxyPost(req, res, next, '/merchant/groupbuy/refunds', withAdminPreferredHeaders());
}

module.exports = {
  createAfterSales,
  listAfterSales,
  listUserAfterSales,
  clearAfterSales,
  updateAfterSalesStatus,
  createMerchantGroupbuyRefund
};
