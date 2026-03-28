<template>
  <view class="container">
    <view v-if="task" class="detail-wrapper">
      <view class="map-area" @click="navigate(task)">
        <text class="map-placeholder">点击使用系统导航前往目的地</text>
        <view class="map-info">
          <text class="distance">距离目的地 {{ formatTaskDistance(task) }}</text>
        </view>
      </view>

      <!-- 倒计时卡片 -->
      <view class="countdown-card" :class="{ urgent: task.remainingTime < 10 }">
        <view class="countdown-left">
          <text class="countdown-label">{{ task.status === 'pending' ? '距取餐超时' : '距送达超时' }}</text>
          <text class="countdown-time">{{ task.remainingTime }} 分钟</text>
        </view>
        <button class="btn-navigate" @click="navigate(task)">导航</button>
      </view>

      <!-- 目的地信息卡片 -->
      <view class="location-card">
        <view class="location-header">
          <view class="location-badge" :class="task.status">
            {{ task.status === 'pending' ? '取' : '送' }}
          </view>
          <view class="location-main">
            <text class="location-name">{{
              task.status === 'pending' ? task.shopName : task.customerAddress
            }}</text>
            <text class="location-address">{{
              task.status === 'pending' ? task.shopAddress : '尾号 ' + task.customerPhoneTail
            }}</text>
          </view>
        </view>
        <view class="location-actions">
          <button class="action-btn" @click="callPhone">
            <text class="btn-icon">📞</text>
            <text class="btn-label">电话</text>
          </button>
          <button class="action-btn" @click="sendMessage">
            <text class="btn-icon">💬</text>
            <text class="btn-label">消息</text>
          </button>
        </view>
      </view>

      <!-- 订单详情 -->
      <view class="order-detail-card">
        <view class="card-title">订单详情</view>
        <view class="detail-row">
          <text class="detail-label">订单编号</text>
          <text class="detail-value">#{{ task.orderNum }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">配送费</text>
          <text class="detail-value price">¥{{ task.price }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">下单时间</text>
          <text class="detail-value">{{ task.createTime }}</text>
        </view>
        <view v-if="task.pickupTime" class="detail-row">
          <text class="detail-label">取餐时间</text>
          <text class="detail-value">{{ task.pickupTime }}</text>
        </view>
        <view class="detail-divider"></view>
        <view class="items-section">
          <text class="detail-label">商品清单</text>
          <text class="items-content">{{ task.items }}</text>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <button class="btn-report" @click="showReport = true">异常上报</button>
        <button class="btn-complete" @click="completeTask">
          {{ task.status === 'pending' ? '我已到店' : '确认送达' }}
        </button>
      </view>
    </view>

    <!-- 异常上报弹窗 -->
    <view v-if="showReport" class="modal-overlay" @click="showReport = false">
      <view class="report-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">异常上报</text>
        </view>
        <view class="report-list">
          <view
            v-for="(reason, index) in reportReasons"
            :key="index"
            class="report-item"
            @click="handleReport(reason)"
          >
            <text>{{ reason }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showReport = false">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import pageLogic from './detail-logic.ts'

export default pageLogic
</script>

<style scoped lang="scss" src="./detail.scss"></style>
