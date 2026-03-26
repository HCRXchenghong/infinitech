/**
 * 消息相关路由
 * 注意：更具体的路由必须放在通用的 /:roomId 之前
 */

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/targets/search', messageController.searchTargets);
router.post('/conversations/upsert', messageController.upsertConversation);
router.post('/conversations/read-all', messageController.markAllConversationsRead);
router.post('/conversations/:chatId/read', messageController.markConversationRead);
router.post('/sync', messageController.syncMessage);
router.get('/conversations', messageController.getConversations);
router.get('/:roomId', messageController.getMessageHistory);

module.exports = router;
