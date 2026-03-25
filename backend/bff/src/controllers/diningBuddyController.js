const { proxyGet, proxyPost } = require('../utils/goProxy');

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

module.exports = {
  listParties,
  createParty,
  joinParty,
  listMessages,
  sendMessage
};
