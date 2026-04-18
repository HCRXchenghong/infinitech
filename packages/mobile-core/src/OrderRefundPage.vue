<template>
  <view class="page refund-page">
    <view class="page-header">
      <view class="nav-left" @tap="back">
        <image src="/static/icons/arrow-left.svg" mode="aspectFit" class="nav-icon" />
      </view>
      <view class="nav-title">
        <text>申请售后</text>
      </view>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="scroll-content">
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">订单信息</text>
        </view>
        <view class="order-brief">
          <image
            :src="order.shopLogo || '/static/images/default-shop.svg'"
            mode="aspectFill"
            class="shop-logo"
          />
          <view class="order-info">
            <text class="shop-name">{{ order.shopName }}</text>
            <text class="order-time">{{ order.time }}</text>
          </view>
        </view>
      </view>

      <view class="info-card">
        <view class="card-header">
          <text class="card-title">售后类型</text>
        </view>
        <view class="refund-types">
          <view
            v-for="type in refundTypes"
            :key="type.value"
            class="type-item"
            :class="{ active: selectedType === type.value }"
            @tap="selectType(type.value)"
          >
            <text class="type-name">{{ type.label }}</text>
            <view v-if="selectedType === type.value" class="check-icon">✓</view>
          </view>
        </view>
      </view>

      <view class="info-card">
        <view class="card-header">
          <text class="card-title">选择商品</text>
        </view>
        <view class="product-list">
          <view
            v-for="(item, idx) in order.productList"
            :key="idx"
            class="product-item"
            :class="{ selected: selectedProducts.includes(idx) }"
            @tap="toggleProduct(idx)"
          >
            <view class="product-checkbox">
              <view v-if="selectedProducts.includes(idx)" class="checkbox-checked">✓</view>
              <view v-else class="checkbox-unchecked"></view>
            </view>
            <image
              :src="item.image || '/static/images/default-food.svg'"
              mode="aspectFill"
              class="product-image"
            />
            <view class="product-info">
              <text class="product-name">{{ item.name }}</text>
              <text v-if="item.spec" class="product-spec">{{ item.spec }}</text>
              <text class="product-price">¥{{ formatPrice(item.price) }} × {{ item.count || 1 }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="selectedType !== 'exchange'" class="info-card">
        <view class="card-header">
          <text class="card-title">申请退款金额</text>
          <text class="card-hint">单位：元</text>
        </view>
        <view class="refund-amount-row">
          <text class="refund-amount-prefix">¥</text>
          <input
            v-model="requestedRefundAmountYuan"
            class="refund-amount-input"
            type="digit"
            maxlength="12"
            placeholder="请输入本次申请退款金额"
            @input="onRefundAmountInput"
          />
        </view>
        <text class="refund-amount-tip">提交后由平台审核，管理端可执行退款或不退款处理。</text>
      </view>

      <view class="info-card">
        <view class="card-header">
          <text class="card-title">问题描述</text>
        </view>
        <textarea
          v-model="problemDesc"
          class="problem-textarea"
          placeholder="请详细描述遇到的问题，以便我们更好地为您处理"
          maxlength="200"
          :auto-height="true"
        />
        <view class="char-count">{{ problemDesc.length }}/200</view>
      </view>

      <view class="info-card">
        <view class="card-header">
          <text class="card-title">上传凭证（选填）</text>
          <text class="card-hint">最多上传3张图片</text>
        </view>
        <view class="upload-section">
          <view v-for="(img, idx) in uploadedImages" :key="idx" class="image-item">
            <image :src="img" mode="aspectFill" class="uploaded-image" />
            <view class="delete-btn" @tap="deleteImage(idx)">×</view>
          </view>
          <view
            v-if="uploadedImages.length < 3"
            class="upload-btn"
            @tap="chooseImage"
          >
            <text class="upload-icon">+</text>
            <text class="upload-text">上传图片</text>
          </view>
        </view>
      </view>

      <view class="info-card">
        <view class="card-header">
          <text class="card-title">联系方式</text>
        </view>
        <view class="contact-info">
          <view class="contact-item">
            <text class="contact-label">手机号</text>
            <input
              v-model="contactPhone"
              class="contact-input"
              type="number"
              placeholder="请输入手机号"
              maxlength="11"
            />
          </view>
        </view>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>

    <view class="bottom-actions">
      <button class="submit-btn" :loading="submitting" @tap="handleSubmit">提交申请</button>
    </view>

    <SuccessModal
      :show="showSuccessModal"
      title="申请已提交"
      message="您的售后申请已成功提交，我们会在1-3个工作日内处理，请耐心等待"
      @close="showSuccessModal = false"
      @confirm="handleSuccessConfirm"
    />
  </view>
</template>

<script>
import { createAfterSales, fetchOrderDetail, uploadAfterSalesEvidence } from "@/shared-ui/api.js";
import SuccessModal from "@/components/SuccessModal.vue";
import { createOrderRefundPage } from "./order-after-sales-pages.js";

export default createOrderRefundPage({
  fetchOrderDetail,
  createAfterSales,
  uploadAfterSalesEvidence,
  SuccessModal,
});
</script>

<style scoped lang="scss" src="./order-refund-page.scss"></style>
