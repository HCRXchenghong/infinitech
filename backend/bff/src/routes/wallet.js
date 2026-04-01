/**
 * 钱包路由（用户端）
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.get('/transactions/:transactionId', walletController.getTransactionStatus);
router.get('/payment-options', walletController.getPaymentOptions);
router.post('/recharge', walletController.recharge);
router.get('/recharge/status', walletController.getRechargeStatus);
router.post('/payment', walletController.payment);
router.get('/withdraw/options', walletController.getWithdrawOptions);
router.post('/withdraw/fee-preview', walletController.previewWithdrawFee);
router.post('/withdraw', walletController.withdraw);
router.get('/withdraw/status', walletController.getWithdrawStatus);
router.get('/withdraw/records', walletController.getWithdrawRecords);
router.get('/rider-deposit/status', walletController.getRiderDepositStatus);
router.post('/rider-deposit/pay-intent', walletController.createRiderDepositPayIntent);
router.post('/rider-deposit/withdraw', walletController.withdrawRiderDeposit);

module.exports = router;
