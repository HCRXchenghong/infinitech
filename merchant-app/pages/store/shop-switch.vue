<template>
  <view class="page">
    <view class="header">
      <text class="title">切换店铺</text>
      <text class="sub">可新建店铺，也可在已有店铺之间切换/删除</text>
    </view>

    <button class="create-btn" @tap="goCreateShop">+ 新建店铺</button>

    <scroll-view scroll-y class="list">
      <view v-if="shops.length === 0" class="empty">当前暂无店铺</view>

      <view
        v-for="shop in shops"
        :key="shop.id"
        class="card"
        :class="{ active: String(shop.id) === currentShopId }"
      >
        <view class="card-main" @tap="switchShop(shop)">
          <view>
            <text class="shop-name">{{ shop.name || `店铺${shop.id}` }}</text>
            <text class="shop-meta">{{ shop.businessCategory || '未设置类目' }} · {{ shop.phone || '--' }}</text>
          </view>
          <text v-if="String(shop.id) === currentShopId" class="badge">当前</text>
        </view>

        <view class="card-actions">
          <button class="mini-btn" @tap="switchShop(shop)">切换</button>
          <button class="mini-btn danger" @tap="confirmDelete(shop)">删除</button>
        </view>
      </view>

      <view class="tip">删除规则：仅允许删除近2天无订单记录的店铺。</view>
      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantShopSwitchPage } from '@/shared-ui/merchantAccountPages'

export default defineComponent({
  setup() {
    return useMerchantShopSwitchPage()
  },
})
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f4f7fb;
  padding: calc(var(--status-bar-height) + 16rpx) 24rpx 24rpx;
  box-sizing: border-box;
}

.header {
  margin-bottom: 12rpx;
}

.title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #102d49;
}

.sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #6b8198;
}

.create-btn {
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 14rpx;
  background: linear-gradient(140deg, #009bf5, #0075c0);
  color: #fff;
  font-size: 26rpx;
  border: none;
}

.list {
  margin-top: 14rpx;
  height: calc(100vh - var(--status-bar-height) - 210rpx);
}

.empty {
  text-align: center;
  color: #90a4b8;
  font-size: 24rpx;
  padding: 80rpx 0;
}

.card {
  background: #ffffff;
  border: 1rpx solid #e3ecf7;
  border-radius: 16rpx;
  padding: 18rpx;
  margin-bottom: 12rpx;

  &.active {
    border-color: #83c6ff;
    background: #f4faff;
  }
}

.card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shop-name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #10304d;
}

.shop-meta {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #6f869f;
}

.badge {
  font-size: 20rpx;
  color: #0073bf;
  background: #dff0ff;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
}

.card-actions {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
}

.mini-btn {
  flex: 1;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 10rpx;
  border: 1rpx solid #cfe2f6;
  background: #eef6ff;
  color: #0f5fa6;
  font-size: 22rpx;

  &.danger {
    border-color: #f2cccc;
    background: #fff5f5;
    color: #b42318;
  }
}

.tip {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #7d91a7;
}

.bottom-space {
  height: calc(20rpx + env(safe-area-inset-bottom));
}
</style>
