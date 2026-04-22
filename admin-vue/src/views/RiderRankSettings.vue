<template>
  <div class="rider-rank-settings-page">
    <RiderRankSettingsHeader
      :load-settings="loadSettings"
      :loading="loading"
      :save-settings="saveSettings"
      :saving="saving"
    />
    <PageStateAlert :message="loadError" />
    <el-row :gutter="16">
      <el-col :span="16">
        <RiderRankSettingsLevelsSection
          :loading="loading"
          :sorted-levels="sortedLevels"
        />
      </el-col>
      <el-col :span="8">
        <RiderRankSettingsPreviewSection :sorted-levels="sortedLevels" />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import './RiderRankSettings.css';
import PageStateAlert from '@/components/PageStateAlert.vue';
import { useRiderRankSettingsPage } from './riderRankSettingsPageHelpers';
import RiderRankSettingsHeader from './riderRankSettingsSections/RiderRankSettingsHeader.vue';
import RiderRankSettingsLevelsSection from './riderRankSettingsSections/RiderRankSettingsLevelsSection.vue';
import RiderRankSettingsPreviewSection from './riderRankSettingsSections/RiderRankSettingsPreviewSection.vue';

const {
  loadError,
  loading,
  loadSettings,
  saveSettings,
  saving,
  sortedLevels,
} = useRiderRankSettingsPage({
  request,
  ElMessage,
  ElMessageBox,
});
</script>
