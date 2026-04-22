<template>
  <div class="system-logs-page">
    <SystemLogsHeader
      :load-logs="loadLogs"
      :loading="loading"
      :open-clear-dialog="openClearDialog"
    />
    <SystemLogsStatusCard
      :format-probe-type="formatProbeType"
      :format-time="formatTime"
      :get-service-signals="getServiceSignals"
      :overall-status-text="overallStatusText"
      :resolve-service-summary="resolveServiceSummary"
      :service-status="serviceStatus"
      :service-status-text="serviceStatusText"
      :service-tag-type="serviceTagType"
    />
    <SystemLogsSummaryCard :summary="summary" />
    <SystemLogsTableCard
      :action-tag-type="actionTagType"
      :filters="filters"
      :format-time="formatTime"
      :handle-page-size-change="handlePageSizeChange"
      :handle-search="handleSearch"
      :load-error="loadError"
      :load-logs="loadLogs"
      :loading="loading"
      :logs="logs"
      :open-delete-dialog="openDeleteDialog"
      :open-detail="openDetail"
      :pagination="pagination"
      :reset-filters="resetFilters"
      :system-log-action-options="SYSTEM_LOG_ACTION_OPTIONS"
      :system-log-source-options="SYSTEM_LOG_SOURCE_OPTIONS"
    />
    <SystemLogsDetailDialog
      :detail-log="detailLog"
      :format-method-path="formatMethodPath"
      :format-time="formatTime"
      :set-detail-visible="setDetailVisible"
      :visible="detailVisible"
    />
    <SystemLogsDeleteDialog
      :confirm-delete-log="confirmDeleteLog"
      :delete-verify-form="deleteVerifyForm"
      :deleting="deleting"
      :set-delete-dialog-visible="setDeleteDialogVisible"
      :visible="deleteDialogVisible"
    />
    <SystemLogsClearDialog
      :clear-source-label="clearSourceLabel"
      :clear-verify-form="clearVerifyForm"
      :clearing="clearing"
      :confirm-clear-logs="confirmClearLogs"
      :set-clear-dialog-visible="setClearDialogVisible"
      :visible="clearDialogVisible"
    />
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import './SystemLogs.css';
import SystemLogsClearDialog from './systemLogsSections/SystemLogsClearDialog.vue';
import SystemLogsDeleteDialog from './systemLogsSections/SystemLogsDeleteDialog.vue';
import SystemLogsDetailDialog from './systemLogsSections/SystemLogsDetailDialog.vue';
import SystemLogsHeader from './systemLogsSections/SystemLogsHeader.vue';
import SystemLogsStatusCard from './systemLogsSections/SystemLogsStatusCard.vue';
import SystemLogsSummaryCard from './systemLogsSections/SystemLogsSummaryCard.vue';
import SystemLogsTableCard from './systemLogsSections/SystemLogsTableCard.vue';
import { useSystemLogsPage } from './systemLogsHelpers';

const {
  actionTagType,
  clearDialogVisible,
  clearSourceLabel,
  clearVerifyForm,
  clearing,
  confirmClearLogs,
  confirmDeleteLog,
  deleteDialogVisible,
  deleteVerifyForm,
  deleting,
  detailLog,
  detailVisible,
  filters,
  formatMethodPath,
  formatProbeType,
  formatTime,
  getServiceSignals,
  handlePageSizeChange,
  handleSearch,
  loadError,
  loadLogs,
  loading,
  logs,
  openClearDialog,
  openDeleteDialog,
  openDetail,
  overallStatusText,
  pagination,
  resolveServiceSummary,
  resetFilters,
  serviceStatus,
  serviceStatusText,
  serviceTagType,
  summary,
  SYSTEM_LOG_ACTION_OPTIONS,
  SYSTEM_LOG_SOURCE_OPTIONS,
} = useSystemLogsPage({
  request,
  ElMessage,
});

function setDetailVisible(value) {
  detailVisible.value = Boolean(value);
}

function setDeleteDialogVisible(value) {
  deleteDialogVisible.value = Boolean(value);
}

function setClearDialogVisible(value) {
  clearDialogVisible.value = Boolean(value);
}
</script>
