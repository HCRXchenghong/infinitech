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
router.get('/payment-callbacks', adminWalletController.listPaymentCallbacks);
router.get('/payment-callbacks/:id', adminWalletController.getPaymentCallbackDetail);
router.post('/payment-callbacks/:id/replay', adminWalletController.replayPaymentCallback);
router.get('/pay-center/config', adminWalletController.getPayCenterConfig);
router.post('/pay-center/config', adminWalletController.savePayCenterConfig);
router.post('/settlement/rule-preview', adminWalletController.previewSettlement);
router.get('/settlement/orders/:id', adminWalletController.getSettlementOrder);
router.get('/rider-deposit/overview', adminWalletController.getRiderDepositOverview);
router.get('/rider-deposit/records', adminWalletController.listRiderDepositRecords);
router.post('/withdraw-requests/review', adminWalletController.reviewWithdraw);
router.post('/recharge', adminWalletController.recharge);

module.exports = router;
