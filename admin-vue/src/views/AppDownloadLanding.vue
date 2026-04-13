<template>
  <section class="download-page">
    <div class="download-grid"></div>
    <div class="halo halo-a"></div>
    <div class="halo halo-b"></div>

    <div class="download-main">
      <div class="app-icon">
        <img class="app-logo" :src="logoUrl" alt="悦享e食 logo" />
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
          <span class="btn-title">Android 下载</span>
        </button>

        <button
          class="download-btn ios"
          type="button"
          :disabled="Boolean(downloading)"
          @click="handleDownload('ios')"
        >
          <span class="btn-title">iOS 下载</span>
        </button>

        <button
          class="download-btn mini-program"
          type="button"
          @click="showMiniProgramDialog = true"
        >
          <span class="btn-title">小程序</span>
        </button>
      </div>

      <div class="version-tip">最新版本: {{ latestVersionText }} | 更新于 {{ updateDateText }}</div>
    </div>

    <el-dialog
      v-model="showMiniProgramDialog"
      width="360px"
      align-center
      class="mini-program-dialog"
      :show-close="true"
    >
      <div class="mini-program-modal">
        <div class="mini-program-kicker">小程序</div>
        <h2>扫一扫去体验</h2>
        <div class="mini-program-qr-shell">
          <img
            v-if="appConfig.mini_program_qr_url"
            :src="appConfig.mini_program_qr_url"
            class="mini-program-qr-image"
            alt="悦享e食小程序二维码"
          />
          <div v-else class="mini-program-qr-placeholder">暂未上传小程序二维码</div>
        </div>
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getPublicAppDownloadConfig } from '@/utils/officialSiteApi';

const downloading = ref('');
const showMiniProgramDialog = ref(false);
const logoUrl = '/logo.png';
const appConfig = ref({
  ios_url: '',
  android_url: '',
  ios_version: '',
  android_version: '',
  latest_version: '',
  updated_at: '',
  mini_program_qr_url: ''
});

const latestVersionText = computed(() => {
  if (appConfig.value.latest_version) return appConfig.value.latest_version;
  return appConfig.value.android_version || appConfig.value.ios_version || '待配置';
});

const updateDateText = computed(() => {
  return appConfig.value.updated_at || '--';
});

onMounted(() => {
  void loadConfig();
});

async function loadConfig() {
  try {
    const data = await getPublicAppDownloadConfig();
    appConfig.value = {
      ios_url: data?.ios_url || '',
      android_url: data?.android_url || '',
      ios_version: data?.ios_version || '',
      android_version: data?.android_version || '',
      latest_version: data?.latest_version || '',
      updated_at: data?.updated_at || '',
      mini_program_qr_url: data?.mini_program_qr_url || ''
    };
  } catch (_error) {
    appConfig.value = {
      ios_url: '',
      android_url: '',
      ios_version: '',
      android_version: '',
      latest_version: '',
      updated_at: '',
      mini_program_qr_url: ''
    };
  }
}

function handleDownload(platform) {
  const targetUrl = platform === 'ios' ? appConfig.value.ios_url : appConfig.value.android_url;
  if (!targetUrl) {
    ElMessage.warning(platform === 'ios' ? '管理员尚未配置 iOS 下载地址' : '管理员尚未配置安卓下载地址');
    return;
  }

  downloading.value = platform;
  window.open(targetUrl, '_blank', 'noopener');
  setTimeout(() => {
    downloading.value = '';
  }, 200);
}
</script>

<style scoped>
.download-page {
  position: relative;
  min-height: calc(100vh - 72px);
  overflow: hidden;
  background: linear-gradient(135deg, #1976d2 0%, #1976d2 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 24px 36px;
}

.download-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
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
  background: rgb(255 255 255 / 0.18);
}

.halo-b {
  width: 420px;
  height: 420px;
  right: 8%;
  bottom: 8%;
  background: rgb(255 255 255 / 0.14);
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
  color: #ffffff;
}

.tagline {
  margin: 14px 0 36px;
  font-size: 18px;
  color: rgb(219 234 254 / 0.96);
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
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
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

.download-btn.mini-program {
  background: rgb(255 255 255 / 0.12);
  color: #ffffff;
  border: 1px solid rgb(255 255 255 / 0.28);
  box-shadow: 0 16px 36px rgb(12 32 71 / 0.18);
  backdrop-filter: blur(10px);
}

.btn-title {
  font-size: 22px;
  font-weight: 700;
}

.version-tip {
  margin-top: 28px;
  color: rgb(219 234 254 / 0.9);
  font-size: 13px;
}

.mini-program-modal {
  text-align: center;
  padding: 8px 6px 4px;
}

.mini-program-kicker {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #1976d2;
  text-transform: uppercase;
}

.mini-program-modal h2 {
  margin: 8px 0 0;
  font-size: 22px;
  line-height: 1.2;
  color: #0f172a;
}

.mini-program-qr-shell {
  margin-top: 18px;
  width: 100%;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid #dbe7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.mini-program-qr-image {
  width: 100%;
  max-width: 220px;
  aspect-ratio: 1 / 1;
  object-fit: contain;
}

.mini-program-qr-placeholder {
  text-align: center;
  color: #64748b;
  font-size: 14px;
  line-height: 1.8;
}

:deep(.mini-program-dialog) {
  border-radius: 28px;
  overflow: hidden;
}

:deep(.mini-program-dialog .el-dialog__header) {
  padding: 14px 16px 0;
}

:deep(.mini-program-dialog .el-dialog__body) {
  padding: 0 18px 18px;
}

@media (max-width: 640px) {
  .download-page {
    padding: 20px 18px 28px;
  }

  h1 {
    font-size: 36px;
  }

  .tagline {
    font-size: 16px;
  }

  .btn-title {
    font-size: 20px;
  }

  .app-icon {
    width: 104px;
    height: 104px;
    border-radius: 28px;
    margin-bottom: 20px;
  }

  .app-logo {
    border-radius: 22px;
  }
}
</style>
