/**
 * 通知相关路由
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/', notificationController.getNotificationList);
router.post('/read-all', notificationController.markAllNotificationsRead);
router.post('/:id/read', notificationController.markNotificationRead);
router.get('/:id', notificationController.getNotificationDetail);

module.exports = router;
