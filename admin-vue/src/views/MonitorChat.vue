<template>
  <div class="chat-container">
    <div class="chat-layout">
      <div class="chat-list">
        <div class="chat-list-header">
          <input v-model="searchQuery" placeholder="搜索聊天" class="search-input" />
        </div>
        <div class="chat-list-body">
          <div
            v-for="chat in filteredChats"
            :key="chat.id"
            class="chat-item"
            :class="{ active: selectedChat?.id === chat.id, unread: chat.unread > 0 }"
            @click="selectChat(chat)"
            @contextmenu.prevent="showContextMenu($event, chat)"
          >
            <img v-if="chat.avatar" :src="chat.avatar" class="chat-avatar chat-avatar-img" />
            <div v-else class="chat-avatar">{{ chat.name.charAt(0) }}</div>
            <div class="chat-info">
              <div class="chat-name">{{ chat.name }}</div>
              <div class="chat-preview">{{ chat.lastMessage }}</div>
            </div>
            <div class="chat-meta">
              <div class="chat-time">{{ chat.time }}</div>
              <div v-if="chat.unread > 0 && !chat.muted" class="chat-badge">{{ chat.unread }}</div>
              <div v-if="chat.muted" class="chat-muted">已静音</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="contextMenu.show" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <div class="context-menu-item" @click="toggleMute">
          {{ contextMenu.chat?.muted ? '取消免打扰' : '消息免打扰' }}
        </div>
        <div class="context-menu-item danger" @click="deleteChat">删除聊天</div>
      </div>
      <div v-if="contextMenu.show" class="context-menu-mask" @click="contextMenu.show = false"></div>

      <div class="chat-main">
        <div v-if="selectedChat" class="chat-window">
          <div class="chat-header">
            <div class="chat-header-info">
              <div class="chat-header-name">{{ selectedChat.name }}</div>
              <div class="chat-header-status">
                {{ selectedChat.role === 'user' ? '顾客' : selectedChat.role === 'rider' ? '骑手' : selectedChat.role === 'merchant' ? '商家' : '用户' }}
                {{ selectedChat.phone }}
              </div>
            </div>
            <div class="chat-header-actions">
              <el-button
                size="small"
                type="primary"
                plain
                :disabled="!canStartRTC"
                @click="startRTC"
              >
                RTC 语音
              </el-button>
              <el-button size="small" type="danger" @click="clearMessages" :loading="clearingMessages">清空聊天记录</el-button>
            </div>
          </div>

          <div class="chat-messages" ref="messagesContainer">
            <div v-for="msg in messages" :key="msg.id" class="message" :class="{ 'message-self': msg.isSelf }">
              <img v-if="msg.isSelf" src="/logo.png" class="message-avatar message-avatar-img" />
              <img v-else-if="msg.avatar" :src="msg.avatar" class="message-avatar message-avatar-img" />
              <div v-else class="message-avatar">{{ msg.sender.charAt(0) }}</div>
              <div class="message-content">
                <div class="message-sender">{{ msg.sender }}</div>
                <div v-if="msg.type === 'image'" class="message-bubble message-image">
                  <img :src="msg.content" alt="图片" @click="previewImage(msg.content)" />
                </div>
                <div v-else-if="msg.type === 'coupon'" class="message-bubble message-coupon">
                  <div class="coupon-icon">券</div>
                  <div class="coupon-info">
                    <div class="coupon-name">{{ msg.coupon.name }}</div>
                    <div class="coupon-amount">¥{{ msg.coupon.amount }}</div>
                  </div>
                </div>
                <div v-else-if="msg.type === 'order'" class="message-bubble message-order">
                  <div class="order-header">
                    <span>订单 #{{ msg.order.orderNo }}</span>
                    <span class="order-status">{{ msg.order.status }}</span>
                  </div>
                  <div class="order-amount">¥{{ msg.order.amount }}</div>
                </div>
                <div v-else class="message-bubble">{{ msg.content }}</div>
                <div class="message-meta">
                  <span class="message-time">{{ msg.time }}</span>
                  <span v-if="msg.isSelf && msg.status === 'sending'" class="msg-status sending">发送中</span>
                  <span v-if="msg.isSelf && msg.status === 'failed'" class="msg-status failed" @click="resendMessage(msg)">发送失败，点击重试</span>
                  <span v-if="msg.isSelf && msg.status === 'sent'" class="msg-status sent">已发送</span>
                  <span v-if="msg.isSelf && msg.status === 'read'" class="msg-status read">已读</span>
                </div>
              </div>
            </div>
          </div>

          <div class="chat-input">
            <div class="input-toolbar">
              <el-upload
                :show-file-list="false"
                :before-upload="handleImageUpload"
                accept="image/*"
              >
                <el-button size="small" :icon="Picture" :loading="uploadingImage">图片</el-button>
              </el-upload>
              <el-button size="small" :icon="Ticket" @click="showCouponDialog = true" :loading="sendingCoupon">优惠券</el-button>
              <el-button size="small" @click="showOrderDialog = true" :loading="sendingOrder">订单</el-button>
            </div>
            <div class="input-area">
              <textarea
                v-model="inputMessage"
                placeholder="输入消息..."
                @keydown.enter.exact.prevent="sendMessage"
                rows="3"
              ></textarea>
              <el-button type="primary" @click="sendMessage" :loading="sendingMessage" :disabled="!inputMessage.trim() || sendingMessage">发送</el-button>
            </div>
          </div>
        </div>
        <div v-else class="chat-empty">
          <div class="empty-icon">消息</div>
          <div class="empty-text">选择一个聊天开始对话</div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showCouponDialog" title="选择优惠券" width="500px">
      <div v-if="coupons.length" class="coupon-list">
        <div
          v-for="coupon in coupons"
          :key="coupon.id"
          class="coupon-item"
          @click="sendCoupon(coupon)"
        >
          <div class="coupon-amount">¥{{ coupon.amount }}</div>
          <div class="coupon-name">{{ coupon.name }}</div>
          <div class="coupon-desc">{{ coupon.desc }}</div>
        </div>
      </div>
      <div v-else class="dialog-empty">暂无可发送优惠券</div>
    </el-dialog>

    <el-dialog v-model="showOrderDialog" title="选择订单" width="500px">
      <div v-if="orders.length" class="order-list">
        <div
          v-for="order in orders"
          :key="order.id"
          class="order-item"
          @click="sendOrder(order)"
        >
          <div class="order-no">订单 #{{ order.orderNo }}</div>
          <div class="order-info">
            <span>{{ order.productName }}</span>
            <span class="order-amount">¥{{ order.amount }}</span>
          </div>
        </div>
      </div>
      <div v-else class="dialog-empty">暂无可发送订单</div>
    </el-dialog>

    <el-image-viewer v-if="showImageViewer" :url-list="[previewImageUrl]" @close="showImageViewer = false" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Picture, Ticket } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getCurrentAdminSocketIdentity } from '@/utils/runtime';
