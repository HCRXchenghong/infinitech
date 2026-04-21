import { onMounted, reactive, ref } from 'vue'
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts'
import {
  buildPaymentCenterConfigPayload,
  createPaymentCenterConfigDraft,
  extractPaymentCallbackPage,
  extractWithdrawRequestPage,
} from '@infinitech/admin-core'
import {
  addPaymentChannelRow,
  addPaymentSettlementSubject,
  addPaymentWithdrawFeeRule,
  createPaymentCenterState,
  extractPaymentCenterListItems,
  removePaymentCenterRow,
} from './paymentCenterHelpers/runtime'
import { usePaymentCenterCallbacks } from './paymentCenterHelpers/callbacks'
import { usePaymentCenterSettlement } from './paymentCenterHelpers/settlement'
import { usePaymentCenterWithdrawals } from './paymentCenterHelpers/withdrawals'

export {
  formatFen,
  formatFenOrDash,
  prettyJson,
} from './paymentCenterHelpers/runtime'

export function usePaymentCenterPage({ request, ElMessage, ElMessageBox }) {
  const activeTab = ref('basic')
  const loading = ref(false)
  const saving = ref(false)
  const pageError = ref('')
  const riderDepositOverview = ref({})
  const gatewaySummary = ref(createPaymentCenterConfigDraft().gatewaySummary)

  const state = reactive(createPaymentCenterState())

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

  const callbacks = usePaymentCenterCallbacks({
    request,
    state,
    pageError,
    ElMessage,
    ElMessageBox,
    setPageError,
  })
  const settlement = usePaymentCenterSettlement({
    request,
    pageError,
    ElMessage,
    setPageError,
  })
  const withdrawals = usePaymentCenterWithdrawals({
    request,
    state,
    pageError,
    ElMessage,
    ElMessageBox,
    setPageError,
    loadAll,
  })

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
      state.riderDepositRecords = extractPaymentCenterListItems(recordsRes.data)
      state.withdrawRequests = extractWithdrawRequestPage(withdrawRes.data).items
      state.paymentCallbacks = extractPaymentCallbackPage(callbackRes.data).items
    } catch (error) {
      setPageError(error, '加载支付中心失败')
    } finally {
      loading.value = false
    }
  }

  function addChannelRow() {
    addPaymentChannelRow(state.channel_matrix)
  }

  function addFeeRule() {
    addPaymentWithdrawFeeRule(state.withdraw_fee_rules)
  }

  function addSubject() {
    addPaymentSettlementSubject(state.settlement_subjects)
  }

  function removeRow(list, index) {
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

  onMounted(loadAll)

  return {
    activeTab,
    gatewaySummary,
    loadAll,
    loading,
    pageError,
    riderDepositOverview,
    saveAll,
    saving,
    state,
    addChannelRow,
    addFeeRule,
    addSubject,
    removeRow,
    ...callbacks,
    ...settlement,
    ...withdrawals,
  }
}
