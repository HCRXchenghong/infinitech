/**
 * Admin 钱包操作 controller - 代理到 Go 后端
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

function adminHeaders(req) {
  return {
    'X-Admin-ID': req.headers['x-admin-id'] || '',
    'X-Admin-Name': req.headers['x-admin-name'] || '',
  };
}

async function addBalance(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/add-balance', {
    headers: adminHeaders(req)
  });
}

async function deductBalance(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/deduct-balance', {
    headers: adminHeaders(req)
  });
}

async function freezeAccount(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/freeze', {
    headers: adminHeaders(req)
  });
}

async function unfreezeAccount(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/unfreeze', {
    headers: adminHeaders(req)
  });
}

async function listOperations(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/operations', {
    headers: adminHeaders(req)
  });
}

async function listWithdrawRequests(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/withdraw-requests', {
    headers: adminHeaders(req)
  });
}

async function getPayCenterConfig(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/pay-center/config', {
    headers: adminHeaders(req)
  });
}

async function savePayCenterConfig(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/pay-center/config', {
    headers: adminHeaders(req)
  });
}

async function previewSettlement(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/settlement/rule-preview', {
    headers: adminHeaders(req)
  });
}

async function getRiderDepositOverview(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/rider-deposit/overview', {
    headers: adminHeaders(req)
  });
}

async function listRiderDepositRecords(req, res, next) {
  await proxyGet(req, res, next, '/admin/wallet/rider-deposit/records', {
    headers: adminHeaders(req)
  });
}

async function reviewWithdraw(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/withdraw-requests/review', {
    headers: adminHeaders(req)
  });
}

async function recharge(req, res, next) {
  await proxyPost(req, res, next, '/admin/wallet/recharge', {
    headers: adminHeaders(req)
  });
}

module.exports = {
  addBalance,
  deductBalance,
  freezeAccount,
  unfreezeAccount,
  listOperations,
  listWithdrawRequests,
  getPayCenterConfig,
  savePayCenterConfig,
  previewSettlement,
  getRiderDepositOverview,
  listRiderDepositRecords,
  reviewWithdraw,
  recharge,
};
