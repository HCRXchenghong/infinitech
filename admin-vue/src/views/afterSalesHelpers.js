import { onMounted, ref } from 'vue'
import { extractAfterSalesPage } from '@infinitech/admin-core'
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts'

export const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已完成', value: 'completed' },
]

function createEmptyProcessForm() {
  return {
    id: null,
    requestNo: '',
    status: 'pending',
    adminRemark: '',
    shouldRefund: false,
    requestedRefundAmount: 0,
    refundAmountYuan: '',
    refundReason: '',
    refundTransactionId: '',
  }
}

function normalizeRecord(raw) {
  return {
    id: raw.id,
    requestNo: raw.requestNo || raw.request_no || '',
    orderNo: raw.orderNo || raw.order_no || '',
    userId: raw.userId || raw.user_id || '',
    contactPhone: raw.contactPhone || raw.contact_phone || '',
    type: raw.type || '',
    typeText: raw.typeText || raw.type || '',
    status: raw.status || 'pending',
    statusText: raw.statusText || raw.status || '待处理',
    problemDesc: raw.problemDesc || raw.problem_desc || '',
    selectedProducts: Array.isArray(raw.selectedProducts)
      ? raw.selectedProducts
      : Array.isArray(raw.selected_products)
        ? raw.selected_products
        : [],
    evidenceImages: Array.isArray(raw.evidenceImages)
      ? raw.evidenceImages
      : Array.isArray(raw.evidence_images)
        ? raw.evidence_images
        : [],
    adminRemark: raw.adminRemark || raw.admin_remark || '',
    requestedRefundAmount: Number(raw.requestedRefundAmount ?? raw.requested_refund_amount ?? 0) || 0,
    shouldRefund: toBoolean(raw.shouldRefund ?? raw.should_refund ?? false),
    refundAmount: Number(raw.refundAmount ?? raw.refund_amount ?? 0) || 0,
    refundReason: raw.refundReason || raw.refund_reason || '',
    refundTransactionId: raw.refundTransactionId || raw.refund_transaction_id || '',
    refundedAt: raw.refundedAt || raw.refunded_at || '',
    created_at: raw.created_at || raw.createdAt || '',
    createdAt: raw.createdAt || raw.created_at || '',
    updated_at: raw.updated_at || raw.updatedAt || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
  }
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = String(value || '').trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(text)) return true
  if (['0', 'false', 'no', 'n', ''].includes(text)) return false
  return Boolean(value)
}

export function fen2yuan(fen) {
  return (Math.abs(Number(fen || 0)) / 100).toFixed(2)
}

function yuanToFen(yuan) {
  const text = String(yuan || '').trim()
  if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) return 0
  return Math.round(Number(text) * 100)
}

export function statusTagType(status) {
  if (status === 'pending') return 'info'
  if (status === 'processing') return 'warning'
  if (status === 'approved') return 'success'
  if (status === 'completed') return 'success'
  if (status === 'rejected') return 'danger'
  return ''
}

