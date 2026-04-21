<template>
  <el-card class="card">
    <div class="card-title logs-title-row">
      <span>财务日志</span>
      <el-button type="primary" size="small" @click="goToTransactionLogs">查看全部日志</el-button>
    </div>
    <PageStateAlert :message="logsError" />
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item label="功能说明">
        <span class="logs-tip">记录所有金额变动，包括充值、提现、支付、退款、赔付等操作</span>
      </el-descriptions-item>
      <el-descriptions-item label="最近更新">
        <span v-if="transactionLogs.length > 0" class="logs-latest">
          {{ formatTransactionType(transactionLogs[0].type) }} ·
          {{ formatUserType(transactionLogs[0].userType) }}
          #{{ transactionLogs[0].userId }} ·
          {{ transactionDirection(transactionLogs[0].type) }}¥{{ fen2yuan(transactionLogs[0].amount) }}
        </span>
        <span v-else class="logs-empty">暂无记录</span>
      </el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue'

defineProps({
  logsError: {
    type: String,
    default: '',
  },
  transactionLogs: {
    type: Array,
    default: () => [],
  },
  goToTransactionLogs: {
    type: Function,
    required: true,
  },
  formatTransactionType: {
    type: Function,
    required: true,
  },
  formatUserType: {
    type: Function,
    required: true,
  },
  transactionDirection: {
    type: Function,
    required: true,
  },
  fen2yuan: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped>
.logs-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logs-tip {
  color: #6b7280;
  font-size: 13px;
}

.logs-latest {
  color: #374151;
  font-size: 13px;
}

.logs-empty {
  color: #9ca3af;
  font-size: 13px;
}
</style>
