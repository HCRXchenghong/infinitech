<template>
  <div class="page-header">
    <div>
      <div class="page-title">商户详情</div>
      <div class="page-subtitle">商户ID：{{ merchant.id || '-' }}</div>
    </div>
    <div class="header-actions">
      <el-button size="small" @click="goBack">返回商户列表</el-button>
      <el-button type="primary" size="small" @click="openMerchantEdit">编辑商户信息</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  merchant: {
    type: Object,
    default: () => ({}),
  },
  goBack: {
    type: Function,
    required: true,
  },
  openMerchantEdit: {
    type: Function,
    required: true,
  },
});
</script>
