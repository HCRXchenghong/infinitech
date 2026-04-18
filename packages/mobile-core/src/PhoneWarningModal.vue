<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-header">
        <text class="modal-title">温馨提示</text>
        <text class="modal-close" @tap="handleClose">×</text>
      </view>
      <view class="modal-body">
        <view class="warning-content">
          <text class="warning-text">为了您的安全与权益，请注意：</text>
          <view class="warning-list">
            <view class="warning-item">
              <text class="warning-dot">•</text>
              <text class="warning-item-text">请保护好个人隐私信息，不要泄露银行卡、密码等重要信息</text>
            </view>
            <view class="warning-item">
              <text class="warning-dot">•</text>
              <text class="warning-item-text">如遇配送问题或纠纷，请及时联系{{ supportTitle }}处理</text>
            </view>
            <view class="warning-item">
              <text class="warning-dot">•</text>
              <text class="warning-item-text">请文明沟通，互相尊重，共建和谐配送环境</text>
            </view>
          </view>
        </view>
      </view>
      <view class="modal-footer">
        <button class="cancel-btn" @tap="handleClose">取消</button>
        <button class="confirm-btn" @tap="handleConfirm">确认拨打</button>
      </view>
    </view>
  </view>
</template>

<script>
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from "@/shared-ui/support-runtime.js";
import { createPhoneWarningModalComponent } from "./consumer-modal-components.js";

export default createPhoneWarningModalComponent({
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
});
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
  padding: 20px;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #fff;
  width: 100%;
  max-width: 400px;
  border-radius: 20px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f2f3f5;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f1f1f;
}

.modal-close {
  font-size: 28px;
  color: #9ca3af;
  line-height: 1;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px;
}

.warning-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warning-text {
  font-size: 15px;
  color: #374151;
  font-weight: 500;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.warning-dot {
  font-size: 16px;
  color: #0095ff;
  flex-shrink: 0;
  margin-top: 2px;
}

.warning-item-text {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px 20px;
  border-top: 1px solid #f2f3f5;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  height: 44px;
  line-height: 42px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;

  &::after {
    border: none;
  }
}

.cancel-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.confirm-btn {
  background: #0095ff;
  color: #fff;
}

.cancel-btn:active,
.confirm-btn:active {
  opacity: 0.85;
  transform: scale(0.98);
}
</style>
