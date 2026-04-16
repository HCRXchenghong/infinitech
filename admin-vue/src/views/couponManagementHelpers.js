import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  buildCouponAdminListParams,
  buildCouponCreatePayload,
  buildCouponIssueLogListParams,
  buildCouponIssuePayload,
  createCouponCreateForm,
  createCouponCreateRules,
  createCouponIssueForm,
  createCouponIssueLogFilters,
  createCouponIssueRules,
  createCouponManagementFilters,
  displayCouponRemainingCount,
  displayCouponTotalCount,
  formatCouponDateTime,
  formatCouponFenAmount,
  formatCouponManagementRuleText,
  getCouponIssueChannelLabel,
  getCouponSourceLabel,
  getCouponSourceTagType,
  shortenCouponLink,
  validateCouponCreateDraft,
} from '@infinitech/admin-core';
import {
  extractEnvelopeData,
  extractErrorMessage,
  extractPaginatedItems,
} from '@infinitech/contracts';
import request from '@/utils/request';

export function useCouponManagementPage() {
  const loading = ref(false);
  const loadError = ref('');
  const coupons = ref([]);
  const total = ref(0);

  const filters = reactive(createCouponManagementFilters());

  const createDialogVisible = ref(false);
  const creating = ref(false);
  const createFormRef = ref();
  const createForm = reactive(createCouponCreateForm());
  const createRules = createCouponCreateRules();

  const issueDialogVisible = ref(false);
  const issuing = ref(false);
  const issueFormRef = ref();
  const issueForm = reactive(createCouponIssueForm());
  const issueRules = createCouponIssueRules();

  const issueLogDialogVisible = ref(false);
  const issueLogLoading = ref(false);
  const issueLogError = ref('');
  const issueLogs = ref([]);
  const issueLogTotal = ref(0);
  const issueLogCoupon = reactive({
    id: '',
    name: '',
  });
  const issueLogFilters = reactive(createCouponIssueLogFilters());

  onMounted(() => {
    loadCoupons();
  });

  async function loadCoupons() {
    loading.value = true;
    loadError.value = '';
    try {
      const { data } = await request.get('/api/coupons/admin', {
        params: buildCouponAdminListParams(filters),
      });
      const page = extractPaginatedItems(data);
      coupons.value = page.items;
      total.value = Number(page.total || 0);
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载优惠券失败，请稍后重试');
      coupons.value = [];
      total.value = 0;
      ElMessage.error(extractErrorMessage(error, '加载优惠券失败'));
    } finally {
      loading.value = false;
    }
  }

  function resetCreateForm() {
    Object.assign(createForm, createCouponCreateForm());
  }

  function openCreateDialog() {
    resetCreateForm();
    createDialogVisible.value = true;
  }

  async function submitCreate() {
    if (!createFormRef.value) return;
    try {
      await createFormRef.value.validate();
    } catch {
      return;
    }

    const validation = validateCouponCreateDraft(createForm);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    creating.value = true;
    try {
      const { data } = await request.post(
        '/api/coupons/admin',
        buildCouponCreatePayload(createForm),
      );
      const created = extractEnvelopeData(data) || {};
      const claimUrl = String(created.claimUrl || created.coupon?.claimUrl || '').trim();
      createDialogVisible.value = false;
      ElMessage.success(claimUrl ? '创建成功，已生成链接' : '创建成功');
      if (claimUrl) {
        await copyLink(claimUrl, true);
      }
      await loadCoupons();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '创建失败'));
    } finally {
      creating.value = false;
    }
  }

  async function toggleStatus(row) {
    const target = row.status === 'active' ? 'inactive' : 'active';
    try {
      await request.put(`/api/coupons/${row.id}`, { status: target });
      ElMessage.success(target === 'active' ? '已上架' : '已下架');
      await loadCoupons();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '更新状态失败'));
    }
  }

  async function removeCoupon(row) {
    try {
      await ElMessageBox.confirm(`确认删除“${row.name || '该优惠券'}”？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });
      await request.delete(`/api/coupons/${row.id}`);
      ElMessage.success('删除成功');
      await loadCoupons();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除失败'));
      }
    }
  }

  function openIssueDialog(row) {
    Object.assign(issueForm, createCouponIssueForm({
      couponId: String(row.id || ''),
    }));
    issueDialogVisible.value = true;
  }

  function openIssueLogDialog(row) {
    issueLogCoupon.id = String(row?.id || '');
    issueLogCoupon.name = String(row?.name || '');
    Object.assign(issueLogFilters, createCouponIssueLogFilters());
    issueLogDialogVisible.value = true;
    loadIssueLogs();
  }

  async function loadIssueLogs() {
    if (!issueLogCoupon.id) {
      issueLogs.value = [];
      issueLogTotal.value = 0;
      return;
    }

    issueLogLoading.value = true;
    issueLogError.value = '';
    try {
      const { data } = await request.get(
        `/api/coupons/admin/${issueLogCoupon.id}/issue-logs`,
        {
          params: buildCouponIssueLogListParams(issueLogFilters),
        },
      );
      const page = extractPaginatedItems(data);
      issueLogs.value = page.items;
      issueLogTotal.value = Number(page.total || 0);
    } catch (error) {
      issueLogs.value = [];
      issueLogTotal.value = 0;
      issueLogError.value = extractErrorMessage(error, '加载发送记录失败，请稍后重试');
      ElMessage.error(extractErrorMessage(error, '加载发送记录失败'));
    } finally {
      issueLogLoading.value = false;
    }
  }

  async function submitIssue() {
    if (!issueFormRef.value || !issueForm.couponId) return;
    try {
      await issueFormRef.value.validate();
    } catch {
      return;
    }

    issuing.value = true;
    try {
      await request.post(
        `/api/coupons/admin/${issueForm.couponId}/issue`,
        buildCouponIssuePayload(issueForm.phone),
      );
      issueDialogVisible.value = false;
      ElMessage.success('发券成功');
      await loadCoupons();
      if (issueLogDialogVisible.value && issueLogCoupon.id === issueForm.couponId) {
        loadIssueLogs();
      }
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '发券失败'));
    } finally {
      issuing.value = false;
    }
  }

  async function copyLink(link, silent = false) {
    const text = String(link || '');
    if (!text) {
      if (!silent) ElMessage.warning('链接为空');
      return false;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (!silent) ElMessage.success('链接已复制');
      return true;
    } catch (_error) {
      if (!silent) ElMessage.error('复制失败');
      return false;
    }
  }

  function onPageSizeChange(size) {
    filters.limit = size;
    filters.page = 1;
    loadCoupons();
  }

  function onCurrentPageChange(page) {
    filters.page = page;
    loadCoupons();
  }

  function onIssueLogPageSizeChange(size) {
    issueLogFilters.limit = size;
    issueLogFilters.page = 1;
    loadIssueLogs();
  }

  function onIssueLogPageChange(page) {
    issueLogFilters.page = page;
    loadIssueLogs();
  }

  return {
    loading,
    loadError,
    coupons,
    total,
    filters,
    createDialogVisible,
    creating,
    createFormRef,
    createForm,
    createRules,
    issueDialogVisible,
    issuing,
    issueFormRef,
    issueForm,
    issueLogDialogVisible,
    issueLogLoading,
    issueLogError,
    issueLogs,
    issueLogTotal,
    issueLogCoupon,
    issueLogFilters,
    issueRules,
    loadCoupons,
    sourceText: getCouponSourceLabel,
    sourceTagType: getCouponSourceTagType,
    couponRuleText: formatCouponManagementRuleText,
    displayTotalCount: displayCouponTotalCount,
    displayRemainingCount: displayCouponRemainingCount,
    fen2yuan: formatCouponFenAmount,
    formatTime: formatCouponDateTime,
    shortLink: shortenCouponLink,
    openCreateDialog,
    submitCreate,
    toggleStatus,
    removeCoupon,
    openIssueDialog,
    openIssueLogDialog,
    loadIssueLogs,
    issueChannelText: getCouponIssueChannelLabel,
    submitIssue,
    copyLink,
    onPageSizeChange,
    onCurrentPageChange,
    onIssueLogPageSizeChange,
    onIssueLogPageChange,
  };
}
