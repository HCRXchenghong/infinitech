/**
 * 优惠券路由（用户端）
 */

const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// 管理端
router.get('/admin', couponController.adminListCoupons);
router.post('/admin', couponController.adminCreateCoupon);
router.get('/admin/:couponId/issue-logs', couponController.adminListCouponIssueLogs);
router.post('/admin/:couponId/issue', couponController.adminIssueCouponToPhone);

// 1788 链接领券
router.get('/link/:token', couponController.publicGetCouponByToken);
router.post('/link/:token/claim', couponController.publicClaimCouponByToken);

// 用户端
router.get('/available', couponController.getAvailableCoupons);
router.get('/user', couponController.getUserCoupons);
router.post('/:couponId/receive', couponController.receiveCoupon);

// 商户/管理端通用 CRUD
router.post('/', couponController.createCoupon);
router.get('/:couponId', couponController.getCouponById);
router.put('/:couponId', couponController.updateCoupon);
router.delete('/:couponId', couponController.deleteCoupon);

module.exports = router;
