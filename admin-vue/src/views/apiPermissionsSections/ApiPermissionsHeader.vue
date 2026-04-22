<template>
  <div class="title-row">
    <div>
      <div class="title">API 权限管理</div>
      <div class="title-subtitle">
        为每个调用方配置主要 API URL、API Key 和可访问的数据权限。
      </div>
    </div>
    <div class="title-actions">
      <el-button @click="goToDocumentation">API 文档</el-button>
      <el-button :loading="apiListLoading" @click="loadApiList">刷新</el-button>
      <el-button type="primary" @click="showAddApiDialog">新建 Key</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  apiListLoading: {
    type: Boolean,
    default: false,
  },
  goToDocumentation: {
    type: Function,
    required: true,
  },
  loadApiList: {
    type: Function,
    required: true,
  },
  showAddApiDialog: {
    type: Function,
    required: true,
  },
});
</script>
