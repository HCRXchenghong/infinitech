const { proxyGet, proxyPost } = require('../utils/goProxy');

async function listRTCCallAudits(req, res, next) {
  await proxyGet(req, res, next, '/admin/rtc-call-audits', { params: req.query });
}

async function createRTCCall(req, res, next) {
  await proxyPost(req, res, next, '/rtc/calls');
}

async function getRTCCall(req, res, next) {
  await proxyGet(req, res, next, `/rtc/calls/${encodeURIComponent(req.params.callId)}`);
}

async function listRTCCallHistory(req, res, next) {
  await proxyGet(req, res, next, '/rtc/calls/history', { params: req.query });
}

async function updateRTCCallStatus(req, res, next) {
  await proxyPost(req, res, next, `/rtc/calls/${encodeURIComponent(req.params.callId)}/status`);
}

module.exports = {
  createRTCCall,
  getRTCCall,
  listRTCCallAudits,
  listRTCCallHistory,
  updateRTCCallStatus,
};
