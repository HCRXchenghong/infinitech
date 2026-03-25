import { logger } from './logger.js';

const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY || 'http://127.0.0.1:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';
const AI_SYSTEM_PROMPT = '你是悦享e食平台的 AI 员工，负责协助管理员处理日常运营工作，包括订单管理、用户服务、数据分析等。请用简洁专业的中文回答。';

const aiChatHistories = new Map();

async function callOpenClaw(messages) {
  const url = `${OPENCLAW_GATEWAY}/v1/chat/completions`;
  const body = JSON.stringify({
    model: 'claude-sonnet-4-5-20250929',
    messages: [{ role: 'system', content: AI_SYSTEM_PROMPT }, ...messages],
    stream: false,
    max_tokens: 2048
  });

  const headers = { 'Content-Type': 'application/json' };
  if (OPENCLAW_TOKEN) headers.Authorization = `Bearer ${OPENCLAW_TOKEN}`;

  const resp = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(60000) });
  const data = await resp.json();

  if (data.choices && data.choices[0]) {
    return { content: data.choices[0].message.content, model: data.model, usage: data.usage };
  }
  throw new Error(data.error?.message || 'OpenClaw 返回异常');
}

export function setupAiNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser,
  getMessages,
  saveMessage,
  clearMessages,
  normalizeMessageData
}) {
  const aiNamespace = io.of('/ai');
  aiNamespace.use(authMiddleware);

  aiNamespace.on('connection', (socket) => {
    logger.info('AI connected:', socket.userId);
    addOnlineUser(socket.id, socket.userId, 'ai_user');

    if (!aiChatHistories.has(socket.userId)) {
      aiChatHistories.set(socket.userId, []);
    }

    socket.on('ai_health_check', async () => {
      try {
        const resp = await fetch(`${OPENCLAW_GATEWAY}/health`, { signal: AbortSignal.timeout(5000) });
        socket.emit('ai_health_result', { online: resp.status === 200 });
      } catch {
        socket.emit('ai_health_result', { online: false });
      }
    });

    socket.on('ai_send_message', async (data) => {
      const { content, chatId } = data;
      const userId = socket.userId;
      const history = aiChatHistories.get(userId) || [];

      const userMsgData = normalizeMessageData({
        content,
        sender: '管理员',
        senderId: userId,
        senderRole: 'admin',
        messageType: 'text'
      }, socket);
      const userResult = saveMessage('ai_chat', chatId || 99999, userMsgData);

      socket.emit('ai_message_saved', {
        id: userResult.lastInsertRowid,
        tempId: data.tempId,
        content,
        role: 'user'
      });

      history.push({ role: 'user', content });
      socket.emit('ai_typing', { typing: true });

      try {
        const result = await callOpenClaw(history);

        history.push({ role: 'assistant', content: result.content });
        aiChatHistories.set(userId, history.slice(-20));

        const aiMsgData = normalizeMessageData({
          content: result.content,
          sender: 'AI员工',
          senderId: 'ai_staff',
          senderRole: 'ai',
          messageType: 'text'
        }, socket, { allowIdentityOverride: true });
        const aiResult = saveMessage('ai_chat', chatId || 99999, aiMsgData);

        socket.emit('ai_reply', {
          id: aiResult.lastInsertRowid,
          content: result.content,
          model: result.model,
          usage: result.usage
        });
      } catch (err) {
        logger.error('AI 调用失败:', err.message);
        socket.emit('ai_reply_error', { error: err.message });
      } finally {
        socket.emit('ai_typing', { typing: false });
      }
    });

    socket.on('ai_load_history', (data) => {
      const chatId = data.chatId || 99999;
      const messages = getMessages('ai_chat', chatId);
      socket.emit('ai_history_loaded', { chatId, messages });
    });

    socket.on('ai_clear_history', (data) => {
      const chatId = data.chatId || 99999;
      clearMessages('ai_chat', chatId);
      aiChatHistories.set(socket.userId, []);
      socket.emit('ai_history_cleared', { chatId });
    });

    socket.on('disconnect', () => {
      removeOnlineUser(socket.id);
      logger.info('AI disconnected:', socket.userId);
    });
  });

  return {
    aiNamespace
  };
}
