/**
 * 运营通知路由
 */

const express = require('express');
const router = express.Router();
const opNotificationController = require('../controllers/opNotificationController');

router.get('/', opNotificationController.list);
router.post('/:id/read', opNotificationController.markRead);

module.exports = router;
