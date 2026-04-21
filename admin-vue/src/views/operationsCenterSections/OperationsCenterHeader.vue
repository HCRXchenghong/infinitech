<template>
  <div class="operations-center-header">
    <div class="operations-center-title">运营管理</div>
    <div class="operations-center-actions">
      <el-button size="small" :loading="loading" @click="refreshCurrent">刷新</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  refreshCurrent: {
    type: Function,
    required: true,
  },
});
</script>
