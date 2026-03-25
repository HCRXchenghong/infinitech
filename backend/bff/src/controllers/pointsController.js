/**
 * Points controller - 积分相关
 */

const { proxyGet, proxyPost, proxyPut, proxyDelete } = require('../utils/goProxy');

async function getBalance(req, res, next) {
  await proxyGet(req, res, next, '/points/balance', { params: req.query });
}

async function listGoods(req, res, next) {
  await proxyGet(req, res, next, '/points/goods', { params: req.query });
}

async function createGood(req, res, next) {
  await proxyPost(req, res, next, '/points/goods');
}

async function updateGood(req, res, next) {
  await proxyPut(req, res, next, `/points/goods/${req.params.id}`);
}

async function deleteGood(req, res, next) {
  await proxyDelete(req, res, next, `/points/goods/${req.params.id}`);
}

async function redeem(req, res, next) {
  await proxyPost(req, res, next, '/points/redeem');
}

async function earn(req, res, next) {
  await proxyPost(req, res, next, '/points/earn');
}

async function refund(req, res, next) {
  await proxyPost(req, res, next, '/points/refund');
}

async function listRedemptions(req, res, next) {
  await proxyGet(req, res, next, '/points/redemptions', { params: req.query });
}

async function updateRedemption(req, res, next) {
  await proxyPut(req, res, next, `/points/redemptions/${req.params.id}`);
}

module.exports = {
  getBalance,
  listGoods,
  createGood,
  updateGood,
  deleteGood,
  redeem,
  earn,
  refund,
  listRedemptions,
  updateRedemption
};
