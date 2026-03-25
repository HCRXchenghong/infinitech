/**
 * 评价管理路由
 */

const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

router.post('/', shopController.createReview);
router.put('/:id', shopController.updateReview);
router.delete('/:id', shopController.deleteReview);

module.exports = router;
