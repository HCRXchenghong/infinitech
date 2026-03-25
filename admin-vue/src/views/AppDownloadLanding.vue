<template>
  <div class="download-page">
    <div class="halo halo-a"></div>
    <div class="halo halo-b"></div>

    <main class="download-main">
      <div class="app-icon">
        <img class="app-logo" :src="inviteLogoUrl" alt="悦享e食 logo" />
      </div>

      <h1>悦享e食</h1>
      <p class="tagline">随时随地，享受身边美食</p>

      <div class="btn-group">
        <button
          class="download-btn android"
          type="button"
          :disabled="Boolean(downloading)"
          @click="handleDownload('android')"
        >
          <span class="btn-title">andriod</span>
        </button>

        <button
          class="download-btn ios"
          type="button"
          :disabled="Boolean(downloading)"
          @click="handleDownload('ios')"
        >
          <span class="btn-title">ios</span>
        </button>
      </div>

      <div class="version-tip">最新版本: {{ latestVersionText }} | 更新于 {{ updateDateText }}</div>
    </main>

    <footer class="footer">© 2026 悦享e食 保留所有权利</footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';

const downloading = ref('');
const inviteLogoUrl = '/logo.png';
const appConfig = ref({
  ios_url: '',
  android_url: '',
  ios_version: '',
  android_version: '',
  latest_version: '',
  updated_at: ''
});

const latestVersionText = computed(() => {
  if (appConfig.value.latest_version) return appConfig.value.latest_version;
  return appConfig.value.android_version || appConfig.value.ios_version || 'V2.0.1';
});

const updateDateText = computed(() => {
  return appConfig.value.updated_at || new Date().toISOString().slice(0, 10);
});

onMounted(() => {
  loadConfig();
});

async function loadConfig() {
  try {
    const { data } = await request.get('/api/public/app-download-config');
    appConfig.value = {
      ios_url: data?.ios_url || '',
      android_url: data?.android_url || '',
      ios_version: data?.ios_version || '',
      android_version: data?.android_version || '',
      latest_version: data?.latest_version || '',
      updated_at: data?.updated_at || ''
    };
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || '下载配置加载失败');
  }
}

function handleDownload(platform) {
  const targetUrl = platform === 'ios' ? appConfig.value.ios_url : appConfig.value.android_url;
  if (!targetUrl) {
    ElMessage.warning(platform === 'ios' ? '管理员尚未配置 iOS 下载地址' : '管理员尚未配置安卓下载地址');
    return;
  }

  downloading.value = platform;
  setTimeout(() => {
    window.location.href = targetUrl;
    downloading.value = '';
  }, 600);
}
</script>

<style scoped>
.download-page {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 42%, #bfdbfe 100%);
  color: #1e293b;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px 24px calc(24px + env(safe-area-inset-bottom));
}

.halo {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  opacity: 0.4;
  pointer-events: none;
}

.halo-a {
  width: 420px;
  height: 420px;
  left: 10%;
  top: 10%;
  background: #93c5fd;
}

.halo-b {
  width: 420px;
  height: 420px;
  right: 8%;
  bottom: 8%;
  background: #67e8f9;
}

.download-main {
  width: 100%;
  max-width: 420px;
  text-align: center;
  z-index: 1;
}

.app-icon {
  width: 130px;
  height: 130px;
  margin: 0 auto 28px;
  border-radius: 36px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.92));
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(148, 163, 184, 0.35);
  padding: 6px;
}

.app-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 30px;
}

h1 {
  margin: 0;
  font-size: 44px;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.tagline {
  margin: 14px 0 36px;
  font-size: 18px;
  color: #475569;
}

.btn-group {
  display: grid;
  gap: 12px;
}

.download-btn {
  border: none;
  border-radius: 18px;
  padding: 16px 20px;
  text-align: center;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.download-btn:active {
  transform: scale(0.98);
}

.download-btn:disabled {
  cursor: not-allowed;
  opacity: 0.85;
}

.download-btn.ios {
  background: #0f172a;
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
}

.download-btn.android {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(148, 163, 184, 0.25);
}

.btn-title {
  font-size: 22px;
  font-weight: 700;
}

.version-tip {
  margin-top: 28px;
  color: #64748b;
  font-size: 13px;
}

.footer {
  margin-top: 28px;
  color: rgba(100, 116, 139, 0.8);
  font-size: 12px;
  z-index: 1;
  text-align: center;
}

@media (max-width: 640px) {
  .download-page {
    padding: 18px 18px calc(20px + env(safe-area-inset-bottom));
  }

  h1 {
    font-size: 36px;
  }

  .tagline {
    font-size: 16px;
  }

  .footer {
    margin-top: 22px;
    font-size: 11px;
  }
}
</style>
