<template>
  <view class="container">
    <view class="chat-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-content">
        <image class="back-icon" src="/static/icons/back.png" @click="goBack"></image>
        <text class="header-title">{{ chatTitle }}</text>
        <text class="more-icon" @click="showMenu = true">⋮</text>
      </view>
    </view>

    <view v-if="showMenu" class="menu-mask" @click="showMenu = false">
      <view class="menu-popup" @click.stop>
        <view class="menu-item" @click="reportService">
          <text class="menu-text">举报客服</text>
        </view>
        <view class="menu-item" @click="clearMessages">
          <text class="menu-text">删除聊天记录</text>
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
        <image class="message-avatar" :src="msg.isSelf ? (avatarUrl || '/static/images/logo.png') : (msg.avatar || otherAvatar || '/static/images/logo.png')" mode="aspectFill"></image>
        <view class="message-content">
          <view v-if="msg.officialIntervention" class="official-intervention">{{ msg.interventionLabel || '官方介入' }}</view>
          <view v-if="msg.type === 'text'" class="message-bubble">{{ msg.content }}</view>
          <view v-else-if="msg.type === 'image'" class="message-image">
            <image :src="msg.content" mode="aspectFill" @click="previewImage(msg.content)"></image>
          </view>
          <view v-else-if="msg.type === 'coupon'" class="message-coupon">
            <view class="coupon-icon">🎫</view>
            <view class="coupon-info">
              <text class="coupon-name">{{ msg.coupon.name }}</text>
              <text class="coupon-amount">¥{{ msg.coupon.amount }}</text>
            </view>
          </view>
          <view v-else-if="msg.type === 'order'" class="message-order-card" @click="openOrderDetail(msg.order)">
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
            <text v-if="msg.status === 'sending'" class="msg-status sending">⏳</text>
            <text v-else-if="msg.status === 'failed'" class="msg-status failed" @click="resendMessage(msg)">❗发送失败</text>
            <text v-else-if="msg.status === 'read'" class="msg-status read">✓✓</text>
            <text v-else-if="msg.status === 'sent'" class="msg-status sent">✓</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="chat-input">
      <view class="input-toolbar">
        <view class="toolbar-action" @click="chooseImage">
          <image class="action-icon" src="/static/icons/image.png"></image>
          <text class="action-text">图片</text>
        </view>
        <view class="toolbar-action" @click="showOrderPicker = true">
          <image class="action-icon" src="/static/icons/order.png"></image>
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
        ></textarea>
        <view class="send-btn" :class="{ active: inputText.trim() }" @click="sendMessage">发送</view>
      </view>
    </view>

    <view v-if="showOrderPicker" class="order-picker-mask" @click="showOrderPicker = false">
      <view class="order-picker" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择订单</text>
          <text class="picker-close" @click="showOrderPicker = false">×</text>
        </view>
        <scroll-view class="picker-list" scroll-y>
          <view v-if="!recentOrders.length" class="picker-empty">暂无可发送订单</view>
          <view
            v-for="order in recentOrders"
            :key="order.id"
            class="order-picker-item"
            @click="sendOrder(order)"
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

<script lang="ts">
import pageLogic from './index-logic.ts'

export default pageLogic
</script>

<style scoped lang="scss" src="./index.scss"></style>
