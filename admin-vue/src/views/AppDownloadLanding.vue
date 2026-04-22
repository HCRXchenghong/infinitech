<template>
  <AppDownloadLandingHero
    :downloading="downloading"
    :handle-download="handleDownload"
    :latest-version-text="latestVersionText"
    :logo-url="logoUrl"
    :open-mini-program-dialog="openMiniProgramDialog"
    :update-date-text="updateDateText"
  />

  <AppDownloadLandingQrDialog
    :mini-program-qr-url="appConfig.mini_program_qr_url"
    :visible="showMiniProgramDialog"
    @update:visible="handleMiniProgramDialogVisibleUpdate"
  />
</template>

<script setup>
import { ElMessage } from 'element-plus';
import './AppDownloadLanding.css';
import { useAppDownloadLandingPage } from './appDownloadLandingPageHelpers';
import AppDownloadLandingHero from './appDownloadLandingSections/AppDownloadLandingHero.vue';
import AppDownloadLandingQrDialog from './appDownloadLandingSections/AppDownloadLandingQrDialog.vue';

const logoUrl = '/logo.png';

const {
  appConfig,
  downloading,
  handleDownload,
  latestVersionText,
  openMiniProgramDialog,
  setMiniProgramDialogVisible,
  showMiniProgramDialog,
  updateDateText,
} = useAppDownloadLandingPage({
  ElMessage,
  openWindow: (...args) => window.open(...args),
});

function handleMiniProgramDialogVisibleUpdate(value) {
  setMiniProgramDialogVisible(value);
}
</script>
