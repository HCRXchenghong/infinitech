<template>
  <el-card shadow="never">
    <template #header>
      <div class="home-entry-settings-card-title">
        <span>预览</span>
        <span class="home-entry-settings-card-tip">
          {{ previewClient === 'user-vue' ? '用户端' : 'App' }}当前会看到的入口
        </span>
      </div>
    </template>

    <el-empty v-if="!previewEntries.length" description="当前预览端没有可展示入口" />
    <div v-else class="home-entry-settings-preview-grid">
      <div
        v-for="entry in previewEntries"
        :key="entry.localKey"
        class="home-entry-settings-preview-card"
        :style="{ background: entry.bg_color || '#f5f5f5' }"
      >
        <div class="home-entry-settings-preview-icon">
          <img v-if="showImageIcon(entry)" :src="entry.icon" alt="" />
          <span v-else>{{ entry.icon || '✨' }}</span>
        </div>
        <div class="home-entry-settings-preview-text">
          <strong>{{ entry.label }}</strong>
          <span>{{ entry.route_type }} / {{ entry.route_value }}</span>
        </div>
        <el-tag v-if="entry.badge_text" size="small" type="danger">
          {{ entry.badge_text }}
        </el-tag>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  previewClient: {
    type: String,
    default: 'user-vue',
  },
  previewEntries: {
    type: Array,
    default: () => [],
  },
  showImageIcon: {
    type: Function,
    required: true,
  },
});
</script>
