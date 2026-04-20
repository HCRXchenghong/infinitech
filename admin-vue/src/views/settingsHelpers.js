import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  createDefaultAlipayConfig,
  createDefaultDebugMode,
  createDefaultPayMode,
  createDefaultWxpayConfig,
  normalizeAlipayConfig,
  normalizeDebugModeConfig,
  normalizePayModeConfig,
  normalizeWxpayConfig,
  SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES,
} from '@infinitech/admin-core';
import request from '@/utils/request';
import { useCharitySettings } from './settingsHelpers/charitySettings';
import { useDataManagementPage } from './dataManagementHelpers';
import { useSettingsApiManagement } from './settingsApiManagementHelpers';
import { useSettingsActionHelpers } from './settingsActionHelpers';
import { useAppDownloadSettings } from './settingsHelpers/appDownload';
import { useServiceSettings } from './settingsHelpers/serviceSettings';
import { useSmsSettings } from './settingsHelpers/sms';
import { useWechatLoginSettings } from './settingsHelpers/wechatLogin';
import { useVipSettings } from './settingsHelpers/vipSettings';
import { useWeatherSettings } from './settingsHelpers/weather';

export function useSettingsPage() {
  const router = useRouter();

  const isMobile = ref(window.innerWidth <= 768);

  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');
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
  const sms = smsSettings.sms;
  const DEFAULT_WEATHER_CONFIG = weatherSettings.DEFAULT_WEATHER_CONFIG;
  const weather = weatherSettings.weather;
  const appDownloadSettings = useAppDownloadSettings({
    request,
    ElMessage,
  });
  const serviceSettingsController = useServiceSettings({
    request,
    ElMessage,
  });
  const DEFAULT_SERVICE_SETTINGS = serviceSettingsController.DEFAULT_SERVICE_SETTINGS;
  const serviceSettings = serviceSettingsController.serviceSettings;
  const savingServiceSettings = serviceSettingsController.savingServiceSettings;
  const uploadingServiceSounds = serviceSettingsController.uploadingServiceSounds;
  const charitySettingsController = useCharitySettings({
    request,
    ElMessage,
  });
  const DEFAULT_CHARITY_SETTINGS = charitySettingsController.DEFAULT_CHARITY_SETTINGS;
  const charitySettings = charitySettingsController.charitySettings;
  const savingCharitySettings = charitySettingsController.savingCharitySettings;
  const vipSettingsController = useVipSettings({
    request,
    ElMessage,
  });
  const DEFAULT_VIP_SETTINGS = vipSettingsController.DEFAULT_VIP_SETTINGS;
  const vipSettings = vipSettingsController.vipSettings;
  const savingVipSettings = vipSettingsController.savingVipSettings;
  const wechatLoginSettings = useWechatLoginSettings({
    request,
    ElMessage,
  });
  const DEFAULT_WECHAT_LOGIN_CONFIG = wechatLoginSettings.DEFAULT_WECHAT_LOGIN_CONFIG;
  const wechatLoginConfig = wechatLoginSettings.wechatLoginConfig;
  const savingWechatLoginConfig = wechatLoginSettings.savingWechatLoginConfig;

  const DEFAULT_APP_DOWNLOAD_CONFIG = appDownloadSettings.DEFAULT_APP_DOWNLOAD_CONFIG;
  const appDownloadConfig = appDownloadSettings.appDownloadConfig;
  const savingAppDownload = appDownloadSettings.savingAppDownload;
  const uploadingPackage = appDownloadSettings.uploadingPackage;

  const debugMode = ref(createDefaultDebugMode());
  const savingDebugMode = ref(false);
  const payMode = ref(createDefaultPayMode());
  const savingPayMode = ref(false);
  const wxpay = ref(createDefaultWxpayConfig());
  const savingWx = ref(false);
  const alipay = ref(createDefaultAlipayConfig());
  const savingAli = ref(false);

  const clearAllDialogVisible = ref(false);
  const clearingAllData = ref(false);
  const clearAllVerifyForm = reactive({
    verifyAccount: '',
    verifyPassword: ''
  });

  const mergeWeatherConfig = weatherSettings.applyWeatherConfig;
  const loadServiceSettings = serviceSettingsController.loadServiceSettings;
  const saveServiceSettings = serviceSettingsController.saveServiceSettings;
  const previewServiceSound = serviceSettingsController.previewServiceSound;
  const handleServiceSoundUpload = serviceSettingsController.handleServiceSoundUpload;
  const clearServiceSound = serviceSettingsController.clearServiceSound;
  const addRiderReportReason = serviceSettingsController.addRiderReportReason;
  const removeRiderReportReason = serviceSettingsController.removeRiderReportReason;
  const addRiderInsuranceCoverage = serviceSettingsController.addRiderInsuranceCoverage;
  const removeRiderInsuranceCoverage = serviceSettingsController.removeRiderInsuranceCoverage;
  const addRiderInsuranceClaimStep = serviceSettingsController.addRiderInsuranceClaimStep;
  const removeRiderInsuranceClaimStep = serviceSettingsController.removeRiderInsuranceClaimStep;
  const addRTCIceServer = serviceSettingsController.addRTCIceServer;
  const removeRTCIceServer = serviceSettingsController.removeRTCIceServer;
  const loadCharitySettings = charitySettingsController.loadCharitySettings;
  const saveCharitySettings = charitySettingsController.saveCharitySettings;
  const addCharityLeaderboardItem = charitySettingsController.addCharityLeaderboardItem;
  const removeCharityLeaderboardItem = charitySettingsController.removeCharityLeaderboardItem;
  const addCharityNewsItem = charitySettingsController.addCharityNewsItem;
  const removeCharityNewsItem = charitySettingsController.removeCharityNewsItem;
  const loadWechatLoginConfig = wechatLoginSettings.loadWechatLoginConfig;
  const saveWechatLoginConfig = wechatLoginSettings.saveWechatLoginConfig;
  const loadVipSettings = vipSettingsController.loadVipSettings;
  const saveVIPSettings = vipSettingsController.saveVIPSettings;
  const addVIPLevel = vipSettingsController.addVIPLevel;
  const removeVIPLevel = vipSettingsController.removeVIPLevel;
  const addVIPBenefit = vipSettingsController.addVIPBenefit;
  const removeVIPBenefit = vipSettingsController.removeVIPBenefit;
  const addVIPTask = vipSettingsController.addVIPTask;
  const removeVIPTask = vipSettingsController.removeVIPTask;
  const addVIPPointRule = vipSettingsController.addVIPPointRule;
  const removeVIPPointRule = vipSettingsController.removeVIPPointRule;

  const dataManagement = useDataManagementPage();
  const {
    exporting,
    importing,
    exportingRiders,
    importingRiders,
    exportingOrders,
    importingOrders,
    exportingMerchants,
    importingMerchants,
    exportingAll,
    importingAll,
    exportUsers,
    beforeImport,
    handleImport: handleImportByType,
    exportRiders,
    exportOrders,
    exportMerchants,
    exportAllData,
    handleImportAll,
    validateDataType,
  } = dataManagement;

  async function handleImport(options) {
    return handleImportByType(options, 'users');
  }

  async function handleImportRiders(options) {
    return handleImportByType(options, 'riders');
  }

  async function handleImportOrders(options) {
    return handleImportByType(options, 'orders');
  }

  async function handleImportMerchants(options) {
    return handleImportByType(options, 'merchants');
  }

  async function handleImportAllData(options) {
    return handleImportAll(options);
  }

  const dataMgmtItems = computed(() => [
    { label: '用户数据', exporting: exporting.value, importing: importing.value, onExport: exportUsers, onImport: handleImport },
    { label: '骑手数据', exporting: exportingRiders.value, importing: importingRiders.value, onExport: exportRiders, onImport: handleImportRiders },
    { label: '订单数据', exporting: exportingOrders.value, importing: importingOrders.value, onExport: exportOrders, onImport: handleImportOrders },
    { label: '商户数据', exporting: exportingMerchants.value, importing: importingMerchants.value, onExport: exportMerchants, onImport: handleImportMerchants },
    { label: '平台备份', exporting: exportingAll.value, importing: importingAll.value, onExport: exportAllData, onImport: handleImportAllData },
  ]);

  const apiManagement = useSettingsApiManagement({
    request,
    router,
    ElMessage,
    ElMessageBox,
  });

  const {
    apiListError,
    apiList,
    apiListLoading,
    apiDialogVisible,
    editingApi,
    apiForm,
    savingApi,
    downloadDialogVisible,
    downloadLanguage,
    downloadingApi,
    currentDownloadApi,
    loadApiList,
    showAddApiDialog,
    editApi,
    deleteApi,
    saveApi,
    resetApiForm,
    generateApiKey,
    copyApiKey,
    getPermissionLabel,
    handleApiPermissionChange,
    showApiDocumentation,
    generateApiDocumentation,
    showDownloadDialog,
    generateMarkdownDoc,
    downloadApiDoc,
  } = apiManagement;

  const pageError = computed(() => loadError.value || '');

  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };

  onMounted(() => {
    loadAll();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });

  async function loadAll() {
    loadError.value = '';
    loading.value = true;
    try {
      const results = await Promise.allSettled([
        smsSettings.loadSmsConfig({ clearError: false, throwOnError: true }),
        request.get('/api/debug-mode'),
        weatherSettings.loadWeatherConfig({ clearError: false, throwOnError: true }),
        loadWechatLoginConfig({ clearError: false, throwOnError: true }),
        loadServiceSettings({ clearError: false, throwOnError: true }),
        loadCharitySettings({ clearError: false, throwOnError: true }),
        loadVipSettings({ clearError: false, throwOnError: true }),
        appDownloadSettings.loadAppDownloadConfig({ clearError: false, throwOnError: true }),
        request.get('/api/pay-config/mode'),
        request.get('/api/pay-config/wxpay'),
        request.get('/api/pay-config/alipay'),
      ]);

      const [, debugResp, , , , , , , payModeResp, wxResp, aliResp] = results;

      if (debugResp.status === 'fulfilled' && debugResp.value?.data) {
        debugMode.value = normalizeDebugModeConfig(extractEnvelopeData(debugResp.value.data) || {});
      }
      if (payModeResp.status === 'fulfilled' && payModeResp.value?.data) {
        payMode.value = normalizePayModeConfig(extractEnvelopeData(payModeResp.value.data) || {});
      }
      if (wxResp.status === 'fulfilled' && wxResp.value?.data) {
        wxpay.value = normalizeWxpayConfig(extractEnvelopeData(wxResp.value.data) || {});
      }
      if (aliResp.status === 'fulfilled' && aliResp.value?.data) {
        alipay.value = normalizeAlipayConfig(extractEnvelopeData(aliResp.value.data) || {});
      }

      if (results.some((item) => item.status === 'rejected')) {
        loadError.value = '部分系统配置加载失败，请稍后重试';
      }
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载系统设置失败，请稍后重试');
    } finally {
      loading.value = false;
    }

  }

  const {
    savePayMode,
    saveDebugMode,
    saveWxpay,
    saveAlipay,
    handleLogout,
  } = useSettingsActionHelpers({
    request,
    payMode,
    debugMode,
    wxpay,
    alipay,
    savingPayMode,
    savingDebugMode,
    savingWx,
    savingAli,
    loadAll,
    router,
    ElMessage,
    ElMessageBox,
  });

  async function saveSms() {
    await smsSettings.saveSmsConfig({ reloadAfterSave: true });
  }

  async function saveWeather() {
    await weatherSettings.saveWeatherConfig();
  }

  async function saveAppDownload() {
    await appDownloadSettings.saveAppDownloadConfig();
  }

  function openClearAllDataDialog() {
    clearAllVerifyForm.verifyAccount = '';
    clearAllVerifyForm.verifyPassword = '';
    clearAllDialogVisible.value = true;
  }

  async function confirmClearAllData() {
    if (!clearAllVerifyForm.verifyAccount || !clearAllVerifyForm.verifyPassword) {
      ElMessage.warning('请输入验证账号和密码');
      return;
    }

    clearingAllData.value = true;
    try {
      const { data } = await request.post('/api/settings/clear-all-data', {
        verifyAccount: clearAllVerifyForm.verifyAccount,
        verifyPassword: clearAllVerifyForm.verifyPassword
      });
      const rows = Number(data?.goResult?.result?.clearedRows || 0);
      ElMessage.success(`系统数据清空完成，共清理约 ${rows} 条记录`);
      clearAllDialogVisible.value = false;
      await loadAll();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '清空全部信息失败'));
    } finally {
      clearingAllData.value = false;
    }
  }

  return {
    router,
    isMobile,
    loading,
    saving,
    loadError,
    apiListError,
    pageError,
    sms,
    DEFAULT_APP_DOWNLOAD_CONFIG,
    DEFAULT_WEATHER_CONFIG,
    weather,
    DEFAULT_SERVICE_SETTINGS,
    serviceSettings,
    uploadingServiceSounds,
    DEFAULT_CHARITY_SETTINGS,
    charitySettings,
    DEFAULT_VIP_SETTINGS,
    vipSettings,
    DEFAULT_WECHAT_LOGIN_CONFIG,
    wechatLoginConfig,
    savingWechatLoginConfig,
    savingServiceSettings,
    savingCharitySettings,
    savingVipSettings,
    appDownloadConfig,
    savingAppDownload,
    uploadingPackage,
    exporting,
    importing,
    exportingRiders,
    importingRiders,
    exportingOrders,
    importingOrders,
    exportingMerchants,
    importingMerchants,
    exportingAll,
    importingAll,
    dataMgmtItems,
    debugMode,
    savingDebugMode,
    payMode,
    savingPayMode,
    wxpay,
    savingWx,
    alipay,
    savingAli,
    apiList,
    apiListLoading,
    apiDialogVisible,
    editingApi,
    apiForm,
    savingApi,
    downloadDialogVisible,
    downloadLanguage,
    downloadingApi,
    currentDownloadApi,
    clearAllDialogVisible,
    clearingAllData,
    clearAllVerifyForm,
    extractErrorMessage,
    mergeWeatherConfig,
    handleResize,
    loadAll,
    saveSms,
    saveWeather,
    saveWechatLoginConfig,
    saveServiceSettings,
    previewServiceSound,
    handleServiceSoundUpload,
    clearServiceSound,
    addRiderReportReason,
    removeRiderReportReason,
    addRiderInsuranceCoverage,
    removeRiderInsuranceCoverage,
    addRiderInsuranceClaimStep,
    removeRiderInsuranceClaimStep,
    addRTCIceServer,
    removeRTCIceServer,
    saveCharitySettings,
    addCharityLeaderboardItem,
    removeCharityLeaderboardItem,
    addCharityNewsItem,
    removeCharityNewsItem,
    saveVIPSettings,
    addVIPLevel,
    removeVIPLevel,
    addVIPBenefit,
    removeVIPBenefit,
    addVIPTask,
    removeVIPTask,
    addVIPPointRule,
    removeVIPPointRule,
    saveAppDownload,
    beforePackageUpload: appDownloadSettings.beforePackageUpload,
    handlePackageUpload: appDownloadSettings.handlePackageUpload,
    beforeMiniProgramQrUpload: appDownloadSettings.beforeMiniProgramQrUpload,
    handleMiniProgramQrUpload: appDownloadSettings.handleMiniProgramQrUpload,
    openDownloadLink: appDownloadSettings.openDownloadLink,
    openClearAllDataDialog,
    confirmClearAllData,
    savePayMode,
    saveDebugMode,
    saveWxpay,
    saveAlipay,
    handleLogout,
    exportUsers,
    beforeImport,
    handleImport,
    exportRiders,
    handleImportRiders,
    validateDataType,
    exportOrders,
    handleImportOrders,
    exportMerchants,
    handleImportMerchants,
    exportAllData,
    handleImportAllData,
    loadApiList,
    showAddApiDialog,
    editApi,
    deleteApi,
    saveApi,
    resetApiForm,
    generateApiKey,
    copyApiKey,
    getPermissionLabel,
    handleApiPermissionChange,
    showApiDocumentation,
    generateApiDocumentation,
    showDownloadDialog,
    generateMarkdownDoc,
    downloadApiDoc,
  };
}
