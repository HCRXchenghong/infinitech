<template>
  <div class="summary-grid">
    <el-card class="summary-card">
      <span class="summary-label">Key 总数</span>
      <strong>{{ summary.total }}</strong>
      <small>当前登记的全部调用方</small>
    </el-card>
    <el-card class="summary-card">
      <span class="summary-label">启用中</span>
      <strong>{{ summary.active }}</strong>
      <small>可正常调用对外接口</small>
    </el-card>
    <el-card class="summary-card">
      <span class="summary-label">全权限</span>
      <strong>{{ summary.allScoped }}</strong>
      <small>拥有 `all` 权限的 Key</small>
    </el-card>
    <el-card class="summary-card">
      <span class="summary-label">已填 API URL</span>
      <strong>{{ summary.withPath }}</strong>
      <small>记录了主要入口或用途路径</small>
    </el-card>
  </div>
</template>

<script setup>
defineProps({
  summary: {
    type: Object,
    required: true,
  },
});
</script>
