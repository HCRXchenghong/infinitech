<template>
  <el-card class="payment-center-panel">
    <template #header>
      <div class="payment-center-header-row">
        <span>支付回调与出款日志</span>
        <div class="payment-center-header-actions">
          <el-button size="small" :loading="callbackLoading" @click="loadPaymentCallbacks">刷新</el-button>
        </div>
      </div>
    </template>
    <div class="payment-center-filter-row">
      <el-select v-model="callbackFilter.channel" clearable placeholder="渠道" style="width: 140px">
        <el-option label="微信" value="wechat" />
        <el-option label="支付宝" value="alipay" />
        <el-option label="银行卡" value="bank_card" />
      </el-select>
      <el-select v-model="callbackFilter.eventType" clearable placeholder="事件" style="width: 180px">
        <el-option label="支付成功" value="payment.success" />
        <el-option label="支付失败" value="payment.fail" />
        <el-option label="退款成功" value="refund.success" />
        <el-option label="退款失败" value="refund.fail" />
        <el-option label="出款成功" value="payout.success" />
        <el-option label="出款失败" value="payout.fail" />
        <el-option label="处理中" value="payout.processing" />
      </el-select>
      <el-select v-model="callbackFilter.status" clearable placeholder="处理状态" style="width: 160px">
        <el-option label="已处理" value="success" />
        <el-option label="待处理" value="pending" />
        <el-option label="处理失败" value="failed" />
        <el-option label="已忽略" value="ignored" />
      </el-select>
      <el-select v-model="callbackFilter.verified" clearable placeholder="验签" style="width: 140px">
        <el-option label="通过" value="true" />
        <el-option label="失败" value="false" />
      </el-select>
      <el-input v-model="callbackFilter.transactionId" clearable placeholder="关联交易号" style="width: 220px" />
      <el-input v-model="callbackFilter.thirdPartyOrderId" clearable placeholder="第三方单号" style="width: 220px" />
      <el-button type="primary" :loading="callbackLoading" @click="loadPaymentCallbacks">筛选</el-button>
      <el-button @click="resetCallbackFilters">重置</el-button>
    </div>
    <el-table :data="state.paymentCallbacks" size="small" stripe v-loading="callbackLoading">
      <el-table-column prop="callback_id" label="回调号" min-width="180" />
      <el-table-column label="渠道" width="100">
        <template #default="{ row }">{{ paymentCallbackChannelLabel(row.channel) }}</template>
      </el-table-column>
      <el-table-column prop="event_type" label="事件" min-width="140" />
      <el-table-column label="处理状态" width="120">
        <template #default="{ row }">
          <el-tag :type="paymentCallbackStatusTag(row)" size="small">{{ paymentCallbackStatusLabel(row) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="关联交易" min-width="160">
        <template #default="{ row }">{{ row.transaction_id || row.transaction?.transaction_id || '-' }}</template>
      </el-table-column>
      <el-table-column label="第三方单号" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.third_party_order_id || row.transaction?.third_party_order_id || '-' }}</template>
      </el-table-column>
      <el-table-column label="请求摘要" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="payment-center-callback-preview-cell">
            <span>{{ row.request_body_preview || '-' }}</span>
            <el-tag v-if="row.is_admin_replay" size="small" type="warning">后台重放</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="处理时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.processed_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPaymentCallbackDetail(row)">详情</el-button>
          <el-button
            v-if="canReplayPaymentCallback(row)"
            link
            type="warning"
            :loading="callbackReplayLoading === (row.callback_id || row.callbackId)"
            @click="replayPaymentCallback(row)"
          >
            重放
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import {
  canReplayPaymentCallback,
  formatAdminDateTime as formatDateTime,
  paymentCallbackChannelLabel,
  paymentCallbackStatusLabel,
  paymentCallbackStatusTag,
} from '@infinitech/admin-core'

defineProps({
  state: {
    type: Object,
    required: true,
  },
  callbackLoading: {
    type: Boolean,
    default: false,
  },
  callbackFilter: {
    type: Object,
    required: true,
  },
  loadPaymentCallbacks: {
    type: Function,
    required: true,
  },
  resetCallbackFilters: {
    type: Function,
    required: true,
  },
  callbackReplayLoading: {
    type: String,
    default: '',
  },
  openPaymentCallbackDetail: {
    type: Function,
    required: true,
  },
  replayPaymentCallback: {
    type: Function,
    required: true,
  },
})
</script>
