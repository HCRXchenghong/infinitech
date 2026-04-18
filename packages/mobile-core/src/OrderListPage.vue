<template>
  <view class="page order-list-page">
    <view class="page-header">
      <text class="page-title">订单</text>
      <view class="search-btn" @tap="goSearch">
        <image src="/static/icons/search.svg" mode="aspectFit" class="search-icon" />
      </view>
    </view>

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
      <view v-if="filteredOrders.length === 0" class="empty-state">
        <view class="empty-icon-wrapper">
          <image src="/static/icons/empty-order.svg" mode="aspectFit" class="empty-icon-img" />
        </view>
        <text class="empty-text">暂无相关订单</text>
        <text class="empty-hint">您的订单将显示在这里</text>
      </view>

      <view
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        @tap="goDetail(order.id, order)"
      >
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
            <text class="order-status" :class="order.statusClass">
              {{ order.statusText }}
            </text>
          </view>
        </view>

        <view class="card-body">
          <view v-if="order.itemCount === 1" class="single-item">
            <text class="item-name">{{ order.items }}</text>
            <text class="total-price">{{ order.price === '-' ? '-' : ('¥' + formatPrice(order.price)) }}</text>
          </view>
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

      <view v-if="filteredOrders.length > 0" class="list-footer">
        <view class="footer-line"></view>
        <text class="footer-text">显示最近半年的订单</text>
        <view class="footer-line"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import {
  fetchAfterSalesList,
  fetchGroupbuyVouchers,
  fetchOrders,
  fetchVoucherQRCode,
  recordPhoneContactClick,
} from "@/shared-ui/api.js";
import { canUseUserRTCContact, loadRTCRuntimeSettings } from "@/shared-ui/rtc-contact.js";
import ContactModal from "@/components/ContactModal.vue";
import PhoneWarningModal from "@/components/PhoneWarningModal.vue";
import { createOrderListPage } from "./order-list-page.js";
import { mapAfterSalesItem, mapOrderItem } from "./order-list-utils.js";

export default createOrderListPage({
  fetchAfterSalesList,
  fetchGroupbuyVouchers,
  fetchOrders,
  fetchVoucherQRCode,
  recordPhoneContactClick,
  canUseUserRTCContact,
  loadRTCRuntimeSettings,
  mapAfterSalesItem,
  mapOrderItem,
  ContactModal,
  PhoneWarningModal,
});
</script>

<style scoped lang="scss" src="./order-list-page.scss"></style>
