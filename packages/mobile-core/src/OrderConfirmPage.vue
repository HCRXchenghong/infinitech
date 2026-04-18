<template>
  <view class="page confirm">
    <view class="card address" @tap="goAddressList">
      <view class="row between">
        <text class="title">{{ deliveryAddressTitle }}</text>
        <text class="arrow">></text>
      </view>
      <text class="sub">{{ deliveryAddressSubtitle }}</text>
      <view class="row between time">
        <text class="bold">{{ deliveryScheduleTitle }}</text>
        <text class="primary">{{ deliveryScheduleSubtitle }}</text>
      </view>
    </view>

    <view v-if="shop" class="card shop">
      <text class="shop-name">{{ shop.name }}</text>
      <view v-for="item in items" :key="item.id" class="row item">
        <view class="thumb"></view>
        <view class="info">
          <text class="name">{{ item.name }}</text>
          <text class="qty">x {{ item.qty }}</text>
        </view>
        <text class="price">￥{{ itemTotal(item) }}</text>
      </view>

      <view class="row between line">
        <text>打包费</text>
        <text class="price">￥{{ packagingFee.toFixed(2) }}</text>
      </view>
      <view class="row between line">
        <text>配送费</text>
        <text class="price">￥{{ deliveryPrice.toFixed(2) }}</text>
      </view>
      <view v-if="discountAmount > 0" class="row between line discount">
        <text>优惠券</text>
        <text class="price">-￥{{ discountAmount.toFixed(2) }}</text>
      </view>
      <view class="row justify-end total-row">
        <text v-if="discountAmount > 0" class="save">已优惠￥{{ discountAmount.toFixed(2) }}</text>
        <text>小计</text>
        <text class="total">￥{{ finalTotalDisplay }}</text>
      </view>
    </view>

    <view class="card">
      <view class="row between" @tap="goRemark">
        <text>备注</text>
        <text class="gray">{{ remarkText || "口味、偏好等" }}</text>
      </view>
      <view class="row between" @tap="goTableware">
        <text>餐具数量</text>
        <text class="gray">{{ tablewareText || "未选择" }}</text>
      </view>
      <view class="row between" @tap="goCoupon">
        <text>优惠券</text>
        <text class="gray">{{ couponSummaryText }}</text>
      </view>
    </view>

    <view class="card pay-method-card">
      <view class="row between pay-method-header">
        <text class="pay-method-title">支付方式</text>
        <text class="pay-method-current">{{ payMethodLabel(selectedPayMethod) }}</text>
      </view>
      <view v-if="paymentOptionsLoading" class="pay-method-empty">
        <text class="gray">正在加载支付方式...</text>
      </view>
      <view v-else-if="payMethods.length === 0" class="pay-method-empty">
        <text class="gray">后台暂未开放当前端订单支付方式</text>
      </view>
      <view v-else class="pay-method-list">
        <view
          v-for="item in payMethods"
          :key="item.value"
          class="pay-method-item"
          :class="{ active: selectedPayMethod === item.value }"
          @tap="selectedPayMethod = item.value"
        >
          <view class="pay-method-left">
            <text class="pay-method-name">{{ item.label }}</text>
            <text class="pay-method-tip">{{ item.tip }}</text>
          </view>
          <text class="pay-method-check">{{ selectedPayMethod === item.value ? "✓" : "" }}</text>
        </view>
      </view>
    </view>

    <view class="pay-bar">
      <view class="amount">
        <text class="big">￥{{ finalTotalDisplay }}</text>
        <text v-if="discountAmount > 0" class="hint">已优惠￥{{ discountAmount.toFixed(2) }}</text>
      </view>
      <button class="pay-btn" @tap="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<script>
import {
  buildAuthorizationHeader,
  createOrder,
  earnPoints,
  fetchProductDetail,
  fetchShopDetail,
  fetchUserAddresses,
  request,
} from "@/shared-ui/api.js";
import {
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment,
} from "@/shared-ui/client-payment.js";
import {
  isHtmlDocumentPayload,
  normalizeErrorMessage,
} from "@/shared-ui/foundation/error.js";
import { useUserOrderStore } from "@/shared-ui/userOrderStore.js";
import { createOrderConfirmPage } from "./order-confirm-page.js";

export default createOrderConfirmPage({
  buildAuthorizationHeader,
  createOrder,
  earnPoints,
  fetchProductDetail,
  fetchShopDetail,
  fetchUserAddresses,
  request,
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment,
  isHtmlDocumentPayload,
  normalizeErrorMessage,
  useUserOrderStore,
});
</script>

<style scoped lang="scss" src="./order-confirm-page.scss"></style>
