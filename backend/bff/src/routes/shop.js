/**
 * 商家相关路由
 */

const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

// 获取商家列表
router.get('/', shopController.getShops);

// 获取今日推荐商户（必须在 /:id 之前）
router.get('/today-recommended', shopController.getTodayRecommendedShops);

// 创建商家
router.post('/', shopController.createShop);

// 更新商家
router.put('/:id', shopController.updateShop);

// 删除商家
router.delete('/:id', shopController.deleteShop);

// 调整今日推荐排序
router.post('/:id/today-recommend/move', shopController.moveTodayRecommendPosition);

// 获取店铺活动优惠券
router.get('/:id/coupons/active', shopController.getActiveCoupons);
// 获取店铺全部优惠券
router.get('/:id/coupons', shopController.getShopCoupons);

// 获取商家菜单
router.get('/:id/menu', shopController.getShopMenu);

// 获取商家评价
router.get('/:id/reviews', shopController.getShopReviews);

// 获取商家详情
router.get('/:id', shopController.getShopDetail);

module.exports = router;
