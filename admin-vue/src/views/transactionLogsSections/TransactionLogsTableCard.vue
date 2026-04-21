<template>
  <el-card class="transaction-logs-card">
    <PageStateAlert :message="loadError" />
    <div v-if="logsLoading">
      <el-skeleton :rows="10" animated />
    </div>
    <el-table v-else :data="transactionLogs" size="small" stripe>
      <el-table-column prop="transactionId" label="交易ID" width="200" show-overflow-tooltip />
      <el-table-column label="用户" width="140">
        <template #default="{ row }">
          <div class="transaction-logs-user">
            <span class="transaction-logs-user-type">{{ formatUserType(row.userType) }}</span>
            <span class="transaction-logs-user-id">#{{ row.userId }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ formatTransactionType(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="120" align="right">
        <template #default="{ row }">
          <span
            class="transaction-logs-amount"
            :class="isIncomeType(row.type) ? 'income' : 'expense'"
          >
            {{ isIncomeType(row.type) ? '+' : '-' }}¥{{ fen2yuan(row.amount) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="余额变化" width="200" align="right">
        <template #default="{ row }">
          <span class="transaction-logs-balance-before">¥{{ fen2yuan(row.balanceBefore) }}</span>
          <span class="transaction-logs-balance-arrow">→</span>
          <span class="transaction-logs-balance-after">¥{{ fen2yuan(row.balanceAfter) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getFinancialTransactionStatusTagType(row.status)" size="small">
            {{ formatStatus(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="支付方式" width="100">
        <template #default="{ row }">{{ row.paymentMethod || '-' }}</template>
      </el-table-column>
      <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作员" width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <div v-if="row.operatorName" class="transaction-logs-operator">
            <span class="transaction-logs-operator-name">{{ row.operatorName }}</span>
            <span class="transaction-logs-operator-id">{{ row.operatorId }}</span>
          </div>
          <span v-else class="transaction-logs-operator-empty">-</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="showDetail(row)">详情</el-button>
          <el-button link type="danger" size="small" @click="openDeleteDialog(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty
          :description="loadError ? '加载失败，暂无可显示数据' : '暂无日志数据'"
          :image-size="90"
        />
      </template>
    </el-table>
    <el-pagination
      v-if="logPagination.total > 0"
      :current-page="logPagination.page"
      :page-size="logPagination.limit"
      :total="logPagination.total"
      :page-sizes="[20, 50, 100, 200]"
      layout="total, sizes, prev, pager, next, jumper"
      class="transaction-logs-pagination"
      @current-change="handlePageChange"
      @size-change="handlePageSizeChange"
    />
  </el-card>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';

defineProps({
  transactionLogs: {
    type: Array,
    default: () => [],
  },
  logsLoading: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: '',
  },
  logPagination: {
    type: Object,
    required: true,
  },
  formatUserType: {
    type: Function,
    required: true,
  },
  getTypeTagType: {
    type: Function,
    required: true,
  },
  formatTransactionType: {
    type: Function,
    required: true,
  },
  isIncomeType: {
    type: Function,
    required: true,
  },
  fen2yuan: {
    type: Function,
    required: true,
  },
  getFinancialTransactionStatusTagType: {
    type: Function,
    required: true,
  },
  formatStatus: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
  showDetail: {
    type: Function,
    required: true,
  },
  openDeleteDialog: {
    type: Function,
    required: true,
  },
  handlePageChange: {
    type: Function,
    required: true,
  },
  handlePageSizeChange: {
    type: Function,
    required: true,
  },
});
</script>
