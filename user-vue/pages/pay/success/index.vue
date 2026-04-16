<template>
  <view class="page success">
    <view class="icon-wrap">
      <text class="icon">✓</text>
    </view>
    <text class="title">支付成功</text>
    <text class="sub">商家正在快马加鞭为您准备餐品</text>
    <view class="btn-row">
      <button class="btn ghost" @tap="goOrders">查看订单</button>
      <button class="btn primary" @tap="goHome">返回首页</button>
    </view>
  </view>
</template>

<script>
import { createOrderPaySuccessPage } from '../../../../shared/mobile-common/order-support-pages.js'

export default createOrderPaySuccessPage()
</script>

<style scoped lang="scss">
.success {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

.icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.icon {
  color: #fff;
  font-size: 40px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}

.sub {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 24px;
}

.btn-row {
  width: 100%;
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  padding: 8px 0;
  border-radius: 999px;
  font-size: 14px;
}

.primary {
  background: #009bf5;
  color: #fff;
}

.ghost {
  background: #fff;
  color: #4b5563;
  border-width: 1px;
  border-style: solid;
  border-color: #d1d5db;
}
</style>
