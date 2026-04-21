import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractErrorMessage } from '@infinitech/contracts';
import {
  buildApiKeyMarkdownText,
} from '@infinitech/admin-core';
import request from '@/utils/request';
import { usePublicApiManagement } from './publicApiManagementCore';
import {
  runSettledTaskGroup,
  useResponsiveAdminPage,
  useSharedSystemConfigSections,
} from './settingsHelpers/pageRuntime';

export function useApiManagementPage(options = {}) {
  const router = useRouter();
  const includeExternalApiManagement = options.includeExternalApiManagement !== false;

  const {
    isMobile,
    handleResize,
    bindWindowResize,
    unbindWindowResize,
  } = useResponsiveAdminPage();

  const loading = ref(false);
  const saving = ref(false);
  const settingsError = ref('');
  const sharedSystemConfig = useSharedSystemConfigSections({
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
  const sms = sharedSystemConfig.sms;
  const weather = sharedSystemConfig.weather;

  const downloadDialogVisible = ref(false);
  const downloadLanguage = ref('java');
  const downloadingApi = ref(false);
  const currentDownloadApi = ref(null);

  onMounted(() => {
    loadAll();
    bindWindowResize();
  });

  onUnmounted(() => {
    unbindWindowResize();
  });

  async function loadAll(forceRefresh = false) {
    settingsError.value = '';
    loading.value = true;
    try {
      const { errorMessage } = await runSettledTaskGroup(
        [
          () => sharedSystemConfig.loadSmsConfig({ clearError: false, throwOnError: true }),
          () => sharedSystemConfig.loadWeatherConfig({ clearError: false, throwOnError: true }),
        ],
        {
          mode: 'first_rejected',
          fallbackMessage: '加载系统配置失败，请稍后重试',
          fallbackMessages: [
            '加载短信配置失败，请稍后重试',
            '加载天气配置失败，请稍后重试',
          ],
        },
      );

      if (errorMessage) {
        settingsError.value = errorMessage;
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
    await sharedSystemConfig.saveSmsConfig();
  }

  async function saveWeather() {
    await sharedSystemConfig.saveWeatherConfig();
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
