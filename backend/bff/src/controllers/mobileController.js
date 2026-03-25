const { proxyGet, proxyPost } = require('../utils/goProxy');

async function registerPushDevice(req, res, next) {
  await proxyPost(req, res, next, '/mobile/push/devices/register');
}

async function unregisterPushDevice(req, res, next) {
  await proxyPost(req, res, next, '/mobile/push/devices/unregister');
}

async function ackPushMessage(req, res, next) {
  await proxyPost(req, res, next, '/mobile/push/ack');
}

async function searchMap(req, res, next) {
  await proxyGet(req, res, next, '/mobile/maps/search', { params: req.query });
}

async function reverseGeocode(req, res, next) {
  await proxyGet(req, res, next, '/mobile/maps/reverse-geocode', { params: req.query });
}

module.exports = {
  registerPushDevice,
  unregisterPushDevice,
  ackPushMessage,
  searchMap,
  reverseGeocode
};
