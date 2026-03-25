/**
 * 团购券路由
 */

const express = require('express');
const router = express.Router();
const groupbuyController = require('../controllers/groupbuyController');

router.get('/vouchers', groupbuyController.listVouchers);
router.get('/vouchers/:id/qrcode', groupbuyController.getVoucherQRCode);

module.exports = router;
