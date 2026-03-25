/**
 * Cooperation controller - 商务合作
 */

const { proxyGet, proxyPost, proxyPut } = require('../utils/goProxy');

async function createCooperation(req, res, next) {
  await proxyPost(req, res, next, '/cooperations');
}

async function listCooperations(req, res, next) {
  await proxyGet(req, res, next, '/cooperations', { params: req.query });
}

async function updateCooperation(req, res, next) {
  await proxyPut(req, res, next, `/cooperations/${req.params.id}`);
}

module.exports = {
  createCooperation,
  listCooperations,
  updateCooperation
};
