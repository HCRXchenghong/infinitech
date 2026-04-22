<template>
  <div class="chat-main">
    <div v-if="selectedChat" class="chat-window">
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-header-name">{{ selectedChat.name }}</div>
          <div class="chat-header-status">{{ selectedChatStatusText }}</div>
        </div>
        <div class="chat-header-actions">
          <el-button size="small" type="primary" plain :disabled="!canStartRTC" @click="startRTC">
            RTC 语音
          </el-button>
          <el-button
            size="small"
            type="danger"
            :loading="clearingMessages"
            @click="clearMessages"
          >
            清空聊天记录
          </el-button>
        </div>
      </div>

      <div :ref="setMessagesContainer" class="chat-messages">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message"
          :class="{ 'message-self': msg.isSelf }"
        >
          <img v-if="msg.isSelf" src="/logo.png" class="message-avatar message-avatar-img" />
          <img v-else-if="msg.avatar" :src="msg.avatar" class="message-avatar message-avatar-img" />
          <div v-else class="message-avatar">{{ (msg.sender || '聊').charAt(0) }}</div>
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
              <span v-if="msg.isSelf && msg.status === 'sending'" class="msg-status sending">
                发送中
              </span>
              <span
                v-if="msg.isSelf && msg.status === 'failed'"
                class="msg-status failed"
                @click="resendMessage(msg)"
              >
                发送失败，点击重试
              </span>
              <span v-if="msg.isSelf && msg.status === 'sent'" class="msg-status sent">已发送</span>
              <span v-if="msg.isSelf && msg.status === 'read'" class="msg-status read">已读</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <div class="input-toolbar">
          <el-upload :show-file-list="false" :before-upload="handleImageUpload" accept="image/*">
            <el-button size="small" :icon="Picture" :loading="uploadingImage">图片</el-button>
          </el-upload>
          <el-button
            size="small"
            :icon="Ticket"
            :loading="sendingCoupon"
            @click="openCouponDialog"
          >
            优惠券
          </el-button>
          <el-button size="small" :loading="sendingOrder" @click="openOrderDialog">订单</el-button>
        </div>
        <div class="input-area">
          <textarea
            :value="inputMessage"
            placeholder="输入消息..."
            rows="3"
            @input="setInputMessage($event.target.value)"
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <el-button
            type="primary"
            :loading="sendingMessage"
            :disabled="!inputMessage.trim() || sendingMessage"
            @click="sendMessage"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>

    <div v-else class="chat-empty">
      <div class="empty-icon">消息</div>
      <div class="empty-text">选择一个聊天开始对话</div>
    </div>
  </div>
</template>

<script setup>
import { Picture, Ticket } from '@element-plus/icons-vue';

defineProps({
  canStartRTC: {
    type: Boolean,
    default: false,
  },
  clearMessages: {
    type: Function,
    required: true,
  },
  clearingMessages: {
    type: Boolean,
    default: false,
  },
  handleImageUpload: {
    type: Function,
    required: true,
  },
  inputMessage: {
    type: String,
    default: '',
  },
  messages: {
    type: Array,
    default: () => [],
  },
  openCouponDialog: {
    type: Function,
    required: true,
  },
  openOrderDialog: {
    type: Function,
    required: true,
  },
  previewImage: {
    type: Function,
    required: true,
  },
  resendMessage: {
    type: Function,
    required: true,
  },
  selectedChat: {
    type: Object,
    default: null,
  },
  selectedChatStatusText: {
    type: String,
    default: '',
  },
  sendingCoupon: {
    type: Boolean,
    default: false,
  },
  sendingMessage: {
    type: Boolean,
    default: false,
  },
  sendingOrder: {
    type: Boolean,
    default: false,
  },
  sendMessage: {
    type: Function,
    required: true,
  },
  setInputMessage: {
    type: Function,
    required: true,
  },
  setMessagesContainer: {
    type: Function,
    required: true,
  },
  startRTC: {
    type: Function,
    required: true,
  },
  uploadingImage: {
    type: Boolean,
    default: false,
  },
});
</script>
