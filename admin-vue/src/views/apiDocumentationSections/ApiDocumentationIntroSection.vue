<template>
  <section class="doc-section">
    <h1>简介</h1>
    <p>这里集中说明对外开放 API 的调用方式、权限要求和示例代码。</p>
    <div class="info-box">
      <el-icon><InfoFilled /></el-icon>
      <div>
        <strong>页面职责</strong>
        <p>
          API 文档页负责解释接口怎么调；API Key 的创建、用途备注和权限分配，应放在 API 权限管理中维护。
        </p>
      </div>
    </div>

    <div class="endpoint-card">
      <div class="endpoint-method post">POST</div>
      <div class="endpoint-path">/api/v1/query</div>
    </div>
    <p>统一查询接口的当前部署地址示例：<code>{{ apiBaseUrl }}/api/v1/query</code></p>
  </section>
</template>

<script setup>
import { InfoFilled } from '@element-plus/icons-vue';

defineProps({
  apiBaseUrl: {
    type: String,
    default: '',
  },
});
</script>
