/**
 * 用户控制器
 */

const { proxyGet, proxyPost, proxyPut, proxyDelete } = require('../utils/goProxy');

async function getUser(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyGet(req, res, next, `/user/${id}`);
}

async function changeUserPhone(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPost(req, res, next, `/user/${id}/change-phone`);
}

async function updateUser(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPut(req, res, next, `/user/${id}`);
}

async function getUserFavorites(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  const page = Number(req.query?.page || 1);
  const pageSize = Number(req.query?.pageSize || 20);
  await proxyGet(req, res, next, `/user/${id}/favorites`, {
    params: { page, pageSize },
  });
}

async function addUserFavorite(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  await proxyPost(req, res, next, `/user/${id}/favorites`);
}

async function deleteUserFavorite(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  const shopId = encodeURIComponent(req.params.shopId);
  await proxyDelete(req, res, next, `/user/${id}/favorites/${shopId}`);
}

async function getUserFavoriteStatus(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  const shopId = encodeURIComponent(req.params.shopId);
  await proxyGet(req, res, next, `/user/${id}/favorites/${shopId}/status`);
}

async function getUserReviews(req, res, next) {
  const id = encodeURIComponent(req.params.id);
  const page = Number(req.query?.page || 1);
  const pageSize = Number(req.query?.pageSize || 20);
  await proxyGet(req, res, next, `/user/${id}/reviews`, {
    params: { page, pageSize },
  });
}

module.exports = {
  getUser,
  updateUser,
  changeUserPhone,
  getUserFavorites,
  addUserFavorite,
  deleteUserFavorite,
  getUserFavoriteStatus,
  getUserReviews,
};
