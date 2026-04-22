<template>
  <el-dialog
    :model-value="visible"
    title="删除日志（二次验证）"
    width="460px"
    @update:model-value="setDeleteDialogVisible"
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
    <div class="delete-tip">删除后无法恢复，并且会留下完整审计记录。</div>
    <template #footer>
      <el-button @click="setDeleteDialogVisible(false)">取消</el-button>
      <el-button type="danger" :loading="deleting" @click="confirmDeleteLog">确认删除</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  confirmDeleteLog: {
    type: Function,
    required: true,
  },
  deleteVerifyForm: {
    type: Object,
    required: true,
  },
  deleting: {
    type: Boolean,
    default: false,
  },
  setDeleteDialogVisible: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
