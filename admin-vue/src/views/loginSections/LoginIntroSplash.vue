<template>
  <div class="intro-page">
    <div class="intro-content">
      <div class="logo-row">
        <img class="logo-mark" :src="logoUrl" alt="悦享e食" />
        <div class="logo-text">悦享e食</div>
      </div>
      <div class="intro-title">管理后台</div>
      <div class="intro-slogan">高效运营 · 轻松管理 · 即时履约</div>
      <button class="start-btn" @click="enterLogin">立即开始</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  logoUrl: {
    type: String,
    required: true,
  },
  enterLogin: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Login.css"></style>
