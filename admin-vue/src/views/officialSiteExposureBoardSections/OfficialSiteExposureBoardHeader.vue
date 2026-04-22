<template>
  <div
    class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-200 pb-6 gap-4"
  >
    <div>
      <h2 class="text-3xl font-bold text-slate-900">校园维权曝光板</h2>
      <p class="text-slate-500 mt-2">平台专员介入审核，已解决事件将在 30 天后自动归档隐匿。</p>
    </div>
    <el-button
      type="danger"
      class="!px-6 !h-12 !text-base font-bold !rounded shadow-sm"
      @click="openForm"
    >
      发起维权曝光
    </el-button>
  </div>
</template>

<script setup>
defineProps({
  openForm: {
    type: Function,
    required: true,
  },
});
</script>
