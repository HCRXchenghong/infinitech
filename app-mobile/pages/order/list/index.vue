<template>
  <view class="page order-list-page">
    <!-- 顶部标题栏 -->
    <view class="page-header">
      <text class="page-title">订单</text>
      <view class="search-btn" @tap="goSearch">
        <image src="/static/icons/search.svg" mode="aspectFit" class="search-icon" />
      </view>
    </view>

    <!-- 分类筛选标签 -->
    <view class="tabs-bar">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: currentTab === tab.id }"
        @tap="switchTab(tab.id)"
      >
        <text>{{ tab.name }}</text>
        <view v-if="currentTab === tab.id" class="tab-indicator"></view>
      </view>
    </view>

    <!-- 订单列表 -->
    <!-- 自定义弹窗 -->
    <ContactModal
      :show="showContactModal"
      :title="contactModalTitle"
      :show-rtc="showRtcContact"
      @close="showContactModal = false"
      @rtc="handleRTCContact"
      @online="handleOnlineContact"
      @phone="handlePhoneContact"
    />
    <PhoneWarningModal
      :show="showPhoneWarning"
      @close="showPhoneWarning = false"
      @confirm="handleConfirmPhone"
    />

    <scroll-view
      scroll-y
      class="order-list"
      :refresher-enabled="false"
      @scroll="onScroll"
    >
      <!-- 空状态 -->
      <view v-if="filteredOrders.length === 0" class="empty-state">
        <view class="empty-icon-wrapper">
          <image src="/static/icons/empty-order.svg" mode="aspectFit" class="empty-icon-img" />
        </view>
        <text class="empty-text">暂无相关订单</text>
        <text class="empty-hint">您的订单将显示在这里</text>
      </view>

      <!-- 订单卡片 -->
      <view
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        @tap="goDetail(order.id, order)"
      >
        <!-- 卡片头部: 商家信息 + 状态 -->
        <view class="card-header">
          <view class="shop-info">
            <image
              :src="order.shopLogo || '/static/images/default-shop.svg'"
              mode="aspectFill"
              class="shop-logo-img"
            />
            <view class="shop-detail">
              <view class="shop-name-row">
                <text class="shop-name">{{ order.shopName }}</text>
                <text class="arrow">›</text>
              </view>
              <text class="order-time">{{ order.time }}</text>
            </view>
          </view>
          <view class="status-wrapper">
            <text class="order-status" :class="getStatusClass(order)">
              {{ order.statusText }}
            </text>
          </view>
        </view>

        <!-- 卡片中部: 商品摘要 -->
        <view class="card-body">
          <!-- 单个商品显示名称 -->
          <view v-if="order.itemCount === 1" class="single-item">
            <text class="item-name">{{ order.items }}</text>
            <text class="total-price">{{ order.price === '-' ? '-' : ('¥' + formatPrice(order.price)) }}</text>
          </view>
          <!-- 多个商品显示缩略图 -->
          <view v-else class="multi-items">
            <view class="item-images">
              <image
                v-for="(img, idx) in order.imageUrls.slice(0, 4)"
                :key="idx"
                :src="img"
                mode="aspectFill"
                class="item-image"
              />
              <view v-if="order.itemCount > 4" class="item-more">
                <text>+{{ order.itemCount - 4 }}</text>
              </view>
            </view>
            <view class="price-info">
              <text class="total-price">{{ order.price === '-' ? '-' : ('¥' + formatPrice(order.price)) }}</text>
              <text class="item-count">共 {{ order.itemCount }} 件</text>
            </view>
          </view>
        </view>

        <!-- 卡片底部: 操作按钮 -->
        <view class="card-footer">
          <view class="action-buttons">
            <button
              v-for="btn in getButtons(order)"
              :key="btn.text"
              class="action-btn"
              :class="{ primary: btn.primary }"
              @tap.stop="handleAction(btn.action, order)"
            >
              {{ btn.text }}
            </button>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view v-if="filteredOrders.length > 0" class="list-footer">
        <view class="footer-line"></view>
        <text class="footer-text">显示最近半年的订单</text>
        <view class="footer-line"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import pageLogic from './page-logic.js'

export default pageLogic
</script>

<style scoped lang="scss" src="./index.scss"></style>
