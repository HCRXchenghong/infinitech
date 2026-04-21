<template>
  <el-card class="card">
    <div class="card-title">{{ title }}</div>
    <div v-if="loading">
      <el-skeleton :rows="skeletonRows" animated />
    </div>
    <el-descriptions v-else :column="4" border size="small">
      <el-descriptions-item v-for="card in cards" :key="card.label" :label="card.label">
        <button
          type="button"
          class="metric-link"
          :style="{ color: accentColor }"
          @click="openKpiDetail(card)"
        >
          {{ card.value }}
        </button>
      </el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  cards: {
    type: Array,
    default: () => [],
  },
  accentColor: {
    type: String,
    default: '#409eff',
  },
  skeletonRows: {
    type: Number,
    default: 2,
  },
  openKpiDetail: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped>
.metric-link {
  cursor: pointer;
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
}
</style>
