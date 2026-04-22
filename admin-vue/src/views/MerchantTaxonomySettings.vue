<template>
  <div class="merchant-taxonomy-settings-page">
    <MerchantTaxonomySettingsHeader
      :load-settings="loadSettings"
      :loading="loading"
      :save-settings="saveSettings"
      :saving="saving"
    />
    <PageStateAlert :message="loadError" />
    <el-row :gutter="16">
      <el-col :span="12">
        <MerchantTaxonomySettingsTypesSection
          :loading="loading"
          :merchant-types="merchantTypes"
        />
      </el-col>
      <el-col :span="12">
        <MerchantTaxonomySettingsCategoriesSection
          :business-categories="businessCategories"
          :loading="loading"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import './MerchantTaxonomySettings.css';
import PageStateAlert from '@/components/PageStateAlert.vue';
import MerchantTaxonomySettingsCategoriesSection from './merchantTaxonomySettingsSections/MerchantTaxonomySettingsCategoriesSection.vue';
import MerchantTaxonomySettingsHeader from './merchantTaxonomySettingsSections/MerchantTaxonomySettingsHeader.vue';
import MerchantTaxonomySettingsTypesSection from './merchantTaxonomySettingsSections/MerchantTaxonomySettingsTypesSection.vue';
import { useMerchantTaxonomySettingsPage } from './merchantTaxonomySettingsPageHelpers';

const {
  businessCategories,
  loadError,
  loading,
  loadSettings,
  merchantTypes,
  saveSettings,
  saving,
} = useMerchantTaxonomySettingsPage({
  request,
  ElMessage,
  ElMessageBox,
});
</script>
