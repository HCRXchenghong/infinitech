import { reactive, ref } from 'vue'
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts'

export function usePaymentCenterSettlement({
  request,
  pageError,
  ElMessage,
  setPageError,
}) {
  const previewing = ref(false)
  const settlementPreviewEntries = ref([])
  const settlementLookupLoading = ref(false)
  const settlementOrderDetail = ref(null)
  const previewForm = reactive({
    amount: 1000,
    ruleSetName: '',
  })
  const settlementLookupForm = reactive({
    orderId: '',
  })

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

  return {
    loadSettlementOrder,
    previewForm,
    previewing,
    resetSettlementOrder,
    runPreview,
    settlementLookupForm,
    settlementLookupLoading,
    settlementOrderDetail,
    settlementPreviewEntries,
  }
}
