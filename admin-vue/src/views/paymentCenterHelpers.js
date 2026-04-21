import { computed, onMounted, reactive, ref } from 'vue'
import {
  extractEnvelopeData,
  extractErrorMessage,
  extractPaginatedItems,
} from '@infinitech/contracts'
import {
  buildBankPayoutCompletePayload,
  buildPaymentCallbackQuery,
  buildPaymentCenterConfigPayload,
  buildWithdrawHistoryTarget,
  buildWithdrawReviewPayload,
  canReplayPaymentCallback,
  collectBankWithdrawRequests,
  collectPendingBankWithdrawRequests,
  countAutoRetryWithdrawRequests,
  createBankPayoutFormState,
  createPaymentCallbackFilterState,
  createPaymentCallbackReplayPayload,
  createPaymentCenterConfigDraft,
  createWithdrawHistoryTargetState,
  createWithdrawRequestFilterState,
  extractPaymentCallbackDetail,
  extractPaymentCallbackPage,
  extractWithdrawRequestPage,
  filterWithdrawRequests,
  getPaymentCallbackId,
  getWithdrawRequestId,
  getWithdrawReviewActionTitle,
  getWithdrawTransactionId,
  validateBankPayoutForm,
  withdrawStatusLabel,
} from '@infinitech/admin-core'

function createPaymentCenterState() {
  const draft = createPaymentCenterConfigDraft()
  return {
    pay_mode: draft.pay_mode,
    wxpay_config: draft.wxpay_config,
    alipay_config: draft.alipay_config,
    channel_matrix: draft.channel_matrix,
    withdraw_fee_rules: draft.withdraw_fee_rules,
    settlement_subjects: draft.settlement_subjects,
    settlementRulesText: draft.settlementRulesText,
    rider_deposit_policy: draft.rider_deposit_policy,
    bank_card_config: draft.bank_card_config,
    riderDepositRecords: [],
    withdrawRequests: [],
    paymentCallbacks: [],
  }
}

function extractListItems(payload) {
  return extractPaginatedItems(payload).items
}

function openConfirm(ElMessageBox, message, title, options = {}) {
  return ElMessageBox.confirm(message, title, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
    ...options,
  }).catch(() => false)
}

function openPrompt(ElMessageBox, message, title, options = {}) {
  return ElMessageBox.prompt(message, title, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    ...options,
  }).catch(() => null)
}

export function formatFen(value) {
  return (Number(value || 0) / 100).toFixed(2)
}

export function formatFenOrDash(value) {
  if (value === null || value === undefined || value === '') return '-'
  return formatFen(value)
}

