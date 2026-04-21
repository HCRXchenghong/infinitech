<template>
  <el-dialog
    :model-value="visible"
    :title="getDiningBuddySensitiveDialogTitle(sensitiveForm)"
    width="520px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form label-width="90px">
      <el-form-item label="敏感词">
        <el-input v-model="sensitiveForm.word" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="sensitiveForm.description" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="sensitiveForm.enabled" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="sensitiveSaving" @click="saveSensitiveWord">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  sensitiveForm: {
    type: Object,
    required: true,
  },
  sensitiveSaving: {
    type: Boolean,
    default: false,
  },
  getDiningBuddySensitiveDialogTitle: {
    type: Function,
    required: true,
  },
  saveSensitiveWord: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
