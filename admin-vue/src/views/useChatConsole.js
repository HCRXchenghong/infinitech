import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { extractErrorMessage, extractUploadAsset } from '@infinitech/contracts';
import {
  createIncomingDisplayMessage,
  createOutgoingTempMessage,
  createSeenMessageTracker,
  isAdminSender,
  mapLoadedChats,
  mapLoadedMessages,
  normalizeChatId,
  sortChats,
} from '@infinitech/admin-core';
import socketService from '@/utils/socket';
import request from '@/utils/request';
import { getCurrentAdminSocketIdentity } from '@/utils/runtime';
import { loadNotificationSoundRuntime, playMessageNotificationSound } from '@/utils/notificationSound';
import {
  fetchMessageConversations,
  fetchMessageHistory,
  markMessageConversationRead
} from './chatConsoleApi';

export function useChatConsole(options = {}) {
  const {
    namespace,
    beforeInitLoad,
    defaultChatName = 'Chat',
    disabledActionMessage = 'Only the monitor page can permanently delete chat history.',
    coupons: couponSeed = [],
    orders: orderSeed = [],
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

  function buildAdminJoinPayload(chatId) {
    const identity = getCurrentAdminSocketIdentity();
    return {
      chatId,
      userId: identity?.userId || '',
      role: 'admin'
    };
  }

  function createLocalMessageId(prefix = 'local') {
    localMessageSeed += 1;
    return `${prefix}_${selectedChat.value?.id || 'chat'}_${Date.now()}_${localMessageSeed}`;
  }

  async function refreshChats() {
    try {
      const nextChats = sortChats(mapLoadedChats(await fetchMessageConversations()));
      chats.value = nextChats;

      const selectedId = normalizeChatId(selectedChat.value?.id);
      if (selectedId) {
        const matchedChat = nextChats.find((item) => normalizeChatId(item.id) === selectedId);
        if (matchedChat) {
          selectedChat.value = {
            ...(selectedChat.value || {}),
            ...matchedChat,
            id: selectedId
          };
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to load server conversation list.', error);
      return false;
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
      console.error('Failed to sync conversation read state.', error);
      return false;
    }
  }

  function scrollToBottom() {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }

  function emitSendMessage(payload) {
    const socket = getSocket();
    if (!socket || !selectedChat.value) return;

    socket.emit('send_message', {
      chatId: selectedChat.value.id,
      senderId: 'admin',
      senderRole: 'admin',
      sender: 'Support',
      ...payload
    });
  }

  async function loadMessages(chatId) {
    const normalizedChatId = normalizeChatId(chatId);
    if (!normalizedChatId) return;
    const hadServerHistory = messages.value.length > 0;

    try {
      const serverMessages = await fetchMessageHistory(normalizedChatId);
      messages.value = mapLoadedMessages(serverMessages);
      serverMessages.forEach((msg) => {
        hasSeenMessage(normalizedChatId, msg.id);
      });
      await syncReadState(normalizedChatId);
      nextTick(() => scrollToBottom());
    } catch (error) {
      console.error('Failed to load server message history.', error);
      if (hadServerHistory) return;
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
    void loadMessages(chatId);

    socket.emit('join_chat', buildAdminJoinPayload(chatId));
    void syncReadState(chatId).then((synced) => {
      if (!synced) return;
      socket.emit('mark_all_read', { chatId });
      void refreshChats();
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
      const { data } = await request.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const asset = extractUploadAsset(data);
      const imageUrl = String(asset?.url || '').trim();
      if (!imageUrl) throw new Error('image_upload_failed');

      messages.value.push(createOutgoingTempMessage({
        id: createLocalMessageId('image'),
        content: imageUrl,
        type: 'image'
      }));

      emitSendMessage({
        messageType: 'image',
        content: imageUrl
      });

      nextTick(() => scrollToBottom());
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, 'Image upload failed'));
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
    ElMessage.success('Coupon sent successfully');
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
    ElMessage.success('Order sent successfully');
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
      ElMessage.success(contextMenu.value.chat.muted ? 'Mute enabled' : 'Mute disabled');
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
    void loadNotificationSoundRuntime();
    const socket = await socketService.connect(namespace);
    socketRef = socket;

    function initLoad() {
      if (typeof beforeInitLoad === 'function') {
        beforeInitLoad(socket, { selectedChat });
      }

      void refreshChats();

      if (selectedChat.value) {
        socket.emit('join_chat', buildAdminJoinPayload(selectedChat.value.id));
        void loadMessages(selectedChat.value.id);
      }
    }

    socket.on('connect', () => {
      initLoad();
    });

    if (socket.connected) {
      initLoad();
    }

    socket.on('new_message', (data) => {
      const incomingChatId = normalizeChatId(data.chatId);
      if (!incomingChatId) return;
      if (hasSeenMessage(incomingChatId, data.id)) return;
      if (!isAdminSender(data)) {
        playMessageNotificationSound();
      }


      if (!upsertBeforeSelectedCheck && pushIncomingToSelectedChat(data, incomingChatId)) {
        void syncReadState(incomingChatId);
        scheduleRefreshChats();
        return;
      }

      if (upsertBeforeSelectedCheck) {
        if (pushIncomingToSelectedChat(data, incomingChatId)) {
          void syncReadState(incomingChatId);
        }
      }
      scheduleRefreshChats();
    });

    socket.on('message_sent', (data) => {
      const selectedId = normalizeChatId(selectedChat.value?.id);
      if (data?.chatId && normalizeChatId(data.chatId) !== selectedId) return;
      const msg = messages.value.find((item) => item.id === data.tempId);
      if (msg) {
        msg.id = data.messageId;
        if (data.time) {
          msg.time = data.time;
        }
        if (Number.isFinite(Number(data?.timestamp || data?.createdAt))) {
          msg.timestamp = Number(data.timestamp || data.createdAt);
        }
        if (msg.status !== 'read') {
          msg.status = 'sent';
        }
      }
      scheduleRefreshChats();
    });

    socket.on('message_read', (data) => {
      const selectedId = normalizeChatId(selectedChat.value?.id);
      if (data?.chatId && normalizeChatId(data.chatId) !== selectedId) return;
      const msg = messages.value.find((item) => item.id === data.messageId);
      if (msg) msg.status = 'read';
      scheduleRefreshChats();
    });

    socket.on('all_messages_read', (data) => {
      const selectedId = normalizeChatId(selectedChat.value?.id);
      if (data?.chatId && normalizeChatId(data.chatId) !== selectedId) return;
      messages.value.forEach((msg) => {
        if (msg.isSelf && msg.status !== 'failed' && msg.status !== 'read') {
          msg.status = 'read';
        }
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
    socketRef.off('new_message');
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
