<template>
  <el-dialog
    :model-value="visible"
    title="编辑图片设置"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form :model="imageForm" label-width="100px">
      <el-form-item label="Logo">
        <ImageUpload v-model="imageForm.logo" upload-domain="shop_media" />
      </el-form-item>
      <el-form-item label="封面图">
        <ImageUpload v-model="imageForm.coverImage" upload-domain="shop_media" />
      </el-form-item>
      <el-form-item label="背景图">
        <ImageUpload v-model="imageForm.backgroundImage" upload-domain="shop_media" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveImageInfo">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import ImageUpload from '@/components/ImageUpload.vue';

defineEmits(['update:visible']);

defineProps({
  imageForm: {
    type: Object,
    required: true,
  },
  saveImageInfo: {
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
