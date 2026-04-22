<template>
  <section class="doc-section">
    <h1>错误码说明</h1>
    <table class="params-table">
      <thead>
        <tr>
          <th>状态码</th>
          <th>说明</th>
          <th>建议处理方式</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="errorCode in errorCodes" :key="errorCode.code">
          <td><code>{{ errorCode.code }}</code></td>
          <td>{{ errorCode.message }}</td>
          <td>{{ errorCode.action }}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="doc-section">
    <h1>注意事项</h1>
    <ul class="notes-list">
      <li v-for="note in notes" :key="note">{{ note }}</li>
    </ul>
    <div class="warning-box">
      <el-icon><WarningFilled /></el-icon>
      <div>
        <strong>安全提示</strong>
        <p>API Key 相当于密钥，请按调用方分配，避免多个系统共用同一个 Key。</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { WarningFilled } from '@element-plus/icons-vue';

defineProps({
  errorCodes: {
    type: Array,
    default: () => [],
  },
  notes: {
    type: Array,
    default: () => [],
  },
});
</script>
