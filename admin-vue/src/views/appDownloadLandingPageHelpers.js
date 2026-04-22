import { computed, onMounted, ref } from 'vue';
import { normalizeAppDownloadConfig } from '@infinitech/admin-core';
import { getPublicAppDownloadConfig } from '@/utils/officialSiteApi';

const DEFAULT_APP_DOWNLOAD_CONFIG = normalizeAppDownloadConfig();

export function useAppDownloadLandingPage({ ElMessage, openWindow }) {
  const downloading = ref('');
  const showMiniProgramDialog = ref(false);
  const appConfig = ref({ ...DEFAULT_APP_DOWNLOAD_CONFIG });

  const latestVersionText = computed(() => {
    if (appConfig.value.latest_version) {
      return appConfig.value.latest_version;
    }
    return appConfig.value.android_version || appConfig.value.ios_version || '待配置';
  });

  const updateDateText = computed(() => appConfig.value.updated_at || '--');

  onMounted(() => {
    void loadConfig();
  });

  async function loadConfig() {
    try {
      const data = await getPublicAppDownloadConfig();
      appConfig.value = normalizeAppDownloadConfig(data);
    } catch (_error) {
      appConfig.value = { ...DEFAULT_APP_DOWNLOAD_CONFIG };
    }
  }

  function openMiniProgramDialog() {
    showMiniProgramDialog.value = true;
  }

  function setMiniProgramDialogVisible(value) {
    showMiniProgramDialog.value = Boolean(value);
  }

  function handleDownload(platform) {
    const targetUrl = platform === 'ios' ? appConfig.value.ios_url : appConfig.value.android_url;
    if (!targetUrl) {
      ElMessage.warning(
        platform === 'ios'
          ? '管理员尚未配置 iOS 下载地址'
          : '管理员尚未配置安卓下载地址',
      );
      return;
    }

    downloading.value = platform;
    openWindow(targetUrl, '_blank', 'noopener');
    setTimeout(() => {
      downloading.value = '';
    }, 200);
  }

  return {
    appConfig,
    downloading,
    handleDownload,
    latestVersionText,
    openMiniProgramDialog,
    setMiniProgramDialogVisible,
    showMiniProgramDialog,
    updateDateText,
  };
}
