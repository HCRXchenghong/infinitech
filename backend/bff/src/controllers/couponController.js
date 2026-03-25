/**
 * 优惠券 controller（用户端）- 代理到 Go 后端
 */

const { proxyGet, proxyPost, proxyPut, proxyDelete } = require('../utils/goProxy');

async function getAvailableCoupons(req, res, next) {
  await proxyGet(req, res, next, '/coupons/available');
}

async function getUserCoupons(req, res, next) {
  await proxyGet(req, res, next, '/coupons/user');
}

async function receiveCoupon(req, res, next) {
  await proxyPost(req, res, next, `/coupons/${req.params.couponId}/receive`);
}

async function createCoupon(req, res, next) {
  await proxyPost(req, res, next, '/coupons');
}

async function updateCoupon(req, res, next) {
  await proxyPut(req, res, next, `/coupons/${req.params.couponId}`);
}

async function deleteCoupon(req, res, next) {
  await proxyDelete(req, res, next, `/coupons/${req.params.couponId}`);
}

async function getCouponById(req, res, next) {
  await proxyGet(req, res, next, `/coupons/${req.params.couponId}`);
}

async function adminListCoupons(req, res, next) {
  await proxyGet(req, res, next, '/admin/coupons');
}

async function adminCreateCoupon(req, res, next) {
  await proxyPost(req, res, next, '/admin/coupons');
}

async function adminListCouponIssueLogs(req, res, next) {
  await proxyGet(req, res, next, `/admin/coupons/${req.params.couponId}/issue-logs`);
}

async function adminIssueCouponToPhone(req, res, next) {
  await proxyPost(req, res, next, `/admin/coupons/${req.params.couponId}/issue`);
}

async function publicGetCouponByToken(req, res, next) {
  await proxyGet(req, res, next, `/coupon-links/${req.params.token}`);
}

async function publicClaimCouponByToken(req, res, next) {
  await proxyPost(req, res, next, `/coupon-links/${req.params.token}/claim`);
}

module.exports = {
  adminListCoupons,
  adminCreateCoupon,
  adminListCouponIssueLogs,
  adminIssueCouponToPhone,
  publicGetCouponByToken,
  publicClaimCouponByToken,
  getAvailableCoupons,
  getUserCoupons,
  receiveCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
};
