<template>
  <el-dialog
    :model-value="visible"
    title="提现处理轨迹"
    width="820px"
    destroy-on-close
    @closed="resetWithdrawHistory"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="withdrawHistoryTarget.requestId" class="payment-center-history-header">
      <el-tag size="small" type="info">{{ withdrawHistoryTarget.requestId }}</el-tag>
      <span>{{ withdrawMethodLabel(withdrawHistoryTarget.method) }}</span>
      <span class="payment-center-muted-text">{{ withdrawUserTypeLabel(withdrawHistoryTarget.userType) }}</span>
      <span class="payment-center-muted-text">申请金额：{{ formatFen(withdrawHistoryTarget.amount) }}</span>
    </div>
    <el-table :data="withdrawActionHistory" size="small" stripe v-loading="withdrawHistoryLoading">
      <el-table-column label="处理时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="动作" width="170">
        <template #default="{ row }">{{ withdrawOperationTypeLabel(row.operation_type) }}</template>
      </el-table-column>
      <el-table-column label="处理人" min-width="160">
        <template #default="{ row }">{{ formatAdminWalletOperationActor(row) }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="处理说明" min-width="180" show-overflow-tooltip />
      <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
    </el-table>
    <el-empty v-if="!withdrawHistoryLoading && !withdrawActionHistory.length" description="暂无处理轨迹" />
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {
  formatAdminDateTime as formatDateTime,
  formatAdminWalletOperationActor,
  withdrawMethodLabel,
  withdrawOperationTypeLabel,
  withdrawUserTypeLabel,
} from '@infinitech/admin-core'
import { formatFen } from '../paymentCenterHelpers'

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  withdrawHistoryTarget: {
    type: Object,
    required: true,
  },
  withdrawActionHistory: {
    type: Array,
    default: () => [],
  },
  withdrawHistoryLoading: {
    type: Boolean,
    default: false,
  },
  resetWithdrawHistory: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
