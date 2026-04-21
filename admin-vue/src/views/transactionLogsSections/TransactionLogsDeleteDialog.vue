<template>
  <el-dialog
    :model-value="visible"
    title="删除财务日志（二次验证）"
    width="460px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="deleteVerifyForm" label-width="80px">
      <el-form-item label="账号">
        <el-input v-model="deleteVerifyForm.verifyAccount" placeholder="请输入验证账号" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input
          v-model="deleteVerifyForm.verifyPassword"
          type="password"
          show-password
          placeholder="请输入验证密码"
          @keyup.enter="confirmDeleteLog"
        />
      </el-form-item>
    </el-form>
    <div class="transaction-logs-delete-tip">删除后无法恢复，且会记录“谁删除了哪条财务日志”。</div>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="danger" :loading="deleting" @click="confirmDeleteLog">确认删除</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  deleteVerifyForm: {
    type: Object,
    required: true,
  },
  deleting: {
    type: Boolean,
    default: false,
  },
  confirmDeleteLog: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