import { canStartAdminRTCCall, startAdminRTCCall } from '@/utils/adminRtc';
import { useChatConsole } from './useChatConsole';

const {
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
} = useChatConsole({
  namespace: '/monitor',
  beforeInitLoad: (socket) => {
    socket.emit('join_monitor', { userId: getCurrentAdminSocketIdentity()?.userId || '' });
  },
  defaultChatName: (data) => `聊天 #${data.chatId}`,
  awaitIncomingSave: true,
  upsertBeforeSelectedCheck: true,
  async onClearMessages({ socket, selectedChat, messages, clearingMessages }) {
    if (!selectedChat.value || clearingMessages.value || !socket) return;

    clearingMessages.value = true;
    try {
      await ElMessageBox.confirm('确定要清空聊天记录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
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
    if (!socket) return;

    try {
      await ElMessageBox.confirm('删除后将清空该聊天的所有记录，确定删除吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });

      const chatId = normalizeChatId(contextMenu.value.chat?.id);
      const index = chats.value.findIndex((chat) => normalizeChatId(chat.id) === chatId);
      if (index > -1) chats.value.splice(index, 1);

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
  }
});

const canStartRTC = computed(() => {
  return canStartAdminRTCCall(selectedChat.value || {});
});

async function startRTC() {
  if (!selectedChat.value) return;

  try {
    await startAdminRTCCall({
      chatId: selectedChat.value.id,
      role: selectedChat.value.role,
      targetId: selectedChat.value.targetId,
      phone: selectedChat.value.phone,
      name: selectedChat.value.name,
      orderId: selectedChat.value.orderId,
      entryPoint: 'admin_monitor_chat',
      scene: 'admin_monitor',
    });
  } catch (error) {
    ElMessage.error(error?.message || '发起 RTC 通话失败');
  }
}
</script>

<style scoped lang="css" src="./MonitorChat.css"></style>
