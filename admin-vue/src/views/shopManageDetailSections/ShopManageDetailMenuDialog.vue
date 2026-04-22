<template>
  <el-dialog
    :model-value="visible"
    title="编辑菜单"
    width="640px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form :model="menuForm" label-width="100px">
      <el-form-item label="菜单说明">
        <el-input
          v-model="menuForm.menuNotes"
          type="textarea"
          :rows="8"
          placeholder="可填写菜单配置说明、品类规划、爆品策略等"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveMenuInfo">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineEmits(['update:visible']);

defineProps({
  menuForm: {
    type: Object,
    required: true,
  },
  saveMenuInfo: {
    type: Function,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
