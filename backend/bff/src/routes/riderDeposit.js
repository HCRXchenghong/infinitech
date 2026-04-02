const express = require('express');

const walletController = require('../controllers/walletController');

const router = express.Router();

router.get('/status', walletController.getRiderDepositStatus);
router.post('/pay-intent', walletController.createRiderDepositPayIntent);
router.post('/withdraw', walletController.withdrawRiderDeposit);

module.exports = router;
