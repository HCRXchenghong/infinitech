const express = require('express');

const { requireAdminAuth } = require('../middleware/requireAdminAuth');
const adminWalletController = require('../controllers/adminWalletController');

const router = express.Router();

router.use(requireAdminAuth);
router.get('/subjects', adminWalletController.listSettlementSubjects);
router.get('/rule-sets', adminWalletController.listSettlementRuleSets);
router.post('/rule-preview', adminWalletController.previewSettlement);
router.get('/orders/:id', adminWalletController.getSettlementOrder);

module.exports = router;
