<template>
  <el-card class="summary-card">
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">新增</div>
        <div class="summary-value create">{{ summary.create }}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">删除</div>
        <div class="summary-value delete">{{ summary.delete }}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">修改</div>
        <div class="summary-value update">{{ summary.update }}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">查询</div>
        <div class="summary-value read">{{ summary.read }}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">系统</div>
        <div class="summary-value system">{{ summary.system }}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">异常</div>
        <div class="summary-value error">{{ summary.error }}</div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  summary: {
    type: Object,
    required: true,
  },
});
</script>
