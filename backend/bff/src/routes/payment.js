const express = require('express');

const walletController = require('../controllers/walletController');

const router = express.Router();

router.get('/options', walletController.getPaymentOptions);
router.post('/intent', walletController.payment);

module.exports = router;
