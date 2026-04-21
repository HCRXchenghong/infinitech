import { reactive, ref } from 'vue'
import {
  buildPaymentCallbackQuery,
  canReplayPaymentCallback,
  createPaymentCallbackFilterState,
  createPaymentCallbackReplayPayload,
  extractPaymentCallbackDetail,
  extractPaymentCallbackPage,
  getPaymentCallbackId,
} from '@infinitech/admin-core'
import { openPaymentCenterPrompt } from './runtime'

export function usePaymentCenterCallbacks({
  request,
  state,
  pageError,
  ElMessage,
  ElMessageBox,
  setPageError,
}) {
  const callbackLoading = ref(false)
  const callbackReplayLoading = ref('')
  const callbackDetailLoading = ref(false)
  const callbackDetailVisible = ref(false)
  const callbackDetail = ref(null)
  const callbackFilter = reactive(createPaymentCallbackFilterState())

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
    void loadPaymentCallbacks()
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

    const prompt = await openPaymentCenterPrompt(
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

  return {
    callbackDetail,
    callbackDetailLoading,
    callbackDetailVisible,
    callbackFilter,
    callbackLoading,
    callbackReplayLoading,
    loadPaymentCallbacks,
    openPaymentCallbackDetail,
    replayPaymentCallback,
    resetCallbackFilters,
  }
}
