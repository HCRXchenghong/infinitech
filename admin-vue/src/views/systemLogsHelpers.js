import { computed, onMounted, reactive, ref } from 'vue';
import {
  buildSystemLogClearPayload,
  buildSystemLogDeletePayload,
  buildSystemLogListQuery,
  createSystemLogFilters,
  createSystemLogPagination,
  createSystemLogVerifyForm,
  extractSystemLogViewState,
  formatSystemLogMethodPath,
  formatSystemLogProbeType,
  formatSystemLogTime,
  getSystemLogActionTagType,
  getSystemLogClearSourceLabel,
  getSystemLogServiceSignals,
  resolveSystemLogServiceSummary,
  serviceHealthOverallStatusLabel as overallStatusText,
  serviceHealthStatusLabel as serviceStatusText,
  serviceHealthStatusTag as serviceTagType,
  SYSTEM_LOG_ACTION_OPTIONS,
  SYSTEM_LOG_SOURCE_OPTIONS,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';

function applySystemLogViewState({ logs, pagination, summary, serviceStatus }, payload = {}) {
  const nextState = extractSystemLogViewState(payload);
  logs.value = nextState.items;
  pagination.total = nextState.total;
  Object.assign(summary, nextState.summary);
  Object.assign(serviceStatus, nextState.serviceStatus);
}

export function useSystemLogsPage({ request, ElMessage }) {
  const loading = ref(false);
  const loadError = ref('');
  const logs = ref([]);
  const detailVisible = ref(false);
  const detailLog = ref(null);
  const deleteDialogVisible = ref(false);
  const deleting = ref(false);
  const pendingDeleteLog = ref(null);
  const clearDialogVisible = ref(false);
  const clearing = ref(false);

  const initialState = extractSystemLogViewState();
  const summary = reactive(initialState.summary);
  const serviceStatus = reactive(initialState.serviceStatus);
  const filters = reactive(createSystemLogFilters());
  const pagination = reactive(createSystemLogPagination());
  const deleteVerifyForm = reactive(createSystemLogVerifyForm());
  const clearVerifyForm = reactive(createSystemLogVerifyForm());

  const clearSourceLabel = computed(() => getSystemLogClearSourceLabel(filters.source));

  const actionTagType = getSystemLogActionTagType;
  const formatProbeType = formatSystemLogProbeType;
  const formatTime = formatSystemLogTime;
  const formatMethodPath = formatSystemLogMethodPath;
  const getServiceSignals = getSystemLogServiceSignals;
  const resolveServiceSummary = resolveSystemLogServiceSummary;

  async function loadLogs() {
    loading.value = true;
    loadError.value = '';

    try {
      const params = buildSystemLogListQuery(filters, pagination);
      const { data } = await request.get('/api/system-logs', { params });
      applySystemLogViewState({ logs, pagination, summary, serviceStatus }, data);
    } catch (error) {
      applySystemLogViewState({ logs, pagination, summary, serviceStatus });
      loadError.value = extractErrorMessage(error, '加载系统日志失败，请稍后重试');
      ElMessage.error(loadError.value);
    } finally {
      loading.value = false;
    }
  }

  function handleSearch() {
    pagination.page = 1;
    void loadLogs();
  }

  function handlePageSizeChange() {
    pagination.page = 1;
    void loadLogs();
  }

  function resetFilters() {
    Object.assign(filters, createSystemLogFilters());
    pagination.page = 1;
    void loadLogs();
  }

  function openDetail(item) {
    detailLog.value = item;
    detailVisible.value = true;
  }

  function openDeleteDialog(item) {
    pendingDeleteLog.value = item;
    Object.assign(deleteVerifyForm, createSystemLogVerifyForm());
    deleteDialogVisible.value = true;
  }

  function openClearDialog() {
    Object.assign(clearVerifyForm, createSystemLogVerifyForm());
    clearDialogVisible.value = true;
  }

  async function confirmDeleteLog() {
    if (!pendingDeleteLog.value) return;
    if (!deleteVerifyForm.verifyAccount || !deleteVerifyForm.verifyPassword) {
      ElMessage.warning('请输入验证账号和密码');
      return;
    }

    deleting.value = true;
    try {
      await request.post(
        '/api/system-logs/delete',
        buildSystemLogDeletePayload(pendingDeleteLog.value, deleteVerifyForm),
      );
      ElMessage.success('日志已删除');
      deleteDialogVisible.value = false;
      pendingDeleteLog.value = null;
      await loadLogs();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '删除日志失败'));
    } finally {
      deleting.value = false;
    }
  }

  async function confirmClearLogs() {
    if (!clearVerifyForm.verifyAccount || !clearVerifyForm.verifyPassword) {
      ElMessage.warning('请输入验证账号和密码');
      return;
    }

    clearing.value = true;
    try {
      await request.post(
        '/api/system-logs/clear',
        buildSystemLogClearPayload(filters.source, clearVerifyForm),
      );
      ElMessage.success('系统日志已清空');
      clearDialogVisible.value = false;
      pagination.page = 1;
      await loadLogs();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '清空日志失败'));
    } finally {
      clearing.value = false;
    }
  }

  onMounted(() => {
    void loadLogs();
  });

  return {
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
  };
}
