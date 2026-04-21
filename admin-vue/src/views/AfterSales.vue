<template>
  <div class="after-sales-page">
    <AfterSalesToolbar
      :search-keyword="searchKeyword"
      :status-filter="statusFilter"
      :status-options="statusOptions"
      :clearing="clearing"
      :handle-search="handleSearch"
      :handle-reset="handleReset"
      :open-clear-selector="openClearSelector"
      @update:search-keyword="handleSearchKeywordUpdate"
      @update:status-filter="handleStatusFilterUpdate"
    />

    <AfterSalesTableSection
      :loading="loading"
      :load-error="loadError"
      :records="records"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :fen2yuan="fen2yuan"
      :format-date-time="formatDateTime"
      :status-tag-type="statusTagType"
      :open-detail="openDetail"
      :open-process="openProcess"
      :fetch-records="fetchRecords"
      :handle-size-change="handleSizeChange"
      @update:page="handlePageUpdate"
      @update:page-size="handlePageSizeUpdate"
    />

    <AfterSalesDetailDialog
      v-model:visible="detailVisible"
      :detail-record="detailRecord"
      :fen2yuan="fen2yuan"
      :format-date-time="formatDateTime"
      :status-tag-type="statusTagType"
    />

    <AfterSalesProcessDialog
      v-model:visible="processVisible"
      :process-form="processForm"
      :status-options="statusOptions"
      :submitting="submitting"
      :fen2yuan="fen2yuan"
      :submit-process="submitProcess"
    />
  </div>
</template>

<script setup>
import './AfterSales.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { getStoredAdminUser } from '@/utils/runtime'
import AfterSalesDetailDialog from './afterSalesSections/AfterSalesDetailDialog.vue'
import AfterSalesProcessDialog from './afterSalesSections/AfterSalesProcessDialog.vue'
import AfterSalesTableSection from './afterSalesSections/AfterSalesTableSection.vue'
import AfterSalesToolbar from './afterSalesSections/AfterSalesToolbar.vue'
import {
  fen2yuan,
  formatDateTime,
  statusOptions,
  statusTagType,
  useAfterSalesPage,
} from './afterSalesHelpers'

const {
  clearing,
  detailRecord,
  detailVisible,
  fetchRecords,
  handleReset,
  handleSearch,
  handleSizeChange,
  loadError,
  loading,
  openClearSelector,
  openDetail,
  openProcess,
  page,
  pageSize,
  processForm,
  processVisible,
  records,
  searchKeyword,
  statusFilter,
  submitProcess,
  submitting,
  total,
} = useAfterSalesPage({
  request,
  ElMessage,
  ElMessageBox,
  getStoredAdminUser,
})

function handleSearchKeywordUpdate(value) {
  searchKeyword.value = value || ''
}

function handleStatusFilterUpdate(value) {
  statusFilter.value = value || ''
}

function handlePageUpdate(value) {
  page.value = Number(value || 1)
}

function handlePageSizeUpdate(value) {
  pageSize.value = Number(value || 20)
}
</script>
