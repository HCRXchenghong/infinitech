/**
 * Admin 钱包操作路由
 */

const express = require('express');
const router = express.Router();
const adminWalletController = require('../controllers/adminWalletController');

router.post('/add-balance', adminWalletController.addBalance);
router.post('/deduct-balance', adminWalletController.deductBalance);
router.post('/freeze', adminWalletController.freezeAccount);
router.post('/unfreeze', adminWalletController.unfreezeAccount);
router.get('/operations', adminWalletController.listOperations);
router.get('/withdraw-requests', adminWalletController.listWithdrawRequests);
router.post('/withdraw-requests/review', adminWalletController.reviewWithdraw);
router.post('/recharge', adminWalletController.recharge);

module.exports = router;
