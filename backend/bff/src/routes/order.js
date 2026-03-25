/**
 * 订单相关路由
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// 获取订单列表（管理员/商户）
router.get('/', orderController.getOrders);

// 创建订单
router.post('/', orderController.createOrder);

// 获取用户订单列表（改为 /orders/user/:userId 避免路由冲突）
router.get('/user/:userId', orderController.getUserOrders);

// 骑手操作订单
router.post('/:id/dispatch', orderController.dispatchOrder);
router.post('/:id/accept', orderController.acceptOrder);
router.post('/:id/pickup', orderController.pickupOrder);
router.post('/:id/deliver', orderController.deliverOrder);
router.post('/:id/reviewed', orderController.markOrderReviewed);
router.post('/:id/exception-report', orderController.reportOrderException);

// 获取订单详情
router.get('/:id', orderController.getOrderDetail);

module.exports = router;
