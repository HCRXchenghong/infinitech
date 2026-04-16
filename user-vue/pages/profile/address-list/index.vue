<template>
  <view class="page address-page">
    <view class="toolbar">
      <text class="page-title">收货地址</text>
      <view class="toolbar-actions">
        <view v-if="!isSelectMode" class="toolbar-btn" @tap="toggleManage">{{ manageMode ? '完成' : '管理' }}</view>
        <view class="toolbar-btn primary" @tap="add">新增地址</view>
      </view>
    </view>

    <view v-if="isSelectMode" class="select-tip">请选择本次下单使用的收货地址</view>

    <view class="search-wrap">
      <text class="search-icon">搜</text>
      <input
        v-model.trim="keyword"
        class="search-input"
        placeholder="搜索姓名、手机号、地址"
        placeholder-class="search-ph"
      />
      <text v-if="keyword" class="search-clear" @tap="keyword = ''">清空</text>
    </view>

    <scroll-view scroll-y class="address-scroll">
      <view v-if="loading" class="empty-state">
        <text class="empty-title">正在加载地址</text>
        <text class="empty-desc">请稍候</text>
      </view>

      <view v-else-if="filteredAddresses.length === 0" class="empty-state">
        <text class="empty-title">{{ keyword ? '没有匹配地址' : '暂无收货地址' }}</text>
        <text class="empty-desc">{{ keyword ? '请尝试其他关键词' : '点击右上角新增地址' }}</text>
      </view>

      <view v-else class="list-panel">
        <view
          v-for="addr in filteredAddresses"
          :key="addr.id"
          class="address-card"
          :class="{ selected: selectedAddressId === addr.id, 'manage-mode': manageMode && !isSelectMode }"
          @tap="onCardTap(addr)"
        >
          <view class="card-head">
            <text class="addr-place">{{ addr.fullAddress }}</text>
            <view class="chip-row">
              <text v-if="addr.isDefault" class="chip primary">默认</text>
              <text v-if="isSelectMode && selectedAddressId === addr.id" class="chip active">已选中</text>
              <text v-if="addr.tag" class="chip">{{ addr.tag }}</text>
            </view>
          </view>

          <view class="contact-row">
            <text class="contact-name">{{ addr.name }}</text>
            <text class="contact-phone">{{ addr.phone }}</text>
          </view>

          <view v-if="manageMode && !isSelectMode" class="card-actions">
            <view class="action-btn secondary" @tap.stop="setDefault(addr)">{{ addr.isDefault ? '默认地址' : '设为默认' }}</view>
            <view class="action-btn edit" @tap.stop="edit(addr.id)">编辑</view>
            <view class="action-btn delete" @tap.stop="deleteAddress(addr.id)">删除</view>
          </view>
        </view>
      </view>

      <view class="bottom-gap"></view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchUserAddresses, deleteUserAddress, setDefaultUserAddress } from '@/shared-ui/api.js'
import { createProfileAddressListPage } from '../../../../shared/mobile-common/profile-address-pages.js'

export default createProfileAddressListPage({
  deleteUserAddress,
  fetchUserAddresses,
  setDefaultUserAddress
})
</script>

<style scoped lang="scss">
.address-page {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f4f7fb;
  padding: 20rpx;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 42rpx;
  font-weight: 700;
  color: #183a6a;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.toolbar-btn {
  height: 64rpx;
  min-width: 112rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  color: #334155;
}

.toolbar-btn.primary {
  color: #ffffff;
  border: none;
  background: #60a5fa;
}

.select-tip {
  margin-top: 14rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #dbeaff;
  color: #275a95;
  font-size: 25rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
}

.search-wrap {
  margin-top: 14rpx;
  height: 82rpx;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
}

.search-icon {
  font-size: 28rpx;
  color: #86a5cf;
}

.search-input {
  flex: 1;
  margin-left: 12rpx;
  font-size: 28rpx;
  color: #1d2f4a;
}

.search-ph {
  color: #9fb6d8;
}

.search-clear {
  font-size: 24rpx;
  color: #4a78b4;
}

.address-scroll {
  flex: 1;
  margin-top: 14rpx;
}

.list-panel {
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  overflow: hidden;
}

.empty-state {
  margin-top: 80rpx;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  padding: 48rpx 20rpx;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 32rpx;
  color: #254a7a;
  font-weight: 600;
}

.empty-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7f9cc1;
}

.address-card {
  padding: 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e8edf4;
}

.address-card:last-child {
  border-bottom: none;
}

.address-card.selected {
  background: #f7fbff;
  border-left: 6rpx solid #60a5fa;
  padding-left: 18rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 10rpx;
}

.addr-place {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  line-height: 1.45;
  font-weight: 700;
  color: #1b2e49;
}

.chip-row {
  display: flex;
  gap: 8rpx;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chip {
  height: 44rpx;
  line-height: 44rpx;
  padding: 0 14rpx;
  border-radius: 12rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 22rpx;
}

.chip.primary {
  background: #e0f2fe;
  color: #0369a1;
}

.chip.active {
  background: #eff6ff;
  color: #1d4ed8;
}

.contact-row {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.contact-name {
  font-size: 30rpx;
  color: #1f3455;
  font-weight: 600;
}

.contact-phone {
  font-size: 29rpx;
  color: #475569;
}

.card-actions {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #e8edf4;
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  flex-wrap: wrap;
}

.action-btn {
  min-width: 124rpx;
  height: 64rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
}

.action-btn.secondary {
  color: #0369a1;
  background: #ecfeff;
}

.action-btn.edit {
  color: #1d4ed8;
  background: #eff6ff;
}

.action-btn.delete {
  color: #dc2626;
  background: #fef2f2;
}

.bottom-gap {
  height: calc(26rpx + env(safe-area-inset-bottom));
}
</style>
