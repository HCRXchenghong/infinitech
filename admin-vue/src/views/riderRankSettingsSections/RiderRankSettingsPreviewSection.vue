<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-title-row">
        <span>展示预览</span>
        <span class="card-tip">这里的名称与图标会同步给骑手个人页与等级页。</span>
      </div>
    </template>

    <div class="preview-list">
      <div v-for="level in sortedLevels" :key="level.level" class="preview-item">
        <div class="preview-icon">{{ level.icon || '🏍' }}</div>
        <div class="preview-content">
          <strong>{{ level.name }}</strong>
          <span>{{ level.desc }}</span>
          <small>{{ level.progress_template }}</small>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  sortedLevels: {
    type: Array,
    default: () => [],
  },
});
</script>
