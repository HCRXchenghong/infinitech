import { onMounted, reactive, ref } from 'vue';
import {
  extractFinancialTransactionLogPage,
  formatFinancialAmountYuan as fen2yuan,
  formatFinancialTransactionStatus as formatStatus,
  formatFinancialTransactionType as formatTransactionType,
  formatFinancialTransactionUserType as formatUserType,
  getFinancialTransactionStatusTagType,
  getFinancialTransactionTypeTagType as getTypeTagType,
  isFinancialTransactionIncomeType as isIncomeType,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';

function createLogFilterState() {
  return {
    type: '',
    userType: '',
    status: '',
    userId: '',
  };
}

function createVerifyFormState() {
  return {
    verifyAccount: '',
    verifyPassword: '',
  };
}

function resetVerifyForm(form) {
  Object.assign(form, createVerifyFormState());
}

function buildTransactionLogParams(logPagination, logFilter, dateRange) {
  const params = {
    page: logPagination.page,
    limit: logPagination.limit,
  };

  if (logFilter.type) params.type = logFilter.type;
  if (logFilter.userType) params.userType = logFilter.userType;
  if (logFilter.status) params.status = logFilter.status;
  if (logFilter.userId) params.userId = logFilter.userId;
  if (Array.isArray(dateRange) && dateRange.length === 2) {
    params.startDate = dateRange[0];
    params.endDate = dateRange[1];
  }

  return params;
}

function formatDateTime(value) {
  return value ? String(value).slice(0, 19).replace('T', ' ') : '-';
}

export function useTransactionLogsPage({ request, ElMessage }) {
  const transactionLogs = ref([]);
  const logsLoading = ref(false);
  const loadError = ref('');
  const logFilter = reactive(createLogFilterState());
  const logPagination = reactive({ page: 1, limit: 50, total: 0 });
  const dateRange = ref([]);

  const detailVisible = ref(false);
  const detailData = ref({});
  const pendingDeleteLog = ref(null);
  const deleteDialogVisible = ref(false);
  const clearDialogVisible = ref(false);
  const deleting = ref(false);
  const clearing = ref(false);
  const deleteVerifyForm = reactive(createVerifyFormState());
  const clearVerifyForm = reactive(createVerifyFormState());

  async function loadTransactionLogs() {
    logsLoading.value = true;
    loadError.value = '';
    try {
      const params = buildTransactionLogParams(
        logPagination,
        logFilter,
        Array.isArray(dateRange.value) ? dateRange.value : [],
      );
      const res = await request.get('/api/financial/transaction-logs', { params });
      const page = extractFinancialTransactionLogPage(res.data);
      transactionLogs.value = page.items;
      logPagination.total = page.total;
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载财务日志失败，请稍后重试');
      ElMessage.error(loadError.value);
      transactionLogs.value = [];
      logPagination.total = 0;
    } finally {
      logsLoading.value = false;
    }
  }

  function reloadLogs() {
    loadTransactionLogs();
  }

  function handleFilterChange() {
    logPagination.page = 1;
    loadTransactionLogs();
  }

  function handleSearch() {
    logPagination.page = 1;
    loadTransactionLogs();
  }

  function handlePageChange(page) {
    logPagination.page = page;
    loadTransactionLogs();
  }

  function handlePageSizeChange(limit) {
    logPagination.limit = limit;
    logPagination.page = 1;
    loadTransactionLogs();
  }

  function resetFilters() {
    Object.assign(logFilter, createLogFilterState());
    dateRange.value = [];
    logPagination.page = 1;
    loadTransactionLogs();
  }

  function showDetail(row) {
    detailData.value = row;
    detailVisible.value = true;
  }

  function closeDeleteDialog() {
    deleteDialogVisible.value = false;
    pendingDeleteLog.value = null;
    resetVerifyForm(deleteVerifyForm);
  }

  function openDeleteDialog(row) {
    pendingDeleteLog.value = row;
    resetVerifyForm(deleteVerifyForm);
    deleteDialogVisible.value = true;
  }

  function closeClearDialog() {
    clearDialogVisible.value = false;
    resetVerifyForm(clearVerifyForm);
  }

  function openClearDialog() {
    resetVerifyForm(clearVerifyForm);
    clearDialogVisible.value = true;
  }

  async function confirmDeleteLog() {
    const recordId = String(pendingDeleteLog.value?.recordId || pendingDeleteLog.value?.id || '').trim();
    if (!recordId) {
      ElMessage.warning('未找到可删除的日志');
      return;
    }
    if (!deleteVerifyForm.verifyAccount || !deleteVerifyForm.verifyPassword) {
      ElMessage.warning('请输入验证账号和密码');
      return;
    }

    deleting.value = true;
    try {
      await request.post('/api/financial/transaction-logs/delete', {
        id: recordId,
        recordId,
        sourceType: pendingDeleteLog.value?.sourceType || 'wallet_transaction',
        verifyAccount: deleteVerifyForm.verifyAccount,
        verifyPassword: deleteVerifyForm.verifyPassword,
      });
      ElMessage.success('财务日志已删除');
      closeDeleteDialog();
      await loadTransactionLogs();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '删除财务日志失败'));
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
      await request.post('/api/financial/transaction-logs/clear', {
        verifyAccount: clearVerifyForm.verifyAccount,
        verifyPassword: clearVerifyForm.verifyPassword,
      });
      ElMessage.success('财务日志已清空');
      closeClearDialog();
      logPagination.page = 1;
      await loadTransactionLogs();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '清空财务日志失败'));
    } finally {
      clearing.value = false;
    }
  }

  onMounted(loadTransactionLogs);

  return {
    clearDialogVisible,
    clearVerifyForm,
    clearing,
    closeClearDialog,
    closeDeleteDialog,
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
  };
}
