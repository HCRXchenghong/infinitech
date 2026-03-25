/**
 * 商家控制器
 */

const { proxyGet, proxyPost, proxyPut, proxyDelete } = require('../utils/goProxy');

async function getShops(req, res, next) {
  await proxyGet(req, res, next, '/shops', {
    params: req.query || {},
  });
}

async function getTodayRecommendedShops(req, res, next) {
  await proxyGet(req, res, next, '/shops/today-recommended');
}

async function getShopDetail(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyGet(req, res, next, `/shops/${id}`);
}

async function getMerchantShops(req, res, next) {
  const merchantId = encodeURIComponent(req.params.merchantId);
  await proxyGet(req, res, next, `/merchants/${merchantId}/shops`, {
    params: req.query || {},
  });
}

async function getShopMenu(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyGet(req, res, next, `/shops/${id}/menu`);
}

async function createShop(req, res, next) {
  await proxyPost(req, res, next, '/shops');
}

async function updateShop(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPut(req, res, next, `/shops/${id}`);
}

async function deleteShop(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyDelete(req, res, next, `/shops/${id}`);
}

async function moveTodayRecommendPosition(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPost(req, res, next, `/shops/${id}/today-recommend/move`);
}

async function getShopReviews(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  const page = Number(req.query?.page || 1);
  const pageSize = Number(req.query?.pageSize || 20);
  await proxyGet(req, res, next, `/shops/${id}/reviews`, {
    params: { page, pageSize },
  });
}

async function createReview(req, res, next) {
  await proxyPost(req, res, next, '/reviews');
}

async function updateReview(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPut(req, res, next, `/reviews/${id}`);
}

async function deleteReview(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyDelete(req, res, next, `/reviews/${id}`);
}

async function getActiveCoupons(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyGet(req, res, next, `/shops/${id}/coupons/active`);
}

async function getShopCoupons(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyGet(req, res, next, `/shops/${id}/coupons`);
}

module.exports = {
  getShops,
  getTodayRecommendedShops,
  getShopDetail,
  getMerchantShops,
  getShopMenu,
  createShop,
  updateShop,
  deleteShop,
  moveTodayRecommendPosition,
  getShopReviews,
  createReview,
  updateReview,
  deleteReview,
  getActiveCoupons,
  getShopCoupons,
};
