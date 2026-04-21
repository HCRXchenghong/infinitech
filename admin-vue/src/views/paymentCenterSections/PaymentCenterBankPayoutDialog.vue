<template>
  <el-dialog
    :model-value="visible"
    title="银行卡人工打款完成"
    width="720px"
    destroy-on-close
    @closed="handleBankPayoutDialogClosed"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form label-width="120px">
      <el-form-item label="提现单号">
        <el-input :model-value="bankPayoutForm.requestId" disabled />
      </el-form-item>
      <el-form-item label="打款凭证" required>
        <ImageUpload v-model="bankPayoutForm.payoutVoucherUrl" upload-domain="admin_asset" />
      </el-form-item>
      <el-form-item label="出款银行" required>
        <el-input v-model="bankPayoutForm.payoutSourceBankName" placeholder="例如：中国工商银行" />
      </el-form-item>
      <el-form-item label="出款支行" required>
        <el-input v-model="bankPayoutForm.payoutSourceBankBranch" placeholder="请填写具体支行" />
      </el-form-item>
      <el-form-item label="出款卡号" required>
        <el-input v-model="bankPayoutForm.payoutSourceCardNo" placeholder="请填写实际打款卡号" />
      </el-form-item>
      <el-form-item label="出款户名" required>
        <el-input v-model="bankPayoutForm.payoutSourceAccountName" placeholder="请填写打款账户名" />
      </el-form-item>
      <el-form-item label="流水号">
        <el-input v-model="bankPayoutForm.payoutReferenceNo" placeholder="银行回单号或内部打款流水号" />
      </el-form-item>
      <el-form-item label="处理说明">
        <el-input v-model="bankPayoutForm.transferResult" type="textarea" :rows="3" placeholder="请填写打款备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="bankPayoutSubmitting" @click="submitBankPayoutComplete">确认已打款</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import ImageUpload from '@/components/ImageUpload.vue'

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  bankPayoutForm: {
    type: Object,
    required: true,
  },
  bankPayoutSubmitting: {
    type: Boolean,
    default: false,
  },
  submitBankPayoutComplete: {
    type: Function,
    required: true,
  },
  handleBankPayoutDialogClosed: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
