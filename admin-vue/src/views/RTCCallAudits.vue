<template>
  <div class="page rtc-call-audits-page">
    <div class="panel">
      <RTCCallAuditsHero
        :loading="loading"
        :summary="summary"
        :load-audits="loadAudits"
      />

      <RTCCallAuditsFilters
        :filters="filters"
        :handle-search="handleSearch"
        :reset-filters="resetFilters"
      />

      <RTCCallAuditsTable
        :records="records"
        :loading="loading"
        :load-error="loadError"
        :pagination="pagination"
        :action-loading="actionLoading"
        :row-key="rowKey"
        :format-date-time="formatDateTime"
        :format-duration="formatDuration"
        :role-label="roleLabel"
        :status-label="statusLabel"
        :status-tag-type="statusTagType"
        :complaint-label="complaintLabel"
        :complaint-tag-type="complaintTagType"
        :retention-label="retentionLabel"
        :retention-tag-type="retentionTagType"
        :open-detail="openDetail"
        :mark-complaint="markComplaint"
        :resolve-complaint="resolveComplaint"
        :freeze-retention="freezeRetention"
        :clear-retention="clearRetention"
        :handle-page-size-change="handlePageSizeChange"
        :load-audits="loadAudits"
      />
    </div>

    <RTCCallAuditDetailDialog
      v-model:visible="detailVisible"
      :detail-record="detailRecord"
      :action-loading="actionLoading"
      :call-type-label="callTypeLabel"
      :role-label="roleLabel"
      :status-label="statusLabel"
      :complaint-label="complaintLabel"
      :retention-label="retentionLabel"
      :format-date-time="formatDateTime"
      :format-duration="formatDuration"
      :format-metadata="formatMetadata"
      :mark-complaint="markComplaint"
      :resolve-complaint="resolveComplaint"
      :freeze-retention="freezeRetention"
      :clear-retention="clearRetention"
      @update:visible="handleDetailVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './RTCCallAudits.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import RTCCallAuditDetailDialog from './rtcCallAuditsSections/RTCCallAuditDetailDialog.vue'
import RTCCallAuditsFilters from './rtcCallAuditsSections/RTCCallAuditsFilters.vue'
import RTCCallAuditsHero from './rtcCallAuditsSections/RTCCallAuditsHero.vue'
import RTCCallAuditsTable from './rtcCallAuditsSections/RTCCallAuditsTable.vue'
import { useRTCCallAuditsPage } from './rtcCallAuditsHelpers'

const {
  actionLoading,
  callTypeLabel,
  clearRetention,
  complaintLabel,
  complaintTagType,
  detailRecord,
  detailVisible,
  filters,
  formatDateTime,
  formatDuration,
  formatMetadata,
  freezeRetention,
  handlePageSizeChange,
  handleSearch,
  loadAudits,
  loadError,
  loading,
  markComplaint,
  openDetail,
  pagination,
  records,
  resetFilters,
  resolveComplaint,
  retentionLabel,
  retentionTagType,
  roleLabel,
  rowKey,
  statusLabel,
  statusTagType,
  summary,
} = useRTCCallAuditsPage({
  request,
  ElMessage,
  ElMessageBox,
})

function handleDetailVisibleUpdate(value) {
  detailVisible.value = value
}
</script>
