<template>
  <div class="transaction-logs-page">
    <TransactionLogsToolbar
      :log-filter="logFilter"
      :date-range="dateRange"
      :update-date-range="updateDateRange"
      :logs-loading="logsLoading"
      :handle-filter-change="handleFilterChange"
      :handle-search="handleSearch"
      :reload-logs="reloadLogs"
      :reset-filters="resetFilters"
      :open-clear-dialog="openClearDialog"
    />

    <TransactionLogsTableCard
      :transaction-logs="transactionLogs"
      :logs-loading="logsLoading"
      :load-error="loadError"
      :log-pagination="logPagination"
      :format-user-type="formatUserType"
      :get-type-tag-type="getTypeTagType"
      :format-transaction-type="formatTransactionType"
      :is-income-type="isIncomeType"
      :fen2yuan="fen2yuan"
      :get-financial-transaction-status-tag-type="getFinancialTransactionStatusTagType"
      :format-status="formatStatus"
      :format-date-time="formatDateTime"
      :show-detail="showDetail"
      :open-delete-dialog="openDeleteDialog"
      :handle-page-change="handlePageChange"
      :handle-page-size-change="handlePageSizeChange"
    />

    <TransactionLogsDetailDialog
      :visible="detailVisible"
      :detail-data="detailData"
      :format-user-type="formatUserType"
      :format-transaction-type="formatTransactionType"
      :fen2yuan="fen2yuan"
      :format-status="formatStatus"
      :format-date-time="formatDateTime"
      @update:visible="detailVisible = $event"
    />

    <TransactionLogsDeleteDialog
      :visible="deleteDialogVisible"
      :delete-verify-form="deleteVerifyForm"
      :deleting="deleting"
      :confirm-delete-log="confirmDeleteLog"
      @update:visible="handleDeleteDialogVisibleUpdate"
    />

    <TransactionLogsClearDialog
      :visible="clearDialogVisible"
      :clear-verify-form="clearVerifyForm"
      :clearing="clearing"
      :confirm-clear-logs="confirmClearLogs"
      @update:visible="handleClearDialogVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './TransactionLogs.css';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import TransactionLogsClearDialog from './transactionLogsSections/TransactionLogsClearDialog.vue';
import TransactionLogsDeleteDialog from './transactionLogsSections/TransactionLogsDeleteDialog.vue';
import TransactionLogsDetailDialog from './transactionLogsSections/TransactionLogsDetailDialog.vue';
import TransactionLogsTableCard from './transactionLogsSections/TransactionLogsTableCard.vue';
import TransactionLogsToolbar from './transactionLogsSections/TransactionLogsToolbar.vue';
import { useTransactionLogsPage } from './transactionLogsPageHelpers';

const {
  clearDialogVisible,
  clearVerifyForm,
  clearing,
  confirmClearLogs,
  confirmDeleteLog,
  dateRange,
  deleteDialogVisible,
  deleteVerifyForm,
  deleting,
  detailData,
  detailVisible,
  fen2yuan,
  formatDateTime,
  formatStatus,
  formatTransactionType,
  formatUserType,
  getFinancialTransactionStatusTagType,
  getTypeTagType,
  handleFilterChange,
  handlePageChange,
  handlePageSizeChange,
  handleSearch,
  isIncomeType,
  loadError,
  logFilter,
  logPagination,
  logsLoading,
  openClearDialog,
  openDeleteDialog,
  reloadLogs,
  resetFilters,
  showDetail,
  transactionLogs,
  closeClearDialog,
  closeDeleteDialog,
} = useTransactionLogsPage({
  request,
  ElMessage,
});

function handleDeleteDialogVisibleUpdate(value) {
  if (!value) {
    closeDeleteDialog();
    return;
  }
  deleteDialogVisible.value = value;
}

function handleClearDialogVisibleUpdate(value) {
  if (!value) {
    closeClearDialog();
    return;
  }
  clearDialogVisible.value = value;
}

function updateDateRange(value) {
  dateRange.value = Array.isArray(value) ? value : [];
}
</script>
