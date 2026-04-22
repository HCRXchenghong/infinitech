<template>
  <div class="page-header">
    <div>
      <h2>优惠券管理</h2>
      <p>统一管理商户券、客服券与平台券，支持手机号发券与链接领取。</p>
    </div>
    <el-button type="primary" @click="openCreateDialog">新建优惠券</el-button>
  </div>
</template>

<script setup>
defineProps({
  openCreateDialog: {
    type: Function,
    required: true,
  },
});
</script>
