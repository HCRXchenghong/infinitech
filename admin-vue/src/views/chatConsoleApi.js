import request from '@/utils/request';

export async function fetchMessageConversations() {
  const { data } = await request.get('/api/messages/conversations');
  return Array.isArray(data) ? data : [];
}

export async function fetchMessageHistory(chatId) {
  const normalizedChatId = encodeURIComponent(String(chatId || '').trim());
  if (!normalizedChatId) return [];
  const { data } = await request.get(`/api/messages/${normalizedChatId}`);
  return Array.isArray(data) ? data : [];
}

export async function markMessageConversationRead(chatId) {
  const normalizedChatId = encodeURIComponent(String(chatId || '').trim());
  if (!normalizedChatId) return;
  await request.post(`/api/messages/conversations/${normalizedChatId}/read`, {});
}
