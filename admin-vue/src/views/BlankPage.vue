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
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'
import BlankPageGatewayPanel from './blankPageSections/BlankPageGatewayPanel.vue'
import BlankPageHero from './blankPageSections/BlankPageHero.vue'
import BlankPageJourneysPanel from './blankPageSections/BlankPageJourneysPanel.vue'
import BlankPageQuickActionsPanel from './blankPageSections/BlankPageQuickActionsPanel.vue'
import BlankPageServiceHealthPanel from './blankPageSections/BlankPageServiceHealthPanel.vue'
import BlankPageSummaryGrid from './blankPageSections/BlankPageSummaryGrid.vue'
import BlankPageWithdrawQueuePanel from './blankPageSections/BlankPageWithdrawQueuePanel.vue'
import { useBlankPage } from './blankPageHelpers'

const router = useRouter()

const {
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
  journeyStatusLabel,
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
} = useBlankPage({
  request,
  router,
})
</script>
