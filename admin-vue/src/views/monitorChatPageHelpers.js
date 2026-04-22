import { getCurrentAdminSocketIdentity } from '@/utils/runtime';
import { useChatConsole } from './useChatConsole';
import { useAdminChatRtcActions } from './chatConsolePageHelpers';

export function useMonitorChatPage({ ElMessage, ElMessageBox }) {
  const page = useChatConsole({
    namespace: '/monitor',
    beforeInitLoad: (socket) => {
      socket.emit('join_monitor', { userId: getCurrentAdminSocketIdentity()?.userId || '' });
    },
    defaultChatName: (data) => `聊天 #${data.chatId}`,
    awaitIncomingSave: true,
    upsertBeforeSelectedCheck: true,
    async onClearMessages({ socket, selectedChat, messages, clearingMessages }) {
      if (!selectedChat.value || clearingMessages.value || !socket) {
        return;
      }

      clearingMessages.value = true;
      try {
        await ElMessageBox.confirm('确定要清空聊天记录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        messages.value = [];
        socket.emit('clear_messages', { chatId: selectedChat.value.id });
        ElMessage.success('聊天记录已清空');
      } catch {
        // ignore cancel
      } finally {
        clearingMessages.value = false;
      }
    },
    async onDeleteChat({ socket, contextMenu, chats, selectedChat, messages, normalizeChatId }) {
      if (!socket) {
        return;
      }

      try {
        await ElMessageBox.confirm('删除后将清空该聊天的所有记录，确定删除吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        const chatId = normalizeChatId(contextMenu.value.chat?.id);
        const index = chats.value.findIndex((chat) => normalizeChatId(chat.id) === chatId);
        if (index > -1) {
          chats.value.splice(index, 1);
        }

        if (normalizeChatId(selectedChat.value?.id) === chatId) {
          selectedChat.value = null;
          messages.value = [];
        }

        if (chatId) {
          socket.emit('clear_messages', { chatId });
        }

        ElMessage.success('已删除聊天');
      } catch {
        // ignore cancel
      }
    },
  });

  const { canStartRTC, selectedChatStatusText, startRTC } = useAdminChatRtcActions({
    selectedChat: page.selectedChat,
    ElMessage,
    buildPayload: (chat) => ({
      chatId: chat.id,
      role: chat.role,
      targetId: chat.targetId,
      phone: chat.phone,
      name: chat.name,
      orderId: chat.orderId,
      entryPoint: 'admin_monitor_chat',
      scene: 'admin_monitor',
    }),
  });

  function setSearchQuery(value) {
    page.searchQuery.value = value;
  }

  function setInputMessage(value) {
    page.inputMessage.value = value;
  }

  function setMessagesContainer(element) {
    page.messagesContainer.value = element;
  }

  function setShowCouponDialog(value) {
    page.showCouponDialog.value = Boolean(value);
  }

  function setShowOrderDialog(value) {
    page.showOrderDialog.value = Boolean(value);
  }

  function setShowImageViewer(value) {
    page.showImageViewer.value = Boolean(value);
  }

  function closeContextMenu() {
    page.contextMenu.value.show = false;
  }

  function openCouponDialog() {
    setShowCouponDialog(true);
  }

  function openOrderDialog() {
    setShowOrderDialog(true);
  }

  return {
    ...page,
    canStartRTC,
    closeContextMenu,
    openCouponDialog,
    openOrderDialog,
    selectedChatStatusText,
    setInputMessage,
    setMessagesContainer,
    setSearchQuery,
    setShowCouponDialog,
    setShowImageViewer,
    setShowOrderDialog,
    startRTC,
  };
}
