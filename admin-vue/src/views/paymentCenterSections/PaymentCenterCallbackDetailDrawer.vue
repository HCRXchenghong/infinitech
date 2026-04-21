<template>
  <el-drawer
    :model-value="visible"
    title="回调详情"
    size="720px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="callbackDetail" v-loading="callbackDetailLoading" class="payment-center-callback-detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="回调号">{{ callbackDetail.callback_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="渠道">{{ paymentCallbackChannelLabel(callbackDetail.channel) }}</el-descriptions-item>
        <el-descriptions-item label="事件">{{ callbackDetail.event_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理状态">{{ paymentCallbackStatusLabel(callbackDetail) }}</el-descriptions-item>
        <el-descriptions-item label="关联交易">{{ callbackDetail.transaction_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="第三方单号">{{ callbackDetail.third_party_order_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(callbackDetail.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="处理时间">{{ formatDateTime(callbackDetail.processed_at) }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ callbackDetail.is_admin_replay ? '后台重放' : '原始回调' }}</el-descriptions-item>
        <el-descriptions-item label="来源回调">{{ callbackDetail.replayed_from_callback_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="重放管理员">{{ callbackDetail.replay_admin_name || callbackDetail.replay_admin_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="验签指纹" :span="2">{{ callbackDetail.replay_fingerprint || '-' }}</el-descriptions-item>
      </el-descriptions>
      <div class="payment-center-callback-actions">
        <el-button
          v-if="canReplayPaymentCallback(callbackDetail)"
          type="warning"
          plain
          :loading="callbackReplayLoading === (callbackDetail.callback_id || callbackDetail.callbackId)"
          @click="replayPaymentCallback(callbackDetail)"
        >
          重放这条已验签回调
        </el-button>
        <span class="payment-center-hint">适用于异步回调已入库但业务链未正确推进时的后台补偿处理。</span>
      </div>

      <el-card class="payment-center-panel payment-center-detail-panel" v-if="callbackDetail.transaction">
        <template #header>关联交易</template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="交易号">{{ callbackDetail.transaction.transaction_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ callbackDetail.transaction.status || '-' }}</el-descriptions-item>
          <el-descriptions-item label="业务类型">{{ callbackDetail.transaction.business_type || '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付渠道">{{ callbackDetail.transaction.payment_channel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ callbackDetail.transaction.user_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="端类型">{{ withdrawUserTypeLabel(callbackDetail.transaction.user_type) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="payment-center-panel payment-center-detail-panel" v-if="callbackDetail.withdraw">
        <template #header>关联提现单</template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="提现单号">{{ callbackDetail.withdraw.request_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提现状态">{{ withdrawStatusLabel(callbackDetail.withdraw.status) }}</el-descriptions-item>
          <el-descriptions-item label="提现渠道">{{ withdrawMethodLabel(callbackDetail.withdraw.withdraw_method) }}</el-descriptions-item>
          <el-descriptions-item label="申请到账">{{ formatFen(callbackDetail.withdraw.actual_amount) }}</el-descriptions-item>
          <el-descriptions-item label="手续费">{{ formatFen(callbackDetail.withdraw.fee) }}</el-descriptions-item>
          <el-descriptions-item label="处理说明">{{ callbackDetail.withdraw.transfer_result || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="payment-center-panel payment-center-detail-panel">
        <template #header>请求头</template>
        <pre class="payment-center-json-block">{{ prettyJson(callbackDetail.request_headers_raw || callbackDetail.request_headers) }}</pre>
      </el-card>
      <el-card class="payment-center-panel payment-center-detail-panel">
        <template #header>请求体</template>
        <pre class="payment-center-json-block">{{ prettyJson(callbackDetail.request_body_raw || callbackDetail.request_body) }}</pre>
      </el-card>
      <el-card class="payment-center-panel payment-center-detail-panel">
        <template #header>响应体</template>
        <pre class="payment-center-json-block">{{ prettyJson(callbackDetail.response_body_raw || callbackDetail.response_body) }}</pre>
      </el-card>
    </div>
  </el-drawer>
</template>

<script setup>
import {
  canReplayPaymentCallback,
  formatAdminDateTime as formatDateTime,
  paymentCallbackChannelLabel,
  paymentCallbackStatusLabel,
  withdrawMethodLabel,
  withdrawStatusLabel,
  withdrawUserTypeLabel,
} from '@infinitech/admin-core'
import { formatFen, prettyJson } from '../paymentCenterHelpers'

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  callbackDetail: {
    type: Object,
    default: null,
  },
  callbackDetailLoading: {
    type: Boolean,
    default: false,
  },
  callbackReplayLoading: {
    type: String,
    default: '',
  },
  replayPaymentCallback: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
