const { proxyDelete, proxyGet, proxyPost, proxyPut } = require('../utils/goProxy');

async function listParties(req, res, next) {
  await proxyGet(req, res, next, '/dining-buddy/parties', { params: req.query });
}

async function createParty(req, res, next) {
  await proxyPost(req, res, next, '/dining-buddy/parties');
}

async function joinParty(req, res, next) {
  await proxyPost(req, res, next, `/dining-buddy/parties/${encodeURIComponent(req.params.id)}/join`);
}

async function listMessages(req, res, next) {
  await proxyGet(req, res, next, `/dining-buddy/parties/${encodeURIComponent(req.params.id)}/messages`, {
    params: req.query
  });
}

async function sendMessage(req, res, next) {
  await proxyPost(req, res, next, `/dining-buddy/parties/${encodeURIComponent(req.params.id)}/messages`);
}

async function createReport(req, res, next) {
  await proxyPost(req, res, next, '/dining-buddy/reports');
}

async function adminListParties(req, res, next) {
  await proxyGet(req, res, next, '/admin/dining-buddy/parties', { params: req.query });
}

async function adminGetParty(req, res, next) {
  await proxyGet(req, res, next, `/admin/dining-buddy/parties/${encodeURIComponent(req.params.id)}`);
}

async function adminCloseParty(req, res, next) {
  await proxyPost(req, res, next, `/admin/dining-buddy/parties/${encodeURIComponent(req.params.id)}/close`);
}

async function adminReopenParty(req, res, next) {
  await proxyPost(req, res, next, `/admin/dining-buddy/parties/${encodeURIComponent(req.params.id)}/reopen`);
}

async function adminListMessages(req, res, next) {
  await proxyGet(req, res, next, `/admin/dining-buddy/parties/${encodeURIComponent(req.params.id)}/messages`, { params: req.query });
}

async function adminDeleteMessage(req, res, next) {
  await proxyDelete(req, res, next, `/admin/dining-buddy/messages/${encodeURIComponent(req.params.id)}`);
}

async function adminListReports(req, res, next) {
  await proxyGet(req, res, next, '/admin/dining-buddy/reports', { params: req.query });
}

async function adminResolveReport(req, res, next) {
  await proxyPost(req, res, next, `/admin/dining-buddy/reports/${encodeURIComponent(req.params.id)}/resolve`);
}

async function adminRejectReport(req, res, next) {
  await proxyPost(req, res, next, `/admin/dining-buddy/reports/${encodeURIComponent(req.params.id)}/reject`);
}

async function adminListSensitiveWords(req, res, next) {
  await proxyGet(req, res, next, '/admin/dining-buddy/sensitive-words', { params: req.query });
}

async function adminCreateSensitiveWord(req, res, next) {
  await proxyPost(req, res, next, '/admin/dining-buddy/sensitive-words');
}

async function adminUpdateSensitiveWord(req, res, next) {
  await proxyPut(req, res, next, `/admin/dining-buddy/sensitive-words/${encodeURIComponent(req.params.id)}`);
}

async function adminDeleteSensitiveWord(req, res, next) {
  await proxyDelete(req, res, next, `/admin/dining-buddy/sensitive-words/${encodeURIComponent(req.params.id)}`);
}

async function adminListUserRestrictions(req, res, next) {
  await proxyGet(req, res, next, '/admin/dining-buddy/user-restrictions', { params: req.query });
}

async function adminCreateUserRestriction(req, res, next) {
  await proxyPost(req, res, next, '/admin/dining-buddy/user-restrictions');
}

async function adminUpdateUserRestriction(req, res, next) {
  await proxyPut(req, res, next, `/admin/dining-buddy/user-restrictions/${encodeURIComponent(req.params.id)}`);
}

async function adminListAuditLogs(req, res, next) {
  await proxyGet(req, res, next, '/admin/dining-buddy/audit-logs', { params: req.query });
}

module.exports = {
  listParties,
  createParty,
  joinParty,
  listMessages,
  sendMessage,
  createReport,
  adminListParties,
  adminGetParty,
  adminCloseParty,
  adminReopenParty,
  adminListMessages,
  adminDeleteMessage,
  adminListReports,
  adminResolveReport,
  adminRejectReport,
  adminListSensitiveWords,
  adminCreateSensitiveWord,
  adminUpdateSensitiveWord,
  adminDeleteSensitiveWord,
  adminListUserRestrictions,
  adminCreateUserRestriction,
  adminUpdateUserRestriction,
  adminListAuditLogs
};
