import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import {
  appendCharityLeaderboardItem as buildNextCharityLeaderboardItems,
  appendCharityNewsItem as buildNextCharityNewsItems,
  appendVIPBenefit as buildNextVIPBenefits,
  appendVIPLevel as buildNextVIPLevels,
  appendVIPPointRule as buildNextVIPPointRules,
  appendVIPTask as buildNextVIPTasks,
  buildCharitySettingsPayload,
  buildVIPSettingsPayload,
  buildWechatLoginConfigPayload,
  createDefaultAlipayConfig,
  createDefaultCharitySettings,
  createDefaultDebugMode,
  createDefaultPayMode,
  createDefaultVIPSettings,
  createDefaultWechatLoginConfig,
  createDefaultWxpayConfig,
  normalizeAlipayConfig,
  normalizeCharitySettings,
  normalizeDebugModeConfig,
  normalizePayModeConfig,
  normalizeVIPSettings,
  normalizeWechatLoginConfig,
  normalizeWxpayConfig,
  removeCharityLeaderboardItem as buildNextCharityLeaderboardAfterRemove,
  removeCharityNewsItem as buildNextCharityNewsAfterRemove,
  removeVIPBenefit as buildNextVIPBenefitsAfterRemove,
  removeVIPLevel as buildNextVIPLevelsAfterRemove,
  removeVIPPointRule as buildNextVIPPointRulesAfterRemove,
  removeVIPTask as buildNextVIPTasksAfterRemove,
  SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES,
} from '@infinitech/admin-core';
import request from '@/utils/request';
import { useDataManagementPage } from './dataManagementHelpers';
import { useSettingsApiManagement } from './settingsApiManagementHelpers';
import { useSettingsActionHelpers } from './settingsActionHelpers';
import { useAppDownloadSettings } from './settingsHelpers/appDownload';
import { useServiceSettings } from './settingsHelpers/serviceSettings';
import { useSmsSettings } from './settingsHelpers/sms';
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
  const DEFAULT_CHARITY_SETTINGS = createDefaultCharitySettings();
  const charitySettings = ref(createDefaultCharitySettings());
  const savingCharitySettings = ref(false);
  const DEFAULT_VIP_SETTINGS = createDefaultVIPSettings();
  const vipSettings = ref(createDefaultVIPSettings());
  const savingVipSettings = ref(false);
  const DEFAULT_WECHAT_LOGIN_CONFIG = createDefaultWechatLoginConfig();
  const wechatLoginConfig = ref(createDefaultWechatLoginConfig());
  const savingWechatLoginConfig = ref(false);

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

  function mergeCharitySettings(payload = {}) {
    charitySettings.value = normalizeCharitySettings(payload);
  }

  function mergeWechatLoginConfig(payload = {}) {
    wechatLoginConfig.value = normalizeWechatLoginConfig(payload);
  }

  function mergeVIPSettings(payload = {}) {
    vipSettings.value = normalizeVIPSettings(payload);
  }

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
        request.get('/api/wechat-login-config'),
        loadServiceSettings({ clearError: false, throwOnError: true }),
        request.get('/api/charity-settings'),
        request.get('/api/vip-settings'),
        appDownloadSettings.loadAppDownloadConfig({ clearError: false, throwOnError: true }),
        request.get('/api/pay-config/mode'),
        request.get('/api/pay-config/wxpay'),
        request.get('/api/pay-config/alipay'),
      ]);

      const [smsResp, debugResp, weaResp, wechatLoginResp, , charityResp, vipResp, downloadResp, payModeResp, wxResp, aliResp] = results;

      if (debugResp.status === 'fulfilled' && debugResp.value?.data) {
        debugMode.value = normalizeDebugModeConfig(extractEnvelopeData(debugResp.value.data) || {});
      }
      if (wechatLoginResp.status === 'fulfilled' && wechatLoginResp.value?.data) {
        mergeWechatLoginConfig(extractEnvelopeData(wechatLoginResp.value.data) || {});
      }
      if (charityResp.status === 'fulfilled' && charityResp.value?.data) {
        mergeCharitySettings(extractEnvelopeData(charityResp.value.data) || {});
      }
      if (vipResp.status === 'fulfilled' && vipResp.value?.data) {
        mergeVIPSettings(extractEnvelopeData(vipResp.value.data) || {});
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

  function addCharityLeaderboardItem() {
    const result = buildNextCharityLeaderboardItems(charitySettings.value.leaderboard);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.charityLeaderboard);
      return;
    }
    charitySettings.value.leaderboard = result.items;
  }

  function removeCharityLeaderboardItem(index) {
    charitySettings.value.leaderboard = buildNextCharityLeaderboardAfterRemove(
      charitySettings.value.leaderboard,
      index,
    );
  }

  function addCharityNewsItem() {
    const result = buildNextCharityNewsItems(charitySettings.value.news_list);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.charityNews);
      return;
    }
    charitySettings.value.news_list = result.items;
  }

  function removeCharityNewsItem(index) {
    charitySettings.value.news_list = buildNextCharityNewsAfterRemove(
      charitySettings.value.news_list,
      index,
    );
  }

  function addVIPLevel() {
    const result = buildNextVIPLevels(vipSettings.value.levels);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.vipLevels);
      return;
    }
    vipSettings.value.levels = result.items;
  }

  function removeVIPLevel(index) {
    vipSettings.value.levels = buildNextVIPLevelsAfterRemove(
      vipSettings.value.levels,
      index,
    );
  }

  function addVIPBenefit(levelIndex) {
    const result = buildNextVIPBenefits(vipSettings.value.levels, levelIndex);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.vipBenefitsPerLevel);
      return;
    }
    vipSettings.value.levels = result.levels;
  }

  function removeVIPBenefit(levelIndex, benefitIndex) {
    vipSettings.value.levels = buildNextVIPBenefitsAfterRemove(
      vipSettings.value.levels,
      levelIndex,
      benefitIndex,
    );
  }

  function addVIPTask() {
    const result = buildNextVIPTasks(vipSettings.value.growth_tasks);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.vipTasks);
      return;
    }
    vipSettings.value.growth_tasks = result.items;
  }

  function removeVIPTask(index) {
    vipSettings.value.growth_tasks = buildNextVIPTasksAfterRemove(
      vipSettings.value.growth_tasks,
      index,
    );
  }

  function addVIPPointRule() {
    const result = buildNextVIPPointRules(vipSettings.value.point_rules);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.vipPointRules);
      return;
    }
    vipSettings.value.point_rules = result.items;
  }

  function removeVIPPointRule(index) {
    vipSettings.value.point_rules = buildNextVIPPointRulesAfterRemove(
      vipSettings.value.point_rules,
      index,
    );
  }

  async function saveCharitySettings() {
    savingCharitySettings.value = true;
    try {
      const payload = buildCharitySettingsPayload(charitySettings.value);
      await request.post('/api/charity-settings', payload);
      mergeCharitySettings(payload);
      ElMessage.success('公益配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存公益配置失败'));
    } finally {
      savingCharitySettings.value = false;
    }
  }

  async function saveVIPSettings() {
    savingVipSettings.value = true;
    try {
      const payload = buildVIPSettingsPayload(vipSettings.value);
      await request.post('/api/vip-settings', payload);
      mergeVIPSettings(payload);
      ElMessage.success('会员配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存会员配置失败'));
    } finally {
      savingVipSettings.value = false;
    }
  }

  async function saveWechatLoginConfig() {
    savingWechatLoginConfig.value = true;
    try {
      const payload = buildWechatLoginConfigPayload(wechatLoginConfig.value);
      await request.post('/api/wechat-login-config', payload);
      mergeWechatLoginConfig({
        ...payload,
        app_secret: '',
        has_app_secret: payload.app_secret !== '' || wechatLoginConfig.value.has_app_secret
      });
      ElMessage.success('微信登录配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存微信登录配置失败'));
    } finally {
      savingWechatLoginConfig.value = false;
    }
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
