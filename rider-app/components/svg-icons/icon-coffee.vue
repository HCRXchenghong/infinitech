<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <line x1="6" y1="1" x2="6" y2="4" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    <line x1="10" y1="1" x2="10" y2="4" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    <line x1="14" y1="1" x2="14" y2="4" :stroke="color" stroke-width="2" stroke-linecap="round"/>
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
