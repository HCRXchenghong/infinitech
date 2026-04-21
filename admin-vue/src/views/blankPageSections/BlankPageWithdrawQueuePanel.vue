<template>
  <el-card class="workbench-panel">
    <template #header>
      <div class="workbench-panel-header">
        <span>待处理提现队列</span>
        <el-button link type="primary" @click="go('/payment-center')">去处理</el-button>
      </div>
    </template>
    <el-table :data="recentWithdrawRequests" size="small" stripe>
      <el-table-column prop="request_id" label="提现单号" min-width="180" />
      <el-table-column label="端类型" width="90">
        <template #default="{ row }">{{ userTypeLabel(row.user_type) }}</template>
      </el-table-column>
      <el-table-column label="渠道" width="110">
        <template #default="{ row }">{{ withdrawMethodLabel(row.withdraw_method) }}</template>
      </el-table-column>
      <el-table-column label="金额" width="110">
        <template #default="{ row }">￥{{ formatFen(row.amount) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <div class="workbench-withdraw-status-cell">
            <el-tag size="small" :type="withdrawStatusTag(row.status)">
              {{ withdrawStatusLabel(row.status) }}
            </el-tag>
            <span v-if="getWithdrawAutoRetry(row)" class="workbench-muted-text">
              {{ workbenchWithdrawAutoRetryLabel(row) }}
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
    </el-table>
    <div v-if="!recentWithdrawRequests.length" class="workbench-empty-note">
      当前没有需要跟进的提现请求。
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  recentWithdrawRequests: {
    type: Array,
    default: () => [],
  },
  go: {
    type: Function,
    required: true,
  },
  userTypeLabel: {
    type: Function,
    required: true,
  },
  withdrawMethodLabel: {
    type: Function,
    required: true,
  },
  formatFen: {
    type: Function,
    required: true,
  },
  withdrawStatusTag: {
    type: Function,
    required: true,
  },
  withdrawStatusLabel: {
    type: Function,
    required: true,
  },
  getWithdrawAutoRetry: {
    type: Function,
    required: true,
  },
  workbenchWithdrawAutoRetryLabel: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
});
</script>
