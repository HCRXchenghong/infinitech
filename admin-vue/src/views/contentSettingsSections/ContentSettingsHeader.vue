<template>
  <div class="title-row">
    <span class="title">内容设置</span>
    <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  loadAll: {
    type: Function,
    required: true,
  },
});
</script>
