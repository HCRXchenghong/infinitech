<template>
  <el-alert
    v-if="message"
    :title="message"
    type="error"
    show-icon
    :closable="false"
    class="state-alert"
  />
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.state-alert {
  margin-bottom: 12px;
}
</style>
