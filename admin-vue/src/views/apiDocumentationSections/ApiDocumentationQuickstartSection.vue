<template>
  <section class="doc-section">
    <h1>快速开始</h1>
    <h2>1. 准备 API Key</h2>
    <p>先在管理后台的 API 权限管理中创建一个 API Key，并为它勾选对应权限。</p>

    <h2>2. 请求头认证</h2>
    <div class="code-block">
      <div class="code-header">
        <span>http</span>
        <el-button text @click="copyText(authHeaderExample)">
          <el-icon><DocumentCopy /></el-icon>
          复制
        </el-button>
      </div>
      <pre><code>{{ authHeaderExample }}</code></pre>
    </div>

    <h2>3. 基础调用示例</h2>
    <div class="code-block">
      <div class="code-header">
        <span>bash</span>
        <el-button text @click="copyText(quickStartCurl)">
          <el-icon><DocumentCopy /></el-icon>
          复制
        </el-button>
      </div>
      <pre><code>{{ quickStartCurl }}</code></pre>
    </div>
  </section>
</template>

<script setup>
import { DocumentCopy } from '@element-plus/icons-vue';

defineProps({
  authHeaderExample: {
    type: String,
    default: '',
  },
  copyText: {
    type: Function,
    required: true,
  },
  quickStartCurl: {
    type: String,
    default: '',
  },
});
</script>
