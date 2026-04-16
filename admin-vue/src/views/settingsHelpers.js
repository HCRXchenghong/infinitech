import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage, extractUploadAsset } from '@infinitech/contracts';
import {
  buildAppDownloadConfigPayload,
  buildCharitySettingsPayload,
  buildSMSConfigPayload,
  buildServiceSettingsPayload as buildSharedServiceSettingsPayload,
  buildVIPSettingsPayload,
  buildWeatherConfigPayload,
  buildWechatLoginConfigPayload,
  createDefaultAlipayConfig,
  createDefaultAppDownloadConfig,
  createDefaultCharitySettings,
  createDefaultDebugMode,
  createDefaultPayMode,
  createDefaultServiceSettings,
  createDefaultSMSConfig,
  createDefaultVIPSettings,
  createDefaultWeatherConfig,
  createDefaultWechatLoginConfig,
  createDefaultWxpayConfig,
  createEmptyCharityLeaderboardItem,
  createEmptyCharityNewsItem,
  createEmptyRTCIceServer,
  createEmptyRiderInsuranceCoverage,
  createEmptyVIPBenefit,
  createEmptyVIPLevel,
  createEmptyVIPTask,
  normalizeAlipayConfig,
  normalizeAppDownloadConfig,
  normalizeCharitySettings,
  normalizeDebugModeConfig,
  normalizePayModeConfig,
  normalizeRTCIceServers,
  normalizeRiderInsuranceCoverages,
  normalizeSMSConfig,
  normalizeServiceSettings,
  normalizeServiceStringList,
  normalizeVIPSettings,
  normalizeWeatherConfig,
  normalizeWechatLoginConfig,
  normalizeWxpayConfig,
  resolveAdminServiceSoundPreviewUrl,
  validateAdminAudioFile,
  validateAdminMiniProgramQrFile,
  validateAdminPackageFile,
} from '@infinitech/admin-core';
import request from '@/utils/request';
import { useDataManagementPage } from './dataManagementHelpers';
import { useSettingsApiManagement } from './settingsApiManagementHelpers';
import { useSettingsActionHelpers } from './settingsActionHelpers';

