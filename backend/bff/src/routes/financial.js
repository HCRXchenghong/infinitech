/**
 * 财务中心路由（admin 端）
 */

const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');

router.get('/overview', financialController.getOverview);
router.get('/statistics', financialController.getStatistics);
router.get('/user-details', financialController.getUserDetails);
router.get('/transaction-logs', financialController.getTransactionLogs);
router.post('/transaction-logs/delete', financialController.deleteTransactionLog);
router.post('/transaction-logs/clear', financialController.clearTransactionLogs);
router.get('/export', financialController.exportData);

module.exports = router;
