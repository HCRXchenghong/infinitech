<template>
  <el-dialog
    :model-value="visible"
    title="编辑标签与优惠"
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form :model="tagForm" label-width="100px">
      <el-form-item label="店铺标签">
        <el-input
          v-model="tagForm.tagsText"
          type="textarea"
          :rows="3"
          placeholder="多个标签请用逗号分隔，例如：口碑商家,配送快,满减多"
        />
      </el-form-item>
      <el-form-item label="优惠信息">
        <el-input
          v-model="tagForm.discountsText"
          type="textarea"
          :rows="3"
          placeholder="多条优惠请用逗号分隔，例如：25减10,40减18"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveTagInfo">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineEmits(['update:visible']);

defineProps({
  saveTagInfo: {
    type: Function,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  tagForm: {
    type: Object,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
