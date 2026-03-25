<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <line x1="12" y1="9" x2="12" y2="13" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    <line x1="12" y1="17" x2="12.01" y2="17" :stroke="color" stroke-width="2" stroke-linecap="round"/>
  </svg>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    size: {
      type: String,
      default: '24'
    },
    color: {
      type: String,
      default: 'currentColor'
    }
  }
})
</script>
