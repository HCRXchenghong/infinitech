<template>
  <div class="home-entry-settings-header">
    <div>
      <h2>首页入口配置</h2>
      <p>统一维护用户端与 App 首页的平台入口、路由与展示状态。</p>
    </div>

    <div class="home-entry-settings-actions">
      <el-select
        :model-value="previewClient"
        size="small"
        style="width: 150px"
        @update:model-value="updatePreviewClient"
      >
        <el-option label="用户端预览" value="user-vue" />
        <el-option label="App 预览" value="app-mobile" />
      </el-select>
      <el-button size="small" :loading="loading" @click="loadSettings(true)">刷新</el-button>
      <el-button size="small" @click="addEntry">新增入口</el-button>
      <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  addEntry: {
    type: Function,
    required: true,
  },
  loadSettings: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  previewClient: {
    type: String,
    default: 'user-vue',
  },
  saveSettings: {
    type: Function,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  updatePreviewClient: {
    type: Function,
    required: true,
  },
});
</script>
