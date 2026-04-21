<template>
  <div class="login-card" :class="{ 'mobile-card': isMobile }">
    <button class="corner-switch" @click="toggleMode">
      <span class="corner-bg" :class="{ inactive: isQrMode }"></span>
      <span class="corner-fold"></span>
      <span class="corner-icon">{{ isQrMode ? '账号' : 'QR' }}</span>
    </button>

    <div class="card-content">
      <transition name="slide-fade" mode="out-in">
        <div v-if="!isQrMode" key="login-form" class="card-body">
          <header class="panel-header">
            <h3>欢迎回来</h3>
            <p>请输入管理员凭证以访问后台</p>
          </header>

          <div class="mode-tabs">
            <button
              type="button"
              :class="['mode-tab', { active: credentialMode === 'password' }]"
              @click="switchCredentialMode('password')"
            >
              密码登录
            </button>
            <button
              type="button"
              :class="['mode-tab', { active: credentialMode === 'code' }]"
              @click="switchCredentialMode('code')"
            >
              验证码登录
            </button>
          </div>

          <form class="login-form" @submit.prevent="handleLogin">
            <div class="field-group">
              <label>手机号</label>
              <input
                v-model.trim="form.phone"
                class="glass-input"
                type="text"
                maxlength="11"
                placeholder="请输入管理员手机号"
                autocomplete="username"
              />
            </div>

            <div class="field-group">
              <label>{{ credentialMode === 'password' ? '登录密码' : '短信验证码' }}</label>
              <div class="credential-row">
                <input
                  v-if="credentialMode === 'password'"
                  v-model="form.password"
                  class="glass-input"
                  type="password"
                  placeholder="请输入登录密码"
                  autocomplete="current-password"
                />
                <input
                  v-else
                  v-model.trim="form.code"
                  class="glass-input"
                  type="text"
                  maxlength="6"
                  placeholder="请输入短信验证码"
                />
                <button
                  v-if="credentialMode === 'code'"
                  type="button"
                  class="code-btn"
                  :disabled="!canSendCode || sendingCode || loading"
                  @click="sendCode"
                >
                  {{ sendingCode ? '发送中' : (countdown > 0 ? `${countdown}s` : '获取验证码') }}
                </button>
              </div>
            </div>

            <div class="form-meta">
              <label class="remember-label">
                <input v-model="form.rememberMe" type="checkbox" />
                <span>保持登录状态</span>
              </label>
              <span class="meta-note">忘记密码请联系平台负责人处理</span>
            </div>

            <button type="submit" class="submit-btn" :disabled="loading || sendingCode">
              {{ loading ? '登录中...' : '进入后台' }}
            </button>
          </form>
        </div>

        <div v-else key="qr-panel" class="card-body qr-body">
          <header class="panel-header qr-header">
            <h3>扫码登录</h3>
            <p>使用管理端 App 扫描二维码确认登录</p>
          </header>

          <div class="qr-wrap">
            <div class="qr-shell">
              <img v-if="qrImage" :src="qrImage" class="qr-image" alt="扫码登录二维码" />
              <div
                v-if="qrStatus === 'pending' || qrStatus === 'scanned'"
                class="qr-scan-line"
              ></div>
              <div
                v-if="qrLoading || qrStatus === 'expired' || qrStatus === 'error' || qrStatus === 'rejected'"
                class="qr-overlay"
              >
                <div class="overlay-title">{{ qrOverlayText }}</div>
                <button
                  type="button"
                  class="overlay-refresh"
                  :disabled="qrLoading"
                  @click="refreshQrCode(true)"
                >
                  立即刷新
                </button>
              </div>
            </div>
          </div>

          <button type="button" class="submit-btn" :disabled="qrLoading" @click="refreshQrCode(true)">
            {{ qrLoading ? '刷新中...' : '刷新二维码' }}
          </button>
        </div>
      </transition>
    </div>

    <footer class="card-footer">安全连接已启用</footer>
  </div>
</template>

<script setup>
defineProps({
  isMobile: {
    type: Boolean,
    default: false,
  },
  isQrMode: {
    type: Boolean,
    default: false,
  },
  toggleMode: {
    type: Function,
    required: true,
  },
  credentialMode: {
    type: String,
    required: true,
  },
  switchCredentialMode: {
    type: Function,
    required: true,
  },
  form: {
    type: Object,
    required: true,
  },
  canSendCode: {
    type: Boolean,
    default: false,
  },
  sendingCode: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  countdown: {
    type: Number,
    default: 0,
  },
  sendCode: {
    type: Function,
    required: true,
  },
  handleLogin: {
    type: Function,
    required: true,
  },
  qrImage: {
    type: String,
    default: '',
  },
  qrStatus: {
    type: String,
    default: 'idle',
  },
  qrLoading: {
    type: Boolean,
    default: false,
  },
  qrOverlayText: {
    type: String,
    default: '',
  },
  refreshQrCode: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Login.css"></style>
