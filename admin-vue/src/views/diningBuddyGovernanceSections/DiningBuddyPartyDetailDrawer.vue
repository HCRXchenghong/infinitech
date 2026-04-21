<template>
  <el-drawer
    :model-value="visible"
    title="组局详情"
    size="40%"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-descriptions v-if="partyDetail" :column="1" border size="small">
      <el-descriptions-item label="标题">{{ partyDetail.title }}</el-descriptions-item>
      <el-descriptions-item label="分类">{{ partyDetail.category }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ partyDetail.status }}</el-descriptions-item>
      <el-descriptions-item label="发起人">{{ partyDetail.host_name || partyDetail.hostName }}</el-descriptions-item>
      <el-descriptions-item label="地点">{{ partyDetail.location }}</el-descriptions-item>
      <el-descriptions-item label="时间">{{ partyDetail.time || partyDetail.activity_time }}</el-descriptions-item>
      <el-descriptions-item label="描述">{{ partyDetail.description || '--' }}</el-descriptions-item>
    </el-descriptions>
  </el-drawer>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  partyDetail: {
    type: Object,
    default: () => null,
  },
})

const emit = defineEmits(['update:visible'])
</script>
