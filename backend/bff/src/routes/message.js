/**
 * 消息相关路由
 * 注意：更具体的路由（/conversations）必须放在更通用的路由（/:roomId）之前
 */

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// 搜索聊天对象（用户/商家/骑手）
router.get('/targets/search', messageController.searchTargets);

// 创建或更新会话
router.post('/conversations/upsert', messageController.upsertConversation);

// 同步消息到 Go 数据库
router.post('/sync', messageController.syncMessage);

// 获取会话列表（必须在 /:roomId 之前）
router.get('/conversations', messageController.getConversations);

// 获取消息历史
router.get('/:roomId', messageController.getMessageHistory);

module.exports = router;
