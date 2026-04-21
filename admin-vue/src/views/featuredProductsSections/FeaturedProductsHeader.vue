<template>
  <div class="featured-products-header">
    <div class="featured-products-title">今日推荐管理</div>
    <div class="featured-products-actions">
      <el-button size="small" :loading="loading" @click="loadFeaturedProducts">刷新</el-button>
      <el-button type="primary" size="small" @click="showAddDialog">添加推荐商品</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  loadFeaturedProducts: {
    type: Function,
    required: true,
  },
  showAddDialog: {
    type: Function,
    required: true,
  },
});
</script>
