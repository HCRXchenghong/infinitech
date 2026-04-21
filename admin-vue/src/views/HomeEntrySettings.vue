<template>
  <div class="home-entry-settings-page">
    <HomeEntrySettingsHeader
      :add-entry="addEntry"
      :load-settings="loadSettings"
      :loading="loading"
      :preview-client="previewClient"
      :save-settings="saveSettings"
      :saving="saving"
      :update-preview-client="updatePreviewClient"
    />

    <PageStateAlert :message="pageError" />

    <div class="home-entry-settings-grid">
      <HomeEntrySettingsEditorPanel
        :entries="form.entries"
        :loading="loading"
        :move-entry="moveEntry"
        :remove-entry="removeEntry"
        :route-placeholder="routePlaceholder"
      />
      <HomeEntrySettingsPreviewPanel
        :preview-client="previewClient"
        :preview-entries="previewEntries"
        :show-image-icon="showImageIcon"
      />
    </div>
  </div>
</template>

<script setup>
import './HomeEntrySettings.css';
import { ElMessage, ElMessageBox } from 'element-plus';
import PageStateAlert from '@/components/PageStateAlert.vue';
import request from '@/utils/request';
import { useHomeEntrySettingsPage } from './homeEntrySettingsPageHelpers';
import HomeEntrySettingsEditorPanel from './homeEntrySettingsSections/HomeEntrySettingsEditorPanel.vue';
import HomeEntrySettingsHeader from './homeEntrySettingsSections/HomeEntrySettingsHeader.vue';
import HomeEntrySettingsPreviewPanel from './homeEntrySettingsSections/HomeEntrySettingsPreviewPanel.vue';

const {
  addEntry,
  form,
  loadSettings,
  loading,
  moveEntry,
  pageError,
  previewClient,
  previewEntries,
  removeEntry,
  routePlaceholder,
  saveSettings,
  saving,
  showImageIcon,
  updatePreviewClient,
} = useHomeEntrySettingsPage({
  request,
  ElMessage,
  ElMessageBox,
});
</script>
