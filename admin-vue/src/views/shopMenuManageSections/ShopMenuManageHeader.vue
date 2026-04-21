<template>
  <div class="page-header">
    <div>
      <div class="page-title">菜单管理</div>
      <div class="page-subtitle">店铺：{{ shop.name || '-' }} (ID: {{ shopId }})</div>
    </div>
    <div class="header-actions">
      <el-button size="small" @click="goBack">返回店铺详情</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  shop: {
    type: Object,
    default: () => ({}),
  },
  shopId: {
    type: String,
    default: '',
  },
  goBack: {
    type: Function,
    required: true,
  },
});
</script>
