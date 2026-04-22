<template>
  <div class="errand-settings-page-header">
    <div>
      <h2>跑腿配置</h2>
      <p>统一维护跑腿首页标题、四张服务卡片、详情提示与服务费说明。</p>
    </div>
    <div class="errand-settings-page-actions">
      <el-button size="small" :loading="loading" @click="loadSettings(true)">刷新</el-button>
      <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loadSettings: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  saveSettings: {
    type: Function,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
});
</script>
