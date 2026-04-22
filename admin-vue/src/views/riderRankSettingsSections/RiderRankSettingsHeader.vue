<template>
  <div class="page-header">
    <div>
      <h2 class="page-title">骑手等级配置</h2>
      <p class="page-subtitle">
        统一维护骑手等级名称、图标、升级提示与阈值说明，骑手端与后台榜单保持一套口径。
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
