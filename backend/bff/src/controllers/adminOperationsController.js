/**
 * Admin Operations Controller - 管理后台操作控制器
 * 处理重置密码、删除订单、ID重组等操作
 */

const { proxyPost, proxyDelete } = require('../utils/goProxy');

// 用户操作
async function resetUserPassword(req, res, next) {
  await proxyPost(req, res, next, `/users/${req.params.id}/reset-password`, { data: {} });
}

async function deleteUserOrders(req, res, next) {
  await proxyPost(req, res, next, `/users/${req.params.id}/delete-orders`, { data: {} });
}

async function deleteAllUsers(req, res, next) {
  await proxyPost(req, res, next, '/users/delete-all', { data: {} });
}

// 骑手操作
async function resetRiderPassword(req, res, next) {
  await proxyPost(req, res, next, `/riders/${req.params.id}/reset-password`, { data: {} });
}

async function deleteRiderOrders(req, res, next) {
  await proxyPost(req, res, next, `/riders/${req.params.id}/delete-orders`, { data: {} });
}

async function deleteAllRiders(req, res, next) {
  await proxyPost(req, res, next, '/riders/delete-all', { data: {} });
}

async function deleteRider(req, res, next) {
  await proxyDelete(req, res, next, `/users/${req.params.id}`);
}

// 商户操作
async function resetMerchantPassword(req, res, next) {
  await proxyPost(req, res, next, `/merchants/${req.params.id}/reset-password`, { data: {} });
}

async function deleteAllMerchants(req, res, next) {
  await proxyPost(req, res, next, '/merchants/delete-all', { data: {} });
}

// ID重组
async function reorganizeRoleIds(req, res, next) {
  await proxyPost(req, res, next, `/reorganize-role-ids/${req.params.type}`, { data: {} });
}

module.exports = {
  resetUserPassword,
  deleteUserOrders,
  deleteAllUsers,
  resetRiderPassword,
  deleteRiderOrders,
  deleteAllRiders,
  deleteRider,
  resetMerchantPassword,
  deleteAllMerchants,
  reorganizeRoleIds
};
