<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-icon-wrapper">
        <image 
          class="success-icon" 
          src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2310b981%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22M20%206L9%2017l-5-5%22%2F%3E%3C%2Fsvg%3E" 
          mode="aspectFit"
        />
      </view>
      <view class="modal-body">
        <text class="modal-title">{{ title }}</text>
        <text v-if="message" class="modal-message">{{ message }}</text>
      </view>
      <view class="modal-footer">
        <button class="confirm-btn" @tap="handleConfirm">确定</button>
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
      default: '提交成功'
    },
    message: {
      type: String,
      default: ''
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    handleConfirm() {
      this.$emit('confirm')
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
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #fff;
  width: 320px;
  max-width: 85%;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px 24px;
  box-sizing: border-box;
}

.modal-icon-wrapper {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon {
  width: 64px;
  height: 64px;
}

.modal-body {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f1f1f;
  text-align: center;
  line-height: 1.4;
}

.modal-message {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  line-height: 1.5;
  word-wrap: break-word;
  word-break: break-all;
  padding: 0 8px;
}

.modal-footer {
  width: 100%;
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  height: 44px;
  line-height: 42px;
  background: #0095ff;
  color: #fff;
  border-radius: 22px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  
  &::after {
    border: none;
  }
  
  &:active {
    opacity: 0.85;
    transform: scale(0.98);
  }
}
</style>
