const express = require('express');
const controller = require('../controllers/diningBuddyController');

const router = express.Router();

router.get('/parties', controller.listParties);
router.post('/parties', controller.createParty);
router.post('/parties/:id/join', controller.joinParty);
router.get('/parties/:id/messages', controller.listMessages);
router.post('/parties/:id/messages', controller.sendMessage);

module.exports = router;
