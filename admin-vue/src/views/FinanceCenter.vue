<template>
  <div class="finance-center-page">
    <FinanceCenterHeader
      :period-type="periodType"
      :stat-date="statDate"
      :exporting="exporting"
      :load-all="loadAll"
      :do-export="doExport"
      @update:period-type="handlePeriodTypeUpdate"
      @update:stat-date="handleStatDateUpdate"
    />

    <PageStateAlert :message="pageError" />

    <FinanceCenterMetricSection
      title="平台概览"
      :loading="overviewLoading"
      :cards="kpiCards"
      accent-color="#409eff"
      :open-kpi-detail="openKpiDetail"
    />

    <FinanceCenterMetricSection
      title="退款与赔付"
      :loading="overviewLoading"
      :cards="refundCards"
      accent-color="#f56c6c"
      :open-kpi-detail="openKpiDetail"
    />

    <FinanceCenterWalletSection
      :coin-ratio-ratio="coinRatio.ratio"
      :saving-coin-ratio="savingCoinRatio"
      :last-recharge="lastRecharge"
      :last-deduct="lastDeduct"
      :format-user-type="formatUserType"
      :update-coin-ratio="updateCoinRatio"
      :save-coin-ratio="saveCoinRatio"
      :open-recharge-dialog="openRechargeDialog"
      :open-deduct-dialog="openDeductDialog"
    />

    <FinanceCenterLeaderboardsSection
      :details-loading="detailsLoading"
      :details-error="detailsError"
      :rider-details="riderDetails"
      :merchant-details="merchantDetails"
      :open-user-detail="openUserDetail"
      :fen2yuan="fen2yuan"
    />

    <FinanceCenterLogsSection
      :logs-error="logsError"
      :transaction-logs="transactionLogs"
      :go-to-transaction-logs="goToTransactionLogs"
      :format-transaction-type="formatTransactionType"
      :format-user-type="formatUserType"
      :transaction-direction="transactionDirection"
      :fen2yuan="fen2yuan"
    />

    <FinanceCenterKpiDialog
      v-model:visible="kpiDialogVisible"
      :kpi-dialog-data="kpiDialogData"
      :overview="overview"
      :format-finance-date="formatFinanceDate"
    />

    <FinanceCenterUserDialog
      v-model:visible="userDialogVisible"
      :user-dialog-data="userDialogData"
      :user-dialog-type="userDialogType"
      :fen2yuan="fen2yuan"
    />

    <FinanceCenterWalletActionDialog
      v-model:visible="rechargeDialogVisible"
      title="账号充值"
      action-label="确认充值"
      action-type="primary"
      :form="rechargeForm"
      :loading="recharging"
      :submit-action="doRecharge"
    />

    <FinanceCenterWalletActionDialog
      v-model:visible="deductDialogVisible"
      title="账户扣款"
      action-label="确认扣款"
      action-type="danger"
      :form="deductForm"
      :loading="deducting"
      :submit-action="doDeduct"
    />
  </div>
</template>

<script setup>
import './FinanceCenter.css'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'
import FinanceCenterHeader from './financeCenterSections/FinanceCenterHeader.vue'
import FinanceCenterKpiDialog from './financeCenterSections/FinanceCenterKpiDialog.vue'
import FinanceCenterLeaderboardsSection from './financeCenterSections/FinanceCenterLeaderboardsSection.vue'
import FinanceCenterLogsSection from './financeCenterSections/FinanceCenterLogsSection.vue'
import FinanceCenterMetricSection from './financeCenterSections/FinanceCenterMetricSection.vue'
import FinanceCenterUserDialog from './financeCenterSections/FinanceCenterUserDialog.vue'
import FinanceCenterWalletActionDialog from './financeCenterSections/FinanceCenterWalletActionDialog.vue'
import FinanceCenterWalletSection from './financeCenterSections/FinanceCenterWalletSection.vue'
import {
  fen2yuan,
  formatFinanceDate,
  formatTransactionType,
  formatUserType,
  transactionDirection,
  useFinanceCenterPage,
} from './financeCenterHelpers'

const router = useRouter()

const {
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
} = useFinanceCenterPage({
  request,
  router,
  ElMessage,
})

function handlePeriodTypeUpdate(value) {
  periodType.value = value
}

function handleStatDateUpdate(value) {
  statDate.value = value
}
</script>
