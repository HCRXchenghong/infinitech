import { computed, onMounted, reactive, ref } from 'vue'
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts'
import {
  createDefaultPaymentGatewaySummary,
  createDefaultServiceHealthStatus,
  extractServiceHealthStatus,
  extractWithdrawRequestPage,
  formatServiceHealthDetail as formatServiceDetail,
  formatAdminDateTime,
  getWithdrawAutoRetry,
  normalizePaymentGatewaySummary,
  serviceHealthJourneyStatusLabel as journeyStatusLabel,
  serviceHealthStatusLabel,
  serviceHealthStatusTag as statusTagType,
  withdrawAutoRetryLabel,
  withdrawMethodLabel,
  withdrawStatusLabel,
  withdrawStatusTag,
  withdrawUserTypeLabel as userTypeLabel,
} from '@infinitech/admin-core'

export function useBlankPage({ request, router }) {
  const loading = ref(false)
  const pageError = ref('')
  const serviceStatus = reactive(createDefaultServiceHealthStatus())
  const gatewaySummary = ref(createDefaultPaymentGatewaySummary())
  const riderDepositOverview = ref({})
  const withdrawRequests = ref([])

  const overallStatusLabel = computed(() => journeyStatusLabel(serviceStatus.overall))
  const upServiceCount = computed(() => {
    return serviceStatus.services.filter((item) => {
      return item.status === 'up' || item.status === 'ok' || item.status === 'ready'
    }).length
  })
  const downServiceCount = computed(() => {
    return serviceStatus.services.filter((item) => {
      return item.status === 'down' || item.status === 'error'
    }).length
  })
  const journeys = computed(() => {
    return Array.isArray(serviceStatus.journeys) ? serviceStatus.journeys : []
  })
  const journeyCounts = computed(() => {
    return journeys.value.reduce(
      (acc, item) => {
        const status = String(item?.status || 'unknown')
        if (status === 'ok' || status === 'ready') {
          acc.ok += 1
        } else if (status === 'degraded') {
          acc.degraded += 1
        } else {
          acc.down += 1
        }
        return acc
      },
      { ok: 0, degraded: 0, down: 0 },
    )
  })
  const gatewayReadyCount = computed(() => {
    let total = 0
    if (gatewaySummary.value.wechat?.ready) total += 1
    if (gatewaySummary.value.alipay?.ready) total += 1
    if (gatewaySummary.value.bankCard?.ready) total += 1
    return total
  })
  const gatewayModeLabel = computed(() => {
    return gatewaySummary.value.mode?.isProd ? '生产模式' : '开发 / 沙箱模式'
  })
  const pendingWithdrawCount = computed(() => {
    return withdrawRequests.value.filter((item) => {
      return ['pending', 'pending_review', 'pending_transfer', 'transferring'].includes(
        String(item?.status || ''),
      )
    }).length
  })
  const autoRetryPendingCount = computed(() => {
    return withdrawRequests.value.filter((item) => {
      const retry = getWithdrawAutoRetry(item)
      return (
        String(item?.status || '') === 'failed'
        && Boolean(retry?.eligible)
        && String(retry?.nextRetryAt || '').trim() !== ''
      )
    }).length
  })
  const recentWithdrawRequests = computed(() => {
    return withdrawRequests.value
      .filter((item) => {
        return [
          'pending',
          'pending_review',
          'pending_transfer',
          'transferring',
          'failed',
        ].includes(String(item?.status || ''))
      })
      .slice(0, 8)
  })

  function go(path) {
    router.push(path)
  }

  function yesNo(value) {
    return value ? '已配置' : '未配置'
  }

  function formatTime(value) {
    return formatAdminDateTime(value, { includeSeconds: true })
  }

  function formatFen(value) {
    return (Number(value || 0) / 100).toFixed(2)
  }

  function workbenchWithdrawAutoRetryLabel(row) {
    return withdrawAutoRetryLabel(row, {
      disabledLabel: '',
      includeNextRetryAt: true,
      formatDateTime: formatTime,
    })
  }

  async function loadWorkbench() {
    loading.value = true
    pageError.value = ''

    try {
      const [healthRes, depositRes, withdrawRes] = await Promise.all([
        request.get('/api/pay-center/health'),
        request.get('/api/rider-deposit/overview'),
        request.get('/api/pay-center/withdraw-requests', {
          params: { page: 1, limit: 20 },
        }),
      ])

      const nextHealth = extractServiceHealthStatus(healthRes.data, {
        path: 'serviceStatus',
      })
      const healthPayload = extractEnvelopeData(healthRes.data) || {}

      serviceStatus.checkedAt = nextHealth.checkedAt
      serviceStatus.overall = nextHealth.overall
      serviceStatus.services = nextHealth.services
      serviceStatus.journeys = nextHealth.journeys
      gatewaySummary.value = normalizePaymentGatewaySummary(
        healthPayload.gateway_summary,
      )
      riderDepositOverview.value = extractEnvelopeData(depositRes.data) || {}
      withdrawRequests.value = extractWithdrawRequestPage(withdrawRes.data).items
    } catch (error) {
      pageError.value = extractErrorMessage(error, '加载联调工作台失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(loadWorkbench)

  return {
    autoRetryPendingCount,
    downServiceCount,
    formatFen,
    formatServiceDetail,
    formatTime,
    gatewayModeLabel,
    gatewayReadyCount,
    gatewaySummary,
    getWithdrawAutoRetry,
    go,
    journeyCounts,
    journeys,
    journeyStatusLabel: journeyStatusLabel,
    loadWorkbench,
    loading,
    overallStatusLabel,
    pageError,
    pendingWithdrawCount,
    recentWithdrawRequests,
    riderDepositOverview,
    serviceStatus,
    serviceStatusLabel,
    statusTagType,
    upServiceCount,
    userTypeLabel,
    withdrawMethodLabel,
    withdrawStatusLabel,
    withdrawStatusTag,
    workbenchWithdrawAutoRetryLabel,
    yesNo,
  }
}
