import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage, extractUploadAsset, UPLOAD_DOMAINS } from '@infinitech/contracts';
import {
  appendCharityLeaderboardItem as buildNextCharityLeaderboardItems,
  appendCharityNewsItem as buildNextCharityNewsItems,
  appendRiderInsuranceClaimStep as buildNextRiderInsuranceClaimSteps,
  appendRiderInsuranceCoverage as buildNextRiderInsuranceCoverages,
  appendRiderReportReason as buildNextRiderReportReasons,
  appendRTCIceServer as buildNextRTCIceServers,
  appendVIPBenefit as buildNextVIPBenefits,
  appendVIPLevel as buildNextVIPLevels,
  appendVIPPointRule as buildNextVIPPointRules,
  appendVIPTask as buildNextVIPTasks,
  appendAdminUploadDomain,
  buildCharitySettingsPayload,
  buildServiceSettingsPayload as buildSharedServiceSettingsPayload,
  buildVIPSettingsPayload,
  buildWechatLoginConfigPayload,
  createDefaultAlipayConfig,
  createDefaultCharitySettings,
  createDefaultDebugMode,
  createDefaultPayMode,
  createDefaultServiceSettings,
  createDefaultVIPSettings,
  createDefaultWechatLoginConfig,
  createDefaultWxpayConfig,
  normalizeAlipayConfig,
  normalizeCharitySettings,
  normalizeDebugModeConfig,
  normalizePayModeConfig,
  normalizeServiceSettings,
  normalizeVIPSettings,
  normalizeWechatLoginConfig,
  normalizeWxpayConfig,
  removeCharityLeaderboardItem as buildNextCharityLeaderboardAfterRemove,
  removeCharityNewsItem as buildNextCharityNewsAfterRemove,
  removeRiderInsuranceClaimStep as buildNextRiderInsuranceClaimStepsAfterRemove,
  removeRiderInsuranceCoverage as buildNextRiderInsuranceCoveragesAfterRemove,
  removeRiderReportReason as buildNextRiderReportReasonsAfterRemove,
  removeRTCIceServer as buildNextRTCIceServersAfterRemove,
  removeVIPBenefit as buildNextVIPBenefitsAfterRemove,
  removeVIPLevel as buildNextVIPLevelsAfterRemove,
  removeVIPPointRule as buildNextVIPPointRulesAfterRemove,
  removeVIPTask as buildNextVIPTasksAfterRemove,
  resolveAdminServiceSoundPreviewUrl,
  SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES,
  validateAdminAudioFile,
} from '@infinitech/admin-core';
import request from '@/utils/request';
import { useDataManagementPage } from './dataManagementHelpers';
import { useSettingsApiManagement } from './settingsApiManagementHelpers';
import { useSettingsActionHelpers } from './settingsActionHelpers';
import { useAppDownloadSettings } from './settingsHelpers/appDownload';
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
  const DEFAULT_SERVICE_SETTINGS = createDefaultServiceSettings();
  const serviceSettings = ref(createDefaultServiceSettings());
  const savingServiceSettings = ref(false);
  const uploadingServiceSounds = reactive({
    message: false,
    order: false,
  });
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

  function mergeServiceSettings(payload = {}) {
    serviceSettings.value = normalizeServiceSettings(payload);
  }

  function addRiderReportReason() {
    const result = buildNextRiderReportReasons(serviceSettings.value.rider_exception_report_reasons);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.riderReportReasons);
      return;
    }
    serviceSettings.value.rider_exception_report_reasons = result.items;
  }

  function removeRiderReportReason(index) {
    serviceSettings.value.rider_exception_report_reasons = buildNextRiderReportReasonsAfterRemove(
      serviceSettings.value.rider_exception_report_reasons,
      index,
    );
  }

  function addRiderInsuranceCoverage() {
    const result = buildNextRiderInsuranceCoverages(serviceSettings.value.rider_insurance_coverages);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.riderInsuranceCoverages);
      return;
    }
    serviceSettings.value.rider_insurance_coverages = result.items;
  }

  function removeRiderInsuranceCoverage(index) {
    serviceSettings.value.rider_insurance_coverages = buildNextRiderInsuranceCoveragesAfterRemove(
      serviceSettings.value.rider_insurance_coverages,
      index,
    );
  }

  function addRiderInsuranceClaimStep() {
    const result = buildNextRiderInsuranceClaimSteps(serviceSettings.value.rider_insurance_claim_steps);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.riderInsuranceClaimSteps);
      return;
    }
    serviceSettings.value.rider_insurance_claim_steps = result.items;
  }

  function removeRiderInsuranceClaimStep(index) {
    serviceSettings.value.rider_insurance_claim_steps = buildNextRiderInsuranceClaimStepsAfterRemove(
      serviceSettings.value.rider_insurance_claim_steps,
      index,
    );
  }

  function addRTCIceServer() {
    const result = buildNextRTCIceServers(serviceSettings.value.rtc_ice_servers);
    if (!result.added) {
      ElMessage.warning(SYSTEM_SETTINGS_COLLECTION_LIMIT_MESSAGES.rtcIceServers);
      return;
    }
    serviceSettings.value.rtc_ice_servers = result.items;
  }

  function removeRTCIceServer(index) {
    serviceSettings.value.rtc_ice_servers = buildNextRTCIceServersAfterRemove(
      serviceSettings.value.rtc_ice_servers,
      index,
    );
  }

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
        request.get('/api/service-settings'),
        request.get('/api/charity-settings'),
        request.get('/api/vip-settings'),
        appDownloadSettings.loadAppDownloadConfig({ clearError: false, throwOnError: true }),
        request.get('/api/pay-config/mode'),
        request.get('/api/pay-config/wxpay'),
        request.get('/api/pay-config/alipay'),
      ]);

      const [smsResp, debugResp, weaResp, wechatLoginResp, serviceResp, charityResp, vipResp, downloadResp, payModeResp, wxResp, aliResp] = results;

      if (debugResp.status === 'fulfilled' && debugResp.value?.data) {
        debugMode.value = normalizeDebugModeConfig(extractEnvelopeData(debugResp.value.data) || {});
      }
      if (wechatLoginResp.status === 'fulfilled' && wechatLoginResp.value?.data) {
        mergeWechatLoginConfig(extractEnvelopeData(wechatLoginResp.value.data) || {});
      }
      if (serviceResp.status === 'fulfilled' && serviceResp.value?.data) {
        mergeServiceSettings(extractEnvelopeData(serviceResp.value.data) || {});
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

  function buildServiceSettingsPayload() {
    return buildSharedServiceSettingsPayload(serviceSettings.value);
  }

  async function saveServiceSettings(options = {}) {
    const successMessage = options?.successMessage || '服务配置保存成功';
    savingServiceSettings.value = true;
    try {
      const payload = buildServiceSettingsPayload();
      await request.post('/api/service-settings', payload);
      mergeServiceSettings(payload);
      ElMessage.success(successMessage);
      return true;
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存服务配置失败'));
      return false;
    } finally {
      savingServiceSettings.value = false;
    }
  }

  function validateSoundFile(file) {
    const result = validateAdminAudioFile(file, 10);
    if (!result.valid) {
      ElMessage.warning(result.message);
      return false;
    }
    return true;
  }

  function resolveDefaultSoundPreviewUrl(kind) {
    return resolveAdminServiceSoundPreviewUrl(kind);
  }

  function resolveConfiguredSoundUrl(kind) {
    if (kind === 'order') {
      return String(serviceSettings.value.order_notification_sound_url || '').trim();
    }
    return String(serviceSettings.value.message_notification_sound_url || '').trim();
  }

  function previewServiceSound(kind) {
    const url = resolveConfiguredSoundUrl(kind) || resolveDefaultSoundPreviewUrl(kind);
    if (!url) {
      ElMessage.warning('当前没有可试听的提示音');
      return;
    }
    const player = new Audio();
    player.src = url;
    const playPromise = player.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        ElMessage.warning('浏览器拦截了自动播放，请与页面交互后重试');
      });
    }
  }

  async function handleServiceSoundUpload(field, options) {
    const file = options?.file;
    if (!file || !validateSoundFile(file)) {
      return;
    }

    const kind = field === 'order_notification_sound_url' ? 'order' : 'message';
    const loadingKey = kind === 'order' ? 'order' : 'message';
    const previousValue = String(serviceSettings.value[field] || '').trim();

    uploadingServiceSounds[loadingKey] = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      appendAdminUploadDomain(formData, UPLOAD_DOMAINS.SERVICE_SOUND);
      const { data } = await request.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (typeof options?.onSuccess === 'function') {
        options.onSuccess(data);
      }

      const asset = extractUploadAsset(data);
      const nextUrl = String(asset?.url || '').trim();
      if (!nextUrl) {
        throw new Error('上传成功但未返回文件地址');
      }

      serviceSettings.value[field] = nextUrl;
      const saved = await saveServiceSettings({
        successMessage: kind === 'order' ? '来单提示音已更新' : '消息提示音已更新'
      });
      if (!saved) {
        serviceSettings.value[field] = previousValue;
      }
    } catch (error) {
      if (typeof options?.onError === 'function') {
        options.onError(error);
      }
      serviceSettings.value[field] = previousValue;
      ElMessage.error(extractErrorMessage(error, '提示音上传失败'));
    } finally {
      uploadingServiceSounds[loadingKey] = false;
    }
  }

  async function clearServiceSound(field) {
    const kind = field === 'order_notification_sound_url' ? 'order' : 'message';
    const previousValue = String(serviceSettings.value[field] || '').trim();
    serviceSettings.value[field] = '';
    const saved = await saveServiceSettings({
      successMessage: kind === 'order'
        ? '来单提示音配置已删除，已回退到默认 come.mp3'
        : '消息提示音配置已删除，已回退到默认 chat.mp3'
    });
    if (!saved) {
      serviceSettings.value[field] = previousValue;
    }
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
