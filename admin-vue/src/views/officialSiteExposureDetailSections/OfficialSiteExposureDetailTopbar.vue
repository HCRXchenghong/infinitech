<template>
  <div class="exposure-detail-topbar">
    <el-button
      link
      class="!text-slate-500 hover:!text-[#1976d2]"
      @click="goBack"
    >
      返回曝光板
    </el-button>
  </div>
</template>

<script setup>
defineProps({
  goBack: {
    type: Function,
    required: true,
  },
})
</script>
