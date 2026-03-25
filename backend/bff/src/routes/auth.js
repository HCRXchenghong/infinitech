/**
 * Auth routes.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/wechat/start', authController.wechatStart);
router.get('/wechat/callback', authController.wechatCallback);
router.get('/wechat/session', authController.consumeWechatSession);
router.post('/wechat/bind-login', authController.wechatBindLogin);

module.exports = router;