export function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export function useAfterSalesPage({ request, ElMessage, ElMessageBox, getStoredAdminUser }) {
  const loading = ref(false)
  const loadError = ref('')
  const submitting = ref(false)
  const clearing = ref(false)
  const records = ref([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const searchKeyword = ref('')
  const statusFilter = ref('')

  const detailVisible = ref(false)
  const detailRecord = ref(null)
  const processVisible = ref(false)
  const processForm = ref(createEmptyProcessForm())

  async function fetchRecords() {
    loading.value = true
    loadError.value = ''
    try {
      const { data } = await request.get('/api/after-sales', {
        params: {
          page: page.value,
          limit: pageSize.value,
          status: statusFilter.value || undefined,
          search: searchKeyword.value || undefined,
        },
      })
      const pageData = extractAfterSalesPage(data)
      records.value = pageData.items.map(normalizeRecord)
      total.value = Number(pageData.total || 0)
    } catch (error) {
      records.value = []
      total.value = 0
      loadError.value = extractErrorMessage(error, '加载售后列表失败，请稍后重试')
      ElMessage.error(loadError.value)
    } finally {
      loading.value = false
    }
  }

  function handleSearch() {
    page.value = 1
    void fetchRecords()
  }

  function handleReset() {
    searchKeyword.value = ''
    statusFilter.value = ''
    page.value = 1
    void fetchRecords()
  }

  function handleSizeChange() {
    page.value = 1
    void fetchRecords()
  }

  async function openClearSelector() {
    if (clearing.value) return
    try {
      await ElMessageBox.confirm(
        '请选择清除范围：点击“清除已处理”将删除所有非待处理售后单，点击“全部清除”将删除全部售后单。',
        '一键清除',
        {
          confirmButtonText: '清除已处理',
          cancelButtonText: '全部清除',
          distinguishCancelAndClose: true,
          closeOnClickModal: false,
          closeOnPressEscape: false,
          type: 'warning',
        },
      )
      await submitClear('processed')
    } catch (action) {
      if (action === 'cancel') {
        await submitClear('all')
      }
    }
  }

  async function submitClear(scope) {
    clearing.value = true
    try {
      const { data } = await request.post('/api/after-sales/clear', { scope })
      const payload = extractEnvelopeData(data) || data || {}
      const deleted = Number(payload.deleted || 0)
      const scopeText = scope === 'all' ? '全部售后单' : '已处理售后单'
      ElMessage.success(`${scopeText}已清除，共 ${deleted} 条`)
      page.value = 1
      await fetchRecords()
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '清除售后记录失败'))
    } finally {
      clearing.value = false
    }
  }

  function openDetail(row) {
    detailRecord.value = row
    detailVisible.value = true
  }

  function openProcess(row) {
    const fallbackRefundAmount = Number(row.refundAmount || row.requestedRefundAmount || 0)
    processForm.value = {
      id: row.id,
      requestNo: row.requestNo,
      status: row.status || 'pending',
      adminRemark: row.adminRemark || '',
      shouldRefund: toBoolean(row.shouldRefund),
      requestedRefundAmount: Number(row.requestedRefundAmount || 0),
      refundAmountYuan: fallbackRefundAmount > 0 ? fen2yuan(fallbackRefundAmount) : '',
      refundReason: row.refundReason || '',
      refundTransactionId: row.refundTransactionId || '',
    }
    processVisible.value = true
  }

  function resolveAdminName() {
    const adminUser = getStoredAdminUser()
    return adminUser?.name || adminUser?.phone || 'admin'
  }

  async function submitProcess() {
    if (!processForm.value.id) return
    if (processForm.value.shouldRefund && ['pending', 'rejected'].includes(processForm.value.status)) {
      ElMessage.warning('当前状态不允许执行退款，请选择处理中/已通过/已完成')
      return
    }

    const refundAmount = processForm.value.shouldRefund ? yuanToFen(processForm.value.refundAmountYuan) : 0
    if (processForm.value.shouldRefund && refundAmount <= 0) {
      ElMessage.warning('请填写有效的退款金额')
      return
    }

    submitting.value = true
    try {
      const { data } = await request.put(`/api/after-sales/${processForm.value.id}/status`, {
        status: processForm.value.status,
        adminRemark: processForm.value.adminRemark || '',
        processedBy: resolveAdminName(),
        shouldRefund: processForm.value.shouldRefund,
        refundAmount,
        refundReason: processForm.value.refundReason || '',
      })
      const payload = extractEnvelopeData(data) || data || {}
      const latest = normalizeRecord(payload)
      if (processForm.value.shouldRefund && !latest.refundTransactionId) {
        ElMessage.warning('状态已更新，但未生成退款流水号，请检查后端退款接口')
      } else {
        ElMessage.success('处理状态已更新')
      }
      processVisible.value = false
      await fetchRecords()
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '更新状态失败'))
    } finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    void fetchRecords()
  })

  return {
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
  }
}
