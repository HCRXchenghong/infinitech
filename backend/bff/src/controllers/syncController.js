/**
 * Sync controller
 */

const { proxyGet } = require('../utils/goProxy');

async function getSyncState(req, res, next) {
  await proxyGet(req, res, next, '/sync/state', {
    params: req.query || {},
  });
}

async function getSyncData(req, res, next) {
  const dataset = encodeURIComponent(req.params.dataset);
  const since = req.query?.since;
  await proxyGet(req, res, next, `/sync/${dataset}`, {
    params: since ? { since } : {},
  });
}

module.exports = {
  getSyncState,
  getSyncData,
};
