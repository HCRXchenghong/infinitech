<template>
  <div class="workbench-page">
    <BlankPageHero
      :service-status="serviceStatus"
      :overall-status-label="overallStatusLabel"
      :pending-withdraw-count="pendingWithdrawCount"
      :auto-retry-pending-count="autoRetryPendingCount"
      :loading="loading"
      :load-workbench="loadWorkbench"
      :go="go"
      :format-time="formatTime"
    />

    <PageStateAlert :message="pageError" />

    <BlankPageSummaryGrid
      :service-status="serviceStatus"
      :up-service-count="upServiceCount"
      :down-service-count="downServiceCount"
      :journey-counts="journeyCounts"
      :gateway-ready-count="gatewayReadyCount"
      :gateway-mode-label="gatewayModeLabel"
      :rider-deposit-overview="riderDepositOverview"
    />

    <div class="workbench-main-grid">
      <BlankPageServiceHealthPanel
        :loading="loading"
        :service-status="serviceStatus"
        :overall-status-label="overallStatusLabel"
        :status-tag-type="statusTagType"
        :service-status-label="serviceStatusLabel"
        :format-service-detail="formatServiceDetail"
      />
      <BlankPageGatewayPanel
        :gateway-summary="gatewaySummary"
        :gateway-mode-label="gatewayModeLabel"
        :yes-no="yesNo"
        :go="go"
      />
    </div>

    <div class="workbench-main-grid">
      <BlankPageJourneysPanel
        :journeys="journeys"
        :journey-status-label="journeyStatusLabel"
        :status-tag-type="statusTagType"
      />
      <BlankPageWithdrawQueuePanel
        :recent-withdraw-requests="recentWithdrawRequests"
        :go="go"
        :user-type-label="userTypeLabel"
        :withdraw-method-label="withdrawMethodLabel"
        :format-fen="formatFen"
        :withdraw-status-tag="withdrawStatusTag"
        :withdraw-status-label="withdrawStatusLabel"
        :get-withdraw-auto-retry="getWithdrawAutoRetry"
        :workbench-withdraw-auto-retry-label="workbenchWithdrawAutoRetryLabel"
        :format-time="formatTime"
      />
    </div>

    <BlankPageQuickActionsPanel :go="go" />
  </div>
</template>

<script setup>
import './BlankPage.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'
import BlankPageGatewayPanel from './blankPageSections/BlankPageGatewayPanel.vue'
import BlankPageHero from './blankPageSections/BlankPageHero.vue'
import BlankPageJourneysPanel from './blankPageSections/BlankPageJourneysPanel.vue'
import BlankPageQuickActionsPanel from './blankPageSections/BlankPageQuickActionsPanel.vue'
import BlankPageServiceHealthPanel from './blankPageSections/BlankPageServiceHealthPanel.vue'
import BlankPageSummaryGrid from './blankPageSections/BlankPageSummaryGrid.vue'
import BlankPageWithdrawQueuePanel from './blankPageSections/BlankPageWithdrawQueuePanel.vue'

const router = useRouter()
const loading = ref(false)
const pageError = ref('')
const serviceStatus = reactive(createDefaultServiceHealthStatus())
const gatewaySummary = ref(createDefaultPaymentGatewaySummary())
const riderDepositOverview = ref({})
const withdrawRequests = ref([])

const overallStatusLabel = computed(() => journeyStatusLabel(serviceStatus.overall))
const upServiceCount = computed(() => serviceStatus.services.filter((item) => item.status === 'up' || item.status === 'ok' || item.status === 'ready').length)
const downServiceCount = computed(() => serviceStatus.services.filter((item) => item.status === 'down' || item.status === 'error').length)
const journeys = computed(() => Array.isArray(serviceStatus.journeys) ? serviceStatus.journeys : [])
const journeyCounts = computed(() => {
  return journeys.value.reduce((acc, item) => {
    const status = String(item?.status || 'unknown')
    if (status === 'ok' || status === 'ready') acc.ok += 1
    else if (status === 'degraded') acc.degraded += 1
    else acc.down += 1
    return acc
  }, { ok: 0, degraded: 0, down: 0 })
})
const gatewayReadyCount = computed(() => {
  let total = 0
  if (gatewaySummary.value.wechat?.ready) total += 1
  if (gatewaySummary.value.alipay?.ready) total += 1
  if (gatewaySummary.value.bankCard?.ready) total += 1
  return total
})
const gatewayModeLabel = computed(() => gatewaySummary.value.mode?.isProd ? '生产模式' : '开发 / 沙箱模式')
const pendingWithdrawCount = computed(() => {
  return withdrawRequests.value.filter((item) => ['pending', 'pending_review', 'pending_transfer', 'transferring'].includes(String(item?.status || ''))).length
})
const autoRetryPendingCount = computed(() => {
  return withdrawRequests.value.filter((item) => {
    const retry = getWithdrawAutoRetry(item)
    return String(item?.status || '') === 'failed' && Boolean(retry?.eligible) && String(retry?.nextRetryAt || '').trim() !== ''
  }).length
})
const recentWithdrawRequests = computed(() => {
  return withdrawRequests.value
    .filter((item) => ['pending', 'pending_review', 'pending_transfer', 'transferring', 'failed'].includes(String(item?.status || '')))
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
      request.get('/api/pay-center/withdraw-requests', { params: { page: 1, limit: 20 } }),
    ])

    const nextHealth = extractServiceHealthStatus(healthRes.data, { path: 'serviceStatus' })
    const healthPayload = extractEnvelopeData(healthRes.data) || {}
    serviceStatus.checkedAt = nextHealth.checkedAt
    serviceStatus.overall = nextHealth.overall
    serviceStatus.services = nextHealth.services
    serviceStatus.journeys = nextHealth.journeys
    gatewaySummary.value = normalizePaymentGatewaySummary(healthPayload.gateway_summary)
    riderDepositOverview.value = extractEnvelopeData(depositRes.data) || {}
    withdrawRequests.value = extractWithdrawRequestPage(withdrawRes.data).items
  } catch (error) {
    pageError.value = extractErrorMessage(error, '加载联调工作台失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadWorkbench)
</script>
