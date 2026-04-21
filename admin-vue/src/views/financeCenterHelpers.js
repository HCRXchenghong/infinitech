import { computed, onMounted, ref } from 'vue'
import { extractEnvelopeData, extractErrorMessage, extractPaginatedItems } from '@infinitech/contracts'
import {
  buildFinanceCenterParams,
  buildFinanceDeductPayload,
  buildFinanceExportFilename,
  buildFinanceOverviewKpiCards,
  buildFinanceRecentTransactionParams,
  buildFinanceRechargePayload,
  buildFinanceRefundCards,
  buildFinanceUserDetailsParams,
  createFinanceCoinRatioState,
  createFinanceWalletActionForm,
  createFinanceWalletActionRecord,
  extractFinancialTransactionLogPage,
  formatFinanceCenterDate,
  formatFinancialAmountYuan,
  formatFinancialTransactionType,
  formatFinancialTransactionUserType,
  getFinanceTransactionDirectionSign,
  validateFinanceWalletActionForm,
} from '@infinitech/admin-core'

export function useFinanceCenterPage({ request, router, ElMessage }) {
  const periodType = ref('daily')
  const statDate = ref('')
  const overview = ref({})
  const overviewLoading = ref(false)
  const riderDetails = ref([])
  const merchantDetails = ref([])
  const detailsLoading = ref(false)
  const exporting = ref(false)
  const overviewError = ref('')
  const detailsError = ref('')
  const logsError = ref('')

  const kpiDialogVisible = ref(false)
  const kpiDialogData = ref({})
  const userDialogVisible = ref(false)
  const userDialogData = ref({})
  const userDialogType = ref('rider')

  const rechargeDialogVisible = ref(false)
  const recharging = ref(false)
  const lastRecharge = ref(null)
  const rechargeForm = ref(createFinanceWalletActionForm())

  const deductDialogVisible = ref(false)
  const deducting = ref(false)
  const lastDeduct = ref(null)
  const deductForm = ref(createFinanceWalletActionForm())

  const coinRatio = ref(createFinanceCoinRatioState())
  const savingCoinRatio = ref(false)

  const transactionLogs = ref([])

  const kpiCards = computed(() => buildFinanceOverviewKpiCards(overview.value))
  const refundCards = computed(() => buildFinanceRefundCards(overview.value))
  const pageError = computed(() => overviewError.value || detailsError.value || logsError.value || '')

  function openKpiDetail(card) {
    kpiDialogData.value = card
    kpiDialogVisible.value = true
  }

  function openUserDetail(row, type) {
    userDialogData.value = row
    userDialogType.value = type
    userDialogVisible.value = true
  }

  function openRechargeDialog() {
    rechargeDialogVisible.value = true
  }

  function openDeductDialog() {
    deductDialogVisible.value = true
  }

  function updateCoinRatio(value) {
    coinRatio.value = createFinanceCoinRatioState({
      ...coinRatio.value,
      ratio: value ?? coinRatio.value.ratio,
    })
  }

  function goToTransactionLogs() {
    router.push('/transaction-logs')
  }

  async function loadOverview() {
    overviewLoading.value = true
    overviewError.value = ''
    try {
      const res = await request.get('/api/financial/overview', {
        params: buildFinanceCenterParams({ periodType: periodType.value, statDate: statDate.value }),
      })
      overview.value = extractEnvelopeData(res.data) || {}
    } catch (error) {
      overview.value = {}
      overviewError.value = extractErrorMessage(error, '加载平台概览失败')
    } finally {
      overviewLoading.value = false
    }
  }

  async function loadDetails() {
    detailsLoading.value = true
    detailsError.value = ''
    try {
      const filters = { periodType: periodType.value, statDate: statDate.value }
      const [riderResponse, merchantResponse] = await Promise.all([
        request.get('/api/financial/user-details', {
          params: buildFinanceUserDetailsParams(filters, 'rider'),
        }),
        request.get('/api/financial/user-details', {
          params: buildFinanceUserDetailsParams(filters, 'merchant'),
        }),
      ])
      riderDetails.value = extractPaginatedItems(riderResponse.data).items
      merchantDetails.value = extractPaginatedItems(merchantResponse.data).items
    } catch (error) {
      riderDetails.value = []
      merchantDetails.value = []
      detailsError.value = extractErrorMessage(error, '加载收入榜失败')
    } finally {
      detailsLoading.value = false
    }
  }

  async function loadCoinRatio() {
    try {
      const res = await request.get('/api/coin-ratio')
      const payload = extractEnvelopeData(res.data) || {}
      coinRatio.value = createFinanceCoinRatioState(payload)
    } catch {
      // Ignore coin ratio bootstrap failures so the rest of the page can keep rendering.
    }
  }

  async function loadRecentTransactions() {
    logsError.value = ''
    try {
      const res = await request.get('/api/financial/transaction-logs', {
        params: buildFinanceRecentTransactionParams(),
      })
      transactionLogs.value = extractFinancialTransactionLogPage(res.data).items
    } catch (error) {
      transactionLogs.value = []
      logsError.value = extractErrorMessage(error, '加载财务日志失败')
    }
  }

  async function loadAll() {
    await Promise.allSettled([
      loadOverview(),
      loadDetails(),
      loadCoinRatio(),
      loadRecentTransactions(),
    ])
  }

  async function saveCoinRatio() {
    savingCoinRatio.value = true
    try {
      await request.post('/api/coin-ratio', coinRatio.value)
      ElMessage.success('虚拟币比例保存成功')
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '保存虚拟币比例失败'))
    } finally {
      savingCoinRatio.value = false
    }
  }

  async function doRecharge() {
    const validationMessage = validateFinanceWalletActionForm(rechargeForm.value)
    if (validationMessage) {
      ElMessage.warning(validationMessage)
      return
    }
    recharging.value = true
    try {
      await request.post('/api/admin/wallet/recharge', buildFinanceRechargePayload(rechargeForm.value))
      ElMessage.success('充值成功')
      lastRecharge.value = createFinanceWalletActionRecord(rechargeForm.value)
      rechargeDialogVisible.value = false
      rechargeForm.value = createFinanceWalletActionForm()
      await loadRecentTransactions()
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '充值失败'))
    } finally {
      recharging.value = false
    }
  }

  async function doDeduct() {
    const validationMessage = validateFinanceWalletActionForm(deductForm.value)
    if (validationMessage) {
      ElMessage.warning(validationMessage)
      return
    }
    deducting.value = true
    try {
      await request.post('/api/admin/wallet/deduct-balance', buildFinanceDeductPayload(deductForm.value))
      ElMessage.success('扣款成功')
      lastDeduct.value = createFinanceWalletActionRecord(deductForm.value)
      deductDialogVisible.value = false
      deductForm.value = createFinanceWalletActionForm()
      await loadRecentTransactions()
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '扣款失败'))
    } finally {
      deducting.value = false
    }
  }

  async function doExport() {
    exporting.value = true
    try {
      const filters = { periodType: periodType.value, statDate: statDate.value }
      const res = await request.get('/api/financial/export', {
        params: buildFinanceCenterParams(filters),
      })
      const payload = extractEnvelopeData(res.data) || res.data || {}
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const link = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: buildFinanceExportFilename(filters),
      })
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '下载报表失败'))
    } finally {
      exporting.value = false
    }
  }

  onMounted(() => {
    void loadAll()
  })

  return {
    coinRatio,
    deductDialogVisible,
    deductForm,
    deducting,
    detailsError,
    detailsLoading,
    doDeduct,
    doExport,
    doRecharge,
    exporting,
    goToTransactionLogs,
    kpiCards,
    kpiDialogData,
    kpiDialogVisible,
    lastDeduct,
    lastRecharge,
    loadAll,
    logsError,
    merchantDetails,
    openDeductDialog,
    openKpiDetail,
    openRechargeDialog,
    openUserDetail,
    overview,
    overviewLoading,
    pageError,
    periodType,
    rechargeDialogVisible,
    rechargeForm,
    recharging,
    refundCards,
    riderDetails,
    saveCoinRatio,
    savingCoinRatio,
    statDate,
    transactionLogs,
    updateCoinRatio,
    userDialogData,
    userDialogType,
    userDialogVisible,
  }
}

export {
  formatFinanceCenterDate as formatFinanceDate,
  formatFinancialAmountYuan as fen2yuan,
  formatFinancialTransactionType as formatTransactionType,
  formatFinancialTransactionUserType as formatUserType,
  getFinanceTransactionDirectionSign as transactionDirection,
}
