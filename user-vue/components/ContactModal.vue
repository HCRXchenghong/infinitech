<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-header">
        <text class="modal-title">{{ title }}</text>
        <text class="modal-close" @tap="handleClose">×</text>
      </view>
      <view class="modal-body">
        <view class="action-item primary" @tap="handleOnlineContact">
          <view class="action-icon-wrapper">
            <image
              class="action-icon"
              src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230095ff%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M21%2015a2%202%200%200%201-2%202H7l-4%204V5a2%202%200%200%201%202-2h14a2%202%200%200%201%202%202z%22%2F%3E%3C%2Fsvg%3E"
              mode="aspectFit"
            />
          </view>
          <view class="action-info">
            <text class="action-name">在线联系</text>
            <text class="action-desc">通过站内消息继续沟通</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="action-item" @tap="handlePhoneContact">
          <view class="action-icon-wrapper">
            <image
              class="action-icon"
              src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M22%2016.92v3a2%202%200%200%201-2.18%202%2019.79%2019.79%200%200%201-8.63-3.07%2019.5%2019.5%200%200%201-6-6%2019.79%2019.79%200%200%201-3.07-8.67A2%202%200%200%201%204.11%202h3a2%202%200%200%201%202%201.72%2012.84%2012.84%200%200%200%20.7%202.81%202%202%200%200%201-.45%202.11L8.09%209.91a16%2016%200%200%200%206%206l1.27-1.27a2%202%200%200%201%202.11-.45%2012.84%2012.84%200%200%200%202.81.7A2%202%200%200%201%2022%2016.92z%22%2F%3E%3C%2Fsvg%3E"
              mode="aspectFit"
            />
          </view>
          <view class="action-info">
            <text class="action-name">电话联系</text>
            <text class="action-desc">直接拨打电话</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '选择联系方式'
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    handleOnlineContact() {
      this.$emit('online')
      this.handleClose()
    },
    handlePhoneContact() {
      this.$emit('phone')
      this.handleClose()
    }
  }
}
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
  padding-bottom: calc(24px + constant(safe-area-inset-bottom));
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
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 16px;
  transition: all 0.2s;

  &:active {
    background: #f3f4f6;
    transform: scale(0.98);
  }

  &.primary {
    background: #eff6ff;
  }
}

.action-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.action-item.primary .action-icon-wrapper {
  background: #dbeafe;
}

.action-icon {
  width: 24px;
  height: 24px;
}

.action-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}

.action-desc {
  font-size: 13px;
  color: #6b7280;
}

.arrow {
  font-size: 20px;
  color: #d1d5db;
  margin-left: 8px;
}
</style>
