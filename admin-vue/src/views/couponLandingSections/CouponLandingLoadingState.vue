<template>
  <div class="state-wrap">
    <div class="loading-card">
      <div class="loading-title">优惠券加载中</div>
      <div v-for="n in 4" :key="n" class="loading-line"></div>
    </div>
  </div>
</template>