export function useSettingsPage() {
  const router = useRouter();

  const isMobile = ref(window.innerWidth <= 768);

  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');

  const sms = ref(createDefaultSMSConfig());
  const DEFAULT_WEATHER_CONFIG = createDefaultWeatherConfig();
  const weather = ref(createDefaultWeatherConfig());
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

  const appDownloadConfig = ref(createDefaultAppDownloadConfig());
  const savingAppDownload = ref(false);
  const uploadingPackage = reactive({
    ios: false,
    android: false,
    miniProgramQr: false
  });

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

  function mergeWeatherConfig(payload = {}) {
    weather.value = normalizeWeatherConfig(payload);
  }

  function mergeServiceSettings(payload = {}) {
    serviceSettings.value = normalizeServiceSettings(payload);
  }

  function addRiderReportReason() {
    const reasons = normalizeServiceStringList(serviceSettings.value.rider_exception_report_reasons, [], 20);
    if (reasons.length >= 20) {
      ElMessage.warning('异常上报原因最多保留 20 条');
      return;
    }
    serviceSettings.value.rider_exception_report_reasons = [
      ...reasons,
      ''
    ];
  }

  function removeRiderReportReason(index) {
    const reasons = Array.isArray(serviceSettings.value.rider_exception_report_reasons)
      ? [...serviceSettings.value.rider_exception_report_reasons]
      : [];
    reasons.splice(index, 1);
    serviceSettings.value.rider_exception_report_reasons = reasons;
  }

  function addRiderInsuranceCoverage() {
    const items = normalizeRiderInsuranceCoverages(serviceSettings.value.rider_insurance_coverages);
    if (items.length >= 10) {
      ElMessage.warning('保障项目最多保留 10 项');
      return;
    }
    serviceSettings.value.rider_insurance_coverages = [
      ...items,
      createEmptyRiderInsuranceCoverage()
    ];
  }

  function removeRiderInsuranceCoverage(index) {
    const items = Array.isArray(serviceSettings.value.rider_insurance_coverages)
      ? [...serviceSettings.value.rider_insurance_coverages]
      : [];
    items.splice(index, 1);
    serviceSettings.value.rider_insurance_coverages = items;
  }

  function addRiderInsuranceClaimStep() {
    const steps = normalizeServiceStringList(serviceSettings.value.rider_insurance_claim_steps, [], 10);
    if (steps.length >= 10) {
      ElMessage.warning('理赔步骤最多保留 10 条');
      return;
    }
    serviceSettings.value.rider_insurance_claim_steps = [
      ...steps,
      ''
    ];
  }

  function removeRiderInsuranceClaimStep(index) {
    const steps = Array.isArray(serviceSettings.value.rider_insurance_claim_steps)
      ? [...serviceSettings.value.rider_insurance_claim_steps]
      : [];
    steps.splice(index, 1);
    serviceSettings.value.rider_insurance_claim_steps = steps;
  }

  function addRTCIceServer() {
    const servers = normalizeRTCIceServers(serviceSettings.value.rtc_ice_servers);
    if (servers.length >= 10) {
      ElMessage.warning('RTC ICE/TURN 最多保留 10 组');
      return;
    }
    serviceSettings.value.rtc_ice_servers = [
      ...servers,
      createEmptyRTCIceServer()
    ];
  }

  function removeRTCIceServer(index) {
    const servers = Array.isArray(serviceSettings.value.rtc_ice_servers)
      ? [...serviceSettings.value.rtc_ice_servers]
      : [];
    servers.splice(index, 1);
    serviceSettings.value.rtc_ice_servers = servers;
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
        request.get('/api/sms-config'),
        request.get('/api/debug-mode'),
        request.get('/api/weather-config'),
        request.get('/api/wechat-login-config'),
        request.get('/api/service-settings'),
        request.get('/api/charity-settings'),
        request.get('/api/vip-settings'),
        request.get('/api/app-download-config'),
        request.get('/api/pay-config/mode'),
        request.get('/api/pay-config/wxpay'),
        request.get('/api/pay-config/alipay'),
      ]);

      const [smsResp, debugResp, weaResp, wechatLoginResp, serviceResp, charityResp, vipResp, downloadResp, payModeResp, wxResp, aliResp] = results;

      if (smsResp.status === 'fulfilled' && smsResp.value?.data) {
        sms.value = normalizeSMSConfig(extractEnvelopeData(smsResp.value.data) || {});
      }
      if (debugResp.status === 'fulfilled' && debugResp.value?.data) {
        debugMode.value = normalizeDebugModeConfig(extractEnvelopeData(debugResp.value.data) || {});
      }
      if (weaResp.status === 'fulfilled' && weaResp.value?.data) {
        mergeWeatherConfig(extractEnvelopeData(weaResp.value.data) || {});
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
      if (downloadResp.status === 'fulfilled' && downloadResp.value?.data) {
        appDownloadConfig.value = normalizeAppDownloadConfig(extractEnvelopeData(downloadResp.value.data) || {});
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
    saving.value = true;
    try {
      await request.post('/api/sms-config', buildSMSConfigPayload(sms.value));
      ElMessage.success('短信配置保存成功');
      setTimeout(() => {
        loadAll();
      }, 100);
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
    if (charitySettings.value.leaderboard.length >= 20) {
      ElMessage.warning('善行榜单最多保留 20 条');
      return;
    }
    charitySettings.value.leaderboard.push(createEmptyCharityLeaderboardItem());
  }

  function removeCharityLeaderboardItem(index) {
    charitySettings.value.leaderboard.splice(index, 1);
  }

  function addCharityNewsItem() {
    if (charitySettings.value.news_list.length >= 20) {
      ElMessage.warning('公益资讯最多保留 20 条');
      return;
    }
    charitySettings.value.news_list.push(createEmptyCharityNewsItem());
  }

  function removeCharityNewsItem(index) {
    charitySettings.value.news_list.splice(index, 1);
  }

  function addVIPLevel() {
    if (vipSettings.value.levels.length >= 8) {
      ElMessage.warning('会员等级最多保留 8 档');
      return;
    }
    vipSettings.value.levels.push(createEmptyVIPLevel());
  }

  function removeVIPLevel(index) {
    vipSettings.value.levels.splice(index, 1);
  }

  function addVIPBenefit(levelIndex) {
    const level = vipSettings.value.levels[levelIndex];
    if (!level) {
      return;
    }
    if (!Array.isArray(level.benefits)) {
      level.benefits = [];
    }
    if (level.benefits.length >= 12) {
      ElMessage.warning('单个会员等级最多保留 12 项权益');
      return;
    }
    level.benefits.push(createEmptyVIPBenefit());
  }

  function removeVIPBenefit(levelIndex, benefitIndex) {
    const level = vipSettings.value.levels[levelIndex];
    if (!level || !Array.isArray(level.benefits)) {
      return;
    }
    level.benefits.splice(benefitIndex, 1);
  }

  function addVIPTask() {
    if (vipSettings.value.growth_tasks.length >= 20) {
      ElMessage.warning('成长任务最多保留 20 项');
      return;
    }
    vipSettings.value.growth_tasks.push(createEmptyVIPTask());
  }

  function removeVIPTask(index) {
    vipSettings.value.growth_tasks.splice(index, 1);
  }

  function addVIPPointRule() {
    if (vipSettings.value.point_rules.length >= 20) {
      ElMessage.warning('积分规则最多保留 20 条');
      return;
    }
    vipSettings.value.point_rules.push('');
  }

  function removeVIPPointRule(index) {
    vipSettings.value.point_rules.splice(index, 1);
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
    savingAppDownload.value = true;
    try {
      const payload = buildAppDownloadConfigPayload(appDownloadConfig.value);
      await request.post('/api/app-download-config', payload);
      appDownloadConfig.value = normalizeAppDownloadConfig(payload);
      ElMessage.success('APP下载配置保存成功');
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存APP下载配置失败'));
    } finally {
      savingAppDownload.value = false;
    }
  }

  function beforePackageUpload(file) {
    const result = validateAdminPackageFile(file, 300);
    if (!result.valid) {
      ElMessage.error(result.message);
      return false;
    }
    return true;
  }

  function beforeMiniProgramQrUpload(file) {
    const result = validateAdminMiniProgramQrFile(file, 10);
    if (!result.valid) {
      ElMessage.error(result.message);
      return false;
    }
    return true;
  }

  async function handlePackageUpload(platform, options) {
    const file = options?.file;
    if (!file) return;

    uploadingPackage[platform] = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await request.post('/api/upload-package', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const asset = extractUploadAsset(data);
      const nextUrl = asset?.url || '';
      if (!nextUrl) {
        throw new Error('上传返回地址为空');
      }

      if (platform === 'ios') {
        appDownloadConfig.value = normalizeAppDownloadConfig({
          ...appDownloadConfig.value,
          ios_url: nextUrl
        });
      } else {
        appDownloadConfig.value = normalizeAppDownloadConfig({
          ...appDownloadConfig.value,
          android_url: nextUrl
        });
      }
      ElMessage.success('安装包上传成功');
      options?.onSuccess?.(data);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '安装包上传失败'));
      options?.onError?.(error);
    } finally {
      uploadingPackage[platform] = false;
    }
  }

  async function handleMiniProgramQrUpload(options) {
    const file = options?.file;
    if (!file) return;

    uploadingPackage.miniProgramQr = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await request.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const asset = extractUploadAsset(data);
      const nextUrl = asset?.url || '';
      if (!nextUrl) {
        throw new Error('上传返回地址为空');
      }

      appDownloadConfig.value = normalizeAppDownloadConfig({
        ...appDownloadConfig.value,
        mini_program_qr_url: nextUrl
      });
      ElMessage.success('小程序二维码上传成功');
      options?.onSuccess?.(data);
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '小程序二维码上传失败'));
      options?.onError?.(error);
    } finally {
      uploadingPackage.miniProgramQr = false;
    }
  }

  function openDownloadLink(url, label) {
    if (!url) {
      ElMessage.warning(`${label} 下载地址为空`);
      return;
    }
    window.open(url, '_blank');
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
    beforePackageUpload,
    handlePackageUpload,
    beforeMiniProgramQrUpload,
    handleMiniProgramQrUpload,
    openDownloadLink,
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
