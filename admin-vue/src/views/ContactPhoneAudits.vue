<template>
  <div class="page contact-phone-audits-page">
    <div class="contact-phone-audits-panel">
      <ContactPhoneAuditsHeader
        :load-audits="loadAudits"
        :loading="loading"
      />

      <ContactPhoneAuditsSummaryGrid :summary="summary" />

      <ContactPhoneAuditsFilters
        :filters="filters"
        :handle-search="handleSearch"
        :reset-filters="resetFilters"
      />

      <PageStateAlert :message="loadError" />

      <ContactPhoneAuditsTable
        :format-date-time="formatDateTime"
        :handle-page-size-change="handlePageSizeChange"
        :load-audits="loadAudits"
        :load-error="loadError"
        :loading="loading"
        :open-detail="openDetail"
        :pagination="pagination"
        :records="records"
        :result-label="resultLabel"
        :result-tag-type="resultTagType"
        :role-label="roleLabel"
      />
    </div>

    <ContactPhoneAuditDetailDialog
      v-model:visible="detailVisible"
      :detail-record="detailRecord"
      :format-date-time="formatDateTime"
      :format-metadata="formatMetadata"
      :result-label="resultLabel"
      :role-label="roleLabel"
      @update:visible="handleDetailVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './ContactPhoneAudits.css';
import { ElMessage } from 'element-plus';
import PageStateAlert from '@/components/PageStateAlert.vue';
import request from '@/utils/request';
import { useContactPhoneAuditsPage } from './contactPhoneAuditsPageHelpers';
import ContactPhoneAuditDetailDialog from './contactPhoneAuditsSections/ContactPhoneAuditDetailDialog.vue';
import ContactPhoneAuditsFilters from './contactPhoneAuditsSections/ContactPhoneAuditsFilters.vue';
import ContactPhoneAuditsHeader from './contactPhoneAuditsSections/ContactPhoneAuditsHeader.vue';
import ContactPhoneAuditsSummaryGrid from './contactPhoneAuditsSections/ContactPhoneAuditsSummaryGrid.vue';
import ContactPhoneAuditsTable from './contactPhoneAuditsSections/ContactPhoneAuditsTable.vue';

const {
  detailRecord,
  detailVisible,
  filters,
  formatDateTime,
  formatMetadata,
  handlePageSizeChange,
  handleSearch,
  loadAudits,
  loadError,
  loading,
  openDetail,
  pagination,
  records,
  resetFilters,
  resultLabel,
  resultTagType,
  roleLabel,
  summary,
} = useContactPhoneAuditsPage({
  request,
  ElMessage,
});

function handleDetailVisibleUpdate(value) {
  detailVisible.value = value;
}
</script>
