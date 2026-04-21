<template>
  <el-card class="payment-center-panel">
    <template #header>
      <div class="payment-center-header-row">
        <span>提现处理队列</span>
        <div class="payment-center-header-actions">
          <span class="payment-center-bank-pending-count">自动重试待执行：{{ autoRetryWithdrawCount }}</span>
          <el-select v-model="withdrawFilter.status" clearable placeholder="状态" style="width: 120px">
            <el-option label="待审核" value="pending_review" />
            <el-option label="待打款" value="pending_transfer" />
            <el-option label="转账中" value="transferring" />
            <el-option label="已完成" value="success" />
            <el-option label="已失败" value="failed" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
          <el-select v-model="withdrawFilter.userType" clearable placeholder="端类型" style="width: 120px">
            <el-option label="用户" value="customer" />
            <el-option label="骑手" value="rider" />
            <el-option label="商户" value="merchant" />
          </el-select>
          <el-select v-model="withdrawFilter.withdrawMethod" clearable placeholder="提现渠道" style="width: 140px">
            <el-option label="微信提现" value="wechat" />
            <el-option label="支付宝提现" value="alipay" />
            <el-option label="银行卡提现" value="bank_card" />
          </el-select>
          <el-button size="small" @click="loadAll">刷新</el-button>
        </div>
      </div>
    </template>
    <el-table :data="filteredWithdrawRequests" size="small" stripe>
      <el-table-column prop="request_id" label="提现单号" min-width="180" />
      <el-table-column label="端类型" width="90">
        <template #default="{ row }">{{ withdrawUserTypeLabel(row.user_type) }}</template>
      </el-table-column>
      <el-table-column label="提现渠道" width="110">
        <template #default="{ row }">{{ withdrawMethodLabel(row.withdraw_method) }}</template>
      </el-table-column>
      <el-table-column label="申请金额" width="110">
        <template #default="{ row }">¥{{ formatFen(row.amount) }}</template>
      </el-table-column>
      <el-table-column label="手续费" width="100">
        <template #default="{ row }">¥{{ formatFen(row.fee) }}</template>
      </el-table-column>
      <el-table-column label="到账金额" width="110">
        <template #default="{ row }">¥{{ formatFen(row.actual_amount) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <div class="payment-center-retry-cell">
            <span>{{ withdrawStatusLabel(row.status) }}</span>
            <template v-if="getWithdrawAutoRetry(row)">
              <el-tag size="small" :type="withdrawAutoRetryTag(row)">
                {{ withdrawAutoRetryLabel(row) }}
              </el-tag>
              <span class="payment-center-muted-text">{{ withdrawAutoRetryHint(row) }}</span>
            </template>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="withdraw_account" label="收款账号" min-width="180" show-overflow-tooltip />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="处理时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.reviewed_at || row.completed_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="260" fixed="right">
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
              v-if="canWithdrawAction(row, 'sync_gateway_status')"
              link
              :loading="withdrawActionLoading === `${row.request_id}:sync_gateway_status`"
              @click="syncWithdrawStatus(row)"
            >
              同步状态
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'execute')"
              link
              type="primary"
              :loading="withdrawActionLoading === `${row.request_id}:execute`"
              @click="submitWithdrawAction(row, 'execute')"
            >
              发起打款
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'mark_processing')"
              link
              :loading="withdrawActionLoading === `${row.request_id}:mark_processing`"
              @click="submitWithdrawAction(row, 'mark_processing')"
            >
              转账中
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'complete')"
              link
              type="success"
              :loading="withdrawActionLoading === `${row.request_id}:complete`"
              @click="submitWithdrawAction(row, 'complete')"
            >
              打款成功
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
            <el-button
              v-if="canWithdrawAction(row, 'supplement_success')"
              link
              type="success"
              :loading="withdrawActionLoading === `${row.request_id}:supplement_success`"
              @click="supplementWithdraw(row, 'supplement_success')"
            >
              补记成功
            </el-button>
            <el-button
              v-if="canWithdrawAction(row, 'supplement_fail')"
              link
              type="danger"
              :loading="withdrawActionLoading === `${row.request_id}:supplement_fail`"
              @click="supplementWithdraw(row, 'supplement_fail')"
            >
              补记失败
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
  getWithdrawAutoRetry,
  withdrawAutoRetryHint,
  withdrawAutoRetryLabel,
  withdrawAutoRetryTag,
  withdrawMethodLabel,
  withdrawStatusLabel,
  withdrawUserTypeLabel,
  formatAdminDateTime as formatDateTime,
} from '@infinitech/admin-core'
import { formatFen } from '../paymentCenterHelpers'

defineProps({
  loadAll: {
    type: Function,
    required: true,
  },
  autoRetryWithdrawCount: {
    type: Number,
    default: 0,
  },
  withdrawFilter: {
    type: Object,
    required: true,
  },
  filteredWithdrawRequests: {
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
  retryWithdrawPayout: {
    type: Function,
    required: true,
  },
  supplementWithdraw: {
    type: Function,
    required: true,
  },
})
</script>
