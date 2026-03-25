/**
 * 商品相关路由
 * 注意：更具体的路由（/featured）必须放在更通用的路由（/:id, /）之前
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// 获取今日推荐（必须在 /:id 和 / 之前）
router.get('/featured', productController.getFeaturedProducts);

// 创建商品
router.post('/', productController.createProduct);

// 更新商品
router.put('/:id', productController.updateProduct);

// 删除商品
router.delete('/:id', productController.deleteProduct);

// 获取商品详情（必须在 / 之前）
router.get('/:id', productController.getProductDetail);

// 获取商品列表（最后，因为会匹配所有 GET 请求）
router.get('/', productController.getProducts);

module.exports = router;
