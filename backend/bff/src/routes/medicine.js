const express = require('express');
const controller = require('../controllers/medicineController');

const router = express.Router();

router.post('/consult', controller.consult);

module.exports = router;
