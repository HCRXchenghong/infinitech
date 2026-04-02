const express = require('express');

const { requireAdminAuth } = require('../middleware/requireAdminAuth');
const adminWalletController = require('../controllers/adminWalletController');

const router = express.Router();

router.use(requireAdminAuth);
router.get('/config', adminWalletController.getPayCenterConfig);
router.post('/config', adminWalletController.savePayCenterConfig);
router.get('/channel-matrix', adminWalletController.getChannelMatrix);
router.get('/health', adminWalletController.getPayCenterHealth);
router.get('/withdraw-requests', adminWalletController.listWithdrawRequests);
router.post('/withdraw-requests/review', adminWalletController.reviewWithdraw);

module.exports = router;
