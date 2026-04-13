<template>
  <transition name="site-cookie-banner">
    <aside v-if="visible" class="cookie-banner">
      <div class="cookie-banner-kicker">Cookie 设置</div>
      <h3>悦享e食 Infinitech 需要你的存储选择</h3>
      <p>
        官网会在你同意后启用 Cookie 与本地存储，用于保存客服会话标识、基础安全状态与浏览偏好。
        同意后，同一浏览器可继续查看历史会话；拒绝后官网仍可继续浏览公开页面，但客服历史与依赖本地标识的互动能力会暂停。
      </p>
      <div class="cookie-banner-links">
        <button type="button" class="cookie-banner-link" @click="openPolicy('/privacy-policy')">隐私政策</button>
        <button type="button" class="cookie-banner-link" @click="openPolicy('/disclaimer')">免责声明</button>
      </div>
      <div class="cookie-banner-actions">
        <el-button size="small" @click="rejectOptional">拒绝非必要</el-button>
        <el-button size="small" type="primary" @click="acceptAll">接受并继续</el-button>
      </div>
    </aside>
  </transition>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { unlockNotificationAudio } from '@/utils/notificationSound';
import {
  getSiteCookieConsent,
  setSiteCookieConsent,
  SITE_COOKIE_CONSENT_EVENT
} from '@/utils/siteCookieConsent';

const route = useRoute();
const router = useRouter();
const visible = ref(!getSiteCookieConsent());

function acceptAll() {
  void unlockNotificationAudio();
  setSiteCookieConsent('accepted');
  syncVisible();
  if (route.name === 'site-cookie-required') {
    const redirectPath = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/';
    router.replace(redirectPath);
  }
}

function rejectOptional() {
  setSiteCookieConsent('rejected');
  syncVisible();
  if (route.name === 'site-cookie-required') {
    router.replace('/');
  }
}

function openPolicy(path) {
  if (route.path !== path) {
    router.push(path);
  }
}

function syncVisible() {
  visible.value = !getSiteCookieConsent();
}

onMounted(() => {
  syncVisible();
  window.addEventListener(SITE_COOKIE_CONSENT_EVENT, syncVisible);
  window.addEventListener('storage', syncVisible);
});

onBeforeUnmount(() => {
  window.removeEventListener(SITE_COOKIE_CONSENT_EVENT, syncVisible);
  window.removeEventListener('storage', syncVisible);
});
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  left: clamp(14px, 2vw, 24px);
  right: clamp(14px, 2vw, 24px);
  bottom: clamp(18px, 2vw, 28px);
  z-index: 38;
  padding: 20px 20px 18px;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 249, 247, 0.96) 100%);
  box-shadow: 0 24px 64px rgba(12, 29, 48, 0.18);
  backdrop-filter: blur(20px);
}

.cookie-banner-kicker {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: #1976d2;
  text-transform: uppercase;
}

.cookie-banner h3 {
  margin: 10px 0 0;
  font-size: 22px;
  line-height: 1.3;
  color: #0f172a;
}

.cookie-banner p {
  margin: 12px 0 0;
  color: #475569;
  line-height: 1.8;
  font-size: 13px;
}

.cookie-banner-links {
  margin-top: 14px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.cookie-banner-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: #1976d2;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.cookie-banner-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.site-cookie-banner-enter-active,
.site-cookie-banner-leave-active {
  transition: all 0.24s ease;
}

.site-cookie-banner-enter-from,
.site-cookie-banner-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

@media (max-width: 768px) {
  .cookie-banner {
    left: 10px;
    right: 10px;
    bottom: calc(10px + env(safe-area-inset-bottom));
    padding: 18px;
  }
}
</style>
