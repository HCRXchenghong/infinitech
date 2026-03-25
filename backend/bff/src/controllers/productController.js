/**
 * 商品控制器
 */

const { proxyGet, proxyPost, proxyPut, proxyDelete } = require('../utils/goProxy');

async function getProductDetail(req, res, next) {
  await proxyGet(req, res, next, `/products/${encodeURIComponent(req.params.id)}`);
}

async function getProducts(req, res, next) {
  await proxyGet(req, res, next, '/products');
}

async function getFeaturedProducts(req, res, next) {
  await proxyGet(req, res, next, '/featured-products');
}

async function getCategories(req, res, next) {
  await proxyGet(req, res, next, '/categories');
}

async function createCategory(req, res, next) {
  await proxyPost(req, res, next, '/categories');
}

async function updateCategory(req, res, next) {
  await proxyPut(req, res, next, `/categories/${req.params.id}`);
}

async function deleteCategory(req, res, next) {
  await proxyDelete(req, res, next, `/categories/${req.params.id}`, {
    params: req.query || {},
  });
}

async function getBanners(req, res, next) {
  await proxyGet(req, res, next, '/banners');
}

async function createBanner(req, res, next) {
  await proxyPost(req, res, next, '/banners');
}

async function updateBanner(req, res, next) {
  await proxyPut(req, res, next, `/banners/${req.params.id}`);
}

async function deleteBanner(req, res, next) {
  await proxyDelete(req, res, next, `/banners/${req.params.id}`, {
    params: req.query || {},
  });
}

async function createProduct(req, res, next) {
  await proxyPost(req, res, next, '/products');
}

async function updateProduct(req, res, next) {
  await proxyPut(req, res, next, `/products/${req.params.id}`);
}

async function deleteProduct(req, res, next) {
  await proxyDelete(req, res, next, `/products/${req.params.id}`, {
    params: req.query || {},
  });
}

module.exports = {
  getProductDetail,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner
};
