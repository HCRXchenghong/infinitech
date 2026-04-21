<template>
  <section class="success-view">
    <el-result
      icon="success"
      title="提交成功"
      sub-title="信息已提交，请等待平台审核。"
    >
      <template #extra>
        <el-button @click="showLetter">查看邀请函</el-button>
      </template>
    </el-result>
  </section>
</template>

<script setup>
defineProps({
  showLetter: {
    type: Function,
    required: true,
  },
});
</script>
