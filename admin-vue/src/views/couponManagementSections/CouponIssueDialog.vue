<template>
  <el-dialog
    :model-value="visible"
    title="手机号发券"
    width="440px"
    :close-on-click-modal="false"
    @update:model-value="setIssueDialogVisible"
  >
    <el-form :ref="setIssueFormRef" :model="issueForm" :rules="issueRules" label-width="90px">
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="issueForm.phone" maxlength="11" placeholder="请输入注册手机号" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="setIssueDialogVisible(false)">取消</el-button>
      <el-button type="primary" :loading="issuing" @click="submitIssue">确认发券</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  issueForm: {
    type: Object,
    required: true,
  },
  issueFormRef: {
    type: Object,
    default: null,
  },
  issueRules: {
    type: Object,
    default: () => ({}),
  },
  issuing: {
    type: Boolean,
    default: false,
  },
  setIssueFormRef: {
    type: Function,
    required: true,
  },
  setIssueDialogVisible: {
    type: Function,
    required: true,
  },
  submitIssue: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
