/**
 * Cooperation routes - 商务合作
 */

const express = require('express');
const router = express.Router();
const cooperationController = require('../controllers/cooperationController');

router.post('/', cooperationController.createCooperation);
router.get('/', cooperationController.listCooperations);
router.put('/:id', cooperationController.updateCooperation);

module.exports = router;
