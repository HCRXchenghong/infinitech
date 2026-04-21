<template>
  <el-dialog
    :model-value="visible"
    title="一键清除财务日志（二次验证）"
    width="460px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="clearVerifyForm" label-width="80px">
      <el-form-item label="账号">
        <el-input v-model="clearVerifyForm.verifyAccount" placeholder="请输入验证账号" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input
          v-model="clearVerifyForm.verifyPassword"
          type="password"
          show-password
          placeholder="请输入验证密码"
          @keyup.enter="confirmClearLogs"
        />
      </el-form-item>
    </el-form>
    <div class="transaction-logs-delete-tip">确认后将清空全部财务日志，操作不可恢复。</div>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="danger" :loading="clearing" @click="confirmClearLogs">确认清除</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  clearVerifyForm: {
    type: Object,
    required: true,
  },
  clearing: {
    type: Boolean,
    default: false,
  },
  confirmClearLogs: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
