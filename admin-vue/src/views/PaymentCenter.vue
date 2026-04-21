<template>
  <div class="payment-center-page">
    <PaymentCenterHeroOverview
      :loading="loading"
      :saving="saving"
      :load-all="loadAll"
      :save-all="saveAll"
      :rider-deposit-overview="riderDepositOverview"
      :gateway-summary="gatewaySummary"
    />

    <PageStateAlert :message="pageError" />

    <el-tabs v-model="activeTab" class="payment-center-tabs">
      <el-tab-pane label="支付基础" name="basic">
        <PaymentCenterBasicTab :state="state" />
      </el-tab-pane>

      <el-tab-pane label="渠道矩阵" name="channels">
        <PaymentCenterChannelsTab
          :state="state"
          :add-channel-row="addChannelRow"
          :remove-row="removeRow"
        />
      </el-tab-pane>

      <el-tab-pane label="提现费" name="fees">
        <PaymentCenterFeesTab
          :state="state"
          :add-fee-rule="addFeeRule"
          :remove-row="removeRow"
        />
      </el-tab-pane>

      <el-tab-pane label="分账规则" name="settlement">
        <PaymentCenterSettlementTab
          :state="state"
          :add-subject="addSubject"
          :remove-row="removeRow"
          :preview-form="previewForm"
          :previewing="previewing"
          :run-preview="runPreview"
          :settlement-preview-entries="settlementPreviewEntries"
          :settlement-lookup-form="settlementLookupForm"
          :settlement-lookup-loading="settlementLookupLoading"
          :load-settlement-order="loadSettlementOrder"
          :reset-settlement-order="resetSettlementOrder"
          :settlement-order-detail="settlementOrderDetail"
          :format-fen="formatFen"
          :format-fen-or-dash="formatFenOrDash"
          :pretty-json="prettyJson"
        />
      </el-tab-pane>

      <el-tab-pane label="保证金与提现" name="deposit">
        <PaymentCenterDepositTab :state="state" />
      </el-tab-pane>
      <el-tab-pane label="提现处理" name="withdraw">
        <PaymentCenterWithdrawTab
          :load-all="loadAll"
          :auto-retry-withdraw-count="autoRetryWithdrawCount"
          :withdraw-filter="withdrawFilter"
          :filtered-withdraw-requests="filteredWithdrawRequests"
          :withdraw-action-loading="withdrawActionLoading"
          :open-withdraw-history="openWithdrawHistory"
          :submit-withdraw-action="submitWithdrawAction"
          :sync-withdraw-status="syncWithdrawStatus"
          :retry-withdraw-payout="retryWithdrawPayout"
          :supplement-withdraw="supplementWithdraw"
        />
      </el-tab-pane>
      <el-tab-pane label="银行卡处理" name="bank-withdraw">
        <PaymentCenterBankWithdrawTab
          :load-all="loadAll"
          :pending-bank-withdraw-requests="pendingBankWithdrawRequests"
          :bank-withdraw-requests="bankWithdrawRequests"
          :withdraw-action-loading="withdrawActionLoading"
          :open-withdraw-history="openWithdrawHistory"
          :submit-withdraw-action="submitWithdrawAction"
          :sync-withdraw-status="syncWithdrawStatus"
          :open-bank-payout-dialog="openBankPayoutDialog"
          :retry-withdraw-payout="retryWithdrawPayout"
          :open-bank-voucher="openBankVoucher"
        />
      </el-tab-pane>
      <el-tab-pane label="回调日志" name="callback-logs">
        <PaymentCenterCallbackLogsTab
          :state="state"
          :callback-loading="callbackLoading"
          :callback-filter="callbackFilter"
          :load-payment-callbacks="loadPaymentCallbacks"
          :reset-callback-filters="resetCallbackFilters"
          :callback-replay-loading="callbackReplayLoading"
          :open-payment-callback-detail="openPaymentCallbackDetail"
          :replay-payment-callback="replayPaymentCallback"
        />
      </el-tab-pane>
    </el-tabs>

    <PaymentCenterBankPayoutDialog
      v-model:visible="bankPayoutDialogVisible"
      :bank-payout-form="bankPayoutForm"
      :bank-payout-submitting="bankPayoutSubmitting"
      :submit-bank-payout-complete="submitBankPayoutComplete"
      :handle-bank-payout-dialog-closed="handleBankPayoutDialogClosed"
    />
    <PaymentCenterWithdrawHistoryDialog
      v-model:visible="withdrawHistoryDialogVisible"
      :withdraw-history-target="withdrawHistoryTarget"
      :withdraw-action-history="withdrawActionHistory"
      :withdraw-history-loading="withdrawHistoryLoading"
      :reset-withdraw-history="resetWithdrawHistory"
    />
    <PaymentCenterCallbackDetailDrawer
      v-model:visible="callbackDetailVisible"
      :callback-detail="callbackDetail"
      :callback-detail-loading="callbackDetailLoading"
      :callback-replay-loading="callbackReplayLoading"
      :replay-payment-callback="replayPaymentCallback"
    />
  </div>
</template>

<script setup>
import './PaymentCenter.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'
import PaymentCenterBankPayoutDialog from './paymentCenterSections/PaymentCenterBankPayoutDialog.vue'
import PaymentCenterBankWithdrawTab from './paymentCenterSections/PaymentCenterBankWithdrawTab.vue'
import PaymentCenterBasicTab from './paymentCenterSections/PaymentCenterBasicTab.vue'
import PaymentCenterCallbackDetailDrawer from './paymentCenterSections/PaymentCenterCallbackDetailDrawer.vue'
import PaymentCenterCallbackLogsTab from './paymentCenterSections/PaymentCenterCallbackLogsTab.vue'
import PaymentCenterChannelsTab from './paymentCenterSections/PaymentCenterChannelsTab.vue'
import PaymentCenterDepositTab from './paymentCenterSections/PaymentCenterDepositTab.vue'
import PaymentCenterFeesTab from './paymentCenterSections/PaymentCenterFeesTab.vue'
import PaymentCenterHeroOverview from './paymentCenterSections/PaymentCenterHeroOverview.vue'
import PaymentCenterSettlementTab from './paymentCenterSections/PaymentCenterSettlementTab.vue'
import PaymentCenterWithdrawHistoryDialog from './paymentCenterSections/PaymentCenterWithdrawHistoryDialog.vue'
import PaymentCenterWithdrawTab from './paymentCenterSections/PaymentCenterWithdrawTab.vue'
import {
  formatFen,
  formatFenOrDash,
  prettyJson,
  usePaymentCenterPage,
} from './paymentCenterHelpers'

const {
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
  resetWithdrawHistory,
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
} = usePaymentCenterPage({
  request,
  ElMessage,
  ElMessageBox,
})
</script>
