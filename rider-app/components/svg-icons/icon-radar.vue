<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" :stroke="color" stroke-width="2" fill="none"/>
    <circle cx="12" cy="12" r="6" :stroke="color" stroke-width="2" fill="none"/>
    <circle cx="12" cy="12" r="2" :fill="color"/>
    <line x1="12" y1="2" x2="12" y2="6" :stroke="color" stroke-width="2" stroke-linecap="round"/>
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
