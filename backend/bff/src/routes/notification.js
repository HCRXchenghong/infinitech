/**
 * 通知相关路由
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');

router.get('/admin/all', requireAdminAuth, notificationController.getAdminNotificationList);
router.get('/admin/:id', requireAdminAuth, notificationController.getAdminNotificationDetail);
router.post('/admin', requireAdminAuth, notificationController.createAdminNotification);
router.put('/admin/:id', requireAdminAuth, notificationController.updateAdminNotification);
router.delete('/admin/:id', requireAdminAuth, notificationController.deleteAdminNotification);

router.get('/', notificationController.getNotificationList);
router.post('/read-all', notificationController.markAllNotificationsRead);
router.post('/:id/read', notificationController.markNotificationRead);
router.get('/:id', notificationController.getNotificationDetail);

module.exports = router;
