<template>
  <view class="container">
    <!-- 消息弹窗组件 -->
    <message-popup />
    <!-- 自定义状态栏 + 顶部工作状态栏 -->
    <view class="header-wrapper" ref="headerWrapper">
      <view class="header bg-primary">
        <!-- 状态栏占位 -->
        <view :style="{ height: statusBarHeight + 'px' }"></view>

        <!-- 顶部信息栏 -->
        <view class="header-content">
          <view class="flex items-center" @click="showStationPicker = true">
            <text class="station-name">{{ currentLocation }}</text>
            <text class="icon-arrow">▼</text>
          </view>
          <view class="header-icons">
            <view class="header-icon-btn" @click="goService">
              <icon-headphones size="40rpx" color="white" />
            </view>
            <icon-bell size="40rpx" color="white" />
          </view>
        </view>

        <!-- 开工/收工滑块 + 今日收入 -->
        <view class="work-status-bar">
          <view class="work-toggle" @click="handleToggleWork">
            <view class="toggle-bg">
              <text class="toggle-label left">开工</text>
              <text class="toggle-label right">收工</text>
              <view class="toggle-slider" :class="{ active: isOnline }">
                <text class="slider-text">{{ isOnline ? '听单中' : '休息中' }}</text>
              </view>
            </view>
          </view>
          
          <view class="earnings-info">
            <text class="earnings-label">今日预估收入</text>
            <text class="earnings-amount">¥{{ todayEarnings }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view v-if="isOnline" class="filter-bar" ref="filterBar" :style="filterBarStyle">
      <text class="filter-title">推荐订单</text>
      <text class="divider">|</text>
      <view
        v-for="(filter, index) in filters"
        :key="index"
        class="filter-item"
        :class="{ active: currentFilter === index }"
        @click="currentFilter = index"
      >
        <text class="filter-text">{{ filter }}</text>
      </view>
    </view>

    <!-- 订单列表区域 -->
    <view v-if="!isOnline || newOrders.length === 0" class="empty-container">
      <!-- 休息中状态 -->
      <view v-if="!isOnline" class="empty-state">
        <view class="empty-icon-wrapper">
          <image class="empty-logo" src="/static/images/logo.png" mode="aspectFit" />
        </view>
        <text class="empty-title">休息中</text>
        <text class="empty-desc">接单请先点击上方"开工"</text>
        <button class="btn-start-work" @click="handleToggleWork">立即开工</button>
      </view>

      <!-- 听单中，无订单 -->
      <view v-else class="empty-state listening">
        <view class="radar-icon-wrapper">
          <image class="empty-logo" src="/static/images/logo.png" mode="aspectFit" />
        </view>
        <text class="empty-title primary">正在听单...</text>
        <text class="empty-desc">系统正在为您优选订单</text>
      </view>
    </view>

    <scroll-view
      v-else
      class="order-list"
      scroll-y
      :style="orderListStyle"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="orders-container">
        <view v-if="displayOrders.length === 0" class="list-empty-tip">
          当前筛选暂无可抢订单
        </view>
        <view
          v-for="order in displayOrders"
          :key="order.id"
          class="order-card"
        >
          <!-- 顶部价格和时间 -->
          <view class="order-header">
            <view class="price-section">
              <view class="price-row">
                <text class="price-main">¥{{ order.price }}</text>
                <text v-if="order.isHighPrice" class="badge high-price">高价</text>
                <text v-if="order.routeLabel" class="badge route">{{ order.routeLabel }}</text>
              </view>
              <text v-if="order.priceDesc" class="price-desc">{{ order.priceDesc }}</text>
            </view>
            <view class="time-section">
              <view class="time-badge">{{ order.timeLeft }}分钟送达</view>
              <text class="distance-text">全程 {{ order.totalDistanceText }}</text>
            </view>
          </view>

          <!-- 路线详情 -->
          <view class="route-details">
            <view class="route-line"></view>
            
            <!-- 取货点 -->
            <view class="route-item">
              <view class="route-dot pickup">取</view>
              <view class="route-info">
                <text class="route-name">{{ order.shopName }}</text>
                <view class="route-meta">
                  <text class="route-address">{{ order.shopAddress }}</text>
                  <text class="route-distance">距离你 {{ order.shopDistanceText }}</text>
                </view>
              </view>
            </view>

            <!-- 送货点 -->
            <view class="route-item">
              <view class="route-dot delivery">送</view>
              <view class="route-info">
                <text class="route-name">{{ order.customerAddress }}</text>
                <view class="route-meta">
                  <text class="route-address">尾号{{ order.customerPhoneTail }}</text>
                  <text class="route-distance">送货 {{ order.customerDistanceText }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 底部操作区 -->
          <view class="order-footer">
            <view class="countdown-box">
              剩余 <text class="countdown-num">{{ order.countdown }}</text> 秒失效
            </view>
            <button class="btn-grab" @click="handleGrabOrder(order)">
              立即抢单
            </button>
          </view>
        </view>

        <view class="list-end">—— 暂时没有更多订单了 ——</view>
      </view>
    </scroll-view>

    <!-- 开工确认弹窗 -->
    <view v-if="showStartWorkModal" class="modal-overlay" @click="showStartWorkModal = false">
      <view class="confirm-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">开工提醒</text>
        </view>
        <view class="modal-body">
          <text class="modal-text">• 请遵守交通规则，注意安全</text>
          <text class="modal-text">• 保持微笑服务，礼貌待人</text>
          <text class="modal-text">• 及时接单，准时送达</text>
          <text class="modal-text">• 如遇问题请及时联系客服</text>
          <view class="checkbox-row" @click="agreeTerms = !agreeTerms">
            <view class="checkbox" :class="{ checked: agreeTerms }">
              <text v-if="agreeTerms">✓</text>
            </view>
            <text class="checkbox-label">我已确认并同意遵守以上规则</text>
          </view>
        </view>
        <view class="modal-actions">
          <button class="btn-cancel" @click="showStartWorkModal = false">取消</button>
          <button class="btn-confirm" :disabled="!agreeTerms" @click="confirmStartWork">确定</button>
        </view>
      </view>
    </view>

    <!-- 停工确认弹窗 -->
    <view v-if="showStopWorkModal" class="modal-overlay" @click="showStopWorkModal = false">
      <view class="confirm-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">停工确认</text>
        </view>
        <view class="modal-body">
          <text v-if="hasUnfinishedOrders" class="modal-text center">您还有订单未完成，确定要停工吗？</text>
          <text v-else class="modal-text center">您确定要停工吗？</text>
          <text v-if="hasUnfinishedOrders" class="modal-hint">停工后不要忘记送完最后订单</text>
        </view>
        <view class="modal-actions">
          <button class="btn-cancel" @click="showStopWorkModal = false">取消</button>
          <button class="btn-confirm" @click="confirmStopWork">确定</button>
        </view>
      </view>
    </view>

    <!-- 停工感谢弹窗 -->
    <view v-if="showThanksModal" class="modal-overlay" @click="showThanksModal = false">
      <view class="confirm-modal" @click.stop>
        <view class="modal-body thanks">
          <text class="thanks-icon">🎉</text>
          <text class="thanks-text">感谢您为悦享做出的贡献</text>
          <text class="thanks-text">祝您生活愉快！</text>
        </view>
        <view class="modal-actions">
          <button class="btn-confirm full" @click="showThanksModal = false">知道了</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import pageLogic from './index-logic.ts'

export default pageLogic
</script>

<style scoped lang="scss" src="./index.scss"></style>
