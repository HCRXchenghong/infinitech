import { onMounted, reactive, ref } from 'vue';
import {
  buildAdminContactPhoneAuditQuery,
  createAdminAuditPaginationState,
  createAdminContactPhoneAuditFilters,
  createAdminContactPhoneAuditSummary,
  extractContactPhoneAuditPage,
  formatAdminCommunicationAuditDateTime,
  formatAdminCommunicationAuditMetadata,
  getAdminCommunicationRoleLabel,
  getAdminContactPhoneAuditResultLabel,
  getAdminContactPhoneAuditResultTagType,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';

export function useContactPhoneAuditsPage({ request, ElMessage }) {
  const loading = ref(false);
  const loadError = ref('');
  const records = ref([]);
  const detailVisible = ref(false);
  const detailRecord = ref(null);

  const filters = reactive(createAdminContactPhoneAuditFilters());
  const pagination = reactive(createAdminAuditPaginationState());
  const summary = reactive(createAdminContactPhoneAuditSummary());

  async function loadAudits() {
    loading.value = true;
    loadError.value = '';
    try {
      const { data } = await request.get('/api/contact-phone-audits', {
        params: buildAdminContactPhoneAuditQuery(filters, pagination),
      });
      const payload = extractContactPhoneAuditPage(data);
      records.value = payload.items;
      Object.assign(summary, createAdminContactPhoneAuditSummary(payload.summary));
      const nextPagination = payload.pagination || {};
      pagination.total = createAdminAuditPaginationState({ total: nextPagination.total }).total;
    } catch (error) {
      records.value = [];
      Object.assign(summary, createAdminContactPhoneAuditSummary());
      pagination.total = 0;
      loadError.value = extractErrorMessage(error, '加载电话联系审计失败');
      ElMessage.error('加载电话联系审计失败');
    } finally {
      loading.value = false;
    }
  }

  function handleSearch() {
    pagination.page = 1;
    void loadAudits();
  }

  function resetFilters() {
    Object.assign(filters, createAdminContactPhoneAuditFilters());
    pagination.page = 1;
    void loadAudits();
  }

  function handlePageSizeChange() {
    pagination.page = 1;
    void loadAudits();
  }

  function openDetail(row) {
    detailRecord.value = row;
    detailVisible.value = true;
  }

  onMounted(() => {
    void loadAudits();
  });

  return {
    detailRecord,
    detailVisible,
    filters,
    formatDateTime: formatAdminCommunicationAuditDateTime,
    formatMetadata: formatAdminCommunicationAuditMetadata,
    handlePageSizeChange,
    handleSearch,
    loadAudits,
    loadError,
    loading,
    openDetail,
    pagination,
    records,
    resetFilters,
    resultLabel: getAdminContactPhoneAuditResultLabel,
    resultTagType: getAdminContactPhoneAuditResultTagType,
    roleLabel: getAdminCommunicationRoleLabel,
    summary,
  };
}
