import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractErrorMessage } from '@infinitech/contracts';
import request from '@/utils/request';
import { useCharitySettings } from './settingsHelpers/charitySettings';
import { useSettingsApiManagement } from './settingsApiManagementHelpers';
import { useSettingsActionHelpers } from './settingsActionHelpers';
import { useAppDownloadSettings } from './settingsHelpers/appDownload';
import { useSettingsDataManagement } from './settingsHelpers/dataManagement';
import { usePaymentAndDebugSettings } from './settingsHelpers/paymentAndDebug';
import {
  runSettledTaskGroup,
  useResponsiveAdminPage,
  useSharedSystemConfigSections,
} from './settingsHelpers/pageRuntime';
import { useServiceSettings } from './settingsHelpers/serviceSettings';
import { useSystemMaintenanceActions } from './settingsHelpers/systemMaintenance';
import { useWechatLoginSettings } from './settingsHelpers/wechatLogin';
import { useVipSettings } from './settingsHelpers/vipSettings';

export function useSettingsPage() {
  const router = useRouter();

  const {
    isMobile,
    handleResize,
    bindWindowResize,
    unbindWindowResize,
  } = useResponsiveAdminPage();

  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');
  const sharedSystemConfig = useSharedSystemConfigSections({
    request,
    ElMessage,
    savingRef: saving,
  });
  const sms = sharedSystemConfig.sms;
  const DEFAULT_WEATHER_CONFIG = sharedSystemConfig.DEFAULT_WEATHER_CONFIG;
  const weather = sharedSystemConfig.weather;
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
  const paymentAndDebugSettings = usePaymentAndDebugSettings({
    request,
    ElMessage,
  });
  const debugMode = paymentAndDebugSettings.debugMode;
  const savingDebugMode = paymentAndDebugSettings.savingDebugMode;
  const payMode = paymentAndDebugSettings.payMode;
  const savingPayMode = paymentAndDebugSettings.savingPayMode;
  const wxpay = paymentAndDebugSettings.wxpay;
  const savingWx = paymentAndDebugSettings.savingWx;
  const alipay = paymentAndDebugSettings.alipay;
  const savingAli = paymentAndDebugSettings.savingAli;

  const mergeWeatherConfig = sharedSystemConfig.mergeWeatherConfig;
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
  const loadPaymentAndDebugSettings = paymentAndDebugSettings.loadPaymentAndDebugSettings;
  const savePayMode = paymentAndDebugSettings.savePayMode;
  const saveDebugMode = paymentAndDebugSettings.saveDebugMode;
  const saveWxpay = paymentAndDebugSettings.saveWxpay;
  const saveAlipay = paymentAndDebugSettings.saveAlipay;
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
    handleImport,
    exportRiders,
    handleImportRiders,
    exportOrders,
    handleImportOrders,
    exportMerchants,
    handleImportMerchants,
    exportAllData,
    handleImportAllData,
    validateDataType,
    dataMgmtItems,
  } = useSettingsDataManagement();

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

  onMounted(() => {
    loadAll();
    bindWindowResize();
  });

  onUnmounted(() => {
    unbindWindowResize();
  });

  async function loadAll() {
    loadError.value = '';
    loading.value = true;
    try {
      const { errorMessage } = await runSettledTaskGroup(
        [
          () => sharedSystemConfig.loadSmsConfig({ clearError: false, throwOnError: true }),
          () => sharedSystemConfig.loadWeatherConfig({ clearError: false, throwOnError: true }),
          () => loadWechatLoginConfig({ clearError: false, throwOnError: true }),
          () => loadServiceSettings({ clearError: false, throwOnError: true }),
          () => loadCharitySettings({ clearError: false, throwOnError: true }),
          () => loadVipSettings({ clearError: false, throwOnError: true }),
          () => appDownloadSettings.loadAppDownloadConfig({ clearError: false, throwOnError: true }),
          () => loadPaymentAndDebugSettings({ clearError: false, throwOnError: true }),
        ],
        {
          partialFailureMessage: '部分系统配置加载失败，请稍后重试',
        },
      );

      if (errorMessage) {
        loadError.value = errorMessage;
      }
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载系统设置失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  const {
    handleLogout,
  } = useSettingsActionHelpers({
    router,
    ElMessage,
    ElMessageBox,
  });

  async function saveSms() {
    await sharedSystemConfig.saveSmsConfig({ reloadAfterSave: true });
  }

  async function saveWeather() {
    await sharedSystemConfig.saveWeatherConfig();
  }

  async function saveAppDownload() {
    await appDownloadSettings.saveAppDownloadConfig();
  }
  const systemMaintenance = useSystemMaintenanceActions({
    request,
    ElMessage,
    reload: loadAll,
  });
  const clearAllDialogVisible = systemMaintenance.clearAllDialogVisible;
  const clearingAllData = systemMaintenance.clearingAllData;
  const clearAllVerifyForm = systemMaintenance.clearAllVerifyForm;
  const openClearAllDataDialog = systemMaintenance.openClearAllDataDialog;
  const confirmClearAllData = systemMaintenance.confirmClearAllData;

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
