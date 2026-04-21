<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="480px"
    align-center
    @update:model-value="emit('update:visible', $event)"
  >
    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="用户ID">{{ userDialogData.userId }}</el-descriptions-item>
      <el-descriptions-item label="类型">{{ userDialogType === 'rider' ? '骑手' : '商户' }}</el-descriptions-item>
      <el-descriptions-item label="总收入">¥{{ fen2yuan(userDialogData.totalIncome) }}</el-descriptions-item>
      <el-descriptions-item label="订单收入">¥{{ fen2yuan(userDialogData.orderIncome) }}</el-descriptions-item>
      <el-descriptions-item label="小费收入">¥{{ fen2yuan(userDialogData.tipIncome) }}</el-descriptions-item>
      <el-descriptions-item label="奖励收入">¥{{ fen2yuan(userDialogData.bonusIncome) }}</el-descriptions-item>
      <el-descriptions-item label="总支出">¥{{ fen2yuan(userDialogData.totalExpense) }}</el-descriptions-item>
      <el-descriptions-item label="退款金额">¥{{ fen2yuan(userDialogData.refundAmount) }}</el-descriptions-item>
      <el-descriptions-item label="赔付金额">¥{{ fen2yuan(userDialogData.compensationAmount) }}</el-descriptions-item>
      <el-descriptions-item label="接单数">{{ userDialogData.orderCount }}</el-descriptions-item>
      <el-descriptions-item label="完成数">{{ userDialogData.completedOrderCount }}</el-descriptions-item>
      <el-descriptions-item label="取消数">{{ userDialogData.cancelledOrderCount }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  userDialogData: {
    type: Object,
    default: () => ({}),
  },
  userDialogType: {
    type: String,
    default: 'rider',
  },
  fen2yuan: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])

const dialogTitle = computed(() => {
  const prefix = props.userDialogType === 'rider' ? '骑手' : '商户'
  return `${prefix} · ${props.userDialogData.userId || ''}`
})
</script>
