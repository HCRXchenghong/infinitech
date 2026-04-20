import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  buildApiKeyMarkdownText,
  buildWeatherConfigPayload,
  createDefaultWeatherConfig,
  normalizeWeatherConfig,
} from '@infinitech/admin-core';
import request from '@/utils/request';
import { DEFAULT_SMS_CONFIG, normalizeSMSConfig, buildSMSConfigPayload } from './smsConfigHelpers';
import { usePublicApiManagement } from './publicApiManagementCore';

const DEFAULT_WEATHER_CONFIG = createDefaultWeatherConfig();

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
  const publicApiManagement = usePublicApiManagement({
    request,
    ElMessage,
    ElMessageBox,
    cache: true,
  });
  const pageError = computed(() => settingsError.value || publicApiManagement.apiListError.value || '');
  const sms = ref({ ...DEFAULT_SMS_CONFIG });
  const weather = ref(createDefaultWeatherConfig());

  const downloadDialogVisible = ref(false);
  const downloadLanguage = ref('java');
  const downloadingApi = ref(false);
  const currentDownloadApi = ref(null);

  function mergeWeatherConfig(payload = {}) {
    weather.value = normalizeWeatherConfig(payload);
  }

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
        request.get('/api/sms-config'),
        request.get('/api/weather-config')
      ]);
      let firstError = '';

      if (smsResp.status === 'fulfilled' && smsResp.value?.data) {
        sms.value = normalizeSMSConfig(extractEnvelopeData(smsResp.value.data) || {});
      } else if (smsResp.status === 'rejected') {
        firstError = extractErrorMessage(smsResp.reason, '加载短信配置失败，请稍后重试');
      }

      if (weaResp.status === 'fulfilled' && weaResp.value?.data) {
        mergeWeatherConfig(extractEnvelopeData(weaResp.value.data) || {});
      } else if (weaResp.status === 'rejected' && !firstError) {
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
    saving.value = true;
    try {
      await request.post('/api/sms-config', buildSMSConfigPayload(sms.value));
      ElMessage.success('短信配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存短信配置失败'));
    } finally {
      saving.value = false;
    }
  }

  async function saveWeather() {
    saving.value = true;
    try {
      const payload = buildWeatherConfigPayload(weather.value);
      await request.post('/api/weather-config', payload);
      weather.value = normalizeWeatherConfig(payload);
      ElMessage.success('天气配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存天气配置失败'));
    } finally {
      saving.value = false;
    }
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
