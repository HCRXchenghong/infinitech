<template>
  <div class="state-wrap">
    <div class="error-card">
      <h2>链接不可用</h2>
      <p>{{ loadError }}</p>
      <button class="btn-primary" type="button" @click="loadCoupon">重新加载</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loadCoupon: {
    type: Function,
    required: true,
  },
  loadError: {
    type: String,
    default: '',
  },
});
</script>
