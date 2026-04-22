<template>
  <div class="official-site-disclaimer-hero site-screen-section site-screen-center">
    <div class="official-site-disclaimer-kicker">Service Notice</div>
    <h1 class="official-site-disclaimer-title">悦享e食官网免责声明与服务说明</h1>
    <p
      v-for="paragraph in heroIntroduction"
      :key="paragraph"
      class="official-site-disclaimer-introduction"
    >
      {{ paragraph }}
    </p>
    <div class="official-site-disclaimer-meta">{{ heroUpdatedAt }}</div>
  </div>
</template>

<script setup>
defineProps({
  heroIntroduction: {
    type: Array,
    required: true,
  },
  heroUpdatedAt: {
    type: String,
    required: true,
  },
})
</script>
