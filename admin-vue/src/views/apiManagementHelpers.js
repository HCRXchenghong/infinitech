import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractErrorMessage } from '@infinitech/contracts';
import {
  buildApiKeyMarkdownText,
} from '@infinitech/admin-core';
import request from '@/utils/request';
import { usePublicApiManagement } from './publicApiManagementCore';
import { useSmsSettings } from './settingsHelpers/sms';
import { useWeatherSettings } from './settingsHelpers/weather';

export function useApiManagementPage(options = {}) {
  const router = useRouter();
  const includeExternalApiManagement = options.includeExternalApiManagement !== false;

  const isMobile = ref(window.innerWidth <= 768);
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };

  const loading = ref(false);
  const saving = ref(false);
  const settingsError = ref('');
  const smsSettings = useSmsSettings({
    request,
    ElMessage,
    savingRef: saving,
  });
  const weatherSettings = useWeatherSettings({
    request,
    ElMessage,
    savingRef: saving,
  });
  const publicApiManagement = usePublicApiManagement({
    request,
    ElMessage,
    ElMessageBox,
    cache: true,
  });
  const pageError = computed(() => settingsError.value || publicApiManagement.apiListError.value || '');
  const sms = smsSettings.sms;
  const weather = weatherSettings.weather;

  const downloadDialogVisible = ref(false);
  const downloadLanguage = ref('java');
  const downloadingApi = ref(false);
  const currentDownloadApi = ref(null);

  onMounted(() => {
    loadAll();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });

  async function loadAll(forceRefresh = false) {
    settingsError.value = '';
    loading.value = true;
    try {
      const [smsResp, weaResp] = await Promise.allSettled([
        smsSettings.loadSmsConfig({ clearError: false, throwOnError: true }),
        weatherSettings.loadWeatherConfig({ clearError: false, throwOnError: true }),
      ]);
      let firstError = '';

      if (smsResp.status === 'rejected') {
        firstError = extractErrorMessage(smsResp.reason, '加载短信配置失败，请稍后重试');
      }

      if (weaResp.status === 'rejected' && !firstError) {
        firstError = extractErrorMessage(weaResp.reason, '加载天气配置失败，请稍后重试');
      }

      if (firstError) {
        settingsError.value = firstError;
      }
    } catch (error) {
      settingsError.value = extractErrorMessage(error, '加载系统配置失败，请稍后重试');
    } finally {
      loading.value = false;
    }

    if (includeExternalApiManagement) {
      publicApiManagement.loadApiList(forceRefresh);
    }
  }

  async function saveSms() {
    await smsSettings.saveSmsConfig();
  }

  async function saveWeather() {
    await weatherSettings.saveWeatherConfig();
  }

  function goToApiPermissions() {
    router.push('/api-permissions');
  }

  function showDownloadDialog(row) {
    currentDownloadApi.value = row;
    downloadLanguage.value = 'java';
    downloadDialogVisible.value = true;
  }

  function generateMarkdownDoc(api) {
    return buildApiKeyMarkdownText(api, publicApiManagement.getPermissionLabel);
  }

  async function downloadApiDoc() {
    if (!currentDownloadApi.value) {
      ElMessage.warning('请选择要下载的API接口');
      return;
    }

    downloadingApi.value = true;
    try {
      const content = generateMarkdownDoc(currentDownloadApi.value);
      const filename = `${currentDownloadApi.value.name}_API_Documentation.md`;

      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      ElMessage.success('API文档下载成功');
      downloadDialogVisible.value = false;
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '下载API文档失败'));
    } finally {
      downloadingApi.value = false;
    }
  }

  return {
    isMobile,
    loading,
    saving,
    pageError,
    sms,
    weather,
    apiList: publicApiManagement.apiList,
    apiListLoading: publicApiManagement.apiListLoading,
    apiDialogVisible: publicApiManagement.apiDialogVisible,
    editingApi: publicApiManagement.editingApi,
    apiForm: publicApiManagement.apiForm,
    savingApi: publicApiManagement.savingApi,
    downloadDialogVisible,
    downloadLanguage,
    downloadingApi,
    loadAll,
    saveSms,
    saveWeather,
    loadApiList: publicApiManagement.loadApiList,
    showAddApiDialog: publicApiManagement.showAddApiDialog,
    editApi: publicApiManagement.editApi,
    deleteApi: publicApiManagement.deleteApi,
    saveApi: publicApiManagement.saveApi,
    generateApiKey: publicApiManagement.generateApiKey,
    copyApiKey: publicApiManagement.copyApiKey,
    getPermissionLabel: publicApiManagement.getPermissionLabel,
    handleApiPermissionChange: publicApiManagement.handleApiPermissionChange,
    goToApiPermissions,
    showDownloadDialog,
    downloadApiDoc
  };
}
