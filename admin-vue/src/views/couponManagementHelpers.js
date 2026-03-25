import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';

export function useCouponManagementPage() {
  const loading = ref(false);
  const loadError = ref('');
  const coupons = ref([]);
  const total = ref(0);

  const filters = reactive({
    source: '',
    status: '',
    keyword: '',
    shopId: '',
    page: 1,
    limit: 20
  });

  const createDialogVisible = ref(false);
  const creating = ref(false);
  const createFormRef = ref();
  const createForm = reactive({
    name: '',
    source: 'customer_service',
    shopId: '',
    type: 'fixed',
    amount: 10,
    maxDiscount: 0,
    conditionType: 'threshold',
    minAmount: 0,
    totalCount: 100,
    budgetCost: 0,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    claimLinkEnabled: false,
    description: ''
  });

  const createRules = {
    name: [{ required: true, message: '请输入券名称', trigger: 'blur' }],
    source: [{ required: true, message: '请选择来源', trigger: 'change' }],
    type: [{ required: true, message: '请选择优惠类型', trigger: 'change' }],
    amount: [{ required: true, message: '请输入优惠金额', trigger: 'change' }],
    validFrom: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
    validUntil: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
  };

  const issueDialogVisible = ref(false);
  const issuing = ref(false);
  const issueFormRef = ref();
  const issueForm = reactive({
    couponId: '',
    phone: ''
  });
  const issueLogDialogVisible = ref(false);
  const issueLogLoading = ref(false);
  const issueLogError = ref('');
  const issueLogs = ref([]);
  const issueLogTotal = ref(0);
  const issueLogCoupon = reactive({
    id: '',
    name: ''
  });
  const issueLogFilters = reactive({
    status: '',
    keyword: '',
    page: 1,
    limit: 20
  });
  const issueRules = {
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
    ]
  };

  onMounted(() => {
    loadCoupons();
  });

  async function loadCoupons() {
    loading.value = true;
    loadError.value = '';
    try {
      const params = {
        source: filters.source || undefined,
        status: filters.status || undefined,
        keyword: filters.keyword || undefined,
        shopId: filters.shopId || undefined,
        page: filters.page,
        limit: filters.limit
      };
      const { data } = await request.get('/api/coupons/admin', { params });
      coupons.value = Array.isArray(data?.items) ? data.items : [];
      total.value = Number(data?.total || 0);
    } catch (error) {
      loadError.value = error?.response?.data?.error || error?.message || '加载优惠券失败，请稍后重试';
      coupons.value = [];
      total.value = 0;
      ElMessage.error(error?.response?.data?.error || '加载优惠券失败');
    } finally {
      loading.value = false;
    }
  }

  function sourceText(source) {
    if (source === 'merchant') return '商户券';
    if (source === 'customer_service') return '客服券';
    if (source === 'port_1788') return '平台';
    return source || '-';
  }

  function sourceTagType(source) {
    if (source === 'merchant') return 'warning';
    if (source === 'customer_service') return 'success';
    if (source === 'port_1788') return 'primary';
    return 'info';
  }

  function couponRuleText(row) {
    const amount = Number(row?.amount || 0);
    const minAmount = Number(row?.minAmount || 0);
    const type = row?.type || 'fixed';
    const noThreshold = row?.conditionType === 'no_threshold' || minAmount <= 0;
    if (type === 'fixed') {
      return noThreshold ? `无门槛减 ¥${amount.toFixed(2)}` : `满 ¥${minAmount.toFixed(2)} 减 ¥${amount.toFixed(2)}`;
    }
    const maxDiscount = Number(row?.maxDiscount || 0);
    return noThreshold
      ? `${(100 - amount).toFixed(0)} 折${maxDiscount > 0 ? `，最高减 ¥${maxDiscount.toFixed(2)}` : ''}`
      : `满 ¥${minAmount.toFixed(2)} ${(100 - amount).toFixed(0)} 折${maxDiscount > 0 ? `，最高减 ¥${maxDiscount.toFixed(2)}` : ''}`;
  }

  function displayTotalCount(totalCount) {
    const value = Number(totalCount || 0);
    return value <= 0 ? '不限' : value;
  }

  function displayRemainingCount(remainingCount) {
    const value = Number(remainingCount);
    if (Number.isNaN(value)) return '-';
    return value < 0 ? '不限' : value;
  }

  function fen2yuan(fen) {
    const value = Number(fen || 0);
    return (value / 100).toFixed(2);
  }

  function formatTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function shortLink(link) {
    const value = String(link || '');
    if (value.length <= 34) return value;
    return `${value.slice(0, 34)}...`;
  }

  function openCreateDialog() {
    resetCreateForm();
    createDialogVisible.value = true;
  }

  function resetCreateForm() {
    createForm.name = '';
    createForm.source = 'customer_service';
    createForm.shopId = '';
    createForm.type = 'fixed';
    createForm.amount = 10;
    createForm.maxDiscount = 0;
    createForm.conditionType = 'threshold';
    createForm.minAmount = 0;
    createForm.totalCount = 100;
    createForm.budgetCost = 0;
    createForm.validFrom = new Date();
    createForm.validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    createForm.claimLinkEnabled = false;
    createForm.description = '';
  }

  async function submitCreate() {
    if (!createFormRef.value) return;
    try {
      await createFormRef.value.validate();
    } catch {
      return;
    }

    if (new Date(createForm.validFrom).getTime() >= new Date(createForm.validUntil).getTime()) {
      ElMessage.warning('结束时间必须晚于开始时间');
      return;
    }
    if (createForm.source === 'merchant' && !String(createForm.shopId || '').trim()) {
      ElMessage.warning('商户券请填写店铺ID');
      return;
    }

    creating.value = true;
    try {
      const payload = {
        name: createForm.name.trim(),
        source: createForm.source,
        shopId: String(createForm.shopId || '').trim(),
        type: createForm.type,
        amount: Number(createForm.amount || 0),
        maxDiscount: createForm.type === 'percent' ? Number(createForm.maxDiscount || 0) : null,
        conditionType: createForm.conditionType,
        minAmount: createForm.conditionType === 'no_threshold' ? 0 : Number(createForm.minAmount || 0),
        totalCount: Number(createForm.totalCount || 0),
        budgetCost: Number(createForm.budgetCost || 0),
        validFrom: new Date(createForm.validFrom).toISOString(),
        validUntil: new Date(createForm.validUntil).toISOString(),
        claimLinkEnabled: Boolean(createForm.claimLinkEnabled),
        description: createForm.description || ''
      };
      const { data } = await request.post('/api/coupons/admin', payload);
      const claimUrl = data?.data?.claimUrl || data?.data?.coupon?.claimUrl || '';
      createDialogVisible.value = false;
      ElMessage.success(claimUrl ? '创建成功，已生成链接' : '创建成功');
      if (claimUrl) {
        await copyLink(claimUrl, true);
      }
      await loadCoupons();
    } catch (error) {
      ElMessage.error(error?.response?.data?.error || '创建失败');
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
      ElMessage.error(error?.response?.data?.error || '更新状态失败');
    }
  }

  async function removeCoupon(row) {
    try {
      await ElMessageBox.confirm(`确认删除“${row.name || '该优惠券'}”？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      });
      await request.delete(`/api/coupons/${row.id}`);
      ElMessage.success('删除成功');
      await loadCoupons();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.response?.data?.error || '删除失败');
      }
    }
  }

  function openIssueDialog(row) {
    issueForm.couponId = String(row.id || '');
    issueForm.phone = '';
    issueDialogVisible.value = true;
  }

  function openIssueLogDialog(row) {
    issueLogCoupon.id = String(row?.id || '');
    issueLogCoupon.name = String(row?.name || '');
    issueLogFilters.status = '';
    issueLogFilters.keyword = '';
    issueLogFilters.page = 1;
    issueLogFilters.limit = 20;
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
      const params = {
        status: issueLogFilters.status || undefined,
        keyword: issueLogFilters.keyword || undefined,
        page: issueLogFilters.page,
        limit: issueLogFilters.limit
      };
      const { data } = await request.get(`/api/coupons/admin/${issueLogCoupon.id}/issue-logs`, { params });
      issueLogs.value = Array.isArray(data?.items) ? data.items : [];
      issueLogTotal.value = Number(data?.total || 0);
    } catch (error) {
      issueLogs.value = [];
      issueLogTotal.value = 0;
      issueLogError.value = error?.response?.data?.error || error?.message || '加载发送记录失败，请稍后重试';
      ElMessage.error(error?.response?.data?.error || '加载发送记录失败');
    } finally {
      issueLogLoading.value = false;
    }
  }

  function issueChannelText(channel) {
    const value = String(channel || '');
    if (value === 'support_chat') return '客服会话';
    if (value === 'monitor_chat') return '监控会话';
    if (value === 'admin_panel') return '管理后台';
    return value || '-';
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
      await request.post(`/api/coupons/admin/${issueForm.couponId}/issue`, {
        phone: issueForm.phone.trim(),
        channel: 'admin_panel'
      });
      issueDialogVisible.value = false;
      ElMessage.success('发券成功');
      await loadCoupons();
      if (issueLogDialogVisible.value && issueLogCoupon.id === issueForm.couponId) {
        loadIssueLogs();
      }
    } catch (error) {
      ElMessage.error(error?.response?.data?.error || '发券失败');
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
    } catch (error) {
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
    sourceText,
    sourceTagType,
    couponRuleText,
    displayTotalCount,
    displayRemainingCount,
    fen2yuan,
    formatTime,
    shortLink,
    openCreateDialog,
    submitCreate,
    toggleStatus,
    removeCoupon,
    openIssueDialog,
    openIssueLogDialog,
    loadIssueLogs,
    issueChannelText,
    submitIssue,
    copyLink,
    onPageSizeChange,
    onCurrentPageChange,
    onIssueLogPageSizeChange,
    onIssueLogPageChange
  };
}
