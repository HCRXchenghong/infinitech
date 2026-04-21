<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="440px"
    align-center
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="form" label-width="90px" size="small">
      <el-form-item label="账号类型">
        <el-radio-group v-model="form.userType">
          <el-radio-button value="user">用户</el-radio-button>
          <el-radio-button value="rider">骑手</el-radio-button>
          <el-radio-button value="merchant">商户</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="账号ID">
        <el-input v-model="form.userId" placeholder="输入手机号或账号ID" />
      </el-form-item>
      <el-form-item :label="amountLabel">
        <el-input-number v-model="form.amountYuan" :min="0.01" :precision="2" :step="10" style="width: 180px" />
        <span class="amount-unit">元</span>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.note" placeholder="可选备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button :type="actionType" :loading="loading" @click="submitAction">{{ actionLabel }}</el-button>
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
  title: {
    type: String,
    required: true,
  },
  actionLabel: {
    type: String,
    required: true,
  },
  actionType: {
    type: String,
    default: 'primary',
  },
  form: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  submitAction: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])

const amountLabel = computed(() => (props.actionType === 'danger' ? '扣款金额' : '充值金额'))
</script>

<style scoped>
.amount-unit {
  margin-left: 8px;
  color: #6b7280;
  font-size: 13px;
}
</style>
