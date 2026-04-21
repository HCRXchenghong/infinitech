<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-wrap">
        <span class="page-title">系统设置</span>
        <span class="page-subtitle">平台配置与数据能力</span>
      </div>
      <el-button @click="loadAll" :loading="loading" size="small">刷新</el-button>
    </div>
    <PageStateAlert :message="pageError" />

    <div class="grid">
      <SettingsCoreConfigSection
        :router="router"
        :debug-mode="debugMode"
        :saving-debug-mode="savingDebugMode"
        :save-debug-mode="saveDebugMode"
        :sms="sms"
        :saving="saving"
        :save-sms="saveSms"
        :weather="weather"
        :save-weather="saveWeather"
      />
      <SettingsServiceExperienceSection
        :service-settings="serviceSettings"
        :uploading-service-sounds="uploadingServiceSounds"
        :saving-service-settings="savingServiceSettings"
        :save-service-settings="saveServiceSettings"
        :preview-service-sound="previewServiceSound"
        :handle-service-sound-upload="handleServiceSoundUpload"
        :clear-service-sound="clearServiceSound"
        :add-rider-report-reason="addRiderReportReason"
        :remove-rider-report-reason="removeRiderReportReason"
        :add-rider-insurance-coverage="addRiderInsuranceCoverage"
        :remove-rider-insurance-coverage="removeRiderInsuranceCoverage"
        :add-rider-insurance-claim-step="addRiderInsuranceClaimStep"
        :remove-rider-insurance-claim-step="removeRiderInsuranceClaimStep"
        :add-r-t-c-ice-server="addRTCIceServer"
        :remove-r-t-c-ice-server="removeRTCIceServer"
      />
      <SettingsGrowthAndCharitySection
        :vip-settings="vipSettings"
        :saving-vip-settings="savingVipSettings"
        :save-v-i-p-settings="saveVIPSettings"
        :add-v-i-p-level="addVIPLevel"
        :remove-v-i-p-level="removeVIPLevel"
        :add-v-i-p-benefit="addVIPBenefit"
        :remove-v-i-p-benefit="removeVIPBenefit"
        :add-v-i-p-task="addVIPTask"
        :remove-v-i-p-task="removeVIPTask"
        :add-v-i-p-point-rule="addVIPPointRule"
        :remove-v-i-p-point-rule="removeVIPPointRule"
        :charity-settings="charitySettings"
        :saving-charity-settings="savingCharitySettings"
        :save-charity-settings="saveCharitySettings"
        :add-charity-leaderboard-item="addCharityLeaderboardItem"
        :remove-charity-leaderboard-item="removeCharityLeaderboardItem"
        :add-charity-news-item="addCharityNewsItem"
        :remove-charity-news-item="removeCharityNewsItem"
      />
      <SettingsDistributionSection
        :router="router"
        :app-download-config="appDownloadConfig"
        :saving-app-download="savingAppDownload"
        :uploading-package="uploadingPackage"
        :save-app-download="saveAppDownload"
        :before-package-upload="beforePackageUpload"
        :handle-package-upload="handlePackageUpload"
        :before-mini-program-qr-upload="beforeMiniProgramQrUpload"
        :handle-mini-program-qr-upload="handleMiniProgramQrUpload"
        :open-download-link="openDownloadLink"
        :wechat-login-config="wechatLoginConfig"
        :saving-wechat-login-config="savingWechatLoginConfig"
        :save-wechat-login-config="saveWechatLoginConfig"
      />
      <SettingsOperationsSection
        :router="router"
        :data-mgmt-items="dataMgmtItems"
        :before-import="beforeImport"
        :clearing-all-data="clearingAllData"
        :open-clear-all-data-dialog="openClearAllDataDialog"
      />
    </div>

    <SettingsClearAllDialog
      :visible="clearAllDialogVisible"
      :clear-all-verify-form="clearAllVerifyForm"
      :clearing-all-data="clearingAllData"
      :confirm-clear-all-data="confirmClearAllData"
      @update:visible="handleClearAllDialogVisibleChange"
    />
  </div>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';
import { useSettingsPage } from './settingsHelpers';
import SettingsClearAllDialog from './settingsSections/SettingsClearAllDialog.vue';
import SettingsCoreConfigSection from './settingsSections/SettingsCoreConfigSection.vue';
import SettingsDistributionSection from './settingsSections/SettingsDistributionSection.vue';
import SettingsGrowthAndCharitySection from './settingsSections/SettingsGrowthAndCharitySection.vue';
import SettingsOperationsSection from './settingsSections/SettingsOperationsSection.vue';
import SettingsServiceExperienceSection from './settingsSections/SettingsServiceExperienceSection.vue';

const {
  router,
  loading,
  saving,
  pageError,
  sms,
  weather,
  serviceSettings,
  uploadingServiceSounds,
  charitySettings,
  vipSettings,
  wechatLoginConfig,
  savingWechatLoginConfig,
  savingServiceSettings,
  savingCharitySettings,
  savingVipSettings,
  appDownloadConfig,
  savingAppDownload,
  uploadingPackage,
  dataMgmtItems,
  debugMode,
  savingDebugMode,
  clearAllDialogVisible,
  clearingAllData,
  clearAllVerifyForm,
  saveSms,
  saveWeather,
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
  saveWechatLoginConfig,
  saveAppDownload,
  beforePackageUpload,
  handlePackageUpload,
  beforeMiniProgramQrUpload,
  handleMiniProgramQrUpload,
  openDownloadLink,
  openClearAllDataDialog,
  confirmClearAllData,
  saveDebugMode,
  beforeImport,
  loadAll,
} = useSettingsPage();

function handleClearAllDialogVisibleChange(value) {
  clearAllDialogVisible.value = value;
}
</script>

<style scoped lang="css" src="./Settings.css"></style>
