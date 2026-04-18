<template>
  <view class="page errand-detail">
    <PageHeader title="订单详情" />

    <scroll-view scroll-y class="content">
      <view class="status-card">
        <text class="status-text">{{ order.statusText }}</text>
        <text class="service-text">{{ order.serviceName }}</text>
        <text class="order-id">{{ order.id }}</text>
      </view>

      <view class="card">
        <view class="card-title">地址信息</view>
        <view class="addr-row">
          <view class="addr-dot green"></view>
          <view class="addr-info">
            <text class="addr-label">{{ startLabel }}</text>
            <text class="addr-text">{{ order.pickup || "未填写" }}</text>
          </view>
        </view>
        <view v-if="showDropoff" class="addr-line"></view>
        <view v-if="showDropoff" class="addr-row">
          <view class="addr-dot orange"></view>
          <view class="addr-info">
            <text class="addr-label">{{ endLabel }}</text>
            <text class="addr-text">{{ order.dropoff }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-title">需求信息</view>
        <view class="info-row">
          <text class="info-label">服务类型</text>
          <text class="info-value">{{ order.serviceName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">需求说明</text>
          <text class="info-value">{{ order.item }}</text>
        </view>
        <view class="info-row" v-if="order.amount > 0">
          <text class="info-label">预估商品金额</text>
          <text class="info-value">¥{{ amountText }}</text>
        </view>
        <view class="info-row" v-if="order.preferredTime">
          <text class="info-label">期望时间</text>
          <text class="info-value">{{ order.preferredTime }}</text>
        </view>
        <view class="info-row" v-if="order.remark">
          <text class="info-label">备注</text>
          <text class="info-value">{{ order.remark }}</text>
        </view>
        <view class="info-row" v-if="order.createdAtText">
          <text class="info-label">下单时间</text>
          <text class="info-value">{{ order.createdAtText }}</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">费用明细</view>
        <view class="info-row" v-if="order.amount > 0">
          <text class="info-label">商品预估</text>
          <text class="info-value">¥{{ amountText }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">跑腿费</text>
          <text class="info-value">¥{{ deliveryFeeText }}</text>
        </view>
        <view class="info-row total">
          <text class="info-label">合计</text>
          <text class="info-value price">¥{{ totalPriceText }}</text>
        </view>
      </view>

      <view class="tips">
        <text>订单已接入真实后端，详情会随服务状态更新。</text>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="footer-btn secondary" @tap="copyOrderId">复制单号</view>
      <view class="footer-btn primary" @tap="backHome">返回首页</view>
    </view>
  </view>
</template>

<script>
import { fetchOrderDetail } from "@/shared-ui/api.js";
import { mapErrandOrderDetail } from "@/shared-ui/errand.js";
import PageHeader from "./PageHeader.vue";
import { createErrandDetailPage } from "./consumer-errand-pages.js";

export default createErrandDetailPage({
  fetchOrderDetail,
  mapErrandOrderDetail,
  components: { PageHeader },
});
</script>

<style scoped lang="scss">
.errand-detail {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding: 0 12px 70px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 54px);
  min-height: 100vh;
  box-sizing: border-box;
}

.status-card {
  background: linear-gradient(135deg, #009bf5 0%, #4ec5ff 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
}

.status-text {
  display: block;
  font-size: 20px;
  color: #fff;
  font-weight: 600;
}

.service-text {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.92);
}

.order-id {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.addr-row {
  display: flex;
  align-items: flex-start;
}

.addr-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
  margin-top: 4px;
  flex-shrink: 0;
}

.addr-dot.green {
  background: #10b981;
}

.addr-dot.orange {
  background: #ff6b00;
}

.addr-info {
  flex: 1;
}

.addr-label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.addr-text {
  display: block;
  font-size: 14px;
  color: #111827;
  line-height: 1.5;
}

.addr-line {
  height: 20px;
  border-left: 1px dashed #ddd;
  margin-left: 4px;
  margin-bottom: 2px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.info-label {
  color: #6b7280;
  flex-shrink: 0;
}

.info-value {
  color: #111827;
  text-align: right;
  flex: 1;
  padding-left: 12px;
  word-break: break-all;
}

.info-row.total .info-value.price {
  color: #ff4d4f;
  font-weight: 600;
}

.tips {
  padding: 10px;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #eee;
}

.footer-btn {
  flex: 1;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: 6px;
}

.footer-btn.secondary {
  background: #fff;
  border: 1px solid #ddd;
  color: #333;
}

.footer-btn.primary {
  background: #009bf5;
  color: #fff;
}
</style>
