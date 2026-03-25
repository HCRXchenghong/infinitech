/**
 * 团购券控制器
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

function withAdminPreferredHeaders(options = {}) {
  return {
    preferExtraHeaders: true,
    ...options
  };
}

async function listVouchers(req, res, next) {
  await proxyGet(
    req,
    res,
    next,
    '/groupbuy/vouchers',
    withAdminPreferredHeaders({ params: req.query || {} })
  );
}

async function getVoucherQRCode(req, res, next) {
  const { id } = req.params;
  await proxyGet(
    req,
    res,
    next,
    `/groupbuy/vouchers/${encodeURIComponent(id)}/qrcode`,
    withAdminPreferredHeaders()
  );
}

async function redeemByScan(req, res, next) {
  await proxyPost(
    req,
    res,
    next,
    '/merchant/groupbuy/vouchers/redeem-by-scan',
    withAdminPreferredHeaders()
  );
}

module.exports = {
  listVouchers,
  getVoucherQRCode,
  redeemByScan
};
