<template>
  <div class="cookie-required-grid">
    <article class="cookie-required-panel">
      <h2>同意后会发生什么</h2>
      <ul>
        <li v-for="item in acceptEffects" :key="item">{{ item }}</li>
      </ul>
    </article>

    <article class="cookie-required-panel">
      <h2>拒绝后会发生什么</h2>
      <ul>
        <li v-for="item in rejectEffects" :key="item">{{ item }}</li>
      </ul>
    </article>
  </div>
</template>

<script setup>
defineProps({
  acceptEffects: {
    type: Array,
    required: true,
  },
  rejectEffects: {
    type: Array,
    required: true,
  },
})
</script>
