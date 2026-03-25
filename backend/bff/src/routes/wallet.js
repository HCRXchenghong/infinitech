/**
 * 钱包路由（用户端）
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/recharge', walletController.recharge);
router.post('/payment', walletController.payment);
router.post('/withdraw', walletController.withdraw);
router.get('/withdraw/records', walletController.getWithdrawRecords);

module.exports = router;
