/**
 * 售后申请路由
 */

const express = require('express');
const router = express.Router();
const afterSalesController = require('../controllers/afterSalesController');

router.post('/', afterSalesController.createAfterSales);
router.get('/', afterSalesController.listAfterSales);
router.get('/user/:userId', afterSalesController.listUserAfterSales);
router.post('/clear', afterSalesController.clearAfterSales);
router.put('/:id/status', afterSalesController.updateAfterSalesStatus);

module.exports = router;
