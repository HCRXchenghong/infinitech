<template>
  <div class="section-card">
    <div class="section-head">
      <span>图片设置</span>
      <el-button type="primary" text size="small" @click="openImageDialog">编辑</el-button>
    </div>
    <div class="image-row">
      <div class="image-item">
        <div class="image-label">Logo</div>
        <img v-if="shop.logo" :src="shop.logo" alt="logo" />
        <div v-else class="image-empty">未设置</div>
      </div>
      <div class="image-item">
        <div class="image-label">封面图</div>
        <img v-if="shop.coverImage" :src="shop.coverImage" alt="cover" />
        <div v-else class="image-empty">未设置</div>
      </div>
      <div class="image-item">
        <div class="image-label">背景图</div>
        <img v-if="shop.backgroundImage" :src="shop.backgroundImage" alt="bg" />
        <div v-else class="image-empty">未设置</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  openImageDialog: {
    type: Function,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
});
</script>
