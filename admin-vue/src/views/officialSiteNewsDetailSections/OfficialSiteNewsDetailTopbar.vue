<template>
  <div class="news-detail-topbar">
    <el-button
      link
      class="!px-0 !text-slate-500 hover:!text-[#1976d2]"
      @click="goBack"
    >
      返回新闻资讯
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
