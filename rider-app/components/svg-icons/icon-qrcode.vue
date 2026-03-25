<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" :stroke="color" stroke-width="2" fill="none"/>
    <rect x="14" y="3" width="7" height="7" :stroke="color" stroke-width="2" fill="none"/>
    <rect x="3" y="14" width="7" height="7" :stroke="color" stroke-width="2" fill="none"/>
    <rect x="5" y="5" width="3" height="3" :fill="color"/>
    <rect x="16" y="5" width="3" height="3" :fill="color"/>
    <rect x="5" y="16" width="3" height="3" :fill="color"/>
    <rect x="14" y="14" width="3" height="3" :fill="color"/>
    <rect x="18" y="14" width="3" height="3" :fill="color"/>
    <rect x="14" y="18" width="3" height="3" :fill="color"/>
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
