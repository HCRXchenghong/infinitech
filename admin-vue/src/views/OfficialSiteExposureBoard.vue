<template>
  <div class="official-site-exposure-board-page">
    <OfficialSiteExposureBoardHeader :open-form="openForm" />
    <OfficialSiteExposureBoardRecords
      :format-currency="formatCurrency"
      :format-date="formatDate"
      :loading="loading"
      :open-detail="openDetail"
      :records="records"
      :resolve-exposure-cover="resolveExposureCover"
      :status-label="statusLabel"
      :status-tag-type="statusTagType"
    />
    <OfficialSiteExposureBoardDialog
      :before-photo-upload="beforePhotoUpload"
      :close-form="closeForm"
      :form="form"
      :handle-dialog-closed="handleDialogClosed"
      :handle-photo-exceed="handlePhotoExceed"
      :handle-photo-remove="handlePhotoRemove"
      :handle-photo-success="handlePhotoSuccess"
      :handle-photo-upload="handlePhotoUpload"
      :set-form-visible="setFormVisible"
      :set-upload-ref="setUploadRef"
      :submit-expose="submitExpose"
      :submitting="submitting"
      :visible="showForm"
    />
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import './OfficialSiteExposureBoard.css';
import OfficialSiteExposureBoardDialog from './officialSiteExposureBoardSections/OfficialSiteExposureBoardDialog.vue';
import OfficialSiteExposureBoardHeader from './officialSiteExposureBoardSections/OfficialSiteExposureBoardHeader.vue';
import OfficialSiteExposureBoardRecords from './officialSiteExposureBoardSections/OfficialSiteExposureBoardRecords.vue';
import { useOfficialSiteExposureBoardPage } from './officialSiteExposureBoardPageHelpers';

const route = useRoute();
const router = useRouter();
const {
  beforePhotoUpload,
  closeForm,
  form,
  formatCurrency,
  formatDate,
  handleDialogClosed,
  handlePhotoExceed,
  handlePhotoRemove,
  handlePhotoSuccess,
  handlePhotoUpload,
  loading,
  openDetail,
  openForm,
  records,
  resolveExposureCover,
  setFormVisible,
  setUploadRef,
  showForm,
  statusLabel,
  statusTagType,
  submitExpose,
  submitting,
} = useOfficialSiteExposureBoardPage({
  route,
  router,
  ElMessage,
});
</script>
