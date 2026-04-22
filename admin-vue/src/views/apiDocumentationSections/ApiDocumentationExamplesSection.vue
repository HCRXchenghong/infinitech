<template>
  <section class="doc-section">
    <h1>代码示例</h1>
    <div v-for="example in requestExamples" :key="example.id" class="code-block">
      <div class="code-header">
        <span>{{ example.lang }}</span>
        <el-button text @click="copyText(example.code)">
          <el-icon><DocumentCopy /></el-icon>
          复制
        </el-button>
      </div>
      <pre><code>{{ example.code }}</code></pre>
    </div>
  </section>
</template>

<script setup>
import { DocumentCopy } from '@element-plus/icons-vue';

defineProps({
  copyText: {
    type: Function,
    required: true,
  },
  requestExamples: {
    type: Array,
    default: () => [],
  },
});
</script>
