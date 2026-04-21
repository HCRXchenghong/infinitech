<template>
  <el-dialog
    :model-value="visible"
    title="清空全部信息（二次验证）"
    width="460px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="clearAllVerifyForm" label-width="80px">
      <el-form-item label="账号">
        <el-input v-model="clearAllVerifyForm.verifyAccount" placeholder="请输入验证账号" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input
          v-model="clearAllVerifyForm.verifyPassword"
          type="password"
          show-password
          placeholder="请输入验证密码"
          @keyup.enter="confirmClearAllData"
        />
      </el-form-item>
    </el-form>
    <div class="danger-dialog-tip">
      二次验证失败 2 次将锁定 24 小时；请谨慎操作。
    </div>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="danger" :loading="clearingAllData" @click="confirmClearAllData">确认清空</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
const emit = defineEmits(['update:visible'])

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  clearAllVerifyForm: {
    type: Object,
    required: true,
  },
  clearingAllData: {
    type: Boolean,
    default: false,
  },
  confirmClearAllData: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Settings.css"></style>
