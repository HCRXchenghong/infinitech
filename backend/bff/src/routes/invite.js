/**
 * Invite routes - 邀请好友
 */

const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');

router.get('/code', inviteController.getInviteCode);
router.post('/share', inviteController.shareInvite);
router.get('/codes', inviteController.listInviteCodes);
router.get('/records', inviteController.listInviteRecords);

module.exports = router;
