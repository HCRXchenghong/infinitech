/**
 * Onboarding invite controller - 商户/骑手入驻邀请
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

async function adminCreateInvite(req, res, next) {
  await proxyPost(req, res, next, '/admin/onboarding/invites');
}

async function adminListInvites(req, res, next) {
  await proxyGet(req, res, next, '/admin/onboarding/invites', { params: req.query });
}

async function adminRevokeInvite(req, res, next) {
  await proxyPost(req, res, next, `/admin/onboarding/invites/${req.params.id}/revoke`);
}

async function adminListSubmissions(req, res, next) {
  await proxyGet(req, res, next, '/admin/onboarding/invites/submissions', { params: req.query });
}

async function publicGetInvite(req, res, next) {
  await proxyGet(req, res, next, `/onboarding/invites/${req.params.token}`);
}

async function publicSubmitInvite(req, res, next) {
  await proxyPost(req, res, next, `/onboarding/invites/${req.params.token}/submit`);
}

module.exports = {
  adminCreateInvite,
  adminListInvites,
  adminRevokeInvite,
  adminListSubmissions,
  publicGetInvite,
  publicSubmitInvite
};