export function prettyJson(value) {
  if (value == null || value === '') return '-'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch (_) {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (_) {
    return String(value)
  }
}

export function usePaymentCenterPage({ request, ElMessage, ElMessageBox }) {
  const activeTab = ref('basic')
  const loading = ref(false)
  const saving = ref(false)
  const previewing = ref(false)
  const pageError = ref('')
  const riderDepositOverview = ref({})
  const settlementPreviewEntries = ref([])
  const settlementLookupLoading = ref(false)
  const settlementOrderDetail = ref(null)
  const gatewaySummary = ref(createPaymentCenterConfigDraft().gatewaySummary)
  const withdrawActionLoading = ref('')
  const bankPayoutDialogVisible = ref(false)
  const bankPayoutSubmitting = ref(false)
  const withdrawHistoryDialogVisible = ref(false)
  const withdrawHistoryLoading = ref(false)
  const withdrawActionHistory = ref([])
  const callbackLoading = ref(false)
  const callbackReplayLoading = ref('')
  const callbackDetailLoading = ref(false)
  const callbackDetailVisible = ref(false)
  const callbackDetail = ref(null)

  const state = reactive(createPaymentCenterState())
  const bankPayoutForm = reactive(createBankPayoutFormState())
  const withdrawHistoryTarget = reactive(createWithdrawHistoryTargetState())
  const previewForm = reactive({
    amount: 1000,
    ruleSetName: '',
  })
  const settlementLookupForm = reactive({
    orderId: '',
  })
  const withdrawFilter = reactive(createWithdrawRequestFilterState())
  const callbackFilter = reactive(createPaymentCallbackFilterState())

  const filteredWithdrawRequests = computed(() =>
    filterWithdrawRequests(state.withdrawRequests, withdrawFilter),
  )
  const autoRetryWithdrawCount = computed(() =>
    countAutoRetryWithdrawRequests(state.withdrawRequests),
  )
  const bankWithdrawRequests = computed(() =>
    collectBankWithdrawRequests(state.withdrawRequests),
  )
  const pendingBankWithdrawRequests = computed(() =>
    collectPendingBankWithdrawRequests(state.withdrawRequests),
  )

  function setPageError(error, fallback, { notify = false } = {}) {
    pageError.value = extractErrorMessage(error, fallback)
    if (notify) {
      ElMessage.error(pageError.value)
    }
    return pageError.value
  }

  function applyConfig(payload = {}) {
    const { gatewaySummary: nextGatewaySummary, ...draft } =
      createPaymentCenterConfigDraft(payload)
    gatewaySummary.value = nextGatewaySummary
    Object.assign(state, draft)
  }

  async function loadAll() {
    loading.value = true
    pageError.value = ''
    try {
      const [configRes, overviewRes, recordsRes, withdrawRes, callbackRes] =
        await Promise.all([
          request.get('/api/pay-center/config'),
          request.get('/api/rider-deposit/overview'),
          request.get('/api/rider-deposit/records', { params: { page: 1, limit: 20 } }),
          request.get('/api/pay-center/withdraw-requests', {
            params: { page: 1, limit: 50 },
          }),
          request.get('/api/admin/wallet/payment-callbacks', {
            params: { page: 1, limit: 50 },
          }),
        ])
      applyConfig(configRes.data || {})
      riderDepositOverview.value = extractEnvelopeData(overviewRes.data) || {}
      state.riderDepositRecords = extractListItems(recordsRes.data)
      state.withdrawRequests = extractWithdrawRequestPage(withdrawRes.data).items
      state.paymentCallbacks = extractPaymentCallbackPage(callbackRes.data).items
    } catch (error) {
      setPageError(error, '加载支付中心失败')
    } finally {
      loading.value = false
    }
  }

  async function loadPaymentCallbacks() {
    callbackLoading.value = true
    pageError.value = ''
    try {
      const { data } = await request.get('/api/admin/wallet/payment-callbacks', {
        params: buildPaymentCallbackQuery(callbackFilter),
      })
      state.paymentCallbacks = extractPaymentCallbackPage(data).items
    } catch (error) {
      setPageError(error, '加载回调日志失败')
    } finally {
      callbackLoading.value = false
    }
  }

  function resetCallbackFilters() {
    Object.assign(callbackFilter, createPaymentCallbackFilterState())
    loadPaymentCallbacks()
  }

  function addChannelRow() {
    state.channel_matrix.push({
      user_type: 'customer',
      platform: 'app',
      scene: 'order_payment',
      channel: 'wechat',
      enabled: true,
      label: '新渠道',
      description: '',
    })
  }

  function addFeeRule() {
    state.withdraw_fee_rules.push({
      user_type: 'customer',
      withdraw_method: 'wechat',
      min_amount: 0,
      max_amount: 0,
      rate_basis_points: 0,
      min_fee: 0,
      max_fee: 0,
      enabled: true,
      sort_order: state.withdraw_fee_rules.length * 10 + 10,
    })
  }

  function addSubject() {
    state.settlement_subjects.push({
      uid: `custom-${Date.now()}`,
      name: '新分账对象',
      subject_type: 'custom',
      scope_type: 'global',
      scope_id: '',
      external_account: '',
      external_channel: '',
      account_holder_name: '',
      enabled: true,
      sort_order: state.settlement_subjects.length * 10 + 10,
      notes: '',
    })
  }

  function removeRow(list, index) {
    list.splice(index, 1)
  }

  async function loadSettlementOrder() {
    const orderId = String(settlementLookupForm.orderId || '').trim()
    if (!orderId) {
      ElMessage.warning('请先输入订单号')
      return
    }
    settlementLookupLoading.value = true
    pageError.value = ''
    try {
      const { data } = await request.get(
        `/api/settlement/orders/${encodeURIComponent(orderId)}`,
      )
      settlementOrderDetail.value = extractEnvelopeData(data) || null
    } catch (error) {
      settlementOrderDetail.value = null
      setPageError(error, '查询订单分账失败', { notify: true })
    } finally {
      settlementLookupLoading.value = false
    }
  }

  function resetSettlementOrder() {
    settlementLookupForm.orderId = ''
    settlementOrderDetail.value = null
  }

  async function openPaymentCallbackDetail(row) {
    const callbackId = getPaymentCallbackId(row)
    if (!callbackId) return
    callbackDetailLoading.value = true
    pageError.value = ''
    try {
      const { data } = await request.get(
        `/api/admin/wallet/payment-callbacks/${encodeURIComponent(callbackId)}`,
      )
      callbackDetail.value = extractPaymentCallbackDetail(data)
      callbackDetailVisible.value = true
    } catch (error) {
      setPageError(error, '加载回调详情失败')
    } finally {
      callbackDetailLoading.value = false
    }
  }

  async function replayPaymentCallback(row) {
    const callbackId = getPaymentCallbackId(row)
    if (!callbackId || !canReplayPaymentCallback(row)) return

    const prompt = await openPrompt(
      ElMessageBox,
      '请输入这次重放的备注，方便后续审计追踪。',
      '重放已验签回调',
      {
        inputPlaceholder: '后台重放已验签回调',
        inputValue: '后台重放已验签回调',
        confirmButtonText: '确认重放',
      },
    )
    if (!prompt) return

    callbackReplayLoading.value = callbackId
    pageError.value = ''
    try {
      const { data } = await request.post(
        `/api/admin/wallet/payment-callbacks/${encodeURIComponent(callbackId)}/replay`,
        createPaymentCallbackReplayPayload(prompt.value),
      )
      ElMessage.success(data?.duplicated ? '回调已被处理过，已按当前状态回填' : '回调已重放处理')
      await loadPaymentCallbacks()
      const nextCallbackId = getPaymentCallbackId(data) || data?.callbackId || callbackId
      await openPaymentCallbackDetail({ callback_id: nextCallbackId })
    } catch (error) {
      setPageError(error, '重放回调失败', { notify: true })
    } finally {
      callbackReplayLoading.value = ''
    }
  }

  function resetWithdrawHistory() {
    withdrawActionHistory.value = []
    Object.assign(withdrawHistoryTarget, createWithdrawHistoryTargetState())
  }

  async function openWithdrawHistory(row) {
    const transactionId = getWithdrawTransactionId(row)
    if (!transactionId) {
      ElMessage.warning('当前提现单缺少关联交易号，暂时无法加载处理轨迹')
      return
    }
    withdrawHistoryDialogVisible.value = true
    withdrawHistoryLoading.value = true
    resetWithdrawHistory()
    Object.assign(withdrawHistoryTarget, buildWithdrawHistoryTarget(row))
    try {
      const { data } = await request.get('/api/pay-center/operations', {
        params: {
          transactionId,
          page: 1,
          limit: 50,
        },
      })
      withdrawActionHistory.value = extractListItems(data)
    } catch (error) {
      setPageError(error, '加载提现处理轨迹失败', { notify: true })
    } finally {
      withdrawHistoryLoading.value = false
    }
  }

  function openBankVoucher(url) {
    const target = String(url || '').trim()
    if (!target) return
    if (typeof window !== 'undefined') {
      window.open(target, '_blank', 'noopener,noreferrer')
    }
  }

  function openBankPayoutDialog(row) {
    Object.assign(bankPayoutForm, createBankPayoutFormState(row))
    bankPayoutDialogVisible.value = true
  }

  function handleBankPayoutDialogClosed() {
    Object.assign(bankPayoutForm, createBankPayoutFormState())
  }

  async function submitWithdrawAction(row, action) {
    const requestId = getWithdrawRequestId(row)
    if (!requestId) return
    if (action === 'complete' && String(row?.withdraw_method || '') === 'bank_card') {
      openBankPayoutDialog(row)
      return
    }

    const actionTitle = getWithdrawReviewActionTitle(action)
    let note = ''

    if (action === 'reject' || action === 'fail') {
      const prompt = await openPrompt(ElMessageBox, '请输入处理说明', actionTitle, {
        inputPlaceholder: '请输入备注或失败原因',
        inputValidator: (value) =>
          (String(value || '').trim() ? true : '请填写处理说明'),
      })
      if (!prompt) return
      note = String(prompt.value || '').trim()
    } else {
      const confirmed = await openConfirm(
        ElMessageBox,
        `确认执行“${actionTitle}”吗？`,
        '确认操作',
      )
      if (!confirmed) return
    }

    withdrawActionLoading.value = `${requestId}:${action}`
    pageError.value = ''
    try {
      await request.post(
        '/api/pay-center/withdraw-requests/review',
        buildWithdrawReviewPayload(requestId, action, { remark: note }),
      )
      ElMessage.success(`${actionTitle}已提交`)
      await loadAll()
    } catch (error) {
      setPageError(error, `${actionTitle}失败`, { notify: true })
    } finally {
      withdrawActionLoading.value = ''
    }
  }

  async function submitBankPayoutComplete() {
    const validationMessage = validateBankPayoutForm(bankPayoutForm)
    if (validationMessage) {
      ElMessage.error(validationMessage)
      return
    }

    bankPayoutSubmitting.value = true
    withdrawActionLoading.value = `${bankPayoutForm.requestId}:complete`
    pageError.value = ''
    try {
      await request.post(
        '/api/pay-center/withdraw-requests/review',
        buildBankPayoutCompletePayload(bankPayoutForm),
      )
      ElMessage.success('已标记为已打款并保存凭证')
      bankPayoutDialogVisible.value = false
      Object.assign(bankPayoutForm, createBankPayoutFormState())
      await loadAll()
    } catch (error) {
      setPageError(error, '保存银行卡打款记录失败', { notify: true })
    } finally {
      bankPayoutSubmitting.value = false
      withdrawActionLoading.value = ''
    }
  }

  async function syncWithdrawStatus(row) {
    const requestId = getWithdrawRequestId(row)
    if (!requestId) return
    withdrawActionLoading.value = `${requestId}:sync_gateway_status`
    pageError.value = ''
    try {
      const { data } = await request.post(
        '/api/pay-center/withdraw-requests/review',
        buildWithdrawReviewPayload(requestId, 'sync_gateway_status'),
      )
      ElMessage.success(
        `同步完成，当前状态：${withdrawStatusLabel(data?.status || row?.status)}`,
      )
      await loadAll()
    } catch (error) {
      setPageError(error, '同步网关状态失败', { notify: true })
    } finally {
      withdrawActionLoading.value = ''
    }
  }

  async function retryWithdrawPayout(row) {
    const requestId = getWithdrawRequestId(row)
    if (!requestId) return
    const confirmed = await openConfirm(
      ElMessageBox,
      '确认重试这笔提现打款吗？如果网关未就绪，会先恢复为待打款状态。',
      '重试打款',
      {
        confirmButtonText: '确认重试',
      },
    )
    if (!confirmed) return

    withdrawActionLoading.value = `${requestId}:retry_payout`
    pageError.value = ''
    try {
      const { data } = await request.post(
        '/api/pay-center/withdraw-requests/review',
        buildWithdrawReviewPayload(requestId, 'retry_payout', {
          remark: '后台重试打款',
        }),
      )
      if (data?.warning) {
        ElMessage.warning(data.warning)
      } else {
        ElMessage.success('已重新发起打款')
      }
      await loadAll()
    } catch (error) {
      setPageError(error, '重试打款失败', { notify: true })
    } finally {
      withdrawActionLoading.value = ''
    }
  }

  async function supplementWithdraw(row, action) {
    const requestId = getWithdrawRequestId(row)
    if (!requestId) return

    const isSuccess = action === 'supplement_success'
    const actionTitle = getWithdrawReviewActionTitle(action)
    const defaultRemark = isSuccess ? '后台补记成功' : '后台补记失败'
    const defaultThirdPartyOrderId =
      row?.third_party_order_id || row?.thirdPartyOrderId || requestId

    const prompt = await openPrompt(
      ElMessageBox,
      '请输入补单备注，可选填写第三方单号。',
      actionTitle,
      {
        inputPlaceholder: defaultRemark,
        inputValue: defaultRemark,
        confirmButtonText: '确认补记',
      },
    )
    if (!prompt) return

    const thirdPartyPrompt = await openPrompt(
      ElMessageBox,
      '请输入第三方流水号，留空则沿用当前提现单号。',
      actionTitle,
      {
        inputPlaceholder: defaultThirdPartyOrderId,
        inputValue: defaultThirdPartyOrderId,
        confirmButtonText: '继续',
      },
    )
    if (!thirdPartyPrompt) return

    withdrawActionLoading.value = `${requestId}:${action}`
    pageError.value = ''
    try {
      const { data } = await request.post(
        '/api/pay-center/withdraw-requests/review',
        buildWithdrawReviewPayload(requestId, action, {
          remark: String(prompt.value || defaultRemark).trim() || defaultRemark,
          thirdPartyOrderId:
            String(thirdPartyPrompt.value || defaultThirdPartyOrderId).trim()
            || defaultThirdPartyOrderId,
        }),
      )
      if (data?.duplicated) {
        ElMessage.warning(`${actionTitle}已存在，已按最新状态回写`)
      } else {
        ElMessage.success(`${actionTitle}已提交`)
      }
      await loadAll()
    } catch (error) {
      setPageError(error, `${actionTitle}失败`, { notify: true })
    } finally {
      withdrawActionLoading.value = ''
    }
  }

  async function saveAll() {
    saving.value = true
    pageError.value = ''
    try {
      const { data } = await request.post(
        '/api/pay-center/config',
        buildPaymentCenterConfigPayload(state),
      )
      applyConfig(data || {})
      ElMessage.success('支付中心配置已保存')
    } catch (error) {
      setPageError(error, '保存失败', { notify: true })
    } finally {
      saving.value = false
    }
  }

  async function runPreview() {
    previewing.value = true
    try {
      const { data } = await request.post('/api/settlement/rule-preview', {
        amount: previewForm.amount,
        ruleSetName: previewForm.ruleSetName,
      })
      settlementPreviewEntries.value = data?.preview_entries || []
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '预览失败'))
    } finally {
      previewing.value = false
    }
  }

  onMounted(loadAll)

  return {
    activeTab,
    autoRetryWithdrawCount,
    bankPayoutDialogVisible,
    bankPayoutForm,
    bankPayoutSubmitting,
    bankWithdrawRequests,
    callbackDetail,
    callbackDetailLoading,
    callbackDetailVisible,
    callbackFilter,
    callbackLoading,
    callbackReplayLoading,
    filteredWithdrawRequests,
    gatewaySummary,
    loadAll,
    loadPaymentCallbacks,
    loadSettlementOrder,
    loading,
    openBankPayoutDialog,
    openBankVoucher,
    openPaymentCallbackDetail,
    openWithdrawHistory,
    pageError,
    pendingBankWithdrawRequests,
    previewForm,
    previewing,
    replayPaymentCallback,
    resetCallbackFilters,
    resetSettlementOrder,
    riderDepositOverview,
    runPreview,
    saveAll,
    saving,
    settlementLookupForm,
    settlementLookupLoading,
    settlementOrderDetail,
    settlementPreviewEntries,
    state,
    submitBankPayoutComplete,
    submitWithdrawAction,
    supplementWithdraw,
    syncWithdrawStatus,
    retryWithdrawPayout,
    withdrawActionHistory,
    withdrawActionLoading,
    withdrawFilter,
    withdrawHistoryDialogVisible,
    withdrawHistoryLoading,
    withdrawHistoryTarget,
    handleBankPayoutDialogClosed,
    addChannelRow,
    addFeeRule,
    addSubject,
    removeRow,
  }
}
