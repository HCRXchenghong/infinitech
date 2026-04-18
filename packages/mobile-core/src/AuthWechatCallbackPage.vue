<template>
  <view class="wechat-callback-page">
    <view class="callback-card">
      <view class="callback-icon">{{ loading ? '...' : (failed ? '!' : 'OK') }}</view>
      <text class="callback-title">{{ title }}</text>
      <text class="callback-desc">{{ detail }}</text>
      <button v-if="failed" class="callback-btn" @tap="goNext">返回{{ mode === 'register' ? '注册' : '登录' }}页</button>
    </view>
  </view>
</template>

<script>
import { consumeWechatSession } from "@/shared-ui/api.js";
import { normalizeErrorMessage } from "@/shared-ui/foundation/error.js";
import { saveTokenInfo } from "@/shared-ui/request-interceptor";
import { createWechatCallbackPage } from "./auth-portal-pages.js";

export default createWechatCallbackPage({
  consumeWechatSession,
  normalizeErrorMessage,
  saveTokenInfo,
});
</script>

<style scoped lang="scss">
.wechat-callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f5fff7 0%, #ffffff 100%);
}

.callback-card {
  width: 100%;
  max-width: 360px;
  padding: 32px 24px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(22, 101, 52, 0.08);
  text-align: center;
}

.callback-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.callback-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.callback-desc {
  display: block;
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.6;
  color: #6b7280;
}

.callback-btn {
  margin-top: 24px;
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: #16a34a;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.callback-btn::after {
  border: none;
}
</style>
