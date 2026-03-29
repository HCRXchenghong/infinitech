const { proxyGet, proxyPost } = require('../utils/goProxy');

async function recordPhoneContactClick(req, res, next) {
  await proxyPost(req, res, next, '/contact/phone-clicks');
}

async function listPhoneContactAudits(req, res, next) {
  await proxyGet(req, res, next, '/admin/contact-phone-audits', { params: req.query });
}

module.exports = {
  recordPhoneContactClick,
  listPhoneContactAudits,
};
