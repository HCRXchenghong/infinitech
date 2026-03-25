<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" :stroke="color" stroke-width="2" fill="none"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
