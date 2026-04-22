<template>
  <el-card shadow="never">
    <template #header>
      <div class="errand-settings-card-title-row">
        <span>页面预览</span>
        <span class="errand-settings-card-tip">启停与排序以右侧预览效果实时回显。</span>
      </div>
    </template>

    <div class="errand-settings-preview-shell">
      <div class="errand-settings-hero-card">
        <strong>{{ preview.heroTitle }}</strong>
        <p>{{ preview.heroDesc }}</p>
      </div>
      <div class="errand-settings-preview-list">
        <div
          v-for="service in preview.services"
          :key="service.key"
          class="errand-settings-preview-item"
        >
          <div
            class="errand-settings-preview-icon"
            :style="{ background: service.color || '#e5e7eb' }"
          >
            {{ service.icon || '·' }}
          </div>
          <div class="errand-settings-preview-content">
            <strong>{{ service.name }}</strong>
            <span>{{ service.desc }}</span>
            <small>{{ service.serviceFeeHint }}</small>
          </div>
        </div>
      </div>
      <el-empty v-if="!preview.services.length" description="当前没有启用中的跑腿服务" />
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  preview: {
    type: Object,
    required: true,
  },
});
</script>
