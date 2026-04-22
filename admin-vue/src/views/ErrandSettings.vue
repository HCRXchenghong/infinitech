<template>
  <div class="errand-settings-page">
    <ErrandSettingsHeader
      :load-settings="loadSettings"
      :loading="loading"
      :save-settings="saveSettings"
      :saving="saving"
    />
    <PageStateAlert :message="loadError" />
    <el-row :gutter="16">
      <el-col :span="14">
        <ErrandSettingsContentSection
          :form="form"
          :loading="loading"
          :sorted-services="sortedServices"
        />
      </el-col>
      <el-col :span="10">
        <ErrandSettingsPreviewSection :preview="preview" />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import './ErrandSettings.css';
import PageStateAlert from '@/components/PageStateAlert.vue';
import ErrandSettingsContentSection from './errandSettingsSections/ErrandSettingsContentSection.vue';
import ErrandSettingsHeader from './errandSettingsSections/ErrandSettingsHeader.vue';
import ErrandSettingsPreviewSection from './errandSettingsSections/ErrandSettingsPreviewSection.vue';
import { useErrandSettingsPage } from './errandSettingsPageHelpers';

const {
  form,
  loadError,
  loading,
  loadSettings,
  preview,
  saveSettings,
  saving,
  sortedServices,
} = useErrandSettingsPage({
  request,
  ElMessage,
  ElMessageBox,
});
</script>
