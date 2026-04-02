const express = require('express');

const { requireAdminAuth } = require('../middleware/requireAdminAuth');
const adminWalletController = require('../controllers/adminWalletController');

const router = express.Router();

router.use(requireAdminAuth);
router.get('/overview', adminWalletController.getRiderDepositOverview);
router.get('/records', adminWalletController.listRiderDepositRecords);

module.exports = router;
