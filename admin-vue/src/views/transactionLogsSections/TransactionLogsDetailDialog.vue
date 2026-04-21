<template>
  <el-dialog
    :model-value="visible"
    title="交易详情"
    width="600px"
    align-center
    @update:model-value="emit('update:visible', $event)"
  >
    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="交易ID" :span="2">{{ detailData.transactionId }}</el-descriptions-item>
      <el-descriptions-item label="用户ID">{{ detailData.userId }}</el-descriptions-item>
      <el-descriptions-item label="用户类型">{{ formatUserType(detailData.userType) }}</el-descriptions-item>
      <el-descriptions-item label="交易类型">{{ formatTransactionType(detailData.type) }}</el-descriptions-item>
      <el-descriptions-item label="业务类型">{{ detailData.businessType || '-' }}</el-descriptions-item>
      <el-descriptions-item label="业务ID" :span="2">{{ detailData.businessId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="金额">¥{{ fen2yuan(detailData.amount) }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ formatStatus(detailData.status) }}</el-descriptions-item>
      <el-descriptions-item label="变动前余额">¥{{ fen2yuan(detailData.balanceBefore) }}</el-descriptions-item>
      <el-descriptions-item label="变动后余额">¥{{ fen2yuan(detailData.balanceAfter) }}</el-descriptions-item>
      <el-descriptions-item label="支付方式">{{ detailData.paymentMethod || '-' }}</el-descriptions-item>
      <el-descriptions-item label="支付渠道">{{ detailData.paymentChannel || '-' }}</el-descriptions-item>
      <el-descriptions-item label="操作员ID">{{ detailData.operatorId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="操作员姓名">{{ detailData.operatorName || '-' }}</el-descriptions-item>
      <el-descriptions-item label="创建时间" :span="2">{{ formatDateTime(detailData.createdAt) }}</el-descriptions-item>
      <el-descriptions-item label="完成时间" :span="2">{{ formatDateTime(detailData.completedAt) }}</el-descriptions-item>
      <el-descriptions-item label="说明" :span="2">{{ detailData.description || '-' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  detailData: {
    type: Object,
    required: true,
  },
  formatUserType: {
    type: Function,
    required: true,
  },
  formatTransactionType: {
    type: Function,
    required: true,
  },
  fen2yuan: {
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
});

const emit = defineEmits(['update:visible']);
</script>
