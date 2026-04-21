<template>
  <div class="hero">
    <div class="hero-logo-ring">
      <img class="hero-logo" :src="logoUrl" alt="悦享e食" />
    </div>
    <h1 class="hero-title">悦享e食管理后台</h1>
    <p class="hero-subtitle">高效运营 · 轻松管理 · 即时履约</p>
  </div>
</template>

<script setup>
defineProps({
  logoUrl: {
    type: String,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Login.css"></style>
