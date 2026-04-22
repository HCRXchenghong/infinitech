<template>
  <div class="page-header">
    <div>
      <div class="page-title">店铺详情</div>
      <div class="page-subtitle">店铺ID：{{ shop.id || '-' }} / 商户ID：{{ merchantId }}</div>
    </div>
    <div class="header-actions">
      <el-button size="small" @click="goBackMerchant">返回商户详情</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  goBackMerchant: {
    type: Function,
    required: true,
  },
  merchantId: {
    type: String,
    default: '',
  },
  shop: {
    type: Object,
    required: true,
  },
});
</script>
