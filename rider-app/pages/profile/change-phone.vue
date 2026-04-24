<template>
  <view class="page">
    <view v-if="step === 1" class="step-content">
      <view class="step-header">
        <text class="step-title">验证原手机号</text>
        <text class="step-desc">请输入当前绑定手机号并完成验证码校验</text>
      </view>
      <view class="form">
        <input v-model="oldPhone" class="input" placeholder="原手机号" type="number" maxlength="11" />
        <view class="code-row">
          <input v-model="oldCode" class="input" placeholder="验证码" type="number" maxlength="6" />
          <text class="code-btn" :class="{ off: oldCodeCooldown > 0 || sendingOldCode }" @tap="sendOldCode">
            {{ sendingOldCode ? '发送中...' : oldCodeCooldown > 0 ? oldCodeCooldown + 's' : '获取验证码' }}
          </text>
        </view>
        <button class="btn" :disabled="verifyingOldPhone" @tap="verifyOldPhone">
          {{ verifyingOldPhone ? '校验中...' : '下一步' }}
        </button>
      </view>
    </view>

    <view v-if="step === 2" class="step-content">
      <view class="step-header">
        <text class="step-title">绑定新手机号</text>
        <text class="step-desc">请输入新手机号并完成验证码校验</text>
      </view>
      <view class="form">
        <input v-model="newPhone" class="input" placeholder="新手机号" type="number" maxlength="11" />
        <view class="code-row">
          <input v-model="newCode" class="input" placeholder="验证码" type="number" maxlength="6" />
          <text class="code-btn" :class="{ off: newCodeCooldown > 0 || sendingNewCode }" @tap="sendNewCode">
            {{ sendingNewCode ? '发送中...' : newCodeCooldown > 0 ? newCodeCooldown + 's' : '获取验证码' }}
          </text>
        </view>
        <button class="btn" :disabled="submitting" @tap="submitChangePhone">
          {{ submitting ? '提交中...' : '确认换绑' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { changePhone, requestSMSCode, verifySMSCodeCheck } from '../../shared-ui/api'
import {
  clearRiderAuthSession,
  persistRiderAuthSession,
  readRiderAuthIdentity,
  readRiderAuthSession,
} from '../../shared-ui/auth-session.js'
import { createRiderChangePhonePageLogic } from '../../../packages/mobile-core/src/rider-change-phone-page.js'

export default Vue.extend(createRiderChangePhonePageLogic({
  changePhone,
  requestSMSCode,
  verifySMSCodeCheck,
  readRiderAuthIdentity,
  readRiderAuthSession,
  persistRiderAuthSession,
  clearRiderAuthSession,
  uniApp: uni,
}) as any)
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f3f4f6;
}

.step-content {
  padding: 48rpx 32rpx;
}

.step-header {
  text-align: center;
  margin-bottom: 64rpx;
}

.step-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #1f2937;
  display: block;
  margin-bottom: 16rpx;
}

.step-desc {
  font-size: 28rpx;
  color: #6b7280;
  display: block;
}

.form {
  background: white;
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
}

.input {
  width: 100%;
  height: 96rpx;
  background: #f3f4f6;
  border-radius: 16rpx;
  padding: 0 32rpx;
  font-size: 32rpx;
  margin-bottom: 32rpx;
  box-sizing: border-box;
}

.code-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.code-row .input {
  flex: 1;
  margin-bottom: 0;
}

.code-btn {
  width: 200rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: white;
  font-size: 28rpx;
  border-radius: 16rpx;
  font-weight: 600;

  &.off {
    background: #d1d5db;
  }
}

.btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #009bf5 0%, #0284c7 100%);
  color: white;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
  margin-top: 16rpx;

  &[disabled] {
    opacity: 0.6;
  }
}
</style>
