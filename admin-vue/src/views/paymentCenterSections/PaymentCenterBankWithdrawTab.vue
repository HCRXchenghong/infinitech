<template>
  <el-card class="payment-center-panel">
    <template #header>
      <div class="payment-center-header-row">
        <span>银行卡人工打款队列</span>
        <div class="payment-center-header-actions">
          <span class="payment-center-bank-pending-count">待处理：{{ pendingBankWithdrawRequests.length }}</span>
          <el-button size="small" @click="loadAll">刷新</el-button>
        </div>
      </div>
    </template>
    <el-table :data="bankWithdrawRequests" size="small" stripe>
      <el-table-column prop="request_id" label="提现单号" min-width="180" />
      <el-table-column label="端类型" width="90">
        <template #default="{ row }">{{ withdrawUserTypeLabel(row.user_type) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ withdrawStatusLabel(row.status) }}</template>
      </el-table-column>
      <el-table-column label="申请/到账" min-width="150">
        <template #default="{ row }">￥{{ formatFen(row.amount) }} / ￥{{ formatFen(row.actual_amount) }}</template>
      </el-table-column>
      <el-table-column label="手续费" width="100">
        <template #default="{ row }">￥{{ formatFen(row.fee) }}</template>
      </el-table-column>
      <el-table-column prop="withdraw_name" label="收款人" width="120" />
      <el-table-column prop="bank_name" label="收款银行" min-width="140" />
      <el-table-column prop="bank_branch" label="收款支行" min-width="180" show-overflow-tooltip />
      <el-table-column label="收款卡号" min-width="160">
        <template #default="{ row }">{{ maskCardNo(row.withdraw_account) }}</template>
      </el-table-column>
      <el-table-column label="打款来源" min-width="220">
        <template #default="{ row }">
          <div class="payment-center-bank-detail-cell">
            <div>{{ row.payout_source_bank_name || '-' }}</div>
            <div class="payment-center-muted-text">{{ row.payout_source_account_name || '-' }} / {{ maskCardNo(row.payout_source_card_no) }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="打款凭证" width="120">
        <template #default="{ row }">
          <el-button v-if="row.payout_voucher_url" link type="primary" @click="openBankVoucher(row.payout_voucher_url)">查看凭证</el-button>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="驳回原因" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.reject_reason || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="300" fixed="right">
        <template #default="{ row }">
          <div class="payment-center-withdraw-actions">
            <el-button link @click="openWithdrawHistory(row)">处理轨迹</el-button>
            <el-button
              v-if="canWithdrawAction(row, 'approve')"
              link
              type="primary"
              :loading="withdrawActionLoading === `${row.request_id}:approve`"
              @click="submitWithdrawAction(row, 'approve')"
            >
              通过
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'reject')"
              link
              type="danger"
              :loading="withdrawActionLoading === `${row.request_id}:reject`"
              @click="submitWithdrawAction(row, 'reject')"
            >
              驳回
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'execute')"
              link
              type="primary"
              :loading="withdrawActionLoading === `${row.request_id}:execute`"
              @click="submitWithdrawAction(row, 'execute')"
            >
              尝试直连打款
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'sync_gateway_status')"
              link
              :loading="withdrawActionLoading === `${row.request_id}:sync_gateway_status`"
              @click="syncWithdrawStatus(row)"
            >
              同步状态
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'complete')"
              link
              type="success"
              :loading="withdrawActionLoading === `${row.request_id}:complete`"
              @click="openBankPayoutDialog(row)"
            >
              人工打款完成
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'fail')"
              link
              type="danger"
              :loading="withdrawActionLoading === `${row.request_id}:fail`"
              @click="submitWithdrawAction(row, 'fail')"
            >
              打款失败
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'retry_payout')"
              link
              type="warning"
              :loading="withdrawActionLoading === `${row.request_id}:retry_payout`"
              @click="retryWithdrawPayout(row)"
            >
              重试打款
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import {
  canWithdrawAction,
  maskCardNo,
  withdrawStatusLabel,
  withdrawUserTypeLabel,
} from '@infinitech/admin-core'
import { formatFen } from '../paymentCenterHelpers'

defineProps({
  loadAll: {
    type: Function,
    required: true,
  },
  pendingBankWithdrawRequests: {
    type: Array,
    default: () => [],
  },
  bankWithdrawRequests: {
    type: Array,
    default: () => [],
  },
  withdrawActionLoading: {
    type: String,
    default: '',
  },
  openWithdrawHistory: {
    type: Function,
    required: true,
  },
  submitWithdrawAction: {
    type: Function,
    required: true,
  },
  syncWithdrawStatus: {
    type: Function,
    required: true,
  },
  openBankPayoutDialog: {
    type: Function,
    required: true,
  },
  retryWithdrawPayout: {
    type: Function,
    required: true,
  },
  openBankVoucher: {
    type: Function,
    required: true,
  },
})
</script>
