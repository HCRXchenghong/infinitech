<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-header">
        <text class="modal-title">选择位置</text>
        <text class="modal-close" @tap="handleClose">×</text>
      </view>
      <view class="modal-body">
        <view
          class="action-item primary"
          @tap="handleRelocate"
          :class="{ loading: loading }"
        >
          <image
            class="action-icon"
            src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23009bf5%22%3E%3Cpath%20d%3D%22M21%203L3%2010.53v.98l6.84%202.65L12.48%2021h.98L21%203z%22%2F%3E%3C%2Fsvg%3E"
            mode="aspectFit"
          />
          <view class="action-info">
            <text class="action-name">{{
              loading ? "定位中..." : "重新获取定位"
            }}</text>
            <text class="action-desc">{{
              loading ? "正在获取您的位置" : "刷新当前所在位置"
            }}</text>
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
  </view>
</template>

<script>
import { createHomeLocationModalComponent } from "./home-shell-components.js";

export default createHomeLocationModalComponent();
</script>

<style scoped lang="scss">
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #fff;
  width: 100%;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #111;
}

.modal-close {
  font-size: 32px;
  color: #999;
  line-height: 1;
}

.action-item {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 16px;
  margin-bottom: 12px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.action-item:active {
  transform: scale(0.98);
}

.action-item.loading {
  opacity: 0.6;
  pointer-events: none;
}

.action-icon {
  width: 36px;
  height: 36px;
  margin-right: 14px;
}

.action-info {
  flex: 1;
}

.action-name {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 13px;
  color: #999;
}

.arrow {
  font-size: 18px;
  color: #ccc;
}
</style>
