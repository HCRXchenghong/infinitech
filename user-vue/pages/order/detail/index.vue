<template>
  <view class="page order-detail-page">
    <!-- 顶部导航栏 -->
    <view class="page-header">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>订单详情</text>
      </view>
      <view class="nav-right" />
    </view>

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

    <scroll-view scroll-y class="scroll-content">
      <!-- 订单状态卡片 -->
      <view class="status-card">
        <view class="status-icon-wrapper">
          <view class="status-icon" :class="order.statusIconClass">
            <text>{{ getStatusIcon(order.status) }}</text>
          </view>
        </view>
        <text class="status-text">{{ getStatusText(order.status) }}</text>
        <text v-if="order.estimatedTime" class="status-desc">{{ order.estimatedTime }}</text>
      </view>

      <!-- 商家信息卡片 -->
      <view class="info-card">
        <view class="card-header">
          <view class="shop-info" @tap="goShopDetail">
            <image
              :src="order.shopLogo || '/static/images/default-shop.svg'"
              mode="aspectFill"
              class="shop-logo"
            />
            <view class="shop-detail">
              <text class="shop-name">{{ order.shopName }}</text>
              <text class="shop-arrow">›</text>
            </view>
          </view>
          <view
            v-if="shouldShowContactShop(order.status)"
            class="contact-shop-btn"
            @tap.stop="handleAction('contactShop', order)"
          >
            <image
              class="message-icon"
              src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230095ff%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M21%2015a2%202%200%200%201-2%202H7l-4%204V5a2%202%200%200%201%202-2h14a2%202%200%200%201%202%202z%22%2F%3E%3C%2Fsvg%3E"
              mode="aspectFit"
            />
          </view>
        </view>
      </view>

      <!-- 配送信息卡片 -->
      <view v-if="order.bizType !== 'groupbuy' && order.deliveryInfo" class="info-card">
        <view class="card-header">
          <text class="card-title">配送信息</text>
        </view>
        <view class="delivery-info">
          <view class="info-row">
            <text class="info-label">配送地址</text>
            <text class="info-value">{{ order.deliveryInfo.address }}</text>
          </view>
          <view v-if="order.deliveryInfo.contact" class="info-row">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ order.deliveryInfo.contact }}</text>
          </view>
          <view v-if="order.deliveryInfo.rider" class="info-row">
            <text class="info-label">骑手</text>
            <text class="info-value">{{ order.deliveryInfo.rider }}</text>
          </view>
          <view v-if="Number(order.deliveryInfo.riderRating || 0) > 0" class="info-row">
            <text class="info-label">骑手星级</text>
            <text class="info-value rider-rating">★ {{ formatRating(order.deliveryInfo.riderRating) }}</text>
          </view>
        </view>
        <view v-if="shouldShowContactRider(order.status)" class="card-action">
          <button
            class="action-btn-inline primary"
            @tap="handleAction('contactRider', order)"
          >
            联系骑手
          </button>
        </view>
      </view>

      <!-- 商品信息卡片 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">商品信息</text>
        </view>
        <view class="product-list">
          <view
            v-for="(item, idx) in order.productList"
            :key="idx"
            class="product-item"
          >
            <image
              :src="item.image || item.img || '/static/images/default-food.svg'"
              mode="aspectFill"
              class="product-image"
            />
            <view class="product-info">
              <text class="product-name">{{ item.name }}</text>
              <view class="product-spec" v-if="item.spec || item.specification">
                <text>{{ item.spec || item.specification }}</text>
              </view>
            </view>
            <view class="product-right">
              <text class="product-price">¥{{ formatPrice(item.price) }}</text>
              <text class="product-count">×{{ item.count || item.quantity || 1 }}</text>
            </view>
          </view>
        </view>
        <view class="card-footer">
          <view class="price-row">
            <text class="price-label">商品合计</text>
            <text class="price-value">¥{{ formatPrice(order.productTotal || order.price) }}</text>
          </view>
          <view v-if="order.deliveryFee !== undefined" class="price-row">
            <text class="price-label">配送费</text>
            <text class="price-value">¥{{ formatPrice(order.deliveryFee) }}</text>
          </view>
          <view v-if="order.discount !== undefined && order.discount > 0" class="price-row discount">
            <text class="price-label">优惠减免</text>
            <text class="price-value">-¥{{ formatPrice(order.discount) }}</text>
          </view>
        </view>
      </view>

      <!-- 订单信息卡片 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">订单信息</text>
        </view>
        <view class="order-info">
          <view class="info-row">
            <text class="info-label">订单号</text>
            <text class="info-value">{{ order.id }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">下单时间</text>
            <text class="info-value">{{ order.time }}</text>
          </view>
          <view v-if="order.payTime" class="info-row">
            <text class="info-label">支付时间</text>
            <text class="info-value">{{ order.payTime }}</text>
          </view>
          <view v-if="order.payMethod" class="info-row">
            <text class="info-label">支付方式</text>
            <text class="info-value">{{ order.payMethod }}</text>
          </view>
        </view>
        
        <!-- 操作按钮 -->
        <view v-if="order.bizType === 'groupbuy' && order.status === 'paid_unused'" class="action-buttons">
          <button
            class="action-btn primary"
            @tap="handleAction('voucher', order)"
          >
            查看券码
          </button>
        </view>
        <view v-else-if="shouldShowRefund(order.status)" class="action-buttons">
          <button
            class="action-btn primary"
            @tap="handleAction('refund', order)"
          >
            申请售后
          </button>
        </view>
        <view v-else-if="shouldShowOtherActions(order.status)" class="action-buttons">
          <button
            v-for="btn in getOtherActionButtons(order)"
            :key="btn.text"
            class="action-btn"
            :class="{ primary: btn.primary }"
            @tap="handleAction(btn.action, order)"
          >
            {{ btn.text }}
          </button>
        </view>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>
  </view>
</template>

<script>
import pageLogic from './page-logic.js'

export default pageLogic
</script>

<style scoped lang="scss" src="./index.scss"></style>
