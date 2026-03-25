const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobileController');

router.post('/push/devices/register', mobileController.registerPushDevice);
router.post('/push/devices/unregister', mobileController.unregisterPushDevice);
router.post('/push/ack', mobileController.ackPushMessage);

router.get('/maps/search', mobileController.searchMap);
router.get('/maps/reverse-geocode', mobileController.reverseGeocode);

module.exports = router;
