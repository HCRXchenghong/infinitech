<template>
  <div class="transaction-logs-toolbar">
    <span class="transaction-logs-title">财务日志</span>
    <div class="transaction-logs-actions">
      <el-select
        v-model="logFilter.type"
        placeholder="交易类型"
        size="small"
        clearable
        style="width: 140px"
        @change="handleFilterChange"
      >
        <el-option label="充值" value="recharge" />
        <el-option label="提现" value="withdraw" />
        <el-option label="支付" value="payment" />
        <el-option label="退款" value="refund" />
        <el-option label="赔付" value="compensation" />
        <el-option label="管理员充值" value="admin_add_balance" />
        <el-option label="管理员扣款" value="admin_deduct_balance" />
      </el-select>
      <el-select
        v-model="logFilter.userType"
        placeholder="用户类型"
        size="small"
        clearable
        style="width: 120px"
        @change="handleFilterChange"
      >
        <el-option label="用户" value="customer" />
        <el-option label="骑手" value="rider" />
        <el-option label="商户" value="merchant" />
      </el-select>
      <el-select
        v-model="logFilter.status"
        placeholder="状态"
        size="small"
        clearable
        style="width: 120px"
        @change="handleFilterChange"
      >
        <el-option label="成功" value="success" />
        <el-option label="处理中" value="processing" />
        <el-option label="失败" value="failed" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
      <el-input
        v-model="logFilter.userId"
        placeholder="用户ID"
        size="small"
        clearable
        style="width: 140px"
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button :icon="Search" @click="handleSearch" />
        </template>
      </el-input>
      <el-date-picker
        :model-value="dateRange"
        type="daterange"
        range-separator="-"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        size="small"
        value-format="YYYY-MM-DD"
        style="width: 240px"
        @update:model-value="updateDateRange"
        @change="handleFilterChange"
      />
      <el-button size="small" :loading="logsLoading" @click="reloadLogs">刷新</el-button>
      <el-button size="small" @click="resetFilters">重置</el-button>
      <el-button type="danger" plain size="small" :disabled="logsLoading" @click="openClearDialog">
        一键清除
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Search } from '@element-plus/icons-vue';

defineProps({
  logFilter: {
    type: Object,
    required: true,
  },
  dateRange: {
    default: () => [],
    validator: (value) => value == null || Array.isArray(value),
  },
  updateDateRange: {
    type: Function,
    required: true,
  },
  logsLoading: {
    type: Boolean,
    default: false,
  },
  handleFilterChange: {
    type: Function,
    required: true,
  },
  handleSearch: {
    type: Function,
    required: true,
  },
  reloadLogs: {
    type: Function,
    required: true,
  },
  resetFilters: {
    type: Function,
    required: true,
  },
  openClearDialog: {
    type: Function,
    required: true,
  },
});
</script>
