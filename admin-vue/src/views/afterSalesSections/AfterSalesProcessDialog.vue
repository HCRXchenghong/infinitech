<template>
  <el-dialog
    :model-value="visible"
    title="处理售后申请"
    width="520px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form label-width="90px">
      <el-form-item label="售后单号">
        <span>{{ processForm.requestNo }}</span>
      </el-form-item>
      <el-form-item label="申请退款">
        <span>{{ processForm.requestedRefundAmount > 0 ? `¥${fen2yuan(processForm.requestedRefundAmount)}` : '-' }}</span>
      </el-form-item>
      <el-form-item label="处理状态">
        <el-select v-model="processForm.status" style="width: 100%">
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="退款处理">
        <el-radio-group v-model="processForm.shouldRefund">
          <el-radio :label="true">退款</el-radio>
          <el-radio :label="false">不退款</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="processForm.shouldRefund" label="退款金额">
        <el-input
          v-model="processForm.refundAmountYuan"
          placeholder="请输入退款金额（元）"
          clearable
        >
          <template #prepend>¥</template>
        </el-input>
      </el-form-item>
      <el-form-item label="退款说明">
        <el-input
          v-model="processForm.refundReason"
          type="textarea"
          :rows="2"
          placeholder="请输入退款/不退款说明（可选）"
        />
      </el-form-item>
      <el-form-item label="处理备注">
        <el-input
          v-model="processForm.adminRemark"
          type="textarea"
          :rows="4"
          placeholder="请输入处理说明（可选）"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitProcess">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  processForm: {
    type: Object,
    required: true,
  },
  statusOptions: {
    type: Array,
    default: () => [],
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  fen2yuan: {
    type: Function,
    required: true,
  },
  submitProcess: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
