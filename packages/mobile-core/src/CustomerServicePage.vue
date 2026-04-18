<template>
  <view class="container">
    <view class="chat-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-content">
        <view class="back-btn" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="header-title">{{ supportTitle }}</text>
        <view class="more-btn" @tap="showMenu = true">
          <text class="more-icon">⋮</text>
        </view>
      </view>
    </view>

    <view v-if="showMenu" class="menu-mask" @tap="showMenu = false">
      <view class="menu-popup" @tap.stop>
        <view class="menu-item" @tap="clearMessages">
          <text class="menu-text">清空聊天记录</text>
        </view>
      </view>
    </view>

    <scroll-view
      class="chat-messages"
      scroll-y
      :scroll-into-view="scrollToView"
      scroll-with-animation
    >
      <view
        v-for="msg in messages"
        :key="msg.id"
        :id="'msg-' + msg.id"
        class="message-item"
        :class="{ 'message-self': msg.isSelf }"
      >
        <image
          class="message-avatar"
          :src="msg.isSelf ? (avatarUrl || '/static/images/my-avatar.svg') : '/static/images/logo.png'"
          mode="aspectFill"
        />
        <view class="message-content">
          <view v-if="msg.type === 'text'" class="message-bubble">
            {{ msg.content }}
          </view>

          <view v-else-if="msg.type === 'image'" class="message-image">
            <image :src="msg.content" mode="aspectFill" @tap="previewImage(msg.content)" />
          </view>

          <view v-else-if="msg.type === 'order'" class="message-order-card" @tap="openOrderDetail(msg.order)">
            <view class="order-card-head">
              <text class="order-card-tag">订单消息</text>
              <text class="order-card-status">{{ getOrderStatusText(msg.order) }}</text>
            </view>
            <text class="order-card-shop">{{ msg.order && msg.order.shopName ? msg.order.shopName : '订单 #' + formatOrderNo(msg.order) }}</text>
            <view class="order-card-meta">
              <text class="order-card-no">#{{ formatOrderNo(msg.order) }}</text>
              <text class="order-card-amount">¥{{ formatOrderAmount(msg.order) }}</text>
            </view>
            <text class="order-card-link">查看详情</text>
          </view>

          <view v-if="msg.isSelf" class="msg-status-row">
            <text v-if="msg.status === 'sending'" class="msg-status sending">发送中...</text>
            <text v-else-if="msg.status === 'failed'" class="msg-status failed" @tap="resendMessage(msg)">发送失败，点击重试</text>
            <text v-else-if="msg.status === 'sent'" class="msg-status sent">已送达</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="chat-input">
      <view class="input-toolbar">
        <view class="toolbar-action" @tap="chooseImage">
          <image class="action-icon" src="/static/icons/image.svg" mode="aspectFit" />
          <text class="action-text">图片</text>
        </view>
        <view class="toolbar-action" @tap="showOrderPicker = true">
          <image class="action-icon" src="/static/icons/order.svg" mode="aspectFit" />
          <text class="action-text">订单</text>
        </view>
      </view>
      <view class="input-wrapper">
        <textarea
          v-model="inputText"
          placeholder="输入消息..."
          :adjust-position="true"
          :auto-height="true"
          :maxlength="500"
          :hold-keyboard="true"
          class="input-field"
        />
        <view
          class="send-btn"
          :class="{ active: inputText.trim() }"
          @tap="sendMessage"
        >
          发送
        </view>
      </view>
    </view>

    <view v-if="showOrderPicker" class="order-picker-mask" @tap="showOrderPicker = false">
      <view class="order-picker" @tap.stop>
        <view class="picker-header">
          <text class="picker-title">选择订单</text>
          <text class="picker-close" @tap="showOrderPicker = false">×</text>
        </view>
        <scroll-view class="picker-list" scroll-y>
          <view v-if="!recentOrders.length" class="picker-empty">暂无可发送订单</view>
          <view
            v-for="order in recentOrders"
            :key="order.id"
            class="order-picker-item"
            @tap="sendOrder(order)"
          >
            <view class="order-picker-main">
              <text class="order-picker-shop">{{ order.shopName || '订单 #' + formatOrderNo(order) }}</text>
              <text class="order-picker-no">#{{ formatOrderNo(order) }}</text>
            </view>
            <view class="order-picker-right">
              <text class="order-picker-amount">¥{{ formatOrderAmount(order) }}</text>
              <text class="order-picker-status">{{ getOrderStatusText(order) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <OrderDetailPopup
      :show="showOrderDetailPopup"
      :order="currentOrderDetail"
      @close="showOrderDetailPopup = false"
    />
  </view>
</template>

<script>
import createSocket from "@/utils/socket-io";
import config from "@/shared-ui/config";
import {
  fetchHistory,
  markConversationRead,
  readAuthorizationHeader,
  request,
  uploadCommonImage,
  upsertConversation,
} from "@/shared-ui/api.js";
import { playMessageNotificationSound } from "@/shared-ui/notification-sound.js";
import {
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
} from "@/shared-ui/support-runtime.js";
import OrderDetailPopup from "./OrderDetailPopup.vue";
import { createCustomerServicePage } from "./customer-service-page.js";

export default createCustomerServicePage({
  createSocket,
  config,
  fetchHistory,
  markConversationRead,
  readAuthorizationHeader,
  request,
  uploadCommonImage,
  upsertConversation,
  playMessageNotificationSound,
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  OrderDetailPopup,
});
</script>

<style scoped lang="scss" src="./customer-service-page.scss"></style>
