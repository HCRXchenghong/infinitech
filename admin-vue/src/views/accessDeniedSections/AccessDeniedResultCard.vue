<template>
  <div class="access-denied-card">
    <el-result :title="title" :sub-title="subtitle" icon="warning">
      <template #extra>
        <div class="access-denied-actions">
          <el-button
            v-for="button in actionButtons"
            :key="button.key"
            :type="button.type"
            @click="button.onClick"
          >
            {{ button.label }}
          </el-button>
        </div>
      </template>
    </el-result>
  </div>
</template>

<script setup>
defineProps({
  actionButtons: {
    type: Array,
    default: () => [],
  },
  subtitle: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
})
</script>
