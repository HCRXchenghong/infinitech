<template>
  <div class="state-wrap">
    <el-skeleton v-if="loading" :rows="6" animated />

    <el-result v-else icon="warning" title="链接不可用" :sub-title="loadError">
      <template #extra>
        <el-button type="primary" @click="loadInvite">重试</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: "",
  },
  loadInvite: {
    type: Function,
    required: true,
  },
});
</script>
