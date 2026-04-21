import { onMounted, reactive, ref } from 'vue';
import {
  buildAdminRTCCallAuditQuery,
  createAdminAuditPaginationState,
  createAdminRTCCallAuditFilters,
  createAdminRTCCallAuditSummary,
  createAdminRTCCallReviewAction,
  extractRTCCallAuditPage,
  extractRTCCallAuditRecord,
  formatAdminCommunicationAuditDateTime,
  formatAdminCommunicationAuditMetadata,
  formatAdminRTCCallDuration,
  getAdminCommunicationRoleLabel,
  getAdminRTCCallAuditRowKey,
  getAdminRTCCallComplaintLabel,
  getAdminRTCCallComplaintTagType,
  getAdminRTCCallRetentionLabel,
  getAdminRTCCallRetentionTagType,
  getAdminRTCCallStatusLabel,
  getAdminRTCCallStatusTagType,
  getAdminRTCCallTypeLabel,
  mergeAdminRTCCallAuditDetail,
  mergeAdminRTCCallAuditRecords,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';

export function useRTCCallAuditsPage({ request, ElMessage, ElMessageBox }) {
  const loading = ref(false);
  const loadError = ref('');
  const records = ref([]);
  const detailVisible = ref(false);
  const detailRecord = ref(null);
  const actionLoading = reactive({});

  const filters = reactive(createAdminRTCCallAuditFilters());
  const pagination = reactive(createAdminAuditPaginationState());
  const summary = reactive(createAdminRTCCallAuditSummary());

  async function loadAudits() {
    loading.value = true;
    loadError.value = '';

    try {
      const { data } = await request.get('/api/rtc-call-audits', {
        params: buildAdminRTCCallAuditQuery(filters, pagination),
      });
      const payload = extractRTCCallAuditPage(data);
      records.value = payload.items;
      Object.assign(summary, createAdminRTCCallAuditSummary(payload.summary));
      const nextPagination = payload.pagination || {};
      pagination.total = createAdminAuditPaginationState({ total: nextPagination.total }).total;
    } catch (error) {
      records.value = [];
      Object.assign(summary, createAdminRTCCallAuditSummary());
      pagination.total = 0;
      loadError.value = extractErrorMessage(error, '加载 RTC 通话审计失败');
      ElMessage.error('加载 RTC 通话审计失败');
    } finally {
      loading.value = false;
    }
  }

  function handleSearch() {
    pagination.page = 1;
    void loadAudits();
  }

  function resetFilters() {
    Object.assign(filters, createAdminRTCCallAuditFilters());
    pagination.page = 1;
    void loadAudits();
  }

  function handlePageSizeChange() {
    pagination.page = 1;
    void loadAudits();
  }

  function openDetail(row) {
    detailRecord.value = { ...row };
    detailVisible.value = true;
  }

  function syncRecord(updated) {
    const key = getAdminRTCCallAuditRowKey(updated);
    if (!key) return;
    records.value = mergeAdminRTCCallAuditRecords(records.value, updated);
    detailRecord.value = mergeAdminRTCCallAuditDetail(detailRecord.value, updated);
  }

  async function submitReview(row, kind) {
    const action = createAdminRTCCallReviewAction(kind);
    if (!action) {
      ElMessage.error('不支持的 RTC 审计操作');
      return;
    }

    const key = getAdminRTCCallAuditRowKey(row);
    if (!key) {
      ElMessage.error('缺少 RTC 通话标识');
      return;
    }

    if (action.confirmMessage) {
      await ElMessageBox.confirm(action.confirmMessage, '确认操作', {
        type: 'warning',
        confirmButtonText: '继续',
        cancelButtonText: '取消',
      });
    }

    actionLoading[key] = true;
    try {
      const { data } = await request.post(
        `/api/rtc-call-audits/${encodeURIComponent(key)}/review`,
        action.payload,
      );
      const updated = extractRTCCallAuditRecord(data);
      syncRecord(updated);
      ElMessage.success(action.successMessage);
      await loadAudits();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '更新 RTC 审计失败'));
      }
    } finally {
      actionLoading[key] = false;
    }
  }

  function markComplaint(row) {
    return submitReview(row, 'markComplaint');
  }

  function resolveComplaint(row) {
    return submitReview(row, 'resolveComplaint');
  }

  function freezeRetention(row) {
    return submitReview(row, 'freezeRetention');
  }

  function clearRetention(row) {
    return submitReview(row, 'clearRetention');
  }

  onMounted(() => {
    void loadAudits();
  });

  return {
    actionLoading,
    callTypeLabel: getAdminRTCCallTypeLabel,
    clearRetention,
    complaintLabel: getAdminRTCCallComplaintLabel,
    complaintTagType: getAdminRTCCallComplaintTagType,
    detailRecord,
    detailVisible,
    filters,
    formatDateTime: formatAdminCommunicationAuditDateTime,
    formatDuration: formatAdminRTCCallDuration,
    formatMetadata: formatAdminCommunicationAuditMetadata,
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
    retentionLabel: getAdminRTCCallRetentionLabel,
    retentionTagType: getAdminRTCCallRetentionTagType,
    roleLabel: getAdminCommunicationRoleLabel,
    rowKey: getAdminRTCCallAuditRowKey,
    statusLabel: getAdminRTCCallStatusLabel,
    statusTagType: getAdminRTCCallStatusTagType,
    summary,
  };
}
