<template>
  <view class="page">
    <scroll-view
      scroll-y
      class="content"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="refreshAll"
    >
      <view class="wallet-card" @tap="goWallet">
        <text class="wallet-title">我的资产（IF-Pay）</text>
        <text class="wallet-balance">¥{{ loadingWallet ? '--' : fen2yuan(balance) }}</text>
        <text class="wallet-sub">冻结金额 ¥{{ loadingWallet ? '--' : fen2yuan(frozenBalance) }}</text>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">店铺信息</text>
          <view class="panel-actions">
            <text class="panel-link" @tap="goCreateShop">新增店铺</text>
            <text v-if="currentShop" class="panel-link" @tap="goEditShop">编辑</text>
          </view>
        </view>

        <view v-if="!currentShop" class="empty-wrap">
          <text class="empty-text">当前还没有店铺</text>
          <button class="empty-btn" @tap="goCreateShop">立即创建店铺</button>
        </view>

        <view v-else>
          <view class="info-row">
            <text class="info-label">店铺名称</text>
            <text class="info-value">{{ currentShop.name || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">主营类目</text>
            <text class="info-value">{{ currentShop.businessCategory || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ currentShop.phone || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">营业时间</text>
            <text class="info-value">{{ currentShop.businessHours || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">店铺地址</text>
            <text class="info-value ellipsis">{{ currentShop.address || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">营业状态</text>
            <switch
              :checked="!!currentShop.isActive"
              color="#009bf5"
              :disabled="switching"
              @change="toggleBusiness"
            />
          </view>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">设置</text>
        </view>

        <view class="setting-row" @tap="goSettings">
          <text class="setting-label">应用设置</text>
          <text class="setting-arrow">›</text>
        </view>
      </view>

      <view class="action-group">
        <button class="action-btn" @tap="goSwitchShop">切换店铺</button>
        <button class="action-btn danger" @tap="logout">退出登录</button>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useMerchantStoreHomePage } from '@/shared-ui/merchantStoreHome'

export default defineComponent({
  setup() {
    return useMerchantStoreHomePage()
  },
})
</script>

<style scoped lang="scss">
.page {
  height: 100vh;
  background: linear-gradient(180deg, #ecf7ff 0%, #f4f8fc 42%, #f5f7fa 100%);
  overflow: hidden;
}

.content {
  height: 100%;
  box-sizing: border-box;
  padding: calc(var(--status-bar-height) + 16rpx) 24rpx 24rpx;
}

.wallet-card {
  background: linear-gradient(140deg, #009bf5, #007fcb);
  border-radius: 22rpx;
  color: #ffffff;
  padding: 24rpx;
  box-shadow: 0 14rpx 28rpx rgba(0, 126, 207, 0.26);
}

.wallet-title {
  font-size: 22rpx;
  opacity: 0.92;
}

.wallet-balance {
  display: block;
  margin-top: 8rpx;
  font-size: 52rpx;
  font-weight: 700;
}

.wallet-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  opacity: 0.92;
}

.panel {
  margin-top: 18rpx;
  background: #ffffff;
  border-radius: 20rpx;
  border: 1rpx solid #e1ecf7;
  padding: 20rpx;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.panel-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #102d49;
}

.panel-link {
  font-size: 24rpx;
  color: #007ecf;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.empty-wrap {
  padding: 20rpx 0 8rpx;
}

.empty-text {
  font-size: 24rpx;
  color: #6f8aa6;
}

.empty-btn {
  margin-top: 14rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 12rpx;
  border: none;
  background: #edf6ff;
  color: #0070b5;
  font-size: 24rpx;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #edf3fa;

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 24rpx;
  color: #617a95;
}

.info-value {
  font-size: 24rpx;
  color: #1c3e61;
  max-width: 62%;
  text-align: right;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-row {
  padding: 18rpx 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-label {
  font-size: 26rpx;
  color: #1c3e61;
}

.setting-arrow {
  font-size: 30rpx;
  color: #9fb0c2;
}

.action-group {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.action-btn {
  background: #ffffff;
  border: 1rpx solid #dfebf7;
  color: #4f6680;
  border-radius: 14rpx;
  font-size: 26rpx;

  &.danger {
    color: #c53030;
    border-color: #f2d7d7;
    background: #fffafa;
  }
}

.bottom-space {
  height: calc(20rpx + env(safe-area-inset-bottom));
}
</style>
