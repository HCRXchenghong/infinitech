<template>
  <div class="doc-header">
    <div class="header-content">
      <div class="header-left">
        <h1 class="doc-title">
          <el-icon><Document /></el-icon>
          API 开发文档
        </h1>
        <p class="doc-subtitle">对外 API 的认证方式、权限模型、接口清单与代码示例</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" :loading="downloading" @click="downloadFullDocumentation">
          <el-icon><Download /></el-icon>
          下载完整文档
        </el-button>
        <el-button @click="refreshDocumentation">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Document, Download, Refresh } from '@element-plus/icons-vue';

defineProps({
  downloading: {
    type: Boolean,
    default: false,
  },
  downloadFullDocumentation: {
    type: Function,
    required: true,
  },
  refreshDocumentation: {
    type: Function,
    required: true,
  },
});
</script>
