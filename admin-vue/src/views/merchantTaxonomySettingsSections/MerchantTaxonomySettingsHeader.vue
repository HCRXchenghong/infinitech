<template>
  <div class="page-header">
    <div>
      <h2 class="page-title">商户业务字典</h2>
      <p class="page-subtitle">
        统一维护商户类型、业务分类、别名兼容与展示顺序，所有店铺编辑页共用这一份字典。
      </p>
    </div>
    <div class="page-actions">
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
