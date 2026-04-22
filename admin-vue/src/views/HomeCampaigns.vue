<template>
  <div class="page home-campaigns-page">
    <HomeCampaignsListPanel
      :loading="loading"
      :page-error="pageError"
      :filters="filters"
      :campaigns="campaigns"
      :load-all="loadAll"
      :open-dialog="openDialog"
      :handle-filter-query="handleFilterQuery"
      :object-type-tag-type="objectTypeTagType"
      :object-type-label="objectTypeLabel"
      :status-tag-type="statusTagType"
      :format-status="formatStatus"
      :lock-tag-type="lockTagType"
      :lock-label="lockLabel"
      :can-action="canAction"
      :change-status="changeStatus"
    />

    <HomeCampaignsPreviewPanel
      :slot-products="slotProducts"
      :slot-shops="slotShops"
      :position-source-tag-type="positionSourceTagType"
      :format-position-source="formatPositionSource"
      :promote-label="promoteLabel"
    />

    <HomeCampaignsDialog
      v-model:visible="dialogVisible"
      :dialog-title="dialogTitle"
      :form="form"
      :target-options="targetOptions"
      :submitting="submitting"
      :handle-object-type-change="handleObjectTypeChange"
      :submit-form="submitForm"
    />
  </div>
</template>

<script setup>
import './HomeCampaigns.css'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import HomeCampaignsDialog from './homeCampaignSections/HomeCampaignsDialog.vue'
import HomeCampaignsListPanel from './homeCampaignSections/HomeCampaignsListPanel.vue'
import HomeCampaignsPreviewPanel from './homeCampaignSections/HomeCampaignsPreviewPanel.vue'
import { useHomeCampaignsPage } from './homeCampaignsPageHelpers'

const {
  campaigns,
  canAction,
  changeStatus,
  dialogTitle,
  dialogVisible,
  filters,
  form,
  formatPositionSource,
  formatStatus,
  handleFilterQuery,
  handleObjectTypeChange,
  loadAll,
  loading,
  lockLabel,
  lockTagType,
  objectTypeLabel,
  objectTypeTagType,
  openDialog,
  pageError,
  positionSourceTagType,
  promoteLabel,
  slotProducts,
  slotShops,
  statusTagType,
  submitForm,
  submitting,
  targetOptions,
} = useHomeCampaignsPage({
  request,
  ElMessage,
})
</script>
