<template>
  <div class="official-site-privacy-policy-hero site-screen-section site-screen-center">
    <div class="official-site-privacy-policy-kicker">Privacy Policy</div>
    <h1 class="official-site-privacy-policy-title">悦享e食官网隐私政策</h1>
    <p
      v-for="paragraph in heroIntroduction"
      :key="paragraph"
      class="official-site-privacy-policy-introduction"
    >
      {{ paragraph }}
    </p>
    <div class="official-site-privacy-policy-meta">{{ heroUpdatedAt }}</div>
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
