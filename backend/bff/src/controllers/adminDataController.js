/**
 * Admin Data Controller - 管理后台数据控制器
 */

const { proxyGet, proxyPost, proxyPut, proxyDelete } = require('../utils/goProxy');

const DATA_RESOURCES = new Set(['users', 'riders', 'orders', 'merchants']);

function resolveDataActionPath(req, action) {
  const plainPath = String(req?.path || req?.originalUrl || '').split('?')[0];
  const match = plainPath.match(/^\/(users|riders|orders|merchants)\/(export|import)$/);

  if (match && DATA_RESOURCES.has(match[1])) {
    return `/${match[1]}/${action}`;
  }

  throw new Error(`Unsupported admin data action path: ${plainPath || 'unknown'}`);
}

async function getUsers(req, res, next) {
  await proxyGet(req, res, next, '/users', { params: req.query });
}

async function getUserById(req, res, next) {
  await proxyGet(req, res, next, `/user/${req.params.id}`);
}

async function createUser(req, res, next) {
  await proxyPost(req, res, next, '/users');
}

async function deleteUser(req, res, next) {
  await proxyDelete(req, res, next, `/users/${req.params.id}`);
}

async function getRiders(req, res, next) {
  await proxyGet(req, res, next, '/riders', { params: req.query });
}

async function getRiderById(req, res, next) {
  await proxyGet(req, res, next, `/riders/${req.params.id}`);
}

async function createRider(req, res, next) {
  await proxyPost(req, res, next, '/riders');
}

async function updateRider(req, res, next) {
  await proxyPut(req, res, next, `/riders/${req.params.id}`);
}

async function getOrders(req, res, next) {
  await proxyGet(req, res, next, '/orders', { params: req.query });
}

async function deleteAllOrders(req, res, next) {
  await proxyPost(req, res, next, '/orders/delete-all', { data: {} });
}

async function getMerchants(req, res, next) {
  await proxyGet(req, res, next, '/merchants', { params: req.query });
}

async function getMerchantById(req, res, next) {
  await proxyGet(req, res, next, `/merchant/${req.params.id}`);
}

async function createMerchant(req, res, next) {
  await proxyPost(req, res, next, '/merchants');
}

async function updateMerchant(req, res, next) {
  await proxyPut(req, res, next, `/merchants/${req.params.id}`);
}

async function deleteMerchant(req, res, next) {
  await proxyDelete(req, res, next, `/merchants/${req.params.id}`);
}

async function getStats(req, res, next) {
  await proxyGet(req, res, next, '/stats');
}

async function getUserRanks(req, res, next) {
  await proxyGet(req, res, next, '/user-ranks');
}

async function getRiderRanks(req, res, next) {
  await proxyGet(req, res, next, '/rider-ranks');
}

async function exportData(req, res, next) {
  await proxyGet(req, res, next, resolveDataActionPath(req, 'export'), { params: req.query });
}

async function importData(req, res, next) {
  await proxyPost(req, res, next, resolveDataActionPath(req, 'import'));
}

module.exports = {
  resolveDataActionPath,
  getUsers,
  getUserById,
  createUser,
  deleteUser,
  getRiders,
  getRiderById,
  createRider,
  updateRider,
  getOrders,
  deleteAllOrders,
  getMerchants,
  getMerchantById,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  getStats,
  getUserRanks,
  getRiderRanks,
  exportData,
  importData
};
