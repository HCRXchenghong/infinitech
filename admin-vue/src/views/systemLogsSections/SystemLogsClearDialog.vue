<template>
  <el-dialog
    :model-value="visible"
    title="一键清空系统日志（二次验证）"
    width="460px"
    @update:model-value="setClearDialogVisible"
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
    <div class="delete-tip">
      即将清空 <strong>{{ clearSourceLabel }}</strong> 的日志数据，操作不可恢复。
    </div>
    <template #footer>
      <el-button @click="setClearDialogVisible(false)">取消</el-button>
      <el-button type="danger" :loading="clearing" @click="confirmClearLogs">确认清空</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  clearSourceLabel: {
    type: String,
    default: '',
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
  setClearDialogVisible: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
