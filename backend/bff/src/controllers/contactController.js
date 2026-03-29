const { proxyPost } = require('../utils/goProxy');

async function recordPhoneContactClick(req, res, next) {
  await proxyPost(req, res, next, '/contact/phone-clicks');
}

module.exports = {
  recordPhoneContactClick,
};
