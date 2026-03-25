<template>
  <div class="panel-actions">
    <slot v-if="!isMobile" name="desktop" />
    <slot v-else name="mobile" />
  </div>
</template>

<script setup>
defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
});
</script>
