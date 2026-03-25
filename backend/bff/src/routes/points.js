/**
 * Points routes - 积分相关
 */

const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');

router.get('/balance', pointsController.getBalance);
router.get('/goods', pointsController.listGoods);
router.post('/goods', pointsController.createGood);
router.put('/goods/:id', pointsController.updateGood);
router.delete('/goods/:id', pointsController.deleteGood);

router.post('/redeem', pointsController.redeem);
router.post('/earn', pointsController.earn);
router.post('/refund', pointsController.refund);

router.get('/redemptions', pointsController.listRedemptions);
router.put('/redemptions/:id', pointsController.updateRedemption);

module.exports = router;
