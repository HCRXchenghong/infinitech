const express = require('express');

const { requireAdminAuth } = require('../middleware/requireAdminAuth');
const adminWalletController = require('../controllers/adminWalletController');

const router = express.Router();

router.use(requireAdminAuth);
router.get('/rules', adminWalletController.listWithdrawFeeRules);

module.exports = router;
