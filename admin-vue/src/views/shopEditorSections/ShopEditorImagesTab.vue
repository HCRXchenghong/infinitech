<template>
  <div>
    <el-form-item label="封面图">
      <ImageUpload v-model="formData.coverImage" upload-domain="shop_media" />
      <div class="shop-editor-inline-tip">店铺列表展示的封面图</div>
    </el-form-item>

    <el-form-item label="背景图">
      <ImageUpload v-model="formData.backgroundImage" upload-domain="shop_media" />
      <div class="shop-editor-inline-tip">店铺详情页顶部背景图</div>
    </el-form-item>

    <el-form-item label="Logo">
      <ImageUpload v-model="formData.logo" upload-domain="shop_media" />
      <div class="shop-editor-inline-tip">店铺 Logo 图标</div>
    </el-form-item>
  </div>
</template>

<script setup>
import ImageUpload from '@/components/ImageUpload.vue';

defineProps({
  formData: {
    type: Object,
    required: true,
  },
});
</script>
