/**
 * 订单控制器
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

function sanitizeQueryParams(query = {}) {
  const cleaned = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (!text) continue;
    cleaned[key] = text;
  }
  return cleaned;
}

async function getOrders(req, res, next) {
  await proxyGet(req, res, next, '/orders', {
    params: sanitizeQueryParams(req.query || {}),
  });
}

async function createOrder(req, res, next) {
  await proxyPost(req, res, next, '/orders');
}

async function getOrderDetail(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyGet(req, res, next, `/orders/${id}`);
}

async function getUserOrders(req, res, next) {
  const userId = encodeURIComponent(req.params.userId);
  await proxyGet(req, res, next, `/orders/user/${userId}`);
}

async function proxyOrderAction(req, res, next, action) {
  const id = encodeURIComponent(req.params.id);
  await proxyPost(req, res, next, `/orders/${id}/${action}`);
}

async function acceptOrder(req, res, next) {
  await proxyOrderAction(req, res, next, 'accept');
}

async function dispatchOrder(req, res, next) {
  await proxyOrderAction(req, res, next, 'dispatch');
}

async function pickupOrder(req, res, next) {
  await proxyOrderAction(req, res, next, 'pickup');
}

async function deliverOrder(req, res, next) {
  await proxyOrderAction(req, res, next, 'deliver');
}

async function markOrderReviewed(req, res, next) {
  await proxyOrderAction(req, res, next, 'reviewed');
}

async function reportOrderException(req, res, next) {
  await proxyOrderAction(req, res, next, 'exception-report');
}

module.exports = {
  getOrders,
  createOrder,
  getOrderDetail,
  getUserOrders,
  dispatchOrder,
  acceptOrder,
  pickupOrder,
  deliverOrder,
  markOrderReviewed,
  reportOrderException,
};
