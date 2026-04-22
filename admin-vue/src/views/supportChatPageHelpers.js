import { useChatConsole } from './useChatConsole';
import { useAdminChatRtcActions } from './chatConsolePageHelpers';

export function useSupportChatPage({ ElMessage }) {
  const page = useChatConsole({
    namespace: '/support',
    defaultChatName: '骑手',
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
