<template>
  <div class="chat-console-page monitor-chat-page">
    <div class="chat-container">
      <div class="chat-layout">
        <ChatConsoleSidebar
          :filtered-chats="filteredChats"
          :search-query="searchQuery"
          :selected-chat="selectedChat"
          :select-chat="selectChat"
          :set-search-query="setSearchQuery"
          :show-context-menu="showContextMenu"
        />

        <ChatConsoleContextMenu
          :close-context-menu="closeContextMenu"
          :context-menu="contextMenu"
          :delete-chat="deleteChat"
          :toggle-mute="toggleMute"
        />

        <ChatConsoleConversationPanel
          :can-start-r-t-c="canStartRTC"
          :clear-messages="clearMessages"
          :clearing-messages="clearingMessages"
          :handle-image-upload="handleImageUpload"
          :input-message="inputMessage"
          :messages="messages"
          :open-coupon-dialog="openCouponDialog"
          :open-order-dialog="openOrderDialog"
          :preview-image="previewImage"
          :resend-message="resendMessage"
          :selected-chat="selectedChat"
          :selected-chat-status-text="selectedChatStatusText"
          :sending-coupon="sendingCoupon"
          :sending-message="sendingMessage"
          :sending-order="sendingOrder"
          :send-message="sendMessage"
          :set-input-message="setInputMessage"
          :set-messages-container="setMessagesContainer"
          :start-r-t-c="startRTC"
          :uploading-image="uploadingImage"
        />
      </div>

      <ChatConsoleDialogs
        :coupons="coupons"
        :orders="orders"
        :preview-image-url="previewImageUrl"
        :send-coupon="sendCoupon"
        :send-order="sendOrder"
        :set-show-coupon-dialog="setShowCouponDialog"
        :set-show-image-viewer="setShowImageViewer"
        :set-show-order-dialog="setShowOrderDialog"
        :show-coupon-dialog="showCouponDialog"
        :show-image-viewer="showImageViewer"
        :show-order-dialog="showOrderDialog"
      />
    </div>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import './ChatConsolePage.css';
import ChatConsoleContextMenu from './chatConsoleSections/ChatConsoleContextMenu.vue';
import ChatConsoleConversationPanel from './chatConsoleSections/ChatConsoleConversationPanel.vue';
import ChatConsoleDialogs from './chatConsoleSections/ChatConsoleDialogs.vue';
import ChatConsoleSidebar from './chatConsoleSections/ChatConsoleSidebar.vue';
import { useMonitorChatPage } from './monitorChatPageHelpers';

const {
  searchQuery,
  selectedChat,
  inputMessage,
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
  deleteChat,
  canStartRTC,
  startRTC,
} = useMonitorChatPage({
  ElMessage,
  ElMessageBox,
});
</script>
