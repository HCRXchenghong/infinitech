<template>
  <div class="login-shell">
    <div v-if="isMobile && !showLogin" class="intro-page">
      <div class="intro-content">
        <div class="logo-row">
          <img class="logo-mark" :src="logoUrl" alt="logo" />
          <div class="logo-text">悦享e食</div>
        </div>
        <div class="intro-title">管理后台</div>
        <div class="intro-slogan">高效运营 · 轻松管理 · 即时履约</div>
        <button class="start-btn" @click="enterLogin">立即管理</button>
      </div>
    </div>
    <template v-if="!isMobile || showLogin">
      <div class="hero" v-if="!isMobile">
        <div class="hero-logo-ring">
          <img class="hero-logo" :src="logoUrl" alt="悦享e食" />
        </div>
        <h1 class="hero-title">悦享e食管理后台</h1>
        <p class="hero-subtitle">高效运营 · 轻松管理</p>
      </div>
      <div class="login-card" :class="{ 'mobile-card': isMobile }">
        <button class="corner-switch" @click="toggleMode">
          <span class="corner-bg" :class="{ inactive: isQrMode }"></span>
          <span class="corner-fold"></span>
          <span class="corner-icon">{{ isQrMode ? '⌂' : 'QR' }}</span>
        </button>
        <div class="card-content">
          <transition name="slide-fade" mode="out-in">
            <div v-if="!isQrMode" key="login-form" class="card-body">
              <header class="panel-header">
                <h3>欢迎回来</h3>
                <p>请输入您的凭据以访问后台</p>
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
                  <label>手机号码</label>
                  <input
                    v-model.trim="form.phone"
                    class="glass-input"
                    type="text"
                    maxlength="11"
                    placeholder="请输入手机号"
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
                      placeholder="请输入密码"
                      autocomplete="current-password"
                    />
                    <input
                      v-else
                      v-model.trim="form.code"
                      class="glass-input"
                      type="text"
                      maxlength="6"
                      placeholder="请输入验证码"
                    />
                    <button
                      v-if="credentialMode === 'code'"
                      type="button"
                      class="code-btn"
                      :disabled="!canSendCode || sendingCode || loading"
                      @click="sendCode"
                    >
                      {{ sendingCode ? '发送中' : (countdown > 0 ? `${countdown}s` : '获取') }}
                    </button>
                  </div>
                </div>
                <div class="form-meta">
                  <label class="remember-label">
                    <input v-model="form.rememberMe" type="checkbox" />
                    <span>保持登录状态</span>
                  </label>
                  <span class="meta-note">忘记密码请联系平台管理员</span>
                </div>
                <button type="submit" class="submit-btn" :disabled="loading || sendingCode">
                  {{ loading ? '登录中...' : '进入系统' }}
                </button>
              </form>
            </div>
            <div v-else key="qrcode-panel" class="card-body qr-body">
              <header class="panel-header qr-header">
                <h3>扫码登录</h3>
                <p>使用移动端 App 扫描以登录</p>
              </header>
              <div class="qr-wrap">
                <div class="qr-shell">
                  <img v-if="qrImage" :src="qrImage" class="qr-image" alt="扫码登录二维码" />
                  <div class="qr-scan-line" v-if="qrStatus === 'pending' || qrStatus === 'scanned'"></div>
                  <div class="qr-overlay" v-if="qrLoading || qrStatus === 'expired' || qrStatus === 'error' || qrStatus === 'rejected'">
                    <div class="overlay-title">{{ qrOverlayText }}</div>
                    <button type="button" class="overlay-refresh" :disabled="qrLoading" @click="refreshQrCode(true)">
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
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';
import QRCode from 'qrcode';
import {
  createDefaultLoginForm,
  isValidPhone,
  isMissingQrRoute,
  getQrFlowErrorMessage
} from './loginHelpers';
const logoUrl = new URL('/logo.png', import.meta.url).href;
const router = useRouter();
const loading = ref(false);
const sendingCode = ref(false);
const countdown = ref(0);
const isMobile = ref(window.innerWidth <= 768);
const showLogin = ref(false);
const credentialMode = ref(localStorage.getItem('admin_login_type') === 'code' ? 'code' : 'password');
const isQrMode = ref(false);
const qrLoading = ref(false);
const qrImage = ref('');
const qrTicket = ref('');
const qrStatus = ref('idle');
const qrRemainSeconds = ref(0);
let qrPollTimer = null;
let qrCountdownTimer = null;
let qrRefreshTimer = null;
let qrLastStatusToast = '';
const QR_REFRESH_INTERVAL_MS = 10000;
const canSendCode = computed(() => countdown.value === 0);
const form = ref(createDefaultLoginForm());
const qrOverlayText = computed(() => {
  if (qrLoading.value) return '二维码生成中...';
  if (qrStatus.value === 'expired') return '二维码已过期';
  if (qrStatus.value === 'rejected') return '授权已取消';
  if (qrStatus.value === 'error') return '网络异常';
  return '';
});
function clearQrTimers() {
  if (qrPollTimer) {
    clearInterval(qrPollTimer);
    qrPollTimer = null;
  }
  if (qrCountdownTimer) {
    clearInterval(qrCountdownTimer);
    qrCountdownTimer = null;
  }
  if (qrRefreshTimer) {
    clearTimeout(qrRefreshTimer);
    qrRefreshTimer = null;
  }
}
function scheduleQrRefresh(delay = QR_REFRESH_INTERVAL_MS) {
  if (qrRefreshTimer) clearTimeout(qrRefreshTimer);
  qrRefreshTimer = setTimeout(() => {
    refreshQrCode(false);
  }, delay);
}
function updateQrStatus(status) {
  if (!status || qrStatus.value === status) return;
  qrStatus.value = status;
  if (status === 'scanned' && qrLastStatusToast !== 'scanned') {
    ElMessage.info('已扫码，请在管理端 App 确认登录');
  }
  if (status === 'rejected' && qrLastStatusToast !== 'rejected') {
    ElMessage.warning('登录授权已取消，二维码将自动刷新');
  }
  qrLastStatusToast = status;
}
function startQrCountdown() {
  if (qrCountdownTimer) clearInterval(qrCountdownTimer);
  qrCountdownTimer = setInterval(() => {
    if (qrRemainSeconds.value > 0) qrRemainSeconds.value -= 1;
    if (qrRemainSeconds.value <= 0 && (qrStatus.value === 'pending' || qrStatus.value === 'scanned')) {
      updateQrStatus('expired');
      scheduleQrRefresh();
    }
  }, 1000);
}
function startQrPolling() {
  if (qrPollTimer) clearInterval(qrPollTimer);
  qrPollTimer = setInterval(() => {
    pollQrStatus();
  }, 2000);
  pollQrStatus();
}
function saveLoginSession(payload, mode = credentialMode.value) {
  if (!payload?.token) {
    ElMessage.error('登录失败，缺少凭证');
    return;
  }
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_user');
  const storage = form.value.rememberMe ? localStorage : sessionStorage;
  storage.setItem('admin_token', payload.token);
  storage.setItem('admin_user', JSON.stringify(payload.user || { name: '管理员', type: 'admin' }));
  storage.setItem('admin_login_type', mode);
  storage.setItem('admin_remember_me', form.value.rememberMe.toString());
  localStorage.setItem('admin_login_type', mode);
  router.push('/dashboard');
}
async function refreshQrCode(showMessage = false) {
  if (!isQrMode.value) return;
  clearQrTimers();
  qrLoading.value = true;
  qrImage.value = '';
  qrTicket.value = '';
  qrRemainSeconds.value = 0;
  qrStatus.value = 'pending';
  qrLastStatusToast = '';
  try {
    const { data } = await request.post('/api/qr-login/session', {
      webOrigin: typeof window !== 'undefined' && window.location
        ? window.location.origin
        : ''
    });
    const payload = data?.data || data;
    if (!payload?.ticket || !payload?.qrText) {
      throw new Error('二维码初始化失败');
    }
    qrTicket.value = String(payload.ticket);
    qrRemainSeconds.value = Math.max(0, Number(payload.remainSeconds || payload.expiresIn || 120));
    qrImage.value = await QRCode.toDataURL(payload.qrText, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#ffffff'
      }
    });
    startQrCountdown();
    startQrPolling();
    scheduleQrRefresh(QR_REFRESH_INTERVAL_MS);
    if (showMessage) ElMessage.success('二维码已刷新');
  } catch (error) {
    updateQrStatus('error');
    if (!isMissingQrRoute(error)) {
      scheduleQrRefresh(QR_REFRESH_INTERVAL_MS);
    }
    const message = getQrFlowErrorMessage(error);
    if (isMissingQrRoute(error)) {
      ElMessage.error(message);
    }
    if (showMessage) {
      ElMessage.error(message);
    }
  } finally {
    qrLoading.value = false;
  }
}
async function pollQrStatus() {
  if (!isQrMode.value || !qrTicket.value || qrLoading.value) return;
  try {
    const { data } = await request.get(`/api/qr-login/session/${encodeURIComponent(qrTicket.value)}`);
    const payload = data?.data || data || {};
    if (typeof payload.remainSeconds === 'number') {
      qrRemainSeconds.value = Math.max(0, payload.remainSeconds);
    }
    const status = String(payload.status || 'pending');
    if (status === 'confirmed' && payload.token) {
      clearQrTimers();
      saveLoginSession({ token: payload.token, user: payload.user }, 'qr');
      return;
    }
    updateQrStatus(status);
    if (status === 'expired' || status === 'rejected' || status === 'consumed') {
      scheduleQrRefresh(QR_REFRESH_INTERVAL_MS);
    }
  } catch (error) {
    const statusCode = error?.response?.status;
    if (isMissingQrRoute(error)) {
      clearQrTimers();
      updateQrStatus('error');
      ElMessage.error(getQrFlowErrorMessage(error));
      return;
    }
    if (statusCode === 404 || statusCode === 409) {
      updateQrStatus('expired');
      scheduleQrRefresh(QR_REFRESH_INTERVAL_MS);
      return;
    }
    updateQrStatus('error');
    scheduleQrRefresh(QR_REFRESH_INTERVAL_MS);
  }
}
function switchCredentialMode(mode) {
  credentialMode.value = mode === 'code' ? 'code' : 'password';
  localStorage.setItem('admin_login_type', credentialMode.value);
}
function toggleMode() {
  isQrMode.value = !isQrMode.value;
  if (isQrMode.value) {
    refreshQrCode(false);
  } else {
    clearQrTimers();
    qrStatus.value = 'idle';
    qrImage.value = '';
    qrTicket.value = '';
    qrRemainSeconds.value = 0;
  }
}
function enterLogin() {
  showLogin.value = true;
}
async function sendCode() {
  if (loading.value) return;
  if (!form.value.phone) {
    ElMessage.error('请输入手机号');
    return;
  }
  if (!isValidPhone(form.value.phone)) {
    ElMessage.error('请输入正确的手机号');
    return;
  }
  if (countdown.value > 0) return;
  sendingCode.value = true;
  try {
    const { data } = await request.post('/api/send-admin-sms-code', {
      phone: form.value.phone,
      scene: 'login'
    });
    if (data && data.success) {
      countdown.value = 60;
      const timer = setInterval(() => {
        countdown.value -= 1;
        if (countdown.value <= 0) {
          clearInterval(timer);
          countdown.value = 0;
        }
      }, 1000);
      if (data.warning) ElMessage.warning(data.warning);
      else ElMessage.success('验证码已发送，请注意查收');
    } else {
      ElMessage.error(data?.error || '发送验证码失败');
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '网络错误，请稍后重试');
  } finally {
    sendingCode.value = false;
  }
}
async function handleLogin() {
  if (loading.value) return;
  if (!form.value.phone) {
    ElMessage.error('请输入手机号');
    return;
  }
  if (!isValidPhone(form.value.phone)) {
    ElMessage.error('手机号格式不正确');
    return;
  }
  const loginData = {
    phone: form.value.phone,
    loginType: credentialMode.value
  };
  if (credentialMode.value === 'password') {
    if (!form.value.password) {
      ElMessage.error('请输入密码');
      return;
    }
    loginData.password = form.value.password;
  } else {
    if (!form.value.code) {
      ElMessage.error('请输入验证码');
      return;
    }
    loginData.code = form.value.code;
  }
  loading.value = true;
  try {
    const { data } = await request.post('/api/login', loginData);
    const payload = data?.token ? data : data?.data;
    if (payload?.token) {
      saveLoginSession(payload, credentialMode.value);
    } else {
      ElMessage.error('登录失败，请重试');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || '登录失败';
    const statusCode = error.response?.status;
    if ((statusCode === 403 || statusCode === 400) && errorMessage.includes('验证码登录')) {
      ElMessage.warning({
        message: `${errorMessage}，已自动切换到验证码登录`,
        duration: 5000,
        showClose: true
      });
      switchCredentialMode('code');
      form.value.password = '';
      if (form.value.phone && isValidPhone(form.value.phone)) {
        setTimeout(() => {
          sendCode();
        }, 500);
      }
      return;
    }
    ElMessage.error(errorMessage);
  } finally {
    loading.value = false;
  }
}
function handleResize() {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) showLogin.value = false;
  if (isMobile.value && !showLogin.value) {
    clearQrTimers();
    isQrMode.value = false;
  }
}
onMounted(() => {
  window.addEventListener('resize', handleResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  clearQrTimers();
});
</script>
<style scoped lang="css" src="./Login.css"></style>
