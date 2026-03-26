/**
 * 消息控制器
 */

const { proxyGet, proxyPost } = require('../utils/goProxy');

async function searchTargets(req, res, next) {
  await proxyGet(req, res, next, '/messages/targets/search', {
    fallbackPayload: { targets: [] },
    fallbackStatuses: [404],
    fallbackOnConnectionRefused: true,
  });
}

async function upsertConversation(req, res, next) {
  await proxyPost(req, res, next, '/messages/conversations/upsert');
}

async function markConversationRead(req, res, next) {
  const { chatId } = req.params;
  await proxyPost(req, res, next, `/messages/conversations/${encodeURIComponent(chatId)}/read`);
}

async function markAllConversationsRead(req, res, next) {
  await proxyPost(req, res, next, '/messages/conversations/read-all');
}

async function syncMessage(req, res, next) {
  await proxyPost(req, res, next, '/messages/sync');
}

async function getConversations(req, res, next) {
  await proxyGet(req, res, next, '/messages/conversations', {
    fallbackPayload: [],
    fallbackStatuses: [404],
    fallbackOnConnectionRefused: true,
  });
}

async function getMessageHistory(req, res, next) {
  const { roomId } = req.params;
  await proxyGet(req, res, next, `/messages/${encodeURIComponent(roomId)}`, {
    fallbackPayload: [],
    fallbackStatuses: [404],
    fallbackOnConnectionRefused: true,
  });
}

module.exports = {
  searchTargets,
  upsertConversation,
  markConversationRead,
  markAllConversationsRead,
  syncMessage,
  getConversations,
  getMessageHistory
};
