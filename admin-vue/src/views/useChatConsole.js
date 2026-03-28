import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import socketService, { SOCKET_HTTP_BASE } from '@/utils/socket';
import messageDB from '@/utils/messageDB';
import {
  fetchMessageConversations,
  fetchMessageHistory,
  markMessageConversationRead
} from './chatConsoleApi';
import {
  normalizeChatId,
  createSeenMessageTracker,
  isAdminSender,
  mapLoadedChats,
  mapCachedMessages,
  mapLoadedMessages,
  sortChats,
  createOutgoingTempMessage,
  createIncomingDisplayMessage,
  saveIncomingMessage,
  saveLoadedMessages,
  upsertChatFromIncoming
} from './chatConsoleHelpers';

function resolveDefaultChatName(defaultChatName, data) {
  return typeof defaultChatName === 'function' ? defaultChatName(data) : defaultChatName;
}

export function useChatConsole(options = {}) {
  const {
    namespace,
    beforeInitLoad,
    defaultChatName = '聊天',
    disabledActionMessage = '按平台规则，仅平台监控页可彻底删除聊天记录',
    coupons: couponSeed = [],
    orders: orderSeed = [],
    awaitIncomingSave = false,
    upsertBeforeSelectedCheck = false,
    onClearMessages,
    onDeleteChat
  } = options;

  let socketRef = null;
  let refreshChatsTimer = null;
  let localMessageSeed = 0;

  const searchQuery = ref('');
  const selectedChat = ref(null);
  const inputMessage = ref('');
  const messagesContainer = ref(null);
  const showCouponDialog = ref(false);
  const showOrderDialog = ref(false);
  const showImageViewer = ref(false);
  const previewImageUrl = ref('');
  const sendingMessage = ref(false);
  const uploadingImage = ref(false);
  const sendingCoupon = ref(false);
  const sendingOrder = ref(false);
  const clearingMessages = ref(false);

  const chats = ref([]);
  const messages = ref([]);
  const messagesFromLocalFallback = ref(false);
  const { hasSeenMessage } = createSeenMessageTracker();

  const contextMenu = ref({ show: false, x: 0, y: 0, chat: null });
  const coupons = ref(couponSeed);
  const orders = ref(orderSeed);

  const filteredChats = computed(() => {
    if (!searchQuery.value) return chats.value;
    const keyword = searchQuery.value;
    return chats.value.filter((chat) => (chat.name || '').includes(keyword) || (chat.phone || '').includes(keyword));
  });

  function getSocket() {
    return socketRef;
  }

  function createLocalMessageId(prefix = 'local') {
    localMessageSeed += 1;
    return `${prefix}_${selectedChat.value?.id || 'chat'}_${Date.now()}_${localMessageSeed}`;
  }

  async function refreshChats() {
    try {
      chats.value = sortChats(mapLoadedChats(await fetchMessageConversations()));
    } catch (error) {
      console.error('加载服务端会话列表失败:', error);
    }
  }

  function scheduleRefreshChats(delay = 250) {
    if (refreshChatsTimer) clearTimeout(refreshChatsTimer);
    refreshChatsTimer = setTimeout(() => {
      refreshChatsTimer = null;
      void refreshChats();
    }, delay);
  }

  async function syncReadState(chatId) {
    const normalizedChatId = normalizeChatId(chatId);
    if (!normalizedChatId) return false;

    try {
      await markMessageConversationRead(normalizedChatId);
      return true;
    } catch (error) {
      console.error('同步服务端已读状态失败:', error);
      return false;
    }
  }

  function scrollToBottom() {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }

  async function loadCachedMessages(chatId) {
    const normalizedChatId = normalizeChatId(chatId);
    if (!normalizedChatId) return false;

    try {
      const cachedMessages = await messageDB.getMessages(normalizedChatId);
      if (cachedMessages && cachedMessages.length > 0) {
        messages.value = mapCachedMessages(cachedMessages);
        nextTick(() => scrollToBottom());
        return true;
      }
    } catch (error) {
      console.error('加载本地消息失败:', error);
    }

    return false;
  }

  function emitSendMessage(payload) {
    const socket = getSocket();
    if (!socket || !selectedChat.value) return;

    socket.emit('send_message', {
      chatId: selectedChat.value.id,
      senderId: 'admin',
      senderRole: 'admin',
      sender: '客服',
      ...payload
    });
  }

  async function loadMessages(chatId) {
    const normalizedChatId = normalizeChatId(chatId);
    if (!normalizedChatId) return;

    try {
      const serverMessages = await fetchMessageHistory(normalizedChatId);
      messages.value = mapLoadedMessages(serverMessages);
      messagesFromLocalFallback.value = false;
      serverMessages.forEach((msg) => {
        hasSeenMessage(normalizedChatId, msg.id);
      });

      try {
        await saveLoadedMessages(messageDB, normalizedChatId, serverMessages);
      } catch (error) {
        console.error('保存服务端消息缓存失败:', error);
      }

      await syncReadState(normalizedChatId);
      nextTick(() => scrollToBottom());
    } catch (error) {
      console.error('加载服务端消息失败:', error);
      messagesFromLocalFallback.value = await loadCachedMessages(normalizedChatId);
    }
  }

  function selectChat(chat) {
    const socket = getSocket();
    if (!socket) return;

    const chatId = normalizeChatId(chat?.id);
    if (!chatId) return;

    selectedChat.value = {
      ...chat,
      id: chatId
    };
    messagesFromLocalFallback.value = false;
    void loadMessages(chatId);

    socket.emit('join_chat', { chatId, userId: 'admin', role: 'admin' });
    void syncReadState(chatId).then((synced) => {
      if (!synced) return;
      if (normalizeChatId(selectedChat.value?.id) === chatId) {
        selectedChat.value = {
          ...selectedChat.value,
          unread: 0
        };
      }
      chats.value = chats.value.map((item) =>
        normalizeChatId(item.id) === chatId ? { ...item, unread: 0 } : item
      );
      socket.emit('mark_all_read', { chatId });
      scheduleRefreshChats();
    });
  }

  function sendMessage() {
    const content = inputMessage.value.trim();
    if (!selectedChat.value || !content || sendingMessage.value || !getSocket()) return;

    sendingMessage.value = true;
    const tempId = createLocalMessageId('send');

    messages.value.push(createOutgoingTempMessage({
      id: tempId,
      content,
      type: 'text',
      status: 'sending'
    }));

    emitSendMessage({
      messageType: 'text',
      content,
      tempId
    });

    setTimeout(() => {
      const msg = messages.value.find((item) => item.id === tempId);
      if (msg && msg.status === 'sending') msg.status = 'failed';
    }, 10000);

    inputMessage.value = '';
    nextTick(() => scrollToBottom());
    sendingMessage.value = false;
  }

  async function handleImageUpload(file) {
    if (!selectedChat.value || uploadingImage.value || !getSocket()) return false;

    uploadingImage.value = true;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${SOCKET_HTTP_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.url) throw new Error('上传失败');

      messages.value.push(createOutgoingTempMessage({
        id: createLocalMessageId('image'),
        content: data.url,
        type: 'image'
      }));

      emitSendMessage({
        messageType: 'image',
        content: data.url
      });

      nextTick(() => scrollToBottom());
    } catch (error) {
      ElMessage.error('图片上传失败');
    } finally {
      uploadingImage.value = false;
    }

    return false;
  }

  function sendCoupon(coupon) {
    if (!selectedChat.value || sendingCoupon.value || !getSocket()) return;

    sendingCoupon.value = true;
    messages.value.push(createOutgoingTempMessage({
      id: createLocalMessageId('coupon'),
      content: '',
      type: 'coupon',
      coupon
    }));

    emitSendMessage({
      messageType: 'coupon',
      content: coupon,
      coupon
    });

    showCouponDialog.value = false;
    nextTick(() => scrollToBottom());
    ElMessage.success('优惠券发送成功');
    sendingCoupon.value = false;
  }

  function sendOrder(order) {
    if (!selectedChat.value || sendingOrder.value || !getSocket()) return;

    sendingOrder.value = true;
    messages.value.push(createOutgoingTempMessage({
      id: createLocalMessageId('order'),
      content: '',
      type: 'order',
      order
    }));

    emitSendMessage({
      messageType: 'order',
      content: order,
      order
    });

    showOrderDialog.value = false;
    nextTick(() => scrollToBottom());
    ElMessage.success('订单发送成功');
    sendingOrder.value = false;
  }

  function previewImage(url) {
    previewImageUrl.value = url;
    showImageViewer.value = true;
  }

  async function clearMessages() {
    if (typeof onClearMessages === 'function') {
      await onClearMessages({
        socket: getSocket(),
        selectedChat,
        messages,
        clearingMessages,
        normalizeChatId
      });
      return;
    }

    ElMessage.warning(disabledActionMessage);
  }

  function resendMessage(msg) {
    if (!selectedChat.value || !getSocket()) return;

    msg.status = 'sending';
    const tempId = msg.id;

    emitSendMessage({
      messageType: msg.type,
      content: msg.content,
      coupon: msg.coupon,
      order: msg.order,
      tempId
    });

    setTimeout(() => {
      if (msg.status === 'sending') msg.status = 'failed';
    }, 10000);
  }

  function showContextMenu(event, chat) {
    contextMenu.value = {
      show: true,
      x: event.clientX,
      y: event.clientY,
      chat
    };
  }

  function toggleMute() {
    if (contextMenu.value.chat) {
      contextMenu.value.chat.muted = !contextMenu.value.chat.muted;
      ElMessage.success(contextMenu.value.chat.muted ? '已开启免打扰' : '已取消免打扰');
    }
    contextMenu.value.show = false;
  }

  async function deleteChat() {
    if (typeof onDeleteChat === 'function') {
      await onDeleteChat({
        socket: getSocket(),
        contextMenu,
        chats,
        selectedChat,
        messages,
        normalizeChatId
      });
    } else {
      ElMessage.warning(disabledActionMessage);
    }

    contextMenu.value.show = false;
  }

  function pushIncomingToSelectedChat(data, incomingChatId) {
    const selectedId = normalizeChatId(selectedChat.value?.id);
    if (!selectedId || selectedId !== incomingChatId) return false;

    if (isAdminSender(data)) return true;
    if (data.id && messages.value.some((item) => String(item.id) === String(data.id))) return true;

    messages.value.push(createIncomingDisplayMessage(data));
    nextTick(() => scrollToBottom());
    return true;
  }

  onMounted(async () => {
    const socket = await socketService.connect(namespace);
    socketRef = socket;

    function initLoad() {
      if (typeof beforeInitLoad === 'function') {
        beforeInitLoad(socket, { selectedChat });
      }

      void refreshChats();

      if (selectedChat.value) {
        socket.emit('join_chat', { chatId: selectedChat.value.id, userId: 'admin', role: 'admin' });
        void loadMessages(selectedChat.value.id);
      }
    }

    socket.on('connect', () => {
      initLoad();
    });

    if (socket.connected) {
      initLoad();
    }

    socket.on('all_chats_loaded', (data) => {
      if (!chats.value.length) {
        chats.value = sortChats(mapLoadedChats(data.chats || []));
      }
    });

    socket.on('new_message', async (data) => {
      const incomingChatId = normalizeChatId(data.chatId);
      if (!incomingChatId) return;
      if (hasSeenMessage(incomingChatId, data.id)) return;

      const saveTask = saveIncomingMessage(messageDB, incomingChatId, data).catch((error) => {
        console.error('保存消息失败:', error);
      });

      if (awaitIncomingSave) {
        await saveTask;
      }

      if (!upsertBeforeSelectedCheck && pushIncomingToSelectedChat(data, incomingChatId)) {
        void syncReadState(incomingChatId);
        scheduleRefreshChats();
        return;
      }

      upsertChatFromIncoming({
        chats: chats.value,
        incomingChatId,
        data,
        adminMessage: isAdminSender(data),
        defaultName: resolveDefaultChatName(defaultChatName, data)
      });

      if (upsertBeforeSelectedCheck) {
        if (pushIncomingToSelectedChat(data, incomingChatId)) {
          void syncReadState(incomingChatId);
        }
      }
      scheduleRefreshChats();
    });

    socket.on('messages_loaded', async (data) => {
      const loadedChatId = normalizeChatId(data.chatId);
      if (!selectedChat.value || loadedChatId !== normalizeChatId(selectedChat.value.id)) return;
      if (messages.value.length > 0 && !messagesFromLocalFallback.value) return;

      messages.value = mapLoadedMessages(data.messages || []);
      messagesFromLocalFallback.value = false;
      (data.messages || []).forEach((msg) => {
        hasSeenMessage(loadedChatId, msg.id);
      });

      try {
        await saveLoadedMessages(messageDB, loadedChatId, data.messages || []);
      } catch (error) {
        console.error('保存消息失败:', error);
      }

      await syncReadState(loadedChatId);
      nextTick(() => scrollToBottom());
    });

    socket.on('message_sent', (data) => {
      const msg = messages.value.find((item) => item.id === data.tempId);
      if (msg) {
        msg.id = data.messageId;
        if (data.time) {
          msg.time = data.time;
        }
        if (Number.isFinite(Number(data?.timestamp || data?.createdAt))) {
          msg.timestamp = Number(data.timestamp || data.createdAt);
        }
        msg.status = 'sent';
      }
      scheduleRefreshChats();
    });

    socket.on('message_read', (data) => {
      const msg = messages.value.find((item) => item.id === data.messageId);
      if (msg) msg.status = 'read';
      scheduleRefreshChats();
    });

    socket.on('all_messages_read', () => {
      messages.value.forEach((msg) => {
        if (msg.isSelf && msg.status !== 'read') msg.status = 'read';
      });
      scheduleRefreshChats();
    });
  });

  onUnmounted(() => {
    if (refreshChatsTimer) {
      clearTimeout(refreshChatsTimer);
      refreshChatsTimer = null;
    }
    if (!socketRef) return;

    socketRef.off('connect');
    socketRef.off('all_chats_loaded');
    socketRef.off('new_message');
    socketRef.off('messages_loaded');
    socketRef.off('message_sent');
    socketRef.off('message_read');
    socketRef.off('all_messages_read');
  });

  return {
    searchQuery,
    selectedChat,
    inputMessage,
    messagesContainer,
    showCouponDialog,
    showOrderDialog,
    showImageViewer,
    previewImageUrl,
    sendingMessage,
    uploadingImage,
    sendingCoupon,
    sendingOrder,
    clearingMessages,
    chats,
    messages,
    contextMenu,
    coupons,
    orders,
    filteredChats,
    selectChat,
    sendMessage,
    handleImageUpload,
    sendCoupon,
    sendOrder,
    previewImage,
    clearMessages,
    resendMessage,
    showContextMenu,
    toggleMute,
    deleteChat
  };
}
