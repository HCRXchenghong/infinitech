<template>
  <view class="page location-select-page">
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text>‹</text>
      </view>
      <text class="title">选择位置</text>
      <view class="placeholder"></view>
    </view>

    <view class="content">
      <view class="action-item primary" @tap="handleRelocate">
        <image
          class="action-icon"
          src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23009bf5%22%3E%3Cpath%20d%3D%22M21%203L3%2010.53v.98l6.84%202.65L12.48%2021h.98L21%203z%22%2F%3E%3C%2Fsvg%3E"
          mode="aspectFit"
        />
        <view class="action-info">
          <text class="action-name">重新获取定位</text>
          <text class="action-desc">刷新当前所在位置</text>
        </view>
      </view>

      <view class="action-item" @tap="handleSelectAddress">
        <image
          class="action-icon"
          src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23f97316%22%3E%3Cpath%20d%3D%22M12%202C8.13%202%205%205.13%205%209c0%205.25%207%2013%207%2013s7-7.75%207-13c0-3.87-3.13-7-7-7zm0%209.5a2.5%202.5%200%201%201%200-5%202.5%202.5%200%200%201%200%205z%22%2F%3E%3C%2Fsvg%3E"
          mode="aspectFit"
        />
        <view class="action-info">
          <text class="action-name">切换收货地址</text>
          <text class="action-desc">选择已保存的地址</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getCurrentLocation } from "@/shared-ui/location.js";
import { createLocationSelectPage } from "./location-select-page.js";

export default createLocationSelectPage({
  getCurrentLocation,
});
</script>

<style scoped lang="scss" src="./location-select-page.scss"></style>
