import { computed, reactive, ref } from 'vue'
import {
  buildBankPayoutCompletePayload,
  buildWithdrawHistoryTarget,
  buildWithdrawReviewPayload,
  collectBankWithdrawRequests,
  collectPendingBankWithdrawRequests,
  countAutoRetryWithdrawRequests,
  createBankPayoutFormState,
  createWithdrawHistoryTargetState,
  createWithdrawRequestFilterState,
  filterWithdrawRequests,
  getWithdrawRequestId,
  getWithdrawReviewActionTitle,
  getWithdrawTransactionId,
  validateBankPayoutForm,
  withdrawStatusLabel,
} from '@infinitech/admin-core'
import {
  extractPaymentCenterListItems,
  openPaymentCenterConfirm,
  openPaymentCenterPrompt,
} from './runtime'

export function usePaymentCenterWithdrawals({
  request,
  state,
  pageError,
  ElMessage,
  ElMessageBox,
  setPageError,
  loadAll,
}) {
  const withdrawActionLoading = ref('')
  const bankPayoutDialogVisible = ref(false)
  const bankPayoutSubmitting = ref(false)
  const withdrawHistoryDialogVisible = ref(false)
  const withdrawHistoryLoading = ref(false)
  const withdrawActionHistory = ref([])
  const bankPayoutForm = reactive(createBankPayoutFormState())
  const withdrawHistoryTarget = reactive(createWithdrawHistoryTargetState())
  const withdrawFilter = reactive(createWithdrawRequestFilterState())

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
      withdrawActionHistory.value = extractPaymentCenterListItems(data)
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
      const prompt = await openPaymentCenterPrompt(
        ElMessageBox,
        '请输入处理说明',
        actionTitle,
        {
          inputPlaceholder: '请输入备注或失败原因',
          inputValidator: (value) =>
            (String(value || '').trim() ? true : '请填写处理说明'),
        },
      )
      if (!prompt) return
      note = String(prompt.value || '').trim()
    } else {
      const confirmed = await openPaymentCenterConfirm(
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
    const confirmed = await openPaymentCenterConfirm(
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

    const prompt = await openPaymentCenterPrompt(
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

    const thirdPartyPrompt = await openPaymentCenterPrompt(
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

  return {
    autoRetryWithdrawCount,
    bankPayoutDialogVisible,
    bankPayoutForm,
    bankPayoutSubmitting,
    bankWithdrawRequests,
    filteredWithdrawRequests,
    handleBankPayoutDialogClosed,
    openBankPayoutDialog,
    openBankVoucher,
    openWithdrawHistory,
    pendingBankWithdrawRequests,
    retryWithdrawPayout,
    submitBankPayoutComplete,
    submitWithdrawAction,
    supplementWithdraw,
    syncWithdrawStatus,
    withdrawActionHistory,
    withdrawActionLoading,
    withdrawFilter,
    withdrawHistoryDialogVisible,
    withdrawHistoryLoading,
    withdrawHistoryTarget,
  }
}
