<template>
  <view class="page phone-change">
    <view class="card">
      <view class="title">验证原手机号</view>
      <view class="sub">为了保障账号安全，请先验证当前绑定手机号</view>

      <view class="field">
        <text class="label">当前手机号</text>
        <text class="value">{{ oldPhoneMasked }}</text>
      </view>

      <view class="field code">
        <input
          v-model="oldCode"
          class="input"
          type="number"
          maxlength="6"
          placeholder="请输入原手机号验证码"
        />
        <button class="code-btn" :disabled="oldCountdown > 0 || loading" @tap="sendOldCode">
          {{ oldCountdown > 0 ? oldCountdown + 's' : '获取验证码' }}
        </button>
      </view>

      <button class="primary-btn" :disabled="!oldCodeValid || loading" @tap="toStep2">下一步</button>
    </view>

    <view v-if="step === 2" class="card">
      <view class="title">绑定新手机号</view>
      <view class="sub">请输入新手机号并完成验证码校验</view>

      <view class="field">
        <input
          v-model="newPhone"
          class="input full"
          type="number"
          maxlength="11"
          placeholder="请输入新手机号"
        />
      </view>

      <view class="field code">
        <input
          v-model="newCode"
          class="input"
          type="number"
          maxlength="6"
          placeholder="请输入新手机号验证码"
        />
        <button class="code-btn" :disabled="newCountdown > 0 || !newPhoneValid || loading" @tap="sendNewCode">
          {{ newCountdown > 0 ? newCountdown + 's' : '获取验证码' }}
        </button>
      </view>

      <button class="primary-btn" :disabled="!newCodeValid || loading" @tap="submit">确认修改</button>
    </view>
  </view>
</template>

<script>
import { changeUserPhone, requestSMSCode, verifySMSCodeCheck } from '@/shared-ui/api.js'
import { saveTokenInfo } from '@/shared-ui/request-interceptor'
import { createProfilePhoneChangePage } from '../../../../shared/mobile-common/profile-phone-change-page.js'

export default createProfilePhoneChangePage({
  changeUserPhone,
  requestSMSCode,
  saveTokenInfo,
  verifySMSCodeCheck
})
</script>

<style scoped lang="scss">
.phone-change {
  min-height: 100vh;
  background: #f4f4f4;
  padding: 12px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 12px;
  margin-bottom: 12px;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.sub {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.field {
  margin-top: 12px;
}

.label {
  font-size: 12px;
  color: #6b7280;
}

.value {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.code {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input {
  flex: 1;
  background: #f9fafb;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: #374151;
}

.input.full {
  width: 100%;
}

.code-btn {
  width: 110px;
  padding: 10px 0;
  border-radius: 10px;
  background: #eff6ff;
  color: #009bf5;
  font-size: 12px;
}

.code-btn[disabled] {
  opacity: 0.6;
}

.primary-btn {
  margin-top: 14px;
  width: 100%;
  padding: 11px 0;
  border-radius: 999px;
  background: #009bf5;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.primary-btn[disabled] {
  opacity: 0.6;
}
</style>
