/**
 * Invite controller - 邀请好友
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

async function getInviteCode(req, res, next) {
  await proxyGet(req, res, next, '/invite/code', { params: req.query });
}

async function shareInvite(req, res, next) {
  await proxyPost(req, res, next, '/invite/share');
}

async function listInviteCodes(req, res, next) {
  await proxyGet(req, res, next, '/invite/codes', { params: req.query });
}

async function listInviteRecords(req, res, next) {
  await proxyGet(req, res, next, '/invite/records', { params: req.query });
}

module.exports = {
  getInviteCode,
  shareInvite,
  listInviteCodes,
  listInviteRecords
};
