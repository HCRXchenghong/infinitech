<template>
  <div class="panel presence-panel">
    <div class="panel-title">
      <div class="presence-title-block">
        <span>在线连接样本</span>
        <div class="presence-caption">{{ getRedisModeHint(imRedis) }}</div>
      </div>
      <div class="presence-status-tags">
        <el-tag size="small" :type="getRedisModeTagType(imRedis.mode)">{{ getRedisModeLabel(imRedis.mode) }}</el-tag>
        <el-tag size="small" effect="plain">在线 {{ imStats.onlineUsers }}</el-tag>
      </div>
    </div>

    <div v-if="onlinePresenceSample.length" class="presence-list">
      <div v-for="entry in onlinePresenceSample" :key="entry.key" class="presence-item">
        <div class="presence-main">
          <div class="presence-user">{{ entry.userLabel }}</div>
          <div class="presence-meta">{{ entry.roleLabel }} · {{ entry.socketLabel }}</div>
        </div>
        <div class="presence-side">
          <div class="presence-time">{{ formatPresenceConnectedAt(entry.connectedAt) }}</div>
        </div>
      </div>
    </div>
    <el-empty v-else :description="presenceEmptyDescription" :image-size="90" />
  </div>
</template>

<script setup>
defineProps({
  onlinePresenceSample: {
    type: Array,
    default: () => [],
  },
  presenceEmptyDescription: {
    type: String,
    default: '暂无在线连接样本',
  },
  imRedis: {
    type: Object,
    required: true,
  },
  imStats: {
    type: Object,
    required: true,
  },
  getRedisModeTagType: {
    type: Function,
    required: true,
  },
  getRedisModeLabel: {
    type: Function,
    required: true,
  },
  getRedisModeHint: {
    type: Function,
    required: true,
  },
  formatPresenceConnectedAt: {
    type: Function,
    required: true,
  },
})
</script>
