<template>
  <div class="content-settings-page">
    <ContentSettingsHeader :loading="loading" :load-all="loadAll" />
    <PageStateAlert :message="pageError" />

    <div class="settings-grid">
      <ContentSettingsPushMessagesSection
        v-if="isMobile"
        :push-messages="pushMessages"
        :push-message-loading="pushMessageLoading"
        :show-add-push-message-dialog="showAddPushMessageDialog"
        :load-push-messages="loadPushMessages"
        :show-push-message-stats="showPushMessageStats"
        :edit-push-message="editPushMessage"
        :delete-push-message="deletePushMessage"
      />

      <ContentSettingsCarouselSection
        :is-mobile="isMobile"
        :saving="saving"
        :carousel-settings="carouselSettings"
        :save-carousel-settings="saveCarouselSettings"
        :show-add-carousel-dialog="showAddCarouselDialog"
        :load-carousel-list="loadCarouselList"
        :carousel-loading="carouselLoading"
        :carousel-list="carouselList"
        :carousel-error="carouselError"
        :start-edit="startEdit"
        :finish-edit="finishEdit"
        :cancel-edit="cancelEdit"
        :delete-carousel="deleteCarousel"
        :show-carousel-detail="showCarouselDetail"
      />
    </div>

    <ContentSettingsCarouselDetailDialog
      :visible="carouselDetailVisible"
      :carousel="currentCarousel"
      :edit-from-detail="editFromDetail"
      :copy-to-clipboard="copyToClipboard"
      @update:visible="handleCarouselDetailVisibleUpdate"
    />

    <ContentSettingsCarouselFormDialog
      :visible="addCarouselVisible"
      :new-carousel="newCarousel"
      :saving="saving"
      :cancel-add-carousel="cancelAddCarousel"
      :confirm-add-carousel="confirmAddCarousel"
      :upload-carousel-image="uploadCarouselImage"
      :before-carousel-upload="beforeCarouselUpload"
      @update:visible="handleAddCarouselVisibleUpdate"
    />

    <ContentSettingsPushMessageDialog
      :visible="pushMessageDialogVisible"
      :is-mobile="isMobile"
      :editing-push-message="editingPushMessage"
      :push-message-form="pushMessageForm"
      :saving-push-message="savingPushMessage"
      :save-push-message="savePushMessage"
      :cancel-push-message-dialog="cancelPushMessageDialog"
      :upload-push-message-image="uploadPushMessageImage"
      :before-push-message-upload="beforePushMessageUpload"
      :insert-image-tag="insertImageTag"
      :clear-push-message-image="clearPushMessageImage"
      @update:visible="handlePushMessageDialogVisibleUpdate"
    />

    <ContentSettingsPushMessageStatsDialog
      :visible="pushMessageStatsVisible"
      :is-mobile="isMobile"
      :current-push-message-stats="currentPushMessageStats"
      :current-push-message-deliveries="currentPushMessageDeliveries"
      :push-message-delivery-loading="pushMessageDeliveryLoading"
      :format-push-delivery-action-label="formatPushDeliveryActionLabel"
      :format-push-delivery-error="formatPushDeliveryError"
      :format-push-delivery-time="formatPushDeliveryTime"
      :get-push-delivery-action-tag-type="getPushDeliveryActionTagType"
      :get-push-delivery-status-tag-type="getPushDeliveryStatusTagType"
      @update:visible="handlePushMessageStatsVisibleUpdate"
    />
  </div>
</template>
<script setup>
import './ContentSettings.css';
import { ElMessage, ElMessageBox } from 'element-plus';
import PageStateAlert from '@/components/PageStateAlert.vue';
import request from '@/utils/request';
import ContentSettingsCarouselDetailDialog from './contentSettingsSections/ContentSettingsCarouselDetailDialog.vue';
import ContentSettingsCarouselFormDialog from './contentSettingsSections/ContentSettingsCarouselFormDialog.vue';
import ContentSettingsCarouselSection from './contentSettingsSections/ContentSettingsCarouselSection.vue';
import ContentSettingsHeader from './contentSettingsSections/ContentSettingsHeader.vue';
import ContentSettingsPushMessageDialog from './contentSettingsSections/ContentSettingsPushMessageDialog.vue';
import ContentSettingsPushMessageStatsDialog from './contentSettingsSections/ContentSettingsPushMessageStatsDialog.vue';
import ContentSettingsPushMessagesSection from './contentSettingsSections/ContentSettingsPushMessagesSection.vue';
import { useContentSettingsPage } from './contentSettingsPageHelpers';

const {
  addCarouselVisible,
  beforeCarouselUpload,
  beforePushMessageUpload,
  cancelAddCarousel,
  cancelEdit,
  cancelPushMessageDialog,
  carouselDetailVisible,
  carouselError,
  carouselList,
  carouselLoading,
  carouselSettings,
  clearPushMessageImage,
  closeCarouselDetail,
  confirmAddCarousel,
  copyToClipboard,
  currentCarousel,
  currentPushMessageDeliveries,
  currentPushMessageStats,
  deleteCarousel,
  deletePushMessage,
  editFromDetail,
  editPushMessage,
  editingPushMessage,
  finishEdit,
  formatPushDeliveryActionLabel,
  formatPushDeliveryError,
  formatPushDeliveryTime,
  getPushDeliveryActionTagType,
  getPushDeliveryStatusTagType,
  hidePushMessageStats,
  insertImageTag,
  isMobile,
  loadAll,
  loadCarouselList,
  loadPushMessages,
  loading,
  newCarousel,
  pageError,
  pushMessageDeliveryLoading,
  pushMessageDialogVisible,
  pushMessageForm,
  pushMessageLoading,
  pushMessageStatsVisible,
  pushMessages,
  saveCarouselSettings,
  savePushMessage,
  saving,
  savingPushMessage,
  showAddCarouselDialog,
  showAddPushMessageDialog,
  showCarouselDetail,
  showPushMessageStats,
  startEdit,
  uploadCarouselImage,
  uploadPushMessageImage,
} = useContentSettingsPage({
  request,
  ElMessage,
  ElMessageBox,
});

function handleCarouselDetailVisibleUpdate(value) {
  if (!value) {
    closeCarouselDetail();
    return;
  }
  carouselDetailVisible.value = value;
}

function handleAddCarouselVisibleUpdate(value) {
  if (!value) {
    cancelAddCarousel();
    return;
  }
  addCarouselVisible.value = value;
}

function handlePushMessageDialogVisibleUpdate(value) {
  if (!value) {
    cancelPushMessageDialog();
    return;
  }
  pushMessageDialogVisible.value = value;
}

function handlePushMessageStatsVisibleUpdate(value) {
  if (!value) {
    hidePushMessageStats();
    return;
  }
  pushMessageStatsVisible.value = value;
}
</script>
